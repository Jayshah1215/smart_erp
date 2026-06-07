import time
from backend.database.db import execute_query

def log_automation(event_type, description):
    """Save an automation activity to DB."""
    try:
        execute_query(
            "INSERT INTO `automation_logs` (`event_type`, `description`) VALUES (%s, %s)",
            (event_type, description),
            commit=True
        )
        print(f"[Automation Logged] {event_type}: {description}")
    except Exception as e:
        print(f"Error logging automation: {e}")

def send_welcome_email(employee_email, employee_name):
    """Simulate sending a welcome email to a new employee."""
    subject = "Welcome to the Smart ERP Team!"
    body = f"""
    Hi {employee_name},
    
    Welcome to our company! Your profile has been successfully set up on the Smart ERP portal.
    You can now log in, record your daily attendance, request leaves, and review your tasks.
    
    If you have any questions, feel free to reach out to the HR department.
    
    Best Regards,
    The Management Team
    """
    
    # Simulate API latency
    print(f"SMTP: Sending email to {employee_email}...")
    print(f"Subject: {subject}")
    
    log_desc = f"New Employee Welcome Email automatically sent to {employee_name} ({employee_email})."
    log_automation("Welcome Email Automation", log_desc)
    return True

def send_leave_notification(manager_email, manager_name, employee_name, leave_type, start, end):
    """Simulate sending email notifying manager about a leave request."""
    subject = f"Action Required: New Leave Request from {employee_name}"
    body = f"""
    Hi {manager_name},
    
    {employee_name} has requested {leave_type} leave starting from {start} to {end}.
    
    Please log in to the Smart ERP Dashboard to review and approve or reject this request.
    
    Best Regards,
    Smart ERP Workflows
    """
    
    print(f"SMTP: Sending leave email to manager {manager_email}...")
    log_desc = f"Workflow trigger: Leave request from {employee_name} forwarded to manager {manager_name} for approval."
    log_automation("Leave Request Workflow", log_desc)
    return True

def send_task_completed_email(creator_email, creator_name, employee_name, task_title):
    """Simulate sending email notifying a manager that their assigned task is completed."""
    subject = f"Notification: Task '{task_title}' Completed"
    body = f"""
    Hi {creator_name},
    
    {employee_name} has marked the task '{task_title}' as completed.
    
    Please review the task progress on your Kanban board.
    
    Best Regards,
    Smart ERP Workflows
    """
    
    print(f"SMTP: Sending task email to {creator_email}...")
    log_desc = f"Workflow trigger: Notification email sent to {creator_name} for completed task '{task_title}'."
    log_automation("Task Completed Workflow", log_desc)
    return True
