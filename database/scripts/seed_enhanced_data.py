"""Seed the database with realistic sample data."""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, time
import random
from faker import Faker

from src.database.enhanced_models import (
    Base, DarkStore, PincodeCoverage, Order, OrderItem, Product,
    Inventory, PricingHistory, UserReview, MarketMetrics,
    PlatformEnum, CityTierEnum, OrderStatusEnum
)
from src.utils.config import DATABASE_URL

fake = Faker('en_IN')
random.seed(42)

# Sample data
CITIES = {
    'Metro': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'],
    'Tier1': ['Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam'],
    'Tier2': ['Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Amritsar'],
    'Tier3': ['Aligarh', 'Moradabad', 'Mysore', 'Gurgaon', 'Ghaziabad', 'Jabalpur', 'Coimbatore', 'Kochi']
}

PRODUCT_CATEGORIES = {
    'Grocery': ['Rice', 'Wheat Flour', 'Cooking Oil', 'Pulses', 'Sugar', 'Salt', 'Spices'],
    'Dairy': ['Milk', 'Butter', 'Cheese', 'Yogurt', 'Paneer', 'Cream'],
    'Beverages': ['Tea', 'Coffee', 'Soft Drinks', 'Juice', 'Energy Drinks', 'Water'],
    'Snacks': ['Chips', 'Biscuits', 'Namkeen', 'Chocolates', 'Cookies', 'Nuts'],
    'Personal Care': ['Soap', 'Shampoo', 'Toothpaste', 'Face Wash', 'Deodorant'],
    'Household': ['Detergent', 'Dishwash', 'Floor Cleaner', 'Toilet Cleaner'],
    'Fruits': ['Apple', 'Banana', 'Orange', 'Mango', 'Grapes', 'Watermelon'],
    'Vegetables': ['Tomato', 'Onion', 'Potato', 'Carrot', 'Cabbage', 'Spinach']
}

BRANDS = ['Amul', 'Britannia', 'Parle', 'ITC', 'Nestle', 'HUL', 'Dabur', 'Patanjali', 'Mother Dairy', 'Haldiram']


def seed_dark_stores(session: Session, count: int = 500):
    """Seed dark stores."""
    print(f"Seeding {count} dark stores...")
    
    stores = []
    store_code = 1000
    
    for _ in range(count):
        tier = random.choice(list(CITIES.keys()))
        city = random.choice(CITIES[tier])
        platform = random.choice(list(PlatformEnum))
        
        # Generate realistic coordinates for Indian cities
        base_coords = {
            'Mumbai': (19.0760, 72.8777),
            'Delhi': (28.7041, 77.1025),
            'Bangalore': (12.9716, 77.5946),
            'Hyderabad': (17.3850, 78.4867),
            'Chennai': (13.0827, 80.2707),
            'Kolkata': (22.5726, 88.3639),
            'Pune': (18.5204, 73.8567),
            'Ahmedabad': (23.0225, 72.5714),
        }
        
        base_lat, base_lon = base_coords.get(city, (20.5937, 78.9629))
        
        store = DarkStore(
            platform=platform,
            store_name=f"{platform.value} {city} {store_code}",
            store_code=f"DS{store_code}",
            city=city,
            pincode=f"{random.randint(100000, 999999)}",
            address=fake.address(),
            latitude=base_lat + random.uniform(-0.5, 0.5),
            longitude=base_lon + random.uniform(-0.5, 0.5),
            city_tier=CityTierEnum[tier.upper()],
            is_active=random.choice([True, True, True, False]),  # 75% active
            opening_time=time(6, 0),
            closing_time=time(23, 0),
            is_24x7=random.choice([True, False]),
            delivery_radius_km=random.uniform(3.0, 7.0),
            storage_capacity_sqft=random.randint(2000, 10000),
            daily_order_capacity=random.randint(200, 1000),
            staff_count=random.randint(10, 50),
            avg_delivery_time_mins=random.uniform(10, 25),
            avg_rating=random.uniform(3.5, 4.9),
            total_orders_served=random.randint(1000, 50000),
            date_opened=fake.date_between(start_date='-2y', end_date='today'),
            source='seed_data'
        )
        
        stores.append(store)
        store_code += 1
    
    session.bulk_save_objects(stores)
    session.commit()
    print(f"✓ Seeded {len(stores)} dark stores")


def seed_pincode_coverage(session: Session, count: int = 1000):
    """Seed PIN code coverage data."""
    print(f"Seeding {count} PIN codes...")
    
    pincodes = []
    
    for _ in range(count):
        tier = random.choice(list(CITIES.keys()))
        city = random.choice(CITIES[tier])
        
        # Coverage based on tier
        coverage_prob = {'Metro': 0.7, 'Tier1': 0.4, 'Tier2': 0.2, 'Tier3': 0.1}
        has_coverage = random.random() < coverage_prob[tier]
        
        platforms = [False, False, False, False]
        if has_coverage:
            num_platforms = random.choices([1, 2, 3, 4], weights=[0.4, 0.3, 0.2, 0.1])[0]
            for i in random.sample(range(4), num_platforms):
                platforms[i] = True
        
        pincode = PincodeCoverage(
            pincode=f"{random.randint(100000, 999999)}",
            city=city,
            state=fake.state(),
            district=fake.city(),
            latitude=random.uniform(8.0, 35.0),
            longitude=random.uniform(68.0, 97.0),
            city_tier=CityTierEnum[tier.upper()],
            population=random.randint(50000, 500000),
            households=random.randint(10000, 100000),
            avg_household_income=random.randint(30000, 150000),
            literacy_rate=random.uniform(60.0, 95.0),
            internet_penetration=random.uniform(40.0, 90.0),
            smartphone_penetration=random.uniform(50.0, 85.0),
            blinkit=platforms[0],
            zepto=platforms[1],
            instamart=platforms[2],
            flipkart_min=platforms[3],
            coverage_score=sum(platforms),
            nearest_store_distance_km=random.uniform(0.5, 15.0) if has_coverage else random.uniform(10.0, 50.0),
            estimated_daily_orders=random.randint(100, 5000) if has_coverage else 0,
            market_potential_score=random.uniform(5.0, 10.0),
            competition_intensity=random.uniform(0.0, 1.0)
        )
        
        pincodes.append(pincode)
    
    session.bulk_save_objects(pincodes)
    session.commit()
    print(f"✓ Seeded {len(pincodes)} PIN codes")


def seed_products(session: Session, count: int = 500):
    """Seed product catalog."""
    print(f"Seeding {count} products...")
    
    products = []
    product_id = 1000
    
    for category, items in PRODUCT_CATEGORIES.items():
        for item in items:
            for _ in range(random.randint(3, 8)):  # Multiple variants
                brand = random.choice(BRANDS)
                mrp = random.uniform(10, 500)
                discount = random.uniform(0, 0.3)
                
                product = Product(
                    product_id=f"PRD{product_id}",
                    name=f"{brand} {item}",
                    description=fake.sentence(),
                    brand=brand,
                    category=category,
                    subcategory=item,
                    weight=random.uniform(0.1, 5.0),
                    weight_unit=random.choice(['kg', 'g', 'L', 'ml']),
                    pack_size=random.choice(['1 pc', '500g', '1kg', '2L', '250ml']),
                    mrp=mrp,
                    selling_price=mrp * (1 - discount),
                    is_active=random.choice([True, True, True, False]),
                    is_perishable=category in ['Dairy', 'Fruits', 'Vegetables'],
                    shelf_life_days=random.randint(1, 365) if category in ['Dairy', 'Fruits', 'Vegetables'] else None
                )
                
                products.append(product)
                product_id += 1
                
                if len(products) >= count:
                    break
            if len(products) >= count:
                break
        if len(products) >= count:
            break
    
    session.bulk_save_objects(products)
    session.commit()
    print(f"✓ Seeded {len(products)} products")


def seed_orders(session: Session, count: int = 10000):
    """Seed orders."""
    print(f"Seeding {count} orders...")
    
    # Get stores and pincodes
    stores = session.query(DarkStore).filter(DarkStore.is_active == True).all()
    pincodes = session.query(PincodeCoverage).limit(100).all()
    
    if not stores or not pincodes:
        print("⚠ No stores or pincodes found. Seed those first.")
        return
    
    orders = []
    order_num = 10000
    
    # Generate orders for last 90 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    
    for _ in range(count):
        store = random.choice(stores)
        pincode = random.choice(pincodes)
        order_dt = fake.date_time_between(start_date=start_date, end_date=end_date)
        
        subtotal = random.uniform(200, 2000)
        discount = subtotal * random.uniform(0, 0.2)
        delivery_fee = random.choice([0, 20, 30, 40])
        tax = (subtotal - discount) * 0.05
        
        order = Order(
            order_number=f"ORD{order_num}",
            store_id=store.id,
            pincode=pincode.pincode,
            delivery_latitude=pincode.latitude + random.uniform(-0.01, 0.01),
            delivery_longitude=pincode.longitude + random.uniform(-0.01, 0.01),
            customer_id=f"CUST{random.randint(1000, 9999)}",
            is_first_order=random.choice([True, False]),
            platform=store.platform,
            order_date=order_dt.date(),
            order_time=order_dt.time(),
            order_datetime=order_dt,
            total_items=random.randint(1, 15),
            category=random.choice(list(PRODUCT_CATEGORIES.keys())),
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            discount=discount,
            tax=tax,
            total_amount=subtotal - discount + delivery_fee + tax,
            payment_method=random.choice(['UPI', 'Card', 'COD', 'Wallet']),
            is_paid=random.choice([True, True, True, False]),
            status=random.choice(list(OrderStatusEnum)),
            estimated_delivery_mins=random.randint(10, 30),
            actual_delivery_mins=random.randint(8, 35),
            delivery_distance_km=random.uniform(0.5, 7.0),
            customer_rating=random.uniform(3.0, 5.0),
            delivery_rating=random.uniform(3.5, 5.0),
            day_of_week=order_dt.strftime('%A'),
            is_weekend=order_dt.weekday() >= 5,
            is_holiday=random.choice([True, False, False, False]),
            hour_of_day=order_dt.hour
        )
        
        orders.append(order)
        order_num += 1
    
    session.bulk_save_objects(orders)
    session.commit()
    print(f"✓ Seeded {len(orders)} orders")


def seed_user_reviews(session: Session, count: int = 2000):
    """Seed user reviews."""
    print(f"Seeding {count} reviews...")
    
    reviews = []
    
    positive_reviews = [
        "Fast delivery! Got my order in 10 minutes.",
        "Great service and fresh products.",
        "Love the convenience. Will order again!",
        "Excellent app experience.",
        "Quick and reliable service."
    ]
    
    negative_reviews = [
        "Delivery was late by 30 minutes.",
        "Some items were missing from my order.",
        "Poor quality vegetables.",
        "App keeps crashing.",
        "Customer service needs improvement."
    ]
    
    for _ in range(count):
        rating = random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.1, 0.15, 0.3, 0.4])[0]
        
        if rating >= 4:
            review_text = random.choice(positive_reviews)
            sentiment_score = random.uniform(0.5, 1.0)
            sentiment_label = 'positive'
        elif rating <= 2:
            review_text = random.choice(negative_reviews)
            sentiment_score = random.uniform(-1.0, -0.3)
            sentiment_label = 'negative'
        else:
            review_text = "Average experience. Could be better."
            sentiment_score = random.uniform(-0.2, 0.2)
            sentiment_label = 'neutral'
        
        review = UserReview(
            platform=random.choice(list(PlatformEnum)),
            review_text=review_text,
            rating=rating,
            sentiment_score=sentiment_score,
            sentiment_label=sentiment_label,
            review_category=random.choice(['delivery', 'quality', 'app', 'general']),
            mentions_delivery=random.choice([True, False]),
            mentions_quality=random.choice([True, False]),
            mentions_price=random.choice([True, False]),
            mentions_app=random.choice([True, False]),
            city=random.choice([city for cities in CITIES.values() for city in cities]),
            review_date=fake.date_between(start_date='-1y', end_date='today'),
            source='app_store',
            is_verified=random.choice([True, True, False]),
            helpful_count=random.randint(0, 100)
        )
        
        reviews.append(review)
    
    session.bulk_save_objects(reviews)
    session.commit()
    print(f"✓ Seeded {len(reviews)} reviews")


def main():
    """Main seeding function."""
    print("="*60)
    print("SEEDING ENHANCED DATABASE")
    print("="*60)
    print()
    
    engine = create_engine(DATABASE_URL, echo=False)
    
    # Create tables
    print("Creating tables...")
    Base.metadata.create_all(engine)
    print("✓ Tables created")
    print()
    
    session = Session(engine)
    
    try:
        # Seed in order (respecting foreign keys)
        seed_dark_stores(session, count=500)
        seed_pincode_coverage(session, count=1000)
        seed_products(session, count=500)
        seed_orders(session, count=10000)
        seed_user_reviews(session, count=2000)
        
        print()
        print("="*60)
        print("✓ DATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print("="*60)
        print()
        print("Summary:")
        print(f"  - Dark Stores: 500")
        print(f"  - PIN Codes: 1,000")
        print(f"  - Products: 500")
        print(f"  - Orders: 10,000")
        print(f"  - Reviews: 2,000")
        print()
        
    except Exception as e:
        print(f"\n✗ Error during seeding: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
