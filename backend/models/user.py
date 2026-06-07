import hashlib
from backend.database.db import execute_query

def hash_password(password):
    """Generate SHA-256 hash of a password."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def create_user(username, password, role='employee'):
    """Create a new user with hashed password."""
    password_hash = hash_password(password)
    try:
        user_id = execute_query(
            "INSERT INTO `users` (`username`, `password_hash`, `role`) VALUES (%s, %s, %s)",
            (username, password_hash, role),
            commit=True
        )
        return user_id
    except Exception as e:
        print(f"Error creating user: {e}")
        return None

def verify_user(username, password):
    """Verify user credentials. Returns user dict or None if invalid."""
    user = execute_query(
        "SELECT * FROM `users` WHERE `username` = %s",
        (username,),
        fetch='one'
    )
    if not user:
        return None
    
    hashed_input = hash_password(password)
    if user['password_hash'] == hashed_input:
        # Don't return password hash
        user.pop('password_hash', None)
        return user
    return None

def get_user_by_id(user_id):
    """Fetch user by primary key."""
    user = execute_query(
        "SELECT `id`, `username`, `role`, `created_at` FROM `users` WHERE `id` = %s",
        (user_id,),
        fetch='one'
    )
    return user

def get_user_by_username(username):
    """Fetch user details by username."""
    user = execute_query(
        "SELECT `id`, `username`, `role`, `created_at` FROM `users` WHERE `username` = %s",
        (username,),
        fetch='one'
    )
    return user
