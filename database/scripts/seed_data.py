"""Seed the database with initial data from CSV files."""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

import pandas as pd
from sqlalchemy.orm import Session
from src.database.models import (
    DarkStore, PincodeCoverage, OrderSynthetic, 
    CompetitorPricing, UserReview, engine
)
from src.utils.config import RAW_DATA_DIR, PROCESSED_DATA_DIR, EXTERNAL_DATA_DIR
from src.utils.helpers import logger, clean_platform_name


def seed_dark_stores(session: Session, csv_path: Path):
    """Load dark stores from CSV into database."""
    try:
        df = pd.read_csv(csv_path)
        logger.info(f"Loading {len(df)} dark stores...")
        
        for _, row in df.iterrows():
            store = DarkStore(
                platform=clean_platform_name(row.get('platform', '')),
                store_name=row.get('name', row.get('store_name', '')),
                city=row.get('city', ''),
                pincode=str(row.get('pincode', '')) if pd.notna(row.get('pincode')) else None,
                latitude=float(row['latitude']),
                longitude=float(row['longitude']),
                city_tier=row.get('city_tier', 'Unknown'),
                is_active=row.get('is_active', True),
                source=row.get('source', 'manual')
            )
            session.add(store)
        
        session.commit()
        logger.info(f"✓ Loaded {len(df)} dark stores")
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error loading dark stores: {e}")
        raise


def seed_pincode_coverage(session: Session, csv_path: Path):
    """Load PIN code coverage data from CSV into database."""
    try:
        df = pd.read_csv(csv_path)
        logger.info(f"Loading {len(df)} PIN code coverage records...")
        
        for _, row in df.iterrows():
            coverage = PincodeCoverage(
                pincode=str(row['pincode']),
                city=row.get('city', ''),
                state=row.get('state', ''),
                latitude=float(row['latitude']) if pd.notna(row.get('latitude')) else None,
                longitude=float(row['longitude']) if pd.notna(row.get('longitude')) else None,
                city_tier=row.get('city_tier', 'Unknown'),
                population=int(row['population']) if pd.notna(row.get('population')) else None,
                blinkit=bool(row.get('blinkit', False)),
                zepto=bool(row.get('zepto', False)),
                instamart=bool(row.get('instamart', False)),
                flipkart_min=bool(row.get('flipkart_min', False)),
                coverage_score=float(row.get('coverage_score', 0))
            )
            session.add(coverage)
        
        session.commit()
        logger.info(f"✓ Loaded {len(df)} PIN code coverage records")
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error loading PIN code coverage: {e}")
        raise


def main():
    """Main function to seed all data."""
    logger.info("Starting database seeding...")
    
    with Session(engine) as session:
        # Seed dark stores if CSV exists
        stores_csv = EXTERNAL_DATA_DIR / "google_places_stores.csv"
        if stores_csv.exists():
            seed_dark_stores(session, stores_csv)
        else:
            logger.warning(f"Dark stores CSV not found: {stores_csv}")
        
        # Seed PIN code coverage if CSV exists
        coverage_csv = PROCESSED_DATA_DIR / "pincode_coverage.csv"
        if coverage_csv.exists():
            seed_pincode_coverage(session, coverage_csv)
        else:
            logger.warning(f"PIN code coverage CSV not found: {coverage_csv}")
    
    logger.info("✓ Database seeding complete!")


if __name__ == "__main__":
    main()
