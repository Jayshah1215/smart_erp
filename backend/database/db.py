import os
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

# Load env variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '12345678')
DB_NAME = os.getenv('DB_NAME', 'smart_erp')

def get_raw_connection(use_db=True):
    """Get a direct connection to MySQL server."""
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME if use_db else None,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def execute_query(query, params=None, commit=False, fetch='all'):
    """Helper to execute SQL queries and handle connection safety."""
    connection = get_raw_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params or ())
            if commit:
                connection.commit()
                return cursor.lastrowid
            
            if fetch == 'all':
                return cursor.fetchall()
            elif fetch == 'one':
                return cursor.fetchone()
            return None
    except Exception as e:
        print(f"Database query error: {e}")
        raise e
    finally:
        connection.close()

def init_db():
    """Create database, tables, and seed sample data if not initialized."""
    # Step 1: Connect to server without specifying DB, to create DB
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            charset='utf8mb4'
        )
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        connection.commit()
        connection.close()
        print(f"Database '{DB_NAME}' created or verified.")
    except Exception as e:
        print(f"Error creating database: {e}")
        return

    # Step 2: Check if tables exist by querying users table
    try:
        execute_query("SELECT 1 FROM `users` LIMIT 1", fetch='one')
        print("Database schema already initialized.")
    except Exception:
        print("Database tables not found. Initializing schema and seed data...")
        
        # Paths to SQL files
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        schema_path = os.path.join(base_dir, 'database', 'schema.sql')
        sample_path = os.path.join(base_dir, 'database', 'sample_data.sql')

        # Run schema DDL
        if os.path.exists(schema_path):
            run_sql_file(schema_path)
            print("Database schema.sql applied successfully.")
        else:
            print(f"Error: schema.sql not found at {schema_path}")

        # Run sample data DML
        if os.path.exists(sample_path):
            run_sql_file(sample_path)
            print("Database sample_data.sql applied successfully.")
        else:
            print(f"Error: sample_data.sql not found at {sample_path}")

def run_sql_file(file_path):
    """Executes a multi-query SQL file by splitting queries."""
    connection = get_raw_connection()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        # Simple SQL parser to split queries by ';' but handle edge cases slightly
        # Remove SQL comments
        queries = []
        current_query = []
        in_trigger = False # simple state to skip split inside triggers/procedures if any
        
        for line in sql_content.split('\n'):
            stripped = line.strip()
            if not stripped or stripped.startswith('--') or stripped.startswith('#'):
                continue
            
            # Simple delimiter check
            current_query.append(line)
            if stripped.endswith(';'):
                queries.append('\n'.join(current_query))
                current_query = []

        with connection.cursor() as cursor:
            # Disable foreign key checks momentarily for cleaner seed truncate
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            for query in queries:
                if query.strip():
                    cursor.execute(query)
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        connection.commit()
    except Exception as e:
        connection.rollback()
        print(f"Error executing SQL file {file_path}: {e}")
        raise e
    finally:
        connection.close()
