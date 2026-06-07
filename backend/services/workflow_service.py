from backend.database.db import execute_query
from backend.services.email_service import send_welcome_email, send_leave_notification, send_task_completed_email

def trigger_new_employee_workflow(employee_id):
    """Fires when a new employee is registered. Sends welcome email."""
    # Fetch employee details
    emp = execute_query("SELECT * FROM `employees` WHERE `id` = %s", (employee_id,), fetch='one')
    if not emp:
        return False
    
    full_name = f"{emp['first_name']} {emp['last_name']}"
    # Send welcome email (logs automation)
    send_welcome_email(emp['email'], full_name)
    
    # Insert initial system notification
    execute_query(
        "INSERT INTO `notifications` (`employee_id`, `message`) VALUES (%s, %s)",
        (employee_id, f"Welcome to Smart ERP, {full_name}! Complete your profile details and log your attendance today."),
        commit=True
    )
    return True

def trigger_leave_request_workflow(leave_id):
    """Fires when an employee submits a leave request. Notifies HR/Managers."""
    # Fetch leave and applicant details
    query = """
        SELECT l.*, e.first_name, e.last_name, e.department
        FROM `leaves` l
        LEFT JOIN `employees` e ON l.employee_id = e.id
        WHERE l.id = %s
    """
    leave = execute_query(query, (leave_id,), fetch='one')
    if not leave:
        return False
    
    applicant_name = f"{leave['first_name']} {leave['last_name']}"
    
    # Fetch HR/Managers to notify. For simplicity, we will query all users with role 'hr' or 'admin'
    managers = execute_query(
        "SELECT e.id, e.email, e.first_name, e.last_name FROM `employees` e JOIN `users` u ON e.user_id = u.id WHERE u.role IN ('hr', 'admin')"
    )
    
    # Notify managers via DB and Email log
    for manager in managers:
        # DB notification
        msg = f"New leave request ({leave['leave_type']}) submitted by {applicant_name} ({leave['department']}). Review pending."
        execute_query(
            "INSERT INTO `notifications` (`employee_id`, `message`) VALUES (%s, %s)",
            (manager['id'], msg),
            commit=True
        )
        
        # Email simulation log
        mgr_name = f"{manager['first_name']} {manager['last_name']}"
        send_leave_notification(
            manager['email'],
            mgr_name,
            applicant_name,
            leave['leave_type'],
            leave['start_date'].strftime('%Y-%m-%d'),
            leave['end_date'].strftime('%Y-%m-%d')
        )
    return True

def trigger_task_completed_workflow(task_id):
    """Fires when a task status changes to 'completed'. Notifies the creator."""
    query = """
        SELECT t.*, 
               e_to.first_name as assignee_first, e_to.last_name as assignee_last,
               e_by.first_name as creator_first, e_by.last_name as creator_last, e_by.email as creator_email
        FROM `tasks` t
        LEFT JOIN `employees` e_to ON t.assigned_to = e_to.id
        LEFT JOIN `employees` e_by ON t.assigned_by = e_by.id
        WHERE t.id = %s
    """
    task = execute_query(query, (task_id,), fetch='one')
    if not task:
        return False
    
    assignee_name = f"{task['assignee_first']} {task['assignee_last']}"
    creator_name = f"{task['creator_first']} {task['creator_last']}"
    
    # Create DB notification for assigner
    msg = f"Task '{task['title']}' has been marked COMPLETED by {assignee_name}."
    execute_query(
        "INSERT INTO `notifications` (`employee_id`, `message`) VALUES (%s, %s)",
        (task['assigned_by'], msg),
        commit=True
    )
    
    # Send email log
    send_task_completed_email(
        task['creator_email'],
        creator_name,
        assignee_name,
        task['title']
    )
    return True
