/**
 * MAT GDL90 Bluetooth Serial Connection
 * 
 * Connects to Bluetooth SPP (Serial Port Profile) ADS-B receivers like:
 * - Garmin GDL 50/52
 * - Dual XGPS 170
 * - Bad Elf GPS Pro+
 * - Other Bluetooth SPP GPS/ADS-B devices
 * 
 * Uses Web Serial API for serial communication.
 * Note: Web Bluetooth API alone cannot access SPP - it only supports BLE GATT.
 * 
 * Browser Support:
 * - Chrome/Edge 89+ on Windows, macOS, Linux, ChromeOS
 * - Chrome on Android (limited)
 * - NOT supported: Safari, Firefox, iOS
 * 
 * @author MAT Project
 * @license BSD-2-Clause (following Avare's license)
 */

const MATGDL90Bluetooth = (function() {
    'use strict';

    // Connection states
    const ConnectionState = {
        DISCONNECTED: 'disconnected',
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        READING: 'reading',
        ERROR: 'error'
    };

    // Well-known Bluetooth SPP UUID (same as Avare uses)
    const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';

    // Common ADS-B device Bluetooth names for filtering
    const KNOWN_DEVICE_NAMES = [
        'GDL 50',
        'GDL 52',
        'GDL 39',
        'Stratus',
        'XGPS',
        'Bad Elf',
        'Dual GPS',
        'SkyRadar',
        'iLevil',
        'Sentry',
        'Scout',
        'echoUAT',
        'Stratux'
    ];

    /**
     * Check if Web Serial API is available
     */
    function isWebSerialSupported() {
        return 'serial' in navigator;
    }

    /**
     * Check if Web Bluetooth API is available
     */
    function isWebBluetoothSupported() {
        return 'bluetooth' in navigator;
    }

    /**
     * Bluetooth Serial Port Profile (SPP) Connection
     * 
     * This class handles connection to classic Bluetooth SPP devices.
     * It uses the Web Serial API which can enumerate Bluetooth serial ports
     * on supported platforms.
     */
    class BluetoothSPPConnection {
        constructor(receiver, options = {}) {
            this.receiver = receiver;
            this.port = null;
            this.reader = null;
            this.readableStreamClosed = null;
            this.keepReading = false;
            this.state = ConnectionState.DISCONNECTED;
            this.onStateChange = options.onStateChange || null;
            this.onError = options.onError || null;
            this.deviceInfo = null;
            
            // Buffer for accumulating data
            this.buffer = new Uint8Array(8192);
            this.bufferOffset = 0;
            
            // Statistics
            this.stats = {
                bytesReceived: 0,
                packetsReceived: 0,
                errors: 0,
                lastDataTime: null,
                connectedAt: null
            };
        }

        /**
         * Check browser support
         */
        static isSupported() {
            return isWebSerialSupported();
        }

        /**
         * Get list of available serial ports (requires prior permission)
         */
        async getAvailablePorts() {
            if (!isWebSerialSupported()) {
                throw new Error('Web Serial API not supported');
            }
            return await navigator.serial.getPorts();
        }

        /**
         * Request user to select a Bluetooth serial device
         * Opens browser's device picker dialog
         */
        async requestDevice() {
            if (!isWebSerialSupported()) {
                throw new Error('Web Serial API not supported in this browser. Use Chrome or Edge.');
            }

            this.setState(ConnectionState.CONNECTING);

            try {
                // Request a serial port - browser will show picker
                // On systems with Bluetooth serial, paired BT devices appear here
                this.port = await navigator.serial.requestPort({
                    // We can't filter by Bluetooth specifically, but we can hint
                    // The user will see all available serial ports including BT
                });

                // Get port info if available
                const info = this.port.getInfo();
                this.deviceInfo = {
                    usbVendorId: info.usbVendorId,
                    usbProductId: info.usbProductId,
                    // Bluetooth devices won't have USB IDs
                    isBluetooth: !info.usbVendorId
                };

                console.log('Selected port:', this.deviceInfo);
                return this.port;

            } catch (e) {
                this.setState(ConnectionState.DISCONNECTED);
                if (e.name === 'NotFoundError') {
                    throw new Error('No device selected');
                }
                throw e;
            }
        }

        /**
         * Connect to the selected device and start reading
         */
        async connect(options = {}) {
            if (!this.port) {
                await this.requestDevice();
            }

            const baudRate = options.baudRate || 9600; // GDL90 typically uses 9600
            const dataBits = options.dataBits || 8;
            const stopBits = options.stopBits || 1;
            const parity = options.parity || 'none';
            const bufferSize = options.bufferSize || 8192;

            try {
                await this.port.open({
                    baudRate,
                    dataBits,
                    stopBits,
                    parity,
                    bufferSize,
                    flowControl: 'none'
                });

                this.stats.connectedAt = new Date();
                this.setState(ConnectionState.CONNECTED);
                console.log(`Connected at ${baudRate} baud`);

                // Start reading
                this.startReading();

            } catch (e) {
                console.error('Failed to open port:', e);
                this.setState(ConnectionState.ERROR);
                if (this.onError) this.onError(e);
                throw e;
            }
        }

        /**
         * Start reading data from the serial port
         */
        async startReading() {
            if (!this.port || !this.port.readable) {
                console.error('Port not open');
                return;
            }

            this.keepReading = true;
            this.setState(ConnectionState.READING);

            while (this.port.readable && this.keepReading) {
                this.reader = this.port.readable.getReader();

                try {
                    while (this.keepReading) {
                        const { value, done } = await this.reader.read();

                        if (done) {
                            console.log('Reader done signal received');
                            break;
                        }

                        if (value) {
                            this.processData(value);
                        }
                    }
                } catch (e) {
                    console.error('Read error:', e);
                    this.stats.errors++;
                    if (this.onError) this.onError(e);
                } finally {
                    this.reader.releaseLock();
                }
            }

            this.setState(ConnectionState.CONNECTED);
        }

        /**
         * Process received data and feed to GDL90 receiver
         */
        processData(data) {
            this.stats.bytesReceived += data.length;
            this.stats.lastDataTime = new Date();

            // Feed directly to the GDL90 receiver
            // The receiver handles frame assembly
            if (this.receiver) {
                this.receiver.feed(data);
            }

            this.stats.packetsReceived++;
        }

        /**
         * Stop reading and disconnect
         */
        async disconnect() {
            this.keepReading = false;

            if (this.reader) {
                try {
                    await this.reader.cancel();
                } catch (e) {
                    // Ignore cancel errors
                }
                this.reader = null;
            }

            if (this.port) {
                try {
                    await this.port.close();
                } catch (e) {
                    console.warn('Error closing port:', e);
                }
                this.port = null;
            }

            this.setState(ConnectionState.DISCONNECTED);
            console.log('Disconnected');
        }

        /**
         * Set connection state and notify callback
         */
        setState(state) {
            const previousState = this.state;
            this.state = state;
            if (this.onStateChange && previousState !== state) {
                this.onStateChange(state, previousState);
            }
        }

        /**
         * Get current connection state
         */
        getState() {
            return this.state;
        }

        /**
         * Get connection statistics
         */
        getStats() {
            return {
                ...this.stats,
                uptime: this.stats.connectedAt 
                    ? Date.now() - this.stats.connectedAt.getTime() 
                    : 0
            };
        }

        /**
         * Check if currently connected
         */
        isConnected() {
            return this.state === ConnectionState.CONNECTED || 
                   this.state === ConnectionState.READING;
        }
    }

    /**
     * Bluetooth Low Energy (BLE) Connection
     * 
     * For BLE-based ADS-B devices that use GATT characteristics.
     * Some newer devices use BLE instead of classic Bluetooth SPP.
     * 
     * Known BLE ADS-B devices:
     * - Some Sentry models
     * - Some newer portable receivers
     */
    class BluetoothBLEConnection {
        constructor(receiver, options = {}) {
            this.receiver = receiver;
            this.device = null;
            this.server = null;
            this.characteristic = null;
            this.state = ConnectionState.DISCONNECTED;
            this.onStateChange = options.onStateChange || null;
            this.onError = options.onError || null;

            // Common UUIDs - may need adjustment per device
            this.serviceUUID = options.serviceUUID || 'generic_access';
            this.characteristicUUID = options.characteristicUUID || null;

            // Statistics
            this.stats = {
                bytesReceived: 0,
                notificationsReceived: 0,
                errors: 0,
                lastDataTime: null,
                connectedAt: null
            };
        }

        /**
         * Check browser support
         */
        static isSupported() {
            return isWebBluetoothSupported();
        }

        /**
         * Request user to select a BLE device
         */
        async requestDevice() {
            if (!isWebBluetoothSupported()) {
                throw new Error('Web Bluetooth API not supported in this browser');
            }

            this.setState(ConnectionState.CONNECTING);

            try {
                // Request device with filters for known ADS-B devices
                this.device = await navigator.bluetooth.requestDevice({
                    // Accept any device and let user choose
                    acceptAllDevices: true,
                    optionalServices: [
                        'generic_access',
                        'device_information',
                        'battery_service',
                        // Add known ADS-B service UUIDs here
                        '00001101-0000-1000-8000-00805f9b34fb', // SPP
                    ]
                });

                console.log('Selected BLE device:', this.device.name);

                // Listen for disconnection
                this.device.addEventListener('gattserverdisconnected', () => {
                    console.log('BLE device disconnected');
                    this.setState(ConnectionState.DISCONNECTED);
                });

                return this.device;

            } catch (e) {
                this.setState(ConnectionState.DISCONNECTED);
                throw e;
            }
        }

        /**
         * Connect to the selected BLE device
         */
        async connect() {
            if (!this.device) {
                await this.requestDevice();
            }

            try {
                console.log('Connecting to GATT server...');
                this.server = await this.device.gatt.connect();

                console.log('Getting services...');
                const services = await this.server.getPrimaryServices();
                console.log('Found services:', services.map(s => s.uuid));

                // Find a service with notify characteristics
                for (const service of services) {
                    try {
                        const characteristics = await service.getCharacteristics();
                        for (const char of characteristics) {
                            if (char.properties.notify) {
                                console.log('Found notify characteristic:', char.uuid);
                                this.characteristic = char;
                                await this.startNotifications();
                                break;
                            }
                        }
                        if (this.characteristic) break;
                    } catch (e) {
                        // Some services may not allow characteristic enumeration
                        continue;
                    }
                }

                if (!this.characteristic) {
                    throw new Error('No suitable characteristic found on device');
                }

                this.stats.connectedAt = new Date();
                this.setState(ConnectionState.CONNECTED);

            } catch (e) {
                console.error('BLE connection error:', e);
                this.setState(ConnectionState.ERROR);
                if (this.onError) this.onError(e);
                throw e;
            }
        }

        /**
         * Start notifications from the characteristic
         */
        async startNotifications() {
            if (!this.characteristic) return;

            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleNotification(event);
            });

            this.setState(ConnectionState.READING);
            console.log('Started BLE notifications');
        }

        /**
         * Handle incoming BLE notification
         */
        handleNotification(event) {
            const value = event.target.value;
            const data = new Uint8Array(value.buffer);

            this.stats.bytesReceived += data.length;
            this.stats.notificationsReceived++;
            this.stats.lastDataTime = new Date();

            if (this.receiver) {
                this.receiver.feed(data);
            }
        }

        /**
         * Disconnect from BLE device
         */
        async disconnect() {
            if (this.characteristic) {
                try {
                    await this.characteristic.stopNotifications();
                } catch (e) {
                    // Ignore
                }
                this.characteristic = null;
            }

            if (this.device && this.device.gatt.connected) {
                this.device.gatt.disconnect();
            }

            this.device = null;
            this.server = null;
            this.setState(ConnectionState.DISCONNECTED);
        }

        setState(state) {
            const previous = this.state;
            this.state = state;
            if (this.onStateChange && previous !== state) {
                this.onStateChange(state, previous);
            }
        }

        getState() {
            return this.state;
        }

        getStats() {
            return { ...this.stats };
        }

        isConnected() {
            return this.state === ConnectionState.CONNECTED ||
                   this.state === ConnectionState.READING;
        }
    }

    /**
     * Auto-detect and connect to best available Bluetooth option
     */
    class BluetoothAutoConnect {
        constructor(receiver, options = {}) {
            this.receiver = receiver;
            this.options = options;
            this.connection = null;
            this.type = null;
        }

        /**
         * Check what Bluetooth options are available
         */
        static getAvailableOptions() {
            const options = [];

            if (isWebSerialSupported()) {
                options.push({
                    type: 'spp',
                    name: 'Bluetooth Serial (SPP)',
                    description: 'For Garmin GDL 50/52, Dual XGPS, and similar devices',
                    supported: true
                });
            }

            if (isWebBluetoothSupported()) {
                options.push({
                    type: 'ble',
                    name: 'Bluetooth Low Energy (BLE)',
                    description: 'For newer BLE-based ADS-B receivers',
                    supported: true
                });
            }

            if (options.length === 0) {
                options.push({
                    type: 'none',
                    name: 'Not Supported',
                    description: 'Use Chrome or Edge browser for Bluetooth support',
                    supported: false
                });
            }

            return options;
        }

        /**
         * Connect using specified type or auto-detect
         */
        async connect(type = 'auto') {
            if (type === 'auto') {
                // Prefer SPP for most ADS-B devices
                if (isWebSerialSupported()) {
                    type = 'spp';
                } else if (isWebBluetoothSupported()) {
                    type = 'ble';
                } else {
                    throw new Error('No Bluetooth support available');
                }
            }

            this.type = type;

            if (type === 'spp') {
                this.connection = new BluetoothSPPConnection(this.receiver, this.options);
            } else if (type === 'ble') {
                this.connection = new BluetoothBLEConnection(this.receiver, this.options);
            } else {
                throw new Error(`Unknown connection type: ${type}`);
            }

            await this.connection.connect();
            return this.connection;
        }

        disconnect() {
            if (this.connection) {
                this.connection.disconnect();
            }
        }

        getConnection() {
            return this.connection;
        }

        getType() {
            return this.type;
        }
    }

    /**
     * Connection Manager - Unified interface for all connection types
     */
    class ConnectionManager {
        constructor(receiver) {
            this.receiver = receiver;
            this.connections = new Map();
            this.activeConnection = null;
        }

        /**
         * Get available connection methods
         */
        getAvailableMethods() {
            return {
                webSerial: isWebSerialSupported(),
                webBluetooth: isWebBluetoothSupported(),
                webSocket: true, // Always available
                file: true // Always available
            };
        }

        /**
         * Create a Bluetooth SPP connection
         */
        createBluetoothSPP(options = {}) {
            const conn = new BluetoothSPPConnection(this.receiver, options);
            this.connections.set('bt-spp', conn);
            return conn;
        }

        /**
         * Create a Bluetooth BLE connection
         */
        createBluetoothBLE(options = {}) {
            const conn = new BluetoothBLEConnection(this.receiver, options);
            this.connections.set('bt-ble', conn);
            return conn;
        }

        /**
         * Connect using best available Bluetooth method
         */
        async connectBluetooth(type = 'auto', options = {}) {
            const auto = new BluetoothAutoConnect(this.receiver, options);
            this.activeConnection = await auto.connect(type);
            return this.activeConnection;
        }

        /**
         * Disconnect all connections
         */
        disconnectAll() {
            for (const conn of this.connections.values()) {
                if (conn.disconnect) {
                    conn.disconnect();
                }
            }
            if (this.activeConnection) {
                this.activeConnection.disconnect();
            }
        }
    }

    // Export public API
    return {
        ConnectionState,
        SPP_UUID,
        KNOWN_DEVICE_NAMES,
        isWebSerialSupported,
        isWebBluetoothSupported,
        BluetoothSPPConnection,
        BluetoothBLEConnection,
        BluetoothAutoConnect,
        ConnectionManager
    };
})();

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MATGDL90Bluetooth;
}
