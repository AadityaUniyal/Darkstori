"""Automated Kaggle dataset integration and live data fetching."""

import os
import subprocess
from pathlib import Path
from typing import Dict

import pandas as pd

from backend.core.config import RAW_DATA_DIR
from backend.core.logger import logger


class KaggleDataFetcher:
    """Fetch and manage datasets from Kaggle."""

    DATASETS = {
        "quick_commerce": "rohitgrewal/quick-commerce-dataset",
        "consumer_behavior": "vedanshsharma0024/quick-commerce-consumer-behavior",
        "india_pincodes": "shubh0799/india-pincode-with-latitude-and-longitude",
        "india_population": "census-india/india-population-2011",
        "retail_stores": "retailrocket/ecommerce-dataset",
    }

    def __init__(self):
        """Initialize Kaggle API credentials."""
        self._setup_kaggle_credentials()
        self.kaggle_configured = self._check_kaggle_setup()

    def _setup_kaggle_credentials(self):
        """Setup Kaggle credentials from environment variables."""
        from backend.core.config import settings

        # Set Kaggle credentials from environment if available
        if settings.KAGGLE_USERNAME and settings.KAGGLE_API_KEY:
            os.environ["KAGGLE_USERNAME"] = settings.KAGGLE_USERNAME
            os.environ["KAGGLE_KEY"] = settings.KAGGLE_API_KEY
            logger.info("Kaggle credentials loaded from environment variables")
        else:
            logger.info(
                "Kaggle credentials not found in environment, checking ~/.kaggle/kaggle.json"
            )

    def _check_kaggle_setup(self) -> bool:
        """Check if Kaggle API is configured."""
        # Check environment variables first
        if os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY"):
            logger.info("Kaggle API configured via environment variables")
            return True

        # Check kaggle.json file
        kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
        if kaggle_json.exists():
            logger.info("Kaggle API configured via ~/.kaggle/kaggle.json")
            return True

        logger.warning(
            "Kaggle API not configured. Either:\n"
            "1. Set KAGGLE_USERNAME and KAGGLE_API_KEY in .env, or\n"
            "2. Place kaggle.json in ~/.kaggle/"
        )
        return False

    def download_dataset(self, dataset_key: str, force: bool = False) -> Path:
        """
        Download dataset from Kaggle.

        Args:
            dataset_key: Key from DATASETS dict
            force: Force re-download even if exists

        Returns:
            Path to downloaded dataset directory
        """
        if not self.kaggle_configured:
            raise RuntimeError("Kaggle API not configured")

        if dataset_key not in self.DATASETS:
            raise ValueError(f"Unknown dataset: {dataset_key}")

        dataset_name = self.DATASETS[dataset_key]
        output_dir = RAW_DATA_DIR / dataset_key

        # Check if already downloaded
        if output_dir.exists() and not force:
            logger.info(f"Dataset {dataset_key} already exists")
            return output_dir

        output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Downloading {dataset_name}...")

        try:
            # Download using kaggle CLI
            cmd = [
                "kaggle",
                "datasets",
                "download",
                "-d",
                dataset_name,
                "-p",
                str(output_dir),
                "--unzip",
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                logger.info(f"✓ Downloaded {dataset_key} successfully")
                return output_dir
            else:
                logger.error(f"Download failed: {result.stderr}")
                raise RuntimeError(f"Kaggle download failed: {result.stderr}")

        except FileNotFoundError:
            logger.error("Kaggle CLI not found. Install: pip install kaggle")
            raise

    def download_all_datasets(self) -> Dict[str, Path]:
        """Download all configured datasets."""
        results = {}

        for key in self.DATASETS.keys():
            try:
                path = self.download_dataset(key)
                results[key] = path
            except Exception as e:
                logger.error(f"Failed to download {key}: {e}")
                results[key] = None

        return results

    def load_quick_commerce_data(self) -> pd.DataFrame:
        """Load and merge quick commerce datasets."""
        try:
            qc_dir = RAW_DATA_DIR / "quick_commerce"

            # Find CSV files
            csv_files = list(qc_dir.glob("*.csv"))

            if not csv_files:
                logger.warning("No CSV files found in quick_commerce dataset")
                return pd.DataFrame()

            # Load and merge
            dfs = []
            for csv_file in csv_files:
                df = pd.read_csv(csv_file)
                dfs.append(df)
                logger.info(f"Loaded {csv_file.name}: {len(df)} rows")

            # Combine all dataframes
            combined_df = pd.concat(dfs, ignore_index=True)
            logger.info(f"Combined dataset: {len(combined_df)} total rows")

            return combined_df

        except Exception as e:
            logger.error(f"Error loading quick commerce data: {e}")
            return pd.DataFrame()

    def load_india_pincodes(self) -> pd.DataFrame:
        """Load India PIN codes with coordinates."""
        try:
            pincode_dir = RAW_DATA_DIR / "india_pincodes"
            csv_files = list(pincode_dir.glob("*.csv"))

            if csv_files:
                df = pd.read_csv(csv_files[0])
                logger.info(f"Loaded {len(df)} PIN codes")
                return df
            else:
                logger.warning("PIN code dataset not found")
                return pd.DataFrame()

        except Exception as e:
            logger.error(f"Error loading PIN codes: {e}")
            return pd.DataFrame()


class LiveDataFetcher:
    """Fetch live data from various APIs."""

    def __init__(self):
        self.session = None

    def fetch_live_traffic(self, lat: float, lng: float) -> Dict:
        """Fetch live traffic data for location."""
        # Placeholder for live traffic API integration
        # Can integrate with Google Maps Traffic API, TomTom, etc.
        return {"traffic_level": "moderate", "avg_speed": 35, "congestion_score": 0.6}

    def fetch_weather_data(self, city: str) -> Dict:
        """Fetch current weather data."""
        # Placeholder for weather API (OpenWeatherMap, etc.)
        return {"temperature": 28, "condition": "Clear", "humidity": 65}

    def fetch_competitor_prices(self, sku: str, city: str) -> Dict:
        """Fetch live competitor pricing."""
        # Placeholder for price scraping/API
        return {"blinkit": 45.0, "zepto": 43.0, "instamart": 46.0}


# Global instances
kaggle_fetcher = KaggleDataFetcher()
live_fetcher = LiveDataFetcher()


def setup_kaggle_datasets():
    """Setup script to download all Kaggle datasets."""
    logger.info("Starting Kaggle dataset download...")

    results = kaggle_fetcher.download_all_datasets()

    logger.info("\n=== Download Summary ===")
    for dataset, path in results.items():
        status = "✓" if path else "✗"
        logger.info(f"{status} {dataset}: {path}")

    return results


if __name__ == "__main__":
    setup_kaggle_datasets()
