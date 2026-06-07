from backend.database.db import execute_query

def get_leaves_by_employee(emp_id):
    """Fetch leave requests for a single employee."""
    query = """
        SELECT l.*, e.first_name as approver_first, e.last_name as approver_last
        FROM `leaves` l
        LEFT JOIN `employees` e ON l.approved_by = e.id
        WHERE l.employee_id = %s
        ORDER BY l.created_at DESC
    """
    return execute_query(query, (emp_id,), fetch='all')

def get_all_leaves():
    """Fetch all leave requests for administrative/HR overview."""
    query = """
        SELECT l.*, 
               e.first_name, e.last_name, e.department,
               app.first_name as approver_first, app.last_name as approver_last
        FROM `leaves` l
        LEFT JOIN `employees` e ON l.employee_id = e.id
        LEFT JOIN `employees` app ON l.approved_by = app.id
        ORDER BY l.created_at DESC
    """
    return execute_query(query, fetch='all')

def create_leave_request(emp_id, leave_type, start_date, end_date, reason):
    """Create a new leave request."""
    try:
        leave_id = execute_query(
            """INSERT INTO `leaves` (`employee_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`)
               VALUES (%s, %s, %s, %s, %s, 'pending')""",
            (emp_id, leave_type, start_date, end_date, reason),
            commit=True
        )
        return leave_id
    except Exception as e:
        print(f"Error creating leave request: {e}")
        return None

def update_leave_status(leave_id, status, approved_by_emp_id):
    """Approve or reject a leave request."""
    try:
        execute_query(
            "UPDATE `leaves` SET `status` = %s, `approved_by` = %s WHERE `id` = %s",
            (status, approved_by_emp_id, leave_id),
            commit=True
        )
        return True
    except Exception as e:
        print(f"Error updating leave status: {e}")
        return False

def get_leave_stats():
    """Fetch analytics aggregate statistics for leaves."""
    stats = {}
    
    # Status count
    status_counts = execute_query(
        "SELECT `status`, COUNT(*) as count FROM `leaves` GROUP BY `status`"
    )
    for row in status_counts:
        stats[f"status_{row['status']}"] = row['count']
        
    # Types count
    type_counts = execute_query(
        "SELECT `leave_type`, COUNT(*) as count FROM `leaves` GROUP BY `leave_type`"
    )
    for row in type_counts:
        stats[f"type_{row['leave_type']}"] = row['count']
        
    return stats
