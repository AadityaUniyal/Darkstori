"""MLflow Server Manager.

This module manages the MLflow tracking server lifecycle, including
starting, stopping, and health checking the server process.
"""

import logging
import os
import signal
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

import requests

from backend.ml.mlflow_config import MLflowConfig, get_mlflow_config

logger = logging.getLogger(__name__)


class MLflowServerManager:
    """Manages MLflow tracking server process lifecycle."""

    def __init__(self, config: Optional[MLflowConfig] = None):
        """Initialize server manager.

        Args:
            config: MLflow configuration. If None, loads from environment.
        """
        self.config = config or get_mlflow_config()
        self.process: Optional[subprocess.Popen] = None
        self._is_running = False

    def start_server(self, wait_for_ready: bool = True, timeout: int = 30) -> bool:
        """Start MLflow tracking server as a subprocess.

        Args:
            wait_for_ready: Whether to wait for server to be ready
            timeout: Maximum seconds to wait for server readiness

        Returns:
            True if server started successfully, False otherwise
        """
        if self._is_running:
            logger.warning("MLflow server is already running")
            return True

        try:
            # Validate configuration
            self.config.validate()

            # Prepare server command
            backend_store_uri = self.config.get_backend_store_uri()
            artifact_root = self.config.get_artifact_root()
            host = self.config.server.host
            port = self.config.server.port
            workers = self.config.server.workers

            # Ensure artifact directory exists
            Path(artifact_root).mkdir(parents=True, exist_ok=True)

            # Build command
            cmd = [
                sys.executable,
                "-m",
                "mlflow",
                "server",
                "--backend-store-uri",
                backend_store_uri,
                "--default-artifact-root",
                artifact_root,
                "--host",
                host,
                "--port",
                str(port),
                "--workers",
                str(workers),
            ]

            logger.info(f"Starting MLflow server: {' '.join(cmd)}")

            # Start server process
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )

            self._is_running = True
            logger.info(f"MLflow server process started (PID: {self.process.pid})")

            # Wait for server to be ready
            if wait_for_ready:
                if self.wait_for_ready(timeout):
                    logger.info(f"MLflow server is ready at http://{host}:{port}")
                    return True
                else:
                    logger.error("MLflow server failed to become ready")
                    self.stop_server()
                    return False

            return True

        except Exception as e:
            logger.error(f"Failed to start MLflow server: {e}")
            self._is_running = False
            return False

    def stop_server(self, timeout: int = 10) -> bool:
        """Stop MLflow tracking server gracefully.

        Args:
            timeout: Maximum seconds to wait for graceful shutdown

        Returns:
            True if server stopped successfully, False otherwise
        """
        if not self._is_running or self.process is None:
            logger.warning("MLflow server is not running")
            return True

        try:
            logger.info(f"Stopping MLflow server (PID: {self.process.pid})")

            # Send SIGTERM for graceful shutdown
            self.process.terminate()

            # Wait for process to terminate
            try:
                self.process.wait(timeout=timeout)
                logger.info("MLflow server stopped gracefully")
            except subprocess.TimeoutExpired:
                logger.warning(
                    "MLflow server did not stop gracefully, forcing shutdown"
                )
                self.process.kill()
                self.process.wait()
                logger.info("MLflow server killed")

            self._is_running = False
            self.process = None
            return True

        except Exception as e:
            logger.error(f"Failed to stop MLflow server: {e}")
            return False

    def restart_server(self, timeout: int = 30) -> bool:
        """Restart MLflow tracking server.

        Args:
            timeout: Maximum seconds to wait for server readiness

        Returns:
            True if server restarted successfully, False otherwise
        """
        logger.info("Restarting MLflow server")
        self.stop_server()
        time.sleep(2)  # Brief pause between stop and start
        return self.start_server(wait_for_ready=True, timeout=timeout)

    def health_check(self) -> bool:
        """Check if MLflow server is responsive.

        Returns:
            True if server is healthy, False otherwise
        """
        try:
            host = self.config.server.host
            port = self.config.server.port

            # Use localhost for health check if host is 0.0.0.0
            check_host = "localhost" if host == "0.0.0.0" else host
            url = f"http://{check_host}:{port}/health"

            response = requests.get(url, timeout=5)
            return response.status_code == 200

        except requests.exceptions.RequestException as e:
            logger.debug(f"Health check failed: {e}")
            return False

    def wait_for_ready(self, timeout: int = 30) -> bool:
        """Wait for MLflow server to be ready.

        Args:
            timeout: Maximum seconds to wait

        Returns:
            True if server became ready, False if timeout
        """
        start_time = time.time()

        while time.time() - start_time < timeout:
            if self.health_check():
                return True

            # Check if process is still running
            if self.process and self.process.poll() is not None:
                logger.error("MLflow server process terminated unexpectedly")
                # Log stderr output
                if self.process.stderr:
                    stderr = self.process.stderr.read()
                    if stderr:
                        logger.error(f"Server stderr: {stderr}")
                return False

            time.sleep(1)

        logger.error(f"MLflow server did not become ready within {timeout} seconds")
        return False

    def verify_database(self) -> bool:
        """Verify database connectivity for MLflow backend store.

        Returns:
            True if database is accessible, False otherwise
        """
        try:
            from sqlalchemy import create_engine, text

            backend_uri = self.config.get_backend_store_uri()
            engine = create_engine(backend_uri)

            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            logger.info("Database connectivity verified")
            return True

        except Exception as e:
            logger.error(f"Database verification failed: {e}")
            return False

    def get_server_info(self) -> dict:
        """Get MLflow server information.

        Returns:
            Dictionary with server information
        """
        return {
            "is_running": self._is_running,
            "pid": self.process.pid if self.process else None,
            "host": self.config.server.host,
            "port": self.config.server.port,
            "tracking_uri": self.config.tracking_uri,
            "artifact_location": self.config.artifact_location,
            "backend_store_uri": self.config.get_backend_store_uri(),
            "healthy": self.health_check() if self._is_running else False,
        }

    def get_tracking_uri(self) -> str:
        """Get MLflow tracking URI for client connections.

        Returns:
            Tracking URI string
        """
        host = self.config.server.host
        port = self.config.server.port

        # Use localhost for client connections if server binds to 0.0.0.0
        client_host = "localhost" if host == "0.0.0.0" else host
        return f"http://{client_host}:{port}"

    @property
    def is_running(self) -> bool:
        """Check if server is running."""
        return (
            self._is_running
            and self.process is not None
            and self.process.poll() is None
        )

    def __enter__(self):
        """Context manager entry."""
        self.start_server()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop_server()

    def __del__(self):
        """Cleanup on deletion."""
        if self._is_running:
            self.stop_server()


@contextmanager
def mlflow_server(config: Optional[MLflowConfig] = None):
    """Context manager for MLflow server lifecycle.

    Args:
        config: MLflow configuration

    Yields:
        MLflowServerManager instance

    Example:
        with mlflow_server() as server:
            # Server is running
            tracking_uri = server.get_tracking_uri()
            # ... use MLflow ...
        # Server is stopped
    """
    manager = MLflowServerManager(config)
    try:
        manager.start_server()
        yield manager
    finally:
        manager.stop_server()


def start_mlflow_server_daemon(
    config: Optional[MLflowConfig] = None,
) -> MLflowServerManager:
    """Start MLflow server as a daemon process.

    This function starts the MLflow server and returns the manager.
    The server will continue running until explicitly stopped.

    Args:
        config: MLflow configuration

    Returns:
        MLflowServerManager instance
    """
    manager = MLflowServerManager(config)

    if manager.start_server(wait_for_ready=True):
        logger.info("MLflow server started successfully")
        return manager
    else:
        raise RuntimeError("Failed to start MLflow server")


if __name__ == "__main__":
    # Test server manager
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    parser = argparse.ArgumentParser(description="MLflow Server Manager")
    parser.add_argument(
        "command",
        choices=["start", "stop", "restart", "status", "test"],
        help="Command to execute",
    )
    parser.add_argument("--config", type=str, help="Path to configuration file")

    args = parser.parse_args()

    # Load configuration
    if args.config:
        from backend.ml.mlflow_config import MLflowConfig

        config = MLflowConfig.from_yaml(args.config)
    else:
        config = get_mlflow_config()

    manager = MLflowServerManager(config)

    if args.command == "start":
        if manager.start_server():
            print("✓ MLflow server started successfully")
            print(f"  Tracking URI: {manager.get_tracking_uri()}")
            print(f"  PID: {manager.process.pid}")
            print("\nPress Ctrl+C to stop the server...")
            try:
                # Keep running until interrupted
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\nStopping server...")
                manager.stop_server()
        else:
            print("✗ Failed to start MLflow server")
            sys.exit(1)

    elif args.command == "stop":
        if manager.stop_server():
            print("✓ MLflow server stopped")
        else:
            print("✗ Failed to stop MLflow server")
            sys.exit(1)

    elif args.command == "restart":
        if manager.restart_server():
            print("✓ MLflow server restarted")
        else:
            print("✗ Failed to restart MLflow server")
            sys.exit(1)

    elif args.command == "status":
        info = manager.get_server_info()
        print("MLflow Server Status:")
        print(f"  Running: {info['is_running']}")
        print(f"  PID: {info['pid']}")
        print(f"  Host: {info['host']}")
        print(f"  Port: {info['port']}")
        print(f"  Healthy: {info['healthy']}")
        print(f"  Tracking URI: {info['tracking_uri']}")

    elif args.command == "test":
        print("Testing MLflow server manager...")

        # Test database connectivity
        print("\n1. Testing database connectivity...")
        if manager.verify_database():
            print("   ✓ Database connection successful")
        else:
            print("   ✗ Database connection failed")
            sys.exit(1)

        # Test server start
        print("\n2. Starting MLflow server...")
        if manager.start_server():
            print("   ✓ Server started successfully")
        else:
            print("   ✗ Server start failed")
            sys.exit(1)

        # Test health check
        print("\n3. Testing health check...")
        if manager.health_check():
            print("   ✓ Health check passed")
        else:
            print("   ✗ Health check failed")

        # Display server info
        print("\n4. Server information:")
        info = manager.get_server_info()
        for key, value in info.items():
            print(f"   {key}: {value}")

        # Test server stop
        print("\n5. Stopping MLflow server...")
        if manager.stop_server():
            print("   ✓ Server stopped successfully")
        else:
            print("   ✗ Server stop failed")

        print("\n✓ All tests passed")


# Global server manager instance
_server_manager: Optional[MLflowServerManager] = None


def get_server_manager() -> MLflowServerManager:
    """Get or create global MLflow server manager instance.

    Returns:
        MLflowServerManager instance
    """
    global _server_manager
    if _server_manager is None:
        _server_manager = MLflowServerManager()
    return _server_manager
