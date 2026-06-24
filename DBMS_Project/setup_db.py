import mysql.connector
import sys

# Try importing from local directory
try:
    from db import get_connection
except ImportError:
    # Fallback in case of path issues
    def get_connection():
        return mysql.connector.connect(
            host='localhost',
            user='root',
            password='root',
            database='food_delivary'
        )

def setup_database():
    print("Connecting to the database...")
    try:
        conn = get_connection()
    except Exception as e:
        print(f"Could not connect to database: {e}")
        print("Please make sure MySQL is running on localhost:3306 with root user.")
        sys.exit(1)
        
    cursor = conn.cursor()
    print("Database connected. Temporarily disabling foreign key checks...")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    
    # 1. Drop existing tables
    tables_to_drop = [
        "delivery_person",
        "delivay_person",
        "orders",
        "order",    
        "customer",
        "food_item",
        "food_delivery_app",
        "delivery_app"
    ]
    
    for table in tables_to_drop:
        try:
            cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
            print(f"  Dropped table (if existed): {table}")
        except mysql.connector.Error as err:
            print(f"  Error dropping {table}: {err}")
            
    print("\nCreating new database tables based on specs...")
    
    # 2. Create customer table
    cursor.execute("""
    CREATE TABLE customer (
        customer_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        address TEXT NOT NULL,
        CONSTRAINT chk_customer_name CHECK (name REGEXP '^[A-Za-z ]+$'),
        CONSTRAINT chk_customer_phone CHECK (phone_number REGEXP '^[0-9]{10}$')
    ) ENGINE=InnoDB;
    """)
    print("  Created table: customer")
    
    # 3. Create food_item table
    cursor.execute("""
    CREATE TABLE food_item (
        food_id INT AUTO_INCREMENT PRIMARY KEY,
        food_name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        availability_status VARCHAR(20) DEFAULT 'Available',
        CONSTRAINT chk_food_name CHECK (food_name REGEXP '^[A-Za-z ]+$'),
        CONSTRAINT chk_food_price CHECK (price >= 0)
    ) ENGINE=InnoDB;
    """)
    print("  Created table: food_item")
    
    # 4. Create food_delivery_app table
    cursor.execute("""
    CREATE TABLE food_delivery_app (
        app_id INT AUTO_INCREMENT PRIMARY KEY,
        app_name VARCHAR(100) NOT NULL,
        contact_number VARCHAR(15) NOT NULL,
        ratings DECIMAL(3, 2) DEFAULT 0.00,
        CONSTRAINT chk_app_name CHECK (app_name REGEXP '^[A-Za-z ]+$'),
        CONSTRAINT chk_app_phone CHECK (contact_number REGEXP '^[0-9]{10}$'),
        CONSTRAINT chk_app_ratings CHECK (ratings >= 0.0 AND ratings <= 5.0)
    ) ENGINE=InnoDB;
    """)
    print("  Created table: food_delivery_app")
    
    # 5. Create orders table (references customer, food_item, food_delivery_app)
    # Using 'orders' to avoid conflicts with SQL keyword ORDER
    cursor.execute("""
    CREATE TABLE orders (
        order_id INT AUTO_INCREMENT PRIMARY KEY,
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        order_amount DECIMAL(10, 2) NOT NULL,
        customer_id INT,
        order_status VARCHAR(20) DEFAULT 'Pending',
        food_id INT,
        app_id INT,
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE,
        FOREIGN KEY (food_id) REFERENCES food_item(food_id) ON DELETE CASCADE,
        FOREIGN KEY (app_id) REFERENCES food_delivery_app(app_id) ON DELETE CASCADE,
        CONSTRAINT chk_orders_amount CHECK (order_amount >= 0)
    ) ENGINE=InnoDB;
    """)
    print("  Created table: orders")
    
    # 6. Create delivery_person table (references orders)
    cursor.execute("""
    CREATE TABLE delivery_person (
        delivery_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        vehicle_type VARCHAR(50) NOT NULL,
        order_id INT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL,
        CONSTRAINT chk_dp_name CHECK (name REGEXP '^[A-Za-z ]+$'),
        CONSTRAINT chk_dp_phone CHECK (phone_number REGEXP '^[0-9]{10}$'),
        CONSTRAINT chk_dp_vehicle CHECK (vehicle_type IN ('Bike', 'Scooter', 'Cycle'))
    ) ENGINE=InnoDB;
    """)
    print("  Created table: delivery_person")
    
    print("\nSeeding database with sample entries...")
    
    # Seed Customers
    customers_data = [
        ("Rahul Sharma", "9876543210", "12, MG Road, Bangalore"),
        ("Priya Patel", "9123456789", "45, Linking Road, Mumbai"),
        ("Amit Kumar", "9988776655", "7, Connaught Place, Delhi"),
        ("Sneha Reddy", "9555123456", "88, Banjara Hills, Hyderabad"),
        ("Vikram Singh", "9444321098", "23, Anna Nagar, Chennai")
    ]
    cursor.executemany(
        "INSERT INTO customer (name, phone_number, address) VALUES (%s, %s, %s)",
        customers_data
    )
    print(f"  Seeded {cursor.rowcount} Customers")
    
    # Seed Food Items
    food_data = [
        ("Butter Chicken", 280.00, "Available"),
        ("Masala Dosa", 120.00, "Available"),
        ("Paneer Tikka Pizza", 350.00, "Available"),
        ("Veg Burger Combo", 150.00, "Available"),
        ("Hyderabadi Biryani", 320.00, "Available"),
        ("Chocolate Brownie", 90.00, "Unavailable")
    ]
    cursor.executemany(
        "INSERT INTO food_item (food_name, price, availability_status) VALUES (%s, %s, %s)",
        food_data
    )
    print(f"  Seeded {cursor.rowcount} Food Items")
    
    # Seed Food Delivery Apps
    apps_data = [
        ("Swiggy", "9876500001", 4.5),
        ("Zomato", "9876500002", 4.4),
        ("Zepto Cafe", "9876500003", 4.3),
        ("Blinkit Eats", "9876500004", 4.1)
    ]
    cursor.executemany(
        "INSERT INTO food_delivery_app (app_name, contact_number, ratings) VALUES (%s, %s, %s)",
        apps_data
    )
    print(f"  Seeded {cursor.rowcount} Delivery Apps")
    
    # Seed Orders
    # We map orders to the auto-incremented customer, food, and app IDs
    orders_data = [
        (560.00, 1, "Delivered", 1, 1), # Rahul, Butter Chicken, Swiggy
        (120.00, 2, "Out for Delivery", 2, 2), # Priya, Masala Dosa, Zomato
        (350.00, 3, "Preparing", 3, 1), # Amit, Pizza, Swiggy
        (960.00, 4, "Confirmed", 5, 3), # Sneha, Biryani (qty 3 = 960), Zepto
        (300.00, 5, "Pending", 4, 2) # Vikram, Burger (qty 2 = 300), Zomato
    ]
    cursor.executemany(
        "INSERT INTO orders (order_amount, customer_id, order_status, food_id, app_id) VALUES (%s, %s, %s, %s, %s)",
        orders_data
    )
    print(f"  Seeded {cursor.rowcount} Orders")
    
    # Seed Delivery Personnel (referencing orders if appropriate)
    delivery_data = [
        ("Raju Bhai", "9111222333", "Bike", 1), # Assigned to Order 1 (Rahul)
        ("Kiran Das", "9222333444", "Scooter", 2), # Assigned to Order 2 (Priya)
        ("Mohan Lal", "9333444555", "Bike", 3), # Assigned to Order 3 (Amit)
        ("Deepak Yadav", "9444555666", "Scooter", None) # Free agent
    ]
    cursor.executemany(
        "INSERT INTO delivery_person (name, phone_number, vehicle_type, order_id) VALUES (%s, %s, %s, %s)",
        delivery_data
    )
    print(f"  Seeded {cursor.rowcount} Delivery Agents")
    
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    conn.commit()
    cursor.close()
    conn.close()
    print("\nDatabase initialization complete! Everything is configured successfully.")

if __name__ == "__main__":
    setup_database()
