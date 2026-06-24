/**
 * MAT GDL90 Protocol Parser
 * 
 * JavaScript port of the Avare GDL90 parsing library (apps4av.com)
 * Original code: Copyright (c) 2012-2017, Apps4Av Inc. (BSD License)
 * JavaScript port: For Mission Aircrew Toolkit (MAT)
 * 
 * This module parses GDL90 protocol messages to extract:
 * - FIS-B Weather: METAR, TAF, PIREP, Winds Aloft, AIRMET, SIGMET
 * - NOTAMs and TFRs
 * - NEXRAD radar imagery
 * - Traffic (TIS-B)
 * - Ownship position and AHRS data
 * 
 * GDL90 is typically transmitted over WiFi UDP port 4000 or via Bluetooth
 */

const MATGDL90 = (function() {
    'use strict';

    // ==================== CONSTANTS ====================
    const Constants = {
        HEADING_RESOLUTION: 1.40625,
        LON_LAT_RESOLUTION: 2.1457672e-5,
        COLS_PER_BIN: 32,
        ROWS_PER_BIN: 4,
        
        // DLAC character encoding table (6-bit to ASCII)
        DLAC_CODE: [
            0x03, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B,
            0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57,
            0x58, 0x59, 0x5A, 0x00, 0x09, 0x1E, 0x0A, 0x00, 0x20, 0x21, 0x22, 0x23,
            0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
            0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B,
            0x3C, 0x3D, 0x3E, 0x3F
        ]
    };

    // Message Types (GDL90 spec)
    const MessageType = {
        HEARTBEAT: 0x00,
        UPLINK: 0x07,
        OWNSHIP: 0x0A,
        OWNSHIP_GEOMETRIC_ALTITUDE: 0x0B,
        TRAFFIC_REPORT: 0x14,
        BASIC_REPORT: 0x1E,
        LONG_REPORT: 0x1F,
        AHRS_REPORT: 0x4C,
        DEVICE_REPORT: 0x7A
    };

    // FIS-B Product Types
    const ProductType = {
        NOTAMS: 8,
        D_ATIS: 9,
        TWIP: 10,
        AIRMET: 11,
        SIGMET: 12,
        SUA: 13,
        NEXRAD_REGIONAL: 63,
        NEXRAD_CONUS: 64,
        TEXT: 413  // METAR, TAF, PIREP, WINDS
    };

    // Geometry shape types for graphical products
    const ShapeType = {
        NONE: -1,
        POLYGON_MSL: 3,
        PRISM_MSL: 7,
        PRISM_AGL: 8,
        POINT3D_AGL: 9
    };

    // ==================== CRC-16 ====================
    const CRC_TABLE = [
        0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
        0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
        0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
        0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
        0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
        0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
        0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
        0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
        0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
        0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
        0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
        0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
        0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
        0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
        0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
        0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
        0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
        0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
        0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
        0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
        0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
        0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
        0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
        0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
        0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
        0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
        0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
        0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
        0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
        0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
        0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
        0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
    ];

    function checkCrc(bytes, length, msgCrc) {
        let crc = 0;
        for (let i = 0; i < length; i++) {
            const crc16 = crc & 0xFFFF;
            const entry2 = bytes[i] & 0xFF;
            const entry = CRC_TABLE[crc16 >> 8] ^ entry2;
            const entry3 = (crc16 << 8) & 0xFFFF;
            crc = entry ^ entry3;
        }
        return crc === msgCrc;
    }

    // ==================== DLAC DECODER ====================
    function dlacDecode(b1, b2, b3) {
        const holder = ((b1 & 0xFF) << 24) + ((b2 & 0xFF) << 16) + ((b3 & 0xFF) << 8);
        
        const firstChar = Constants.DLAC_CODE[((holder & 0xFC000000) >>> 26) & 0x3F];
        const secondChar = Constants.DLAC_CODE[((holder & 0x03F00000) >>> 20) & 0x3F];
        const thirdChar = Constants.DLAC_CODE[((holder & 0x000FC000) >>> 14) & 0x3F];
        const fourthChar = Constants.DLAC_CODE[((holder & 0x00003F00) >>> 8) & 0x3F];
        
        return String.fromCharCode(firstChar, secondChar, thirdChar, fourthChar);
    }

    function dlacFormat(text) {
        if (!text) return text;
        // Split on record separator and take first part
        text = text.split('\u001E')[0];
        // Remove invalid chars after newline
        text = text.replace(/\n\t[A-Z]{1}/g, '\n');
        return text;
    }

    // ==================== BIT INPUT STREAM ====================
    class BitInputStream {
        constructor(buffer) {
            this.buffer = buffer;
            this.location = 0;
            this.bitsLeft = 8;
            this.iBuffer = buffer[0] & 0xFF;
        }

        getBits(numberOfBits) {
            let value = 0;
            let num = numberOfBits;
            while (num-- > 0) {
                value <<= 1;
                value |= this.readBit();
            }
            return value;
        }

        readBit() {
            if (this.bitsLeft === 0) {
                this.iBuffer = this.buffer[++this.location] & 0xFF;
                this.bitsLeft = 8;
            }
            this.bitsLeft--;
            return (this.iBuffer >> this.bitsLeft) & 0x1;
        }

        totalRead() {
            return this.location + 1;
        }
    }

    // ==================== DATA BUFFER (Frame Assembly) ====================
    class DataBuffer {
        constructor(size = 8192) {
            this.size = size;
            this.buffer = new Uint8Array(size);
            this.buffer2 = new Uint8Array(size);
            this.elem = 0;
            this.indexes = [];
        }

        flush() {
            this.elem = 0;
            this.indexes = [];
        }

        compute() {
            this.indexes = [];
            if (this.elem <= 0) return;
            
            let i = 0;
            if (this.buffer[0] !== 0x7E) {
                // Partial packet - find first flag
                for (i = 0; i < this.elem; i++) {
                    if (this.buffer[i] === 0x7E) {
                        i++;
                        break;
                    }
                }
            }
            
            for (let j = i; j < this.elem; j++) {
                if (this.buffer[j] === 0x7E) {
                    this.indexes.push(j);
                }
            }
        }

        getAtBegin(len) {
            const buffer = new Uint8Array(len);
            buffer.set(this.buffer.subarray(0, len));
            this.elem -= len;
            this.buffer2.set(this.buffer.subarray(len, len + this.elem));
            
            // Swap buffers
            [this.buffer, this.buffer2] = [this.buffer2, this.buffer];
            this.compute();
            return buffer;
        }

        getNext() {
            if (this.indexes.length === 0) return -1;
            return this.indexes.shift();
        }

        get() {
            let beg = this.getNext();
            
            if (beg < 0) {
                this.flush();
                return null;
            } else if (beg > 0) {
                this.getAtBegin(beg);
                beg = this.getNext();
            }
            
            const end = this.getNext();
            if (end < 0) return null; // Incomplete packet
            
            return this.getAtBegin(end - beg + 1);
        }

        put(data, len) {
            if ((this.elem + len) >= this.size) {
                this.flush();
                return;
            }
            this.buffer.set(data.subarray(0, len), this.elem);
            this.elem += len;
            this.compute();
        }
    }

    // ==================== MESSAGE CLASSES ====================
    
    class HeartbeatMessage {
        constructor() {
            this.type = MessageType.HEARTBEAT;
            this.time = Date.now();
        }

        parse(msg) {
            const d = msg[0] & 0xFF;
            this.gpsPositionValid = (d & 0x80) !== 0;
            this.batteryLow = (d & 0x40) !== 0;
            this.deviceRunning = (d & 0x01) !== 0;

            const d1 = msg[1] & 0xFF;
            const d2 = msg[2] & 0xFF;
            const d3 = msg[3] & 0xFF;

            const timeStamp = ((d1 & 0x80) << 9) | (d3 << 8) | d2;
            const hourFrac = timeStamp * 0.00008 / 3600;
            this.hour = Math.floor(hourFrac);
            const minuteFrac = (hourFrac - this.hour) * 60;
            this.minute = Math.floor(minuteFrac);
            const secondsFrac = (minuteFrac - this.minute) * 60;
            this.second = Math.round(secondsFrac);
            
            if (this.second === 60) { this.second = 0; this.minute++; }
            if (this.minute === 60) { this.minute = 0; this.hour++; }
        }
    }

    class OwnshipMessage {
        constructor() {
            this.type = MessageType.OWNSHIP;
            this.time = Date.now();
        }

        parse(msg) {
            this.icaoAddress = ((msg[1] & 0xFF) << 16) + ((msg[2] & 0xFF) << 8) + (msg[3] & 0xFF);
            this.lat = this.calculateDegrees(msg[4] & 0xFF, msg[5] & 0xFF, msg[6] & 0xFF);
            this.lon = this.calculateDegrees(msg[7] & 0xFF, msg[8] & 0xFF, msg[9] & 0xFF);

            let upper = (msg[10] & 0xFF) << 4;
            let lower = (msg[11] & 0xF0) >> 4;
            let alt = upper + lower;
            
            if (alt === 0xFFF) {
                this.altitude = -305; // -1000 ft in meters
            } else {
                alt = (alt * 25) - 1000;
                if (alt < -1000) alt = -1000;
                this.altitude = Math.round(alt / 3.28084); // Convert to meters
            }

            this.isAirborne = (msg[11] & 0x08) !== 0;
            this.isExtrapolated = (msg[11] & 0x04) !== 0;
            this.trackType = msg[11] & 0x03;

            this.nic = ((msg[12] & 0xF0) >> 4) & 0x0F;
            this.nacp = msg[12] & 0x0F;

            upper = (msg[13] & 0xFF) << 4;
            lower = (msg[14] & 0xF0) >> 4;
            if (upper === 0xFF0 && lower === 0xF) {
                this.horizontalVelocity = 0;
            } else {
                this.horizontalVelocity = Math.round((upper + lower) * 0.514444); // Knots to m/s
            }

            // Vertical velocity
            if ((msg[14] & 0x08) === 0) {
                this.verticalVelocity = ((msg[14] & 0x0F) << 14) + ((msg[15] & 0xFF) << 6);
            } else if (msg[15] === 0) {
                this.verticalVelocity = Number.MAX_SAFE_INTEGER;
            } else {
                this.verticalVelocity = ((msg[14] & 0x0F) << 14) + ((msg[15] & 0xFF) << 6) - 0x40000;
            }

            this.direction = (msg[16] & 0xFF) * Constants.HEADING_RESOLUTION;
        }

        calculateDegrees(highByte, midByte, lowByte) {
            let position = (highByte << 16) | (midByte << 8) | lowByte;
            position &= 0xFFFFFFFF;

            let xx;
            if ((position & 0x800000) !== 0) {
                position |= 0xFF000000;
                xx = position | 0;  // Sign extend
                if (xx > 0x7FFFFFFF) xx -= 0x100000000;
            } else {
                xx = position & 0x7FFFFF;
            }
            return xx * Constants.LON_LAT_RESOLUTION;
        }
    }

    class TrafficReportMessage {
        constructor() {
            this.type = MessageType.TRAFFIC_REPORT;
            this.time = Date.now();
        }

        parse(msg) {
            this.status = (msg[0] & 0xF0) >> 4;
            this.addressType = msg[0] & 0x0F;
            this.icaoAddress = ((msg[1] & 0xFF) << 16) + ((msg[2] & 0xFF) << 8) + (msg[3] & 0xFF);

            this.lat = this.calculateDegrees(msg[4] & 0xFF, msg[5] & 0xFF, msg[6] & 0xFF);
            this.lon = this.calculateDegrees(msg[7] & 0xFF, msg[8] & 0xFF, msg[9] & 0xFF);

            let upper = (msg[10] & 0xFF) << 4;
            let lower = (msg[11] & 0xF0) >> 4;
            this.altitude = (upper + lower) * 25 - 1000;

            this.miscInd = msg[11] & 0x0F;
            this.isAirborne = (msg[11] & 0x08) !== 0;
            this.isExtrapolated = (msg[11] & 0x04) !== 0;
            this.trackType = msg[11] & 0x03;

            this.nic = (msg[12] & 0xF0) >> 4;
            this.nacp = msg[12] & 0x0F;

            upper = (msg[13] & 0xFF) << 4;
            lower = (msg[14] & 0xF0) >> 4;
            this.horizVelocity = upper | lower;

            // Vertical velocity
            if ((msg[14] & 0x08) === 0) {
                this.vertVelocity = ((msg[14] & 0x0F) << 14) + ((msg[15] & 0xFF) << 6);
            } else if (msg[15] === 0) {
                this.vertVelocity = Number.MAX_SAFE_INTEGER;
            } else {
                this.vertVelocity = ((msg[14] & 0x0F) << 14) + ((msg[15] & 0xFF) << 6) - 0x40000;
            }

            this.heading = (msg[16] & 0xFF) * 360 / 256;
            this.emitCategory = msg[17] & 0xFF;

            // Callsign (8 bytes)
            const callsignBytes = msg.slice(18, 26);
            this.callSign = String.fromCharCode(...callsignBytes).trim();

            this.emergencyPriorityCode = (msg[26] & 0xF0) >> 4;
        }

        calculateDegrees(highByte, midByte, lowByte) {
            let position = (highByte << 16) | (midByte << 8) | lowByte;
            let xx;
            if ((position & 0x800000) !== 0) {
                position |= 0xFF000000;
                xx = position | 0;
                if (xx > 0x7FFFFFFF) xx -= 0x100000000;
            } else {
                xx = position & 0x7FFFFF;
            }
            return xx * Constants.LON_LAT_RESOLUTION;
        }
    }

    // ==================== FIS-B PRODUCTS ====================

    class TextProduct {
        constructor() {
            this.productType = ProductType.TEXT;
        }

        parse(msg) {
            this.text = '';
            this.parts = null;
            const len = msg.length;

            // Decode DLAC text: begins with @METAR, @TAF, @SPECI, @SUA, @PIREP, @WINDS
            for (let i = 0; i < (len - 3); i += 3) {
                this.text += dlacDecode(msg[i], msg[i + 1], msg[i + 2]);
            }

            this.text = dlacFormat(this.text);
            if (this.text) {
                this.parts = this.text.split(' ', 3);
            }
        }

        getHeader() {
            if (!this.parts || this.parts.length < 1) return '';
            return this.parts[0];
        }

        getLocation() {
            if (!this.parts || this.parts.length < 2) return '';
            return this.parts[1];
        }

        getData() {
            if (!this.parts || this.parts.length < 3) return '';
            return this.parts[2];
        }
    }

    class NexradProduct {
        constructor(isConus = false) {
            this.productType = isConus ? ProductType.NEXRAD_CONUS : ProductType.NEXRAD_REGIONAL;
            this.isConus = isConus;
            this.block = -1;
            this.data = null;
            this.empty = null;
        }

        static get INTENSITY() {
            return [
                0x00000000,
                0x00000000,
                0xFF007F00, // dark green
                0xFF00AF00, // light green
                0xFF00FF00, // lighter green
                0xFFFFFF00, // yellow
                0xFFFF7F00, // orange
                0xFFFF0000  // red
            ];
        }

        parse(msg) {
            const elementIdentifier = (msg[0] & 0x80) !== 0; // RLE or Empty?
            const len = msg.length;

            this.block = ((msg[0] & 0x0F) << 16) + ((msg[1] & 0xFF) << 8) + (msg[2] & 0xFF);

            let index = 3;

            if (elementIdentifier) {
                // RLE encoded data
                this.data = new Array(Constants.COLS_PER_BIN * Constants.ROWS_PER_BIN);
                this.empty = null;

                for (let i = 0; i < this.data.length; i++) {
                    this.data[i] = NexradProduct.INTENSITY[0];
                }

                let j = 0;
                while (index < len) {
                    const numberOfBins = ((msg[index] & 0xF8) >> 3) + 1;
                    for (let i = 0; i < numberOfBins; i++) {
                        if (j >= this.data.length) {
                            this.data = null;
                            return;
                        }
                        this.data[j] = NexradProduct.INTENSITY[msg[index] & 0x07];
                        j++;
                    }
                    index++;
                }
            } else {
                // Empty blocks list
                this.data = null;
                this.empty = [this.block];
                
                const bitmaplen = msg[index] & 0x0F;

                if ((msg[index] & 0x10) !== 0) this.empty.push(this.block + 1);
                if ((msg[index] & 0x20) !== 0) this.empty.push(this.block + 2);
                if ((msg[index] & 0x30) !== 0) this.empty.push(this.block + 3);
                if ((msg[index] & 0x40) !== 0) this.empty.push(this.block + 4);

                for (let i = 1; i < bitmaplen; i++) {
                    const b = msg[index + i];
                    if ((b & 0x01) !== 0) this.empty.push(this.block + i * 8 - 3);
                    if ((b & 0x02) !== 0) this.empty.push(this.block + i * 8 - 2);
                    if ((b & 0x04) !== 0) this.empty.push(this.block + i * 8 - 1);
                    if ((b & 0x08) !== 0) this.empty.push(this.block + i * 8);
                    if ((b & 0x10) !== 0) this.empty.push(this.block + i * 8 + 1);
                    if ((b & 0x20) !== 0) this.empty.push(this.block + i * 8 + 2);
                    if ((b & 0x40) !== 0) this.empty.push(this.block + i * 8 + 3);
                    if ((b & 0x80) !== 0) this.empty.push(this.block + i * 8 + 4);
                }
            }
        }
    }

    class GraphicsProduct {
        constructor(productType) {
            this.productType = productType;
            this.location = '';
            this.text = '';
            this.label = '';
            this.startTime = '';
            this.endTime = '';
            this.reportNumber = 0;
            this.coordinates = [];
            this.geometryType = ShapeType.NONE;
        }

        parseDate(b0, b1, b2, b3, format) {
            switch (format) {
                case 0: return '';
                case 1: return `${String(b0).padStart(2,'0')}-${String(b1).padStart(2,'0')}T${String(b2).padStart(2,'0')}:${String(b3).padStart(2,'0')}:00Z`;
                case 2: return `${String(b0).padStart(2,'0')}T${String(b1).padStart(2,'0')}:${String(b2).padStart(2,'0')}:00Z`;
                case 3: return `${String(b0).padStart(2,'0')}:${String(b1).padStart(2,'0')}:00Z`;
                default: return '';
            }
        }

        parseLatLon(lat, lon, alt = false) {
            const factor = alt ? 0.001373 : 0.000687;
            let latDeg = factor * lat;
            let lonDeg = factor * lon;
            if (latDeg > 90) latDeg -= 180;
            if (lonDeg > 180) lonDeg -= 360;
            return { lat: latDeg, lon: lonDeg, altitude: 0 };
        }

        parse(data) {
            const format = (data[0] & 0xF0) >> 4;
            const count = (data[1] & 0xF0) >> 4;
            
            if (count !== 1) return false;

            this.location = dlacFormat(dlacDecode(data[2], data[3], data[4]));

            if (format === 0) return false;

            if (format === 2) {
                // Unformatted DLAC text
                const length = ((data[6] & 0xFF) << 8) + (data[7] & 0xFF);
                if (data.length - length < 6) return false;

                this.reportNumber = ((data[8] & 0xFF) << 6) + ((data[9] & 0xFC) >> 2);
                const textLen = length - 5;

                this.text = '';
                for (let i = 0; i < (textLen - 3); i += 3) {
                    this.text += dlacDecode(data[i + 11], data[i + 12], data[i + 13]);
                }
                this.text = dlacFormat(this.text);
                return true;
            }

            if (format === 8) {
                // Graphical overlay
                let recordData = data.slice(6);

                this.reportNumber = ((recordData[1] & 0x3F) << 8) + (recordData[2] & 0xFF);

                const flag = recordData[4] & 0x01;
                if (flag === 0) {
                    this.label = String(((recordData[5] & 0xFF) << 8) + (recordData[6] & 0xFF));
                    recordData = recordData.slice(7);
                } else {
                    this.label = dlacFormat(
                        dlacDecode(recordData[5], recordData[6], recordData[7]) +
                        dlacDecode(recordData[8], recordData[9], recordData[10]) +
                        dlacDecode(recordData[11], recordData[12], recordData[13])
                    );
                    recordData = recordData.slice(14);
                }

                const flag2 = (recordData[0] & 0x40) >> 6;
                recordData = recordData.slice(flag2 === 0 ? 2 : 5);

                const applicabilityOptions = (recordData[0] & 0xC0) >> 6;
                const dtFormat = (recordData[0] & 0x30) >> 4;
                this.geometryType = recordData[0] & 0x0F;
                const overlayVerticesCount = (recordData[1] & 0x3F) + 1;

                // Parse dates based on applicability
                switch (applicabilityOptions) {
                    case 0:
                        recordData = recordData.slice(2);
                        break;
                    case 1:
                        this.startTime = this.parseDate(recordData[2], recordData[3], recordData[4], recordData[5], dtFormat);
                        recordData = recordData.slice(6);
                        break;
                    case 2:
                        this.endTime = this.parseDate(recordData[2], recordData[3], recordData[4], recordData[5], dtFormat);
                        recordData = recordData.slice(6);
                        break;
                    case 3:
                        this.startTime = this.parseDate(recordData[2], recordData[3], recordData[4], recordData[5], dtFormat);
                        this.endTime = this.parseDate(recordData[6], recordData[7], recordData[8], recordData[9], dtFormat);
                        recordData = recordData.slice(10);
                        break;
                }

                // Parse vertices
                this.coordinates = [];
                
                switch (this.geometryType) {
                    case ShapeType.POLYGON_MSL:
                        for (let i = 0; i < overlayVerticesCount; i++) {
                            const lon = ((recordData[6*i] & 0xFF) << 11) +
                                       ((recordData[6*i+1] & 0xFF) << 3) +
                                       ((recordData[6*i+2] & 0xE0) >> 5);
                            const lat = ((recordData[6*i+2] & 0x1F) << 14) +
                                       ((recordData[6*i+3] & 0xFF) << 6) +
                                       ((recordData[6*i+4] & 0xFC) >> 2);
                            const alt = ((recordData[6*i+4] & 0x03) << 8) +
                                       (recordData[6*i+5] & 0xFF);

                            const coord = this.parseLatLon(lat, lon, false);
                            coord.altitude = alt * 100;
                            this.coordinates.push(coord);
                        }
                        break;

                    case ShapeType.POINT3D_AGL:
                        if (recordData.length >= 6) {
                            const lon = ((recordData[0] & 0xFF) << 11) +
                                       ((recordData[1] & 0xFF) << 3) +
                                       ((recordData[2] & 0xE0) >> 5);
                            const lat = ((recordData[2] & 0x1F) << 14) +
                                       ((recordData[3] & 0xFF) << 6) +
                                       ((recordData[4] & 0xFC) >> 2);
                            const alt = ((recordData[4] & 0x03) << 8) +
                                       (recordData[5] & 0xFF);

                            const coord = this.parseLatLon(lat, lon, false);
                            coord.altitude = alt * 100;
                            this.coordinates.push(coord);
                        }
                        break;

                    case ShapeType.PRISM_MSL:
                    case ShapeType.PRISM_AGL:
                        if (recordData.length >= 14) {
                            // Parse prism data (circular area with altitude bounds)
                            const bottomLon = ((recordData[0] & 0xFF) << 10) + ((recordData[1] & 0xFF) << 2) + ((recordData[2] & 0xC0) >> 6);
                            const bottomLat = ((recordData[2] & 0x3F) << 10) + ((recordData[3] & 0xFF) << 4) + ((recordData[4] & 0xF0) >> 4);
                            const topLon = ((recordData[4] & 0x0F) << 14) + ((recordData[5] & 0xFF) << 6) + ((recordData[6] & 0xFC) >> 2);
                            const topLat = ((recordData[6] & 0x03) << 16) + ((recordData[7] & 0xFF) << 8) + (recordData[8] & 0xFF);
                            const bottomAlt = (recordData[9] & 0xFE) >> 1;
                            const topAlt = ((recordData[9] & 0x01) << 6) + ((recordData[10] & 0xFC) >> 2);
                            const rLon = (((recordData[10] & 0x03) << 7) + ((recordData[11] & 0xFE) >> 1)) * 0.2;
                            const rLat = (((recordData[11] & 0x01) << 8) + (recordData[12] & 0xFF)) * 0.2;

                            const bottom = this.parseLatLon(bottomLat, bottomLon, true);
                            bottom.altitude = bottomAlt * 5;
                            
                            const top = this.parseLatLon(topLat, topLon, true);
                            top.altitude = topAlt * 500;

                            this.coordinates.push(top);
                            this.coordinates.push(bottom);
                            this.coordinates.push({ lon: rLon, lat: rLat, altitude: recordData[13] & 0xFF }); // Radius info
                        }
                        break;
                }
                return true;
            }

            return false;
        }

        getShapeString() {
            switch (this.geometryType) {
                case ShapeType.POINT3D_AGL: return 'point';
                case ShapeType.POLYGON_MSL: return 'polygon';
                case ShapeType.PRISM_MSL: return 'prism.msl';
                case ShapeType.PRISM_AGL: return 'prism';
                default: return '';
            }
        }
    }

    // ==================== PRODUCT FACTORY ====================
    function buildProduct(bufin) {
        const s = new BitInputStream(bufin);

        const flagAppMethod = s.getBits(1) !== 0;
        const flagGeoLocator = s.getBits(1) !== 0;
        s.getBits(1); // Provider spec flag, discard

        const productID = s.getBits(11);

        if (flagAppMethod) s.getBits(8);
        if (flagGeoLocator) s.getBits(20);

        const segFlag = s.getBits(1) !== 0;
        const timeOpts = s.getBits(2);

        // Parse time
        let month = -1, day = -1, hours = -1, mins = -1, secs = -1;
        if ((timeOpts & 0x02) !== 0) {
            month = s.getBits(4);
            day = s.getBits(5);
        }
        hours = s.getBits(5);
        mins = s.getBits(6);
        if ((timeOpts & 0x01) !== 0) {
            secs = s.getBits(6);
        }

        if (segFlag) return null; // Segmented messages not implemented

        const totalRead = s.totalRead();
        const length = bufin.length - totalRead;
        const data = bufin.slice(totalRead);

        let product = null;

        switch (productID) {
            case 8:  // NOTAMs
            case 11: // AIRMET
            case 12: // SIGMET
            case 13: // SUA
                product = new GraphicsProduct(productID);
                break;
            case 63: // NEXRAD Regional
                product = new NexradProduct(false);
                break;
            case 64: // NEXRAD CONUS
                product = new NexradProduct(true);
                break;
            case 413: // Text (METAR, TAF, etc.)
                product = new TextProduct();
                break;
            default:
                return null;
        }

        if (product) {
            product.parse(data);
            product.time = { month, day, hours, mins, secs };
        }

        return product;
    }

    // ==================== FIS BUFFER (Frame Parser) ====================
    class FisBuffer {
        constructor(buffer, offset) {
            this.size = buffer.length - offset;
            if (this.size <= 0) {
                this.products = [];
                return;
            }
            this.buffer = buffer.slice(offset);
            this.products = [];
        }

        makeProducts() {
            let i = 0;
            while (i < (this.size - 1)) {
                let iFrameLength = (this.buffer[i] & 0xFF) << 1;
                iFrameLength += (this.buffer[i + 1] & 0x80) >> 7;

                if (iFrameLength === 0) break;

                const frameType = this.buffer[i + 1] & 0x0F;

                if ((i + 2 + iFrameLength) > this.size || frameType !== 0) break;

                const frameData = this.buffer.slice(i + 2, i + 2 + iFrameLength);

                try {
                    const product = buildProduct(frameData);
                    if (product) {
                        this.products.push(product);
                    }
                } catch (e) {
                    console.warn('Error parsing FIS-B product:', e);
                }

                i += iFrameLength + 2;
            }
        }
    }

    // ==================== UPLINK MESSAGE ====================
    class UplinkMessage {
        constructor() {
            this.type = MessageType.UPLINK;
            this.time = Date.now();
            this.products = [];
        }

        parse(msg) {
            const skip = 3; // First 3 bytes are Zulu time
            
            // Parse position from UAT header
            let lat = ((msg[skip] & 0xFF) << 16) + ((msg[skip + 1] & 0xFF) << 8) + (msg[skip + 2] & 0xFE);
            lat >>= 1;
            const isSouth = (lat & 0x800000) !== 0;
            this.lat = lat * Constants.LON_LAT_RESOLUTION * (isSouth ? -1 : 1);

            let lon = ((msg[skip + 3] & 0xFF) << 16) + ((msg[skip + 4] & 0xFF) << 8) + (msg[skip + 5] & 0xFE);
            lon >>= 1;
            if ((msg[skip + 2] & 0x01) !== 0) lon += 0x800000;
            const isWest = (lon & 0x800000) !== 0;
            this.lon = (lon & 0x7fffff) * Constants.LON_LAT_RESOLUTION;
            if (isWest) this.lon = -1 * (180 - this.lon);

            this.positionValid = (msg[skip + 5] & 0x01) !== 0;
            const applicationDataValid = (msg[skip + 6] & 0x20) !== 0;
            
            if (!applicationDataValid) return;

            this.slotId = msg[skip + 6] & 0x1F;
            this.tisbSiteId = (msg[skip + 7] & 0xF0) >> 4;

            // Parse FIS-B products
            const fisBuffer = new FisBuffer(msg, skip + 8);
            fisBuffer.makeProducts();
            this.products = fisBuffer.products;
        }
    }

    // ==================== MESSAGE FACTORY ====================
    function processMessage(msg) {
        const len = msg.length;

        // Strip flag bytes 0x7E
        if (len < 5) return null;
        
        const stripped = msg.slice(1, len - 1);

        // Process escape sequences and check CRC
        let length = 0;
        const msgCrc = new Uint8Array(stripped.length);
        
        for (let i = 0; i < stripped.length; i++) {
            if (stripped[i] === 0x7D) {
                i++;
                if (i >= stripped.length) break;
                msgCrc[length] = stripped[i] ^ 0x20;
            } else {
                msgCrc[length] = stripped[i];
            }
            length++;
        }

        if (length < 2) return null;

        // Check CRC
        const msb = msgCrc[length - 1] & 0xFF;
        const lsb = msgCrc[length - 2] & 0xFF;
        const inCrc = (msb << 8) + lsb;
        
        if (!checkCrc(msgCrc, length - 2, inCrc)) {
            return null;
        }

        // Extract message type and data
        const type = msgCrc[0] & 0xFF;
        const data = msgCrc.slice(1, length - 2);

        let message = null;

        switch (type) {
            case MessageType.HEARTBEAT:
                message = new HeartbeatMessage();
                break;
            case MessageType.UPLINK:
                message = new UplinkMessage();
                break;
            case MessageType.OWNSHIP:
                message = new OwnshipMessage();
                break;
            case MessageType.TRAFFIC_REPORT:
                message = new TrafficReportMessage();
                break;
            default:
                return null;
        }

        if (message) {
            message.parse(data);
        }

        return message;
    }

    // ==================== WEATHER CACHE ====================
    class WeatherCache {
        constructor() {
            this.metars = new Map();      // station -> { raw, time, decoded }
            this.tafs = new Map();        // station -> { raw, time }
            this.pireps = new Map();      // id -> { raw, time, location }
            this.winds = new Map();       // location -> { raw, time }
            this.airmets = new Map();     // id -> { text, coordinates, time }
            this.sigmets = new Map();     // id -> { text, coordinates, time }
            this.notams = new Map();      // id -> { text, location, time }
            this.tfrs = new Map();        // id -> { coordinates, time }
            this.nexrad = new Map();      // block -> { data, time, isConus }
            
            this.lastUpdate = null;
            this.expiryMinutes = 60;      // Default expiry
        }

        processProducts(products) {
            const now = Date.now();
            
            for (const product of products) {
                if (product instanceof TextProduct) {
                    const header = product.getHeader();
                    const location = product.getLocation();
                    const data = product.getData();

                    if (header === '@METAR' || header === '@SPECI') {
                        this.metars.set(location, {
                            raw: `${location} ${data}`,
                            time: now,
                            type: header === '@SPECI' ? 'SPECI' : 'METAR'
                        });
                    } else if (header === '@TAF') {
                        this.tafs.set(location, { raw: `${location} ${data}`, time: now });
                    } else if (header === '@PIREP') {
                        const id = `${location}-${now}`;
                        this.pireps.set(id, { raw: data, location, time: now });
                    } else if (header === '@WINDS') {
                        this.winds.set(location, { raw: data, time: now });
                    }
                } else if (product instanceof GraphicsProduct) {
                    const id = `${product.reportNumber}-${product.location}`;
                    const entry = {
                        text: product.text,
                        label: product.label,
                        location: product.location,
                        coordinates: product.coordinates,
                        startTime: product.startTime,
                        endTime: product.endTime,
                        shape: product.getShapeString(),
                        time: now
                    };

                    switch (product.productType) {
                        case ProductType.NOTAMS:
                            this.notams.set(id, entry);
                            break;
                        case ProductType.AIRMET:
                            this.airmets.set(id, entry);
                            break;
                        case ProductType.SIGMET:
                            this.sigmets.set(id, entry);
                            break;
                        case ProductType.SUA:
                            this.tfrs.set(id, entry);
                            break;
                    }
                } else if (product instanceof NexradProduct) {
                    if (product.block >= 0) {
                        this.nexrad.set(product.block, {
                            data: product.data,
                            empty: product.empty,
                            isConus: product.isConus,
                            time: now
                        });
                    }
                }
            }

            this.lastUpdate = now;
            this.pruneExpired();
        }

        pruneExpired() {
            const now = Date.now();
            const expiryMs = this.expiryMinutes * 60 * 1000;

            const prune = (map) => {
                for (const [key, value] of map) {
                    if (now - value.time > expiryMs) {
                        map.delete(key);
                    }
                }
            };

            prune(this.metars);
            prune(this.tafs);
            prune(this.pireps);
            prune(this.winds);
            prune(this.airmets);
            prune(this.sigmets);
            prune(this.notams);
            prune(this.tfrs);
            prune(this.nexrad);
        }

        getMetar(station) {
            return this.metars.get(station.toUpperCase());
        }

        getTaf(station) {
            return this.tafs.get(station.toUpperCase());
        }

        getAllMetars() {
            return Array.from(this.metars.entries()).map(([station, data]) => ({
                station,
                ...data
            }));
        }

        getAllTafs() {
            return Array.from(this.tafs.entries()).map(([station, data]) => ({
                station,
                ...data
            }));
        }

        getActiveNotams() {
            return Array.from(this.notams.values());
        }

        getActiveAirmets() {
            return Array.from(this.airmets.values());
        }

        getActiveSigmets() {
            return Array.from(this.sigmets.values());
        }

        getStatus() {
            return {
                metars: this.metars.size,
                tafs: this.tafs.size,
                pireps: this.pireps.size,
                winds: this.winds.size,
                airmets: this.airmets.size,
                sigmets: this.sigmets.size,
                notams: this.notams.size,
                tfrs: this.tfrs.size,
                nexradBlocks: this.nexrad.size,
                lastUpdate: this.lastUpdate
            };
        }
    }

    // ==================== GDL90 RECEIVER ====================
    class GDL90Receiver {
        constructor(options = {}) {
            this.dataBuffer = new DataBuffer(16384);
            this.weatherCache = new WeatherCache();
            this.trafficCache = new Map();
            this.ownship = null;
            this.heartbeat = null;
            
            this.onMessage = options.onMessage || null;
            this.onWeather = options.onWeather || null;
            this.onTraffic = options.onTraffic || null;
            this.onOwnship = options.onOwnship || null;
            this.onHeartbeat = options.onHeartbeat || null;
            this.onError = options.onError || null;

            this.stats = {
                messagesReceived: 0,
                messagesParsed: 0,
                crcErrors: 0,
                weatherProducts: 0
            };
        }

        /**
         * Feed raw bytes from GDL90 stream
         * @param {Uint8Array} data - Raw bytes
         */
        feed(data) {
            this.dataBuffer.put(data, data.length);

            let frame;
            while ((frame = this.dataBuffer.get()) !== null) {
                this.stats.messagesReceived++;
                this.processFrame(frame);
            }
        }

        processFrame(frame) {
            try {
                const message = processMessage(frame);
                if (!message) {
                    this.stats.crcErrors++;
                    return;
                }

                this.stats.messagesParsed++;

                if (this.onMessage) {
                    this.onMessage(message);
                }

                if (message instanceof HeartbeatMessage) {
                    this.heartbeat = message;
                    if (this.onHeartbeat) this.onHeartbeat(message);
                } else if (message instanceof OwnshipMessage) {
                    this.ownship = message;
                    if (this.onOwnship) this.onOwnship(message);
                } else if (message instanceof TrafficReportMessage) {
                    this.trafficCache.set(message.icaoAddress, message);
                    if (this.onTraffic) this.onTraffic(message);
                } else if (message instanceof UplinkMessage) {
                    if (message.products && message.products.length > 0) {
                        this.stats.weatherProducts += message.products.length;
                        this.weatherCache.processProducts(message.products);
                        if (this.onWeather) this.onWeather(message.products);
                    }
                }
            } catch (e) {
                if (this.onError) this.onError(e);
            }
        }

        getWeatherCache() {
            return this.weatherCache;
        }

        getTraffic() {
            return Array.from(this.trafficCache.values());
        }

        getOwnship() {
            return this.ownship;
        }

        getStats() {
            return {
                ...this.stats,
                weather: this.weatherCache.getStatus()
            };
        }

        reset() {
            this.dataBuffer.flush();
            this.trafficCache.clear();
            this.ownship = null;
            this.heartbeat = null;
        }
    }

    // ==================== PUBLIC API ====================
    return {
        // Classes
        GDL90Receiver,
        WeatherCache,
        DataBuffer,
        
        // Message types
        MessageType,
        ProductType,
        ShapeType,
        
        // Constants
        Constants,
        
        // Utility functions
        dlacDecode,
        dlacFormat,
        checkCrc,
        
        // Low-level message processing
        processMessage,
        buildProduct,

        // Version
        VERSION: '1.0.0'
    };
})();

// Export for Node.js / module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MATGDL90;
}
