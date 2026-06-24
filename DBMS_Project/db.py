import mysql.connector
import sys

def get_connection():
    """
    Creates and returns a connection to the local MySQL database 'food_delivary'.
    Tries credentials based on successful diagnostic runs.
    """
    # Order of passwords to try
    passwords = ['root', '', 'admin', 'password', 'your_password']
    
    last_err = None
    for p in passwords:
        try:
            conn = mysql.connector.connect(
                host='localhost',
                user='root',
                password=p,
                database='food_delivary'
            )
            return conn
        except mysql.connector.Error as err:
            # If database doesn't exist, we connect to server first to create it
            if err.errno == 1049: # Unknown database
                try:
                    conn = mysql.connector.connect(
                        host='localhost',
                        user='root',
                        password=p
                    )
                    # Create the database and use it
                    cursor = conn.cursor()
                    cursor.execute("CREATE DATABASE food_delivary")
                    cursor.execute("USE food_delivary")
                    cursor.close()
                    return conn
                except Exception as db_err:
                    last_err = db_err
            else:
                last_err = err
                
    # If root user fails, try other settings or raise
    print(f"Database Connection Error: {last_err}", file=sys.stderr)
    raise last_err
