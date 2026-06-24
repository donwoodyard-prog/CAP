#!/usr/bin/env python3
"""
gdl90_ws_bridge.py - WebSocket bridge for GDL 90 ADS-B data

Receives GDL 90 protocol data on UDP port 4000 and forwards it to
WebSocket clients. This enables browser-based applications like MAT
to receive avionics data from ADS-B devices.

Compatible Sources:
- Stratus/Sentry (ForeFlight)
- SkyEcho
- Stratux (DIY)
- G1000/G3X via Flight Stream
- Any GDL 90 compliant device

Usage:
    python gdl90_ws_bridge.py [options]
    
Options:
    --udp-port PORT     UDP port to listen on (default: 4000)
    --ws-port PORT      WebSocket port to serve on (default: 8765)
    --host HOST         Host address to bind to (default: 0.0.0.0)
    --verbose           Enable verbose logging
    --log-file FILE     Log to file instead of stdout

Requirements:
    pip install websockets

Author: MAT Development Team
License: MIT
"""

import asyncio
import argparse
import logging
import signal
import sys
from datetime import datetime
from typing import Set

try:
    import websockets
except ImportError:
    print("Error: 'websockets' package not found.")
    print("Install with: pip install websockets")
    sys.exit(1)

# Version
__version__ = "1.0.0"

# Default configuration
DEFAULT_UDP_PORT = 4000
DEFAULT_WS_PORT = 8765
DEFAULT_HOST = "0.0.0.0"

# Global state
clients: Set[websockets.WebSocketServerProtocol] = set()
stats = {
    "udp_packets": 0,
    "bytes_received": 0,
    "ws_messages_sent": 0,
    "errors": 0,
    "start_time": None
}


def setup_logging(verbose: bool = False, log_file: str = None):
    """Configure logging."""
    level = logging.DEBUG if verbose else logging.INFO
    format_str = "%(asctime)s [%(levelname)s] %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    handlers = []
    if log_file:
        handlers.append(logging.FileHandler(log_file))
    handlers.append(logging.StreamHandler())
    
    logging.basicConfig(
        level=level,
        format=format_str,
        datefmt=date_format,
        handlers=handlers
    )
    
    return logging.getLogger("gdl90_bridge")


class GDL90Protocol(asyncio.DatagramProtocol):
    """UDP protocol handler for GDL 90 data."""
    
    def __init__(self, logger):
        self.logger = logger
        self.transport = None
    
    def connection_made(self, transport):
        self.transport = transport
        addr = transport.get_extra_info('sockname')
        self.logger.info(f"UDP listening on {addr[0]}:{addr[1]}")
    
    def datagram_received(self, data: bytes, addr):
        """Handle incoming UDP packet."""
        stats["udp_packets"] += 1
        stats["bytes_received"] += len(data)
        
        self.logger.debug(f"UDP packet from {addr}: {len(data)} bytes")
        
        # Forward to all WebSocket clients
        if clients:
            asyncio.create_task(broadcast_to_clients(data))
    
    def error_received(self, exc):
        self.logger.error(f"UDP error: {exc}")
        stats["errors"] += 1


async def broadcast_to_clients(data: bytes):
    """Send data to all connected WebSocket clients."""
    if not clients:
        return
    
    disconnected = set()
    
    for client in clients:
        try:
            await client.send(data)
            stats["ws_messages_sent"] += 1
        except websockets.exceptions.ConnectionClosed:
            disconnected.add(client)
        except Exception as e:
            logging.getLogger("gdl90_bridge").error(f"Send error: {e}")
            disconnected.add(client)
            stats["errors"] += 1
    
    # Remove disconnected clients
    for client in disconnected:
        clients.discard(client)


async def ws_handler(websocket, path):
    """Handle WebSocket client connection."""
    logger = logging.getLogger("gdl90_bridge")
    client_addr = websocket.remote_address
    
    clients.add(websocket)
    logger.info(f"WebSocket client connected from {client_addr} ({len(clients)} total)")
    
    try:
        # Keep connection alive and wait for close
        async for message in websocket:
            # We don't expect incoming messages, but log if received
            logger.debug(f"Received from client: {message}")
    except websockets.exceptions.ConnectionClosed as e:
        logger.debug(f"Client disconnected: {e}")
    finally:
        clients.discard(websocket)
        logger.info(f"WebSocket client disconnected from {client_addr} ({len(clients)} total)")


async def status_reporter(logger, interval: int = 60):
    """Periodically report statistics."""
    while True:
        await asyncio.sleep(interval)
        
        uptime = datetime.now() - stats["start_time"]
        logger.info(
            f"Stats: {stats['udp_packets']} UDP packets, "
            f"{stats['bytes_received']} bytes, "
            f"{stats['ws_messages_sent']} WS messages, "
            f"{len(clients)} clients, "
            f"uptime {uptime}"
        )


async def main(args):
    """Main entry point."""
    logger = setup_logging(args.verbose, args.log_file)
    logger.info(f"GDL 90 WebSocket Bridge v{__version__}")
    
    stats["start_time"] = datetime.now()
    
    # Handle shutdown signals
    loop = asyncio.get_event_loop()
    
    def shutdown_handler():
        logger.info("Shutdown signal received")
        for task in asyncio.all_tasks(loop):
            task.cancel()
    
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, shutdown_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            pass
    
    # Start UDP listener
    logger.info(f"Starting UDP listener on {args.host}:{args.udp_port}")
    transport, protocol = await loop.create_datagram_endpoint(
        lambda: GDL90Protocol(logger),
        local_addr=(args.host, args.udp_port)
    )
    
    # Start WebSocket server
    logger.info(f"Starting WebSocket server on {args.host}:{args.ws_port}")
    
    async with websockets.serve(
        ws_handler,
        args.host,
        args.ws_port,
        ping_interval=20,
        ping_timeout=20
    ):
        logger.info("Bridge ready - waiting for connections")
        logger.info(f"  ADS-B devices should send to UDP port {args.udp_port}")
        logger.info(f"  MAT should connect to ws://{args.host}:{args.ws_port}")
        
        # Start status reporter
        reporter_task = asyncio.create_task(status_reporter(logger))
        
        try:
            await asyncio.Future()  # Run forever
        except asyncio.CancelledError:
            pass
        finally:
            reporter_task.cancel()
            transport.close()
    
    logger.info("Bridge shutdown complete")


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="GDL 90 WebSocket Bridge - Forward ADS-B data to browsers",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Basic usage (defaults)
    python gdl90_ws_bridge.py
    
    # Custom ports
    python gdl90_ws_bridge.py --udp-port 43211 --ws-port 9000
    
    # Verbose logging to file
    python gdl90_ws_bridge.py --verbose --log-file bridge.log

In MAT, connect to: ws://localhost:8765 (or custom --ws-port)
        """
    )
    
    parser.add_argument(
        "--udp-port",
        type=int,
        default=DEFAULT_UDP_PORT,
        help=f"UDP port to listen for GDL 90 data (default: {DEFAULT_UDP_PORT})"
    )
    
    parser.add_argument(
        "--ws-port",
        type=int,
        default=DEFAULT_WS_PORT,
        help=f"WebSocket port for browser connections (default: {DEFAULT_WS_PORT})"
    )
    
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"Host address to bind to (default: {DEFAULT_HOST})"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose debug logging"
    )
    
    parser.add_argument(
        "--log-file",
        help="Log to file instead of stdout"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}"
    )
    
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    
    try:
        asyncio.run(main(args))
    except KeyboardInterrupt:
        print("\nInterrupted")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
