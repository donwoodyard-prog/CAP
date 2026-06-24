/**
 * MAT GDL90 Connection Manager
 * 
 * Handles connections to GDL90 data sources:
 * - WebSocket connections (for Stratux-style WiFi devices)
 * - Web Bluetooth Serial (for Bluetooth ADS-B receivers)
 * - File input (for testing with recorded data)
 * 
 * Note: Browser security restrictions limit direct UDP access.
 * Most GDL90 devices expose data via WiFi which can be proxied through WebSocket.
 */

const MATGDL90Connection = (function() {
    'use strict';

    // Connection states
    const ConnectionState = {
        DISCONNECTED: 'disconnected',
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        ERROR: 'error'
    };

    /**
     * WebSocket connection to GDL90 proxy server
     * Stratux exposes WebSocket at ws://192.168.10.1/traffic or similar
     */
    class WebSocketConnection {
        constructor(receiver, options = {}) {
            this.receiver = receiver;
            this.url = options.url || 'ws://192.168.10.1:4000';
            this.reconnect = options.reconnect !== false;
            this.reconnectInterval = options.reconnectInterval || 5000;
            this.ws = null;
            this.state = ConnectionState.DISCONNECTED;
            this.onStateChange = options.onStateChange || null;
        }

        connect() {
            if (this.ws) {
                this.disconnect();
            }

            this.setState(ConnectionState.CONNECTING);

            try {
                this.ws = new WebSocket(this.url);
                this.ws.binaryType = 'arraybuffer';

                this.ws.onopen = () => {
                    this.setState(ConnectionState.CONNECTED);
                    console.log('GDL90 WebSocket connected');
                };

                this.ws.onmessage = (event) => {
                    if (event.data instanceof ArrayBuffer) {
                        const data = new Uint8Array(event.data);
                        this.receiver.feed(data);
                    }
                };

                this.ws.onclose = () => {
                    this.setState(ConnectionState.DISCONNECTED);
                    if (this.reconnect) {
                        setTimeout(() => this.connect(), this.reconnectInterval);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('GDL90 WebSocket error:', error);
                    this.setState(ConnectionState.ERROR);
                };
            } catch (e) {
                console.error('Failed to create WebSocket:', e);
                this.setState(ConnectionState.ERROR);
            }
        }

        disconnect() {
            this.reconnect = false;
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            this.setState(ConnectionState.DISCONNECTED);
        }

        setState(state) {
            this.state = state;
            if (this.onStateChange) {
                this.onStateChange(state);
            }
        }

        getState() {
            return this.state;
        }
    }

    /**
     * Web Bluetooth Serial connection
     * For Bluetooth-enabled ADS-B receivers
     */
    class BluetoothConnection {
        constructor(receiver, options = {}) {
            this.receiver = receiver;
            this.device = null;
            this.characteristic = null;
            this.state = ConnectionState.DISCONNECTED;
            this.onStateChange = options.onStateChange || null;
            
            // Standard Serial Port Profile UUIDs
            this.serviceUUID = options.serviceUUID || '00001101-0000-1000-8000-00805f9b34fb';
        }

        async connect() {
            if (!navigator.bluetooth) {
                throw new Error('Web Bluetooth not supported in this browser');
            }

            this.setState(ConnectionState.CONNECTING);

            try {
                this.device = await navigator.bluetooth.requestDevice({
                    filters: [{ services: [this.serviceUUID] }],
                    optionalServices: ['battery_service']
                });

                this.device.addEventListener('gattserverdisconnected', () => {
                    this.setState(ConnectionState.DISCONNECTED);
                });

                const server = await this.device.gatt.connect();
                const service = await server.getPrimaryService(this.serviceUUID);
                
                // Find the characteristic that provides data
                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                    if (char.properties.notify || char.properties.read) {
                        this.characteristic = char;
                        break;
                    }
                }

                if (this.characteristic && this.characteristic.properties.notify) {
                    await this.characteristic.startNotifications();
                    this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
                        const value = event.target.value;
                        const data = new Uint8Array(value.buffer);
                        this.receiver.feed(data);
                    });
                }

                this.setState(ConnectionState.CONNECTED);
            } catch (e) {
                console.error('Bluetooth connection error:', e);
                this.setState(ConnectionState.ERROR);
                throw e;
            }
        }

        disconnect() {
            if (this.device && this.device.gatt.connected) {
                this.device.gatt.disconnect();
            }
            this.setState(ConnectionState.DISCONNECTED);
        }

        setState(state) {
            this.state = state;
            if (this.onStateChange) {
                this.onStateChange(state);
            }
        }

        getState() {
            return this.state;
        }
    }

    /**
     * File-based data source for testing
     * Reads recorded GDL90 data from a file
     */
    class FileDataSource {
        constructor(receiver) {
            this.receiver = receiver;
        }

        /**
         * Process a file containing GDL90 binary data
         * @param {File} file - File object from input element
         */
        async processFile(file) {
            const buffer = await file.arrayBuffer();
            const data = new Uint8Array(buffer);
            this.receiver.feed(data);
        }

        /**
         * Process hex-encoded GDL90 data (for testing)
         * @param {string} hexString - Hex-encoded GDL90 frames
         */
        processHex(hexString) {
            const hex = hexString.replace(/\s/g, '');
            const data = new Uint8Array(hex.length / 2);
            for (let i = 0; i < hex.length; i += 2) {
                data[i / 2] = parseInt(hex.substr(i, 2), 16);
            }
            this.receiver.feed(data);
        }

        /**
         * Simulate receiving data packets over time
         * @param {Uint8Array} data - Full data buffer
         * @param {number} chunkSize - Bytes per chunk
         * @param {number} interval - Ms between chunks
         */
        simulateStream(data, chunkSize = 100, interval = 50) {
            let offset = 0;
            const timer = setInterval(() => {
                if (offset >= data.length) {
                    clearInterval(timer);
                    return;
                }
                const end = Math.min(offset + chunkSize, data.length);
                const chunk = data.slice(offset, end);
                this.receiver.feed(chunk);
                offset = end;
            }, interval);
        }
    }

    /**
     * Stratux-specific connection
     * Stratux has a known API at 192.168.10.1
     */
    class StratuxConnection {
        constructor(receiver, options = {}) {
            this.receiver = receiver;
            this.host = options.host || '192.168.10.1';
            this.state = ConnectionState.DISCONNECTED;
            this.onStateChange = options.onStateChange || null;
            this.ws = null;
            this.statusInterval = null;
        }

        async connect() {
            this.setState(ConnectionState.CONNECTING);

            // First check if Stratux is reachable
            try {
                const statusResponse = await fetch(`http://${this.host}/getStatus`, {
                    mode: 'cors',
                    timeout: 5000
                });
                const status = await statusResponse.json();
                console.log('Stratux status:', status);
            } catch (e) {
                console.warn('Could not fetch Stratux status (may still work):', e);
            }

            // Connect to the GDL90 WebSocket
            // Stratux typically uses port 4000 for raw GDL90
            this.ws = new WebSocket(`ws://${this.host}:4000/`);
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                this.setState(ConnectionState.CONNECTED);
                // Start periodic status checks
                this.statusInterval = setInterval(() => this.checkStatus(), 30000);
            };

            this.ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    const data = new Uint8Array(event.data);
                    this.receiver.feed(data);
                }
            };

            this.ws.onclose = () => {
                this.setState(ConnectionState.DISCONNECTED);
                if (this.statusInterval) {
                    clearInterval(this.statusInterval);
                }
            };

            this.ws.onerror = (error) => {
                console.error('Stratux WebSocket error:', error);
                this.setState(ConnectionState.ERROR);
            };
        }

        async checkStatus() {
            try {
                const response = await fetch(`http://${this.host}/getStatus`);
                return await response.json();
            } catch (e) {
                return null;
            }
        }

        async getSituation() {
            try {
                const response = await fetch(`http://${this.host}/getSituation`);
                return await response.json();
            } catch (e) {
                return null;
            }
        }

        disconnect() {
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            if (this.statusInterval) {
                clearInterval(this.statusInterval);
            }
            this.setState(ConnectionState.DISCONNECTED);
        }

        setState(state) {
            this.state = state;
            if (this.onStateChange) {
                this.onStateChange(state);
            }
        }

        getState() {
            return this.state;
        }
    }

    return {
        ConnectionState,
        WebSocketConnection,
        BluetoothConnection,
        FileDataSource,
        StratuxConnection
    };
})();

// Export for Node.js / module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MATGDL90Connection;
}
