from flask import Flask, render_template, jsonify, request
from flask.json.provider import DefaultJSONProvider
import decimal
import datetime
from db import get_connection
import re

def is_valid_name(name):
    if not name or not isinstance(name, str):
        return False
    return bool(re.match(r"^[A-Za-z ]+$", name))

def is_valid_phone(phone):
    if not phone or not isinstance(phone, str):
        return False
    return bool(re.match(r"^[0-9]{10}$", phone))

def is_valid_number(val, min_val=0, max_val=None):
    try:
        f_val = float(val)
        if f_val < min_val:
            return False
        if max_val is not None and f_val > max_val:
            return False
        return True
    except (ValueError, TypeError):
        return False

def auto_assign_queued_orders(cursor):
    """
    Finds free delivery agents (order_id IS NULL) and assigns them to the oldest active, 
    unassigned orders (status NOT IN ('Delivered', 'Cancelled') and not assigned to anyone).
    """
    # Find all free delivery persons
    cursor.execute("SELECT delivery_id FROM delivery_person WHERE order_id IS NULL ORDER BY delivery_id ASC")
    free_agents = [row[0] for row in cursor.fetchall()]
    
    if not free_agents:
        return
        
    # Find the oldest active unassigned orders
    query = """
        SELECT order_id 
        FROM orders 
        WHERE order_status NOT IN ('Delivered', 'Cancelled')
          AND order_id NOT IN (
              SELECT order_id 
              FROM delivery_person 
              WHERE order_id IS NOT NULL
          )
        ORDER BY order_id ASC
        LIMIT %s
    """
    cursor.execute(query, (len(free_agents),))
    queued_orders = [row[0] for row in cursor.fetchall()]
    
    # Pair them up
    for agent_id, order_id in zip(free_agents, queued_orders):
        cursor.execute(
            "UPDATE delivery_person SET order_id = %s WHERE delivery_id = %s",
            (order_id, agent_id)
        )



app = Flask(__name__)

# Configure custom JSON encoder to handle MySQL Decimal and DateTime types
class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        return super().default(obj)

app.json = CustomJSONProvider(app)

# Add CORS headers to support cross-origin API calls (e.g. from VS Code Live Server on port 5500)
@app.after_request
def enable_cors(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# --- WEB PAGE ROUTE ---
@app.route('/')
def home():
    return render_template('index.html')


# --- API ENDPOINTS ---

# ==================== CUSTOMERS ====================
@app.route('/api/customers', methods=['GET'])
def get_customers():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM customer ORDER BY customer_id DESC")
        customers = cursor.fetchall()
        cursor.close(); conn.close()
        return jsonify(customers)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/customers', methods=['POST'])
def add_customer():
    try:
        data = request.json
        name = data.get('name')
        phone_number = data.get('phone_number')
        address = data.get('address')
        
        if not name or not phone_number or not address:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_name(name):
            return jsonify({"error": "Invalid name. Name must contain only alphabetical characters and spaces."}), 400
            
        if not is_valid_phone(phone_number):
            return jsonify({"error": "Invalid phone number. Phone number must be exactly 10 digits."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO customer (name, phone_number, address) VALUES (%s, %s, %s)",
            (name, phone_number, address)
        )
        conn.commit()
        customer_id = cursor.lastrowid
        cursor.close(); conn.close()
        return jsonify({"message": "Customer added successfully", "customer_id": customer_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    try:
        data = request.json
        name = data.get('name')
        phone_number = data.get('phone_number')
        address = data.get('address')
        
        if not name or not phone_number or not address:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_name(name):
            return jsonify({"error": "Invalid name. Name must contain only alphabetical characters and spaces."}), 400
            
        if not is_valid_phone(phone_number):
            return jsonify({"error": "Invalid phone number. Phone number must be exactly 10 digits."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE customer SET name = %s, phone_number = %s, address = %s WHERE customer_id = %s",
            (name, phone_number, address, customer_id)
        )
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Customer updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM customer WHERE customer_id = %s", (customer_id,))
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Customer deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== FOOD ITEMS ====================
@app.route('/api/food_items', methods=['GET'])
def get_food_items():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM food_item ORDER BY food_id DESC")
        food_items = cursor.fetchall()
        cursor.close(); conn.close()
        return jsonify(food_items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/food_items', methods=['POST'])
def add_food_item():
    try:
        data = request.json
        food_name = data.get('food_name')
        price = data.get('price')
        availability_status = data.get('availability_status', 'Available')
        
        if not food_name or price is None:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_name(food_name):
            return jsonify({"error": "Invalid food name. Food name must contain only alphabetical characters and spaces."}), 400
            
        if not is_valid_number(price, min_val=0):
            return jsonify({"error": "Invalid price. Price must be a positive number."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO food_item (food_name, price, availability_status) VALUES (%s, %s, %s)",
            (food_name, price, availability_status)
        )
        conn.commit()
        food_id = cursor.lastrowid
        cursor.close(); conn.close()
        return jsonify({"message": "Food item added successfully", "food_id": food_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/food_items/<int:food_id>', methods=['PUT'])
def update_food_item(food_id):
    try:
        data = request.json
        food_name = data.get('food_name')
        price = data.get('price')
        availability_status = data.get('availability_status')
        
        if not food_name or price is None or not availability_status:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_name(food_name):
            return jsonify({"error": "Invalid food name. Food name must contain only alphabetical characters and spaces."}), 400
            
        if not is_valid_number(price, min_val=0):
            return jsonify({"error": "Invalid price. Price must be a positive number."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE food_item SET food_name = %s, price = %s, availability_status = %s WHERE food_id = %s",
            (food_name, price, availability_status, food_id)
        )
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Food item updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/food_items/<int:food_id>', methods=['DELETE'])
def delete_food_item(food_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM food_item WHERE food_id = %s", (food_id,))
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Food item deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== DELIVERY APPS ====================
@app.route('/api/apps', methods=['GET'])
def get_apps():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM food_delivery_app ORDER BY app_id DESC")
        apps = cursor.fetchall()
        cursor.close(); conn.close()
        return jsonify(apps)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/apps', methods=['POST'])
def add_app():
    try:
        data = request.json
        app_name = data.get('app_name')
        contact_number = data.get('contact_number')
        ratings = data.get('ratings', 0.0)
        
        if not app_name or not contact_number:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_name(app_name):
            return jsonify({"error": "Invalid app name. App name must contain only alphabetical characters and spaces."}), 400
            
        if not is_valid_phone(contact_number):
            return jsonify({"error": "Invalid contact number. Contact number must be exactly 10 digits."}), 400
            
        if not is_valid_number(ratings, min_val=0, max_val=5):
            return jsonify({"error": "Invalid ratings. Ratings must be a number between 0.0 and 5.0."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO food_delivery_app (app_name, contact_number, ratings) VALUES (%s, %s, %s)",
            (app_name, contact_number, ratings)
        )
        conn.commit()
        app_id = cursor.lastrowid
        cursor.close(); conn.close()
        return jsonify({"message": "App added successfully", "app_id": app_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/apps/<int:app_id>', methods=['PUT'])
def update_app(app_id):
    try:
        data = request.json
        app_name = data.get('app_name')
        contact_number = data.get('contact_number')
        ratings = data.get('ratings')
        
        if not app_name or not contact_number or ratings is None:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_name(app_name):
            return jsonify({"error": "Invalid app name. App name must contain only alphabetical characters and spaces."}), 400
            
        if not is_valid_phone(contact_number):
            return jsonify({"error": "Invalid contact number. Contact number must be exactly 10 digits."}), 400
            
        if not is_valid_number(ratings, min_val=0, max_val=5):
            return jsonify({"error": "Invalid ratings. Ratings must be a number between 0.0 and 5.0."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE food_delivery_app SET app_name = %s, contact_number = %s, ratings = %s WHERE app_id = %s",
            (app_name, contact_number, ratings, app_id)
        )
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "App updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/apps/<int:app_id>', methods=['DELETE'])
def delete_app(app_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM food_delivery_app WHERE app_id = %s", (app_id,))
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "App deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== ORDERS ====================
@app.route('/api/orders', methods=['GET'])
def get_orders():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        # Query orders joined with customer, food_item, and food_delivery_app for detail display
        query = """
            SELECT o.*, 
                   c.name as customer_name, c.phone_number as customer_phone,
                   f.food_name, f.price as food_price,
                   a.app_name
            FROM orders o
            LEFT JOIN customer c ON o.customer_id = c.customer_id
            LEFT JOIN food_item f ON o.food_id = f.food_id
            LEFT JOIN food_delivery_app a ON o.app_id = a.app_id
            ORDER BY o.order_id DESC
        """
        cursor.execute(query)
        orders = cursor.fetchall()
        cursor.close(); conn.close()
        return jsonify(orders)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders', methods=['POST'])
def add_order():
    try:
        data = request.json
        order_amount = data.get('order_amount')
        customer_id = data.get('customer_id')
        food_id = data.get('food_id')
        app_id = data.get('app_id')
        order_status = data.get('order_status', 'Pending')
        
        if order_amount is None or not customer_id or not food_id or not app_id:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_number(order_amount, min_val=0):
            return jsonify({"error": "Invalid order amount. Amount must be a positive number."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO orders (order_amount, customer_id, food_id, app_id, order_status) 
               VALUES (%s, %s, %s, %s, %s)""",
            (order_amount, customer_id, food_id, app_id, order_status)
        )
        order_id = cursor.lastrowid
        auto_assign_queued_orders(cursor)
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Order placed successfully", "order_id": order_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    try:
        data = request.json
        order_amount = data.get('order_amount')
        customer_id = data.get('customer_id')
        food_id = data.get('food_id')
        app_id = data.get('app_id')
        order_status = data.get('order_status')
        
        if order_amount is None or not customer_id or not food_id or not app_id or not order_status:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_number(order_amount, min_val=0):
            return jsonify({"error": "Invalid order amount. Amount must be a positive number."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE orders 
               SET order_amount = %s, customer_id = %s, food_id = %s, app_id = %s, order_status = %s 
               WHERE order_id = %s""",
            (order_amount, customer_id, food_id, app_id, order_status, order_id)
        )
        
        if order_status in ('Delivered', 'Cancelled'):
            # Free any delivery person assigned to this order
            cursor.execute("UPDATE delivery_person SET order_id = NULL WHERE order_id = %s", (order_id,))
            
        auto_assign_queued_orders(cursor)
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Order updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM orders WHERE order_id = %s", (order_id,))
        auto_assign_queued_orders(cursor)
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Order deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== DELIVERY AGENTS ====================
@app.route('/api/delivery_persons', methods=['GET'])
def get_delivery_persons():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        # Query agents and join their current assigned order info
        query = """
            SELECT dp.*, o.order_status, c.name as customer_name
            FROM delivery_person dp
            LEFT JOIN orders o ON dp.order_id = o.order_id
            LEFT JOIN customer c ON o.customer_id = c.customer_id
            ORDER BY dp.delivery_id DESC
        """
        cursor.execute(query)
        agents = cursor.fetchall()
        cursor.close(); conn.close()
        return jsonify(agents)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/delivery_persons', methods=['POST'])
def add_delivery_person():
    try:
        data = request.json
        name = data.get('name')
        phone_number = data.get('phone_number')
        vehicle_type = data.get('vehicle_type')
        order_id = data.get('order_id')  # Can be None/null
        
        # order_id could be empty string from a form, convert to None
        if order_id == "" or order_id == "None":
            order_id = None
            
        if not name or not phone_number or not vehicle_type:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_name(name):
            return jsonify({"error": "Invalid name. Name must contain only alphabetical characters and spaces."}), 400
            
        if not is_valid_phone(phone_number):
            return jsonify({"error": "Invalid phone number. Phone number must be exactly 10 digits."}), 400
            
        if vehicle_type not in ('Bike', 'Scooter', 'Cycle'):
            return jsonify({"error": "Invalid vehicle type. Allowed options: Bike, Scooter, Cycle."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO delivery_person (name, phone_number, vehicle_type, order_id) VALUES (%s, %s, %s, %s)",
            (name, phone_number, vehicle_type, order_id)
        )
        auto_assign_queued_orders(cursor)
        conn.commit()
        delivery_id = cursor.lastrowid
        cursor.close(); conn.close()
        return jsonify({"message": "Delivery person added successfully", "delivery_id": delivery_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/delivery_persons/<int:delivery_id>', methods=['PUT'])
def update_delivery_person(delivery_id):
    try:
        data = request.json
        name = data.get('name')
        phone_number = data.get('phone_number')
        vehicle_type = data.get('vehicle_type')
        order_id = data.get('order_id')
        
        if order_id == "" or order_id == "None" or order_id is None:
            order_id = None
            
        if not name or not phone_number or not vehicle_type:
            return jsonify({"error": "Missing required fields"}), 400
            
        if not is_valid_name(name):
            return jsonify({"error": "Invalid name. Name must contain only alphabetical characters and spaces."}), 400
            
        if not is_valid_phone(phone_number):
            return jsonify({"error": "Invalid phone number. Phone number must be exactly 10 digits."}), 400
            
        if vehicle_type not in ('Bike', 'Scooter', 'Cycle'):
            return jsonify({"error": "Invalid vehicle type. Allowed options: Bike, Scooter, Cycle."}), 400
            
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE delivery_person SET name = %s, phone_number = %s, vehicle_type = %s, order_id = %s WHERE delivery_id = %s",
            (name, phone_number, vehicle_type, order_id, delivery_id)
        )
        auto_assign_queued_orders(cursor)
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Delivery person updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/delivery_persons/<int:delivery_id>', methods=['DELETE'])
def delete_delivery_person(delivery_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM delivery_person WHERE delivery_id = %s", (delivery_id,))
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Delivery person deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- RUN BACKEND SERVER ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
