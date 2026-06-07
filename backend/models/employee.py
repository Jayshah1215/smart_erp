from backend.database.db import execute_query
from datetime import datetime

def get_all_employees():
    """Fetch all employees with role details from user table."""
    query = """
        SELECT e.*, u.username, u.role
        FROM `employees` e
        LEFT JOIN `users` u ON e.user_id = u.id
        ORDER BY e.id ASC
    """
    return execute_query(query, fetch='all')

def get_employee_by_id(emp_id):
    """Fetch employee by ID."""
    query = """
        SELECT e.*, u.username, u.role
        FROM `employees` e
        LEFT JOIN `users` u ON e.user_id = u.id
        WHERE e.id = %s
    """
    return execute_query(query, (emp_id,), fetch='one')

def get_employee_by_user_id(user_id):
    """Fetch employee linked to a User ID."""
    query = """
        SELECT e.*, u.username, u.role
        FROM `employees` e
        LEFT JOIN `users` u ON e.user_id = u.id
        WHERE e.user_id = %s
    """
    return execute_query(query, (user_id,), fetch='one')

def create_employee(user_id, first_name, last_name, email, phone=None, department=None, position=None, joining_date=None, status='active'):
    """Insert employee details."""
    if not joining_date:
        joining_date = datetime.now().date().strftime('%Y-%m-%d')
    try:
        emp_id = execute_query(
            """INSERT INTO `employees` (`user_id`, `first_name`, `last_name`, `email`, `phone`, `department`, `position`, `joining_date`, `status`)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (user_id, first_name, last_name, email, phone, department, position, joining_date, status),
            commit=True
        )
        return emp_id
    except Exception as e:
        print(f"Error creating employee: {e}")
        return None

def update_employee(emp_id, first_name, last_name, email, phone=None, department=None, position=None, status='active'):
    """Update employee details."""
    try:
        execute_query(
            """UPDATE `employees`
               SET `first_name` = %s, `last_name` = %s, `email` = %s, `phone` = %s, `department` = %s, `position` = %s, `status` = %s
               WHERE `id` = %s""",
            (first_name, last_name, email, phone, department, position, status, emp_id),
            commit=True
        )
        return True
    except Exception as e:
        print(f"Error updating employee: {e}")
        return False

# Attendance Operations
def get_attendance_today(emp_id, date_str=None):
    """Get check-in details for an employee today."""
    if not date_str:
        date_str = datetime.now().date().strftime('%Y-%m-%d')
    return execute_query(
        "SELECT * FROM `attendance` WHERE `employee_id` = %s AND `date` = %s",
        (emp_id, date_str),
        fetch='one'
    )

def log_check_in(emp_id, date_str, time_str, status='present'):
    """Insert check in record."""
    try:
        attn_id = execute_query(
            "INSERT INTO `attendance` (`employee_id`, `date`, `check_in`, `status`) VALUES (%s, %s, %s, %s)",
            (emp_id, date_str, time_str, status),
            commit=True
        )
        return attn_id
    except Exception as e:
        print(f"Error checking in: {e}")
        return None

def log_check_out(emp_id, date_str, time_str):
    """Update check out record."""
    try:
        execute_query(
            "UPDATE `attendance` SET `check_out` = %s WHERE `employee_id` = %s AND `date` = %s",
            (time_str, emp_id, date_str),
            commit=True
        )
        return True
    except Exception as e:
        print(f"Error checking out: {e}")
        return False

def get_employee_attendance_history(emp_id, limit=30):
    """Get history of check-ins for employee."""
    return execute_query(
        "SELECT * FROM `attendance` WHERE `employee_id` = %s ORDER BY `date` DESC LIMIT %s",
        (emp_id, limit),
        fetch='all'
    )

def get_all_attendance_today(date_str=None):
    """Get attendance grid for all employees for dashboard."""
    if not date_str:
        date_str = datetime.now().date().strftime('%Y-%m-%d')
    query = """
        SELECT e.id, e.first_name, e.last_name, e.department, a.check_in, a.check_out, a.status
        FROM `employees` e
        LEFT JOIN `attendance` a ON e.id = a.employee_id AND a.date = %s
        WHERE e.status = 'active'
    """
    return execute_query(query, (date_str,), fetch='all')
