"""Web scraper for Blinkit serviceable PIN codes."""
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import pandas as pd
import time
from typing import List, Dict
from src.utils.config import SCRAPE_DELAY_SECONDS, RAW_DATA_DIR
from src.utils.helpers import logger


class BlinkitScraper:
    """Scraper for Blinkit website to check PIN code serviceability."""
    
    def __init__(self, headless: bool = True):
        """
        Initialize the scraper.
        
        Args:
            headless: Run browser in headless mode
        """
        options = webdriver.ChromeOptions()
        if headless:
            options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 10)
        logger.info("Blinkit scraper initialized")
    
    def check_pincode_serviceable(self, pincode: str) -> Dict:
        """
        Check if a PIN code is serviceable by Blinkit.
        
        Args:
            pincode: Indian PIN code to check
            
        Returns:
            Dict with pincode and serviceable status
        """
        try:
            self.driver.get("https://blinkit.com")
            time.sleep(2)
            
            # Find and click location input
            location_input = self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='location']"))
            )
            location_input.clear()
            location_input.send_keys(pincode)
            time.sleep(1)
            
            # Check for serviceable message or error
            try:
                # Look for success indicators
                serviceable_element = self.driver.find_element(
                    By.XPATH, 
                    "//*[contains(text(), 'Deliver') or contains(text(), 'Available')]"
                )
                is_serviceable = True
                logger.info(f"✓ {pincode} is serviceable")
            except:
                is_serviceable = False
                logger.info(f"✗ {pincode} is NOT serviceable")
            
            time.sleep(SCRAPE_DELAY_SECONDS)
            
            return {
                "pincode": pincode,
                "blinkit_serviceable": is_serviceable,
                "checked_at": pd.Timestamp.now()
            }
            
        except TimeoutException:
            logger.warning(f"Timeout checking {pincode}")
            return {
                "pincode": pincode,
                "blinkit_serviceable": None,
                "checked_at": pd.Timestamp.now()
            }
        except Exception as e:
            logger.error(f"Error checking {pincode}: {e}")
            return {
                "pincode": pincode,
                "blinkit_serviceable": None,
                "checked_at": pd.Timestamp.now()
            }
    
    def check_multiple_pincodes(self, pincodes: List[str]) -> pd.DataFrame:
        """
        Check multiple PIN codes for serviceability.
        
        Args:
            pincodes: List of PIN codes to check
            
        Returns:
            DataFrame with results
        """
        results = []
        total = len(pincodes)
        
        logger.info(f"Starting to check {total} PIN codes...")
        
        for idx, pincode in enumerate(pincodes, 1):
            result = self.check_pincode_serviceable(pincode)
            results.append(result)
            
            if idx % 10 == 0:
                logger.info(f"Progress: {idx}/{total} PIN codes checked")
        
        df = pd.DataFrame(results)
        logger.info(f"Completed checking {total} PIN codes")
        
        return df
    
    def close(self):
        """Close the browser."""
        if self.driver:
            self.driver.quit()
            logger.info("Browser closed")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def main():
    """Example usage: Check sample PIN codes."""
    # Sample PIN codes for testing
    sample_pincodes = [
        "110001",  # Delhi
        "400001",  # Mumbai
        "560001",  # Bangalore
        "600001",  # Chennai
        "700001",  # Kolkata
        "201301",  # Noida
        "411001",  # Pune
        "380001",  # Ahmedabad
        "500001",  # Hyderabad
        "302001"   # Jaipur
    ]
    
    with BlinkitScraper(headless=False) as scraper:
        results_df = scraper.check_multiple_pincodes(sample_pincodes)
        
        print("\n=== Blinkit Coverage Results ===")
        print(results_df)
        
        # Save results
        output_path = RAW_DATA_DIR / "blinkit_coverage.csv"
        results_df.to_csv(output_path, index=False)
        print(f"\nResults saved to: {output_path}")
        
        # Summary statistics
        serviceable_count = results_df["blinkit_serviceable"].sum()
        print(f"\nServiceable: {serviceable_count}/{len(results_df)}")


if __name__ == "__main__":
    main()
