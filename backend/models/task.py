from backend.database.db import execute_query

def get_tasks_by_employee(emp_id):
    """Fetch all tasks assigned to an employee."""
    query = """
        SELECT t.*, 
               e_by.first_name as creator_first, e_by.last_name as creator_last
        FROM `tasks` t
        LEFT JOIN `employees` e_by ON t.assigned_by = e_by.id
        WHERE t.assigned_to = %s
        ORDER BY t.due_date ASC, t.priority DESC
    """
    return execute_query(query, (emp_id,), fetch='all')

def get_all_tasks():
    """Fetch all system tasks with details of assignee and assigner."""
    query = """
        SELECT t.*,
               e_to.first_name as assignee_first, e_to.last_name as assignee_last, e_to.department,
               e_by.first_name as creator_first, e_by.last_name as creator_last
        FROM `tasks` t
        LEFT JOIN `employees` e_to ON t.assigned_to = e_to.id
        LEFT JOIN `employees` e_by ON t.assigned_by = e_by.id
        ORDER BY t.created_at DESC
    """
    return execute_query(query, fetch='all')

def create_task(title, description, assigned_to, assigned_by, due_date, priority='medium'):
    """Create a new task in the database."""
    try:
        task_id = execute_query(
            """INSERT INTO `tasks` (`title`, `description`, `assigned_to`, `assigned_by`, `due_date`, `priority`, `status`)
               VALUES (%s, %s, %s, %s, %s, %s, 'todo')""",
            (title, description, assigned_to, assigned_by, due_date, priority),
            commit=True
        )
        return task_id
    except Exception as e:
        print(f"Error creating task: {e}")
        return None

def update_task_status(task_id, status):
    """Modify the current status of a task."""
    try:
        execute_query(
            "UPDATE `tasks` SET `status` = %s WHERE `id` = %s",
            (status, task_id),
            commit=True
        )
        return True
    except Exception as e:
        print(f"Error updating task status: {e}")
        return False

def get_task_by_id(task_id):
    """Fetch a single task details."""
    query = """
        SELECT t.*, 
               e_to.first_name as assignee_first, e_to.last_name as assignee_last, e_to.email as assignee_email,
               e_by.first_name as creator_first, e_by.last_name as creator_last
        FROM `tasks` t
        LEFT JOIN `employees` e_to ON t.assigned_to = e_to.id
        LEFT JOIN `employees` e_by ON t.assigned_by = e_by.id
        WHERE t.id = %s
    """
    return execute_query(query, (task_id,), fetch='one')

def get_task_stats():
    """Fetch completion rates and aggregates for dashboard widgets."""
    stats = {
        'todo': 0,
        'in_progress': 0,
        'completed': 0,
        'total': 0,
        'completion_rate': 0.0
    }
    
    query = "SELECT `status`, COUNT(*) as count FROM `tasks` GROUP BY `status`"
    rows = execute_query(query)
    
    total = 0
    for row in rows:
        status = row['status']
        count = row['count']
        if status in stats:
            stats[status] = count
        total += count
        
    stats['total'] = total
    if total > 0:
        stats['completion_rate'] = round((stats['completed'] / total) * 100, 1)
        
    return stats
