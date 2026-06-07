from flask import Blueprint, request, jsonify, session
from backend.models.task import (
    get_tasks_by_employee, get_all_tasks, create_task, update_task_status, get_task_stats, get_task_by_id
)
from backend.services.workflow_service import trigger_task_completed_workflow

task_bp = Blueprint('task', __name__)

def check_login():
    return 'user_id' in session

def is_hr_or_admin():
    return session.get('role') in ('hr', 'admin')

@task_bp.route('/', methods=['GET'])
def list_tasks():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
        
    emp_id = session.get('employee_id')
    
    # Managers see all tasks, employees see assigned tasks
    if is_hr_or_admin():
        tasks = get_all_tasks()
    else:
        tasks = get_tasks_by_employee(emp_id)
        
    # Format dates
    for t in tasks:
        t['due_date'] = t['due_date'].strftime('%Y-%m-%d')
        t['created_at'] = t['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
    return jsonify(tasks)

@task_bp.route('/create', methods=['POST'])
def create():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
    if not is_hr_or_admin():
        return jsonify({"error": "Access Denied. Only HR or Admin can assign tasks."}), 403
        
    data = request.get_json() or {}
    title = data.get('title')
    description = data.get('description', '')
    assigned_to = data.get('assigned_to') # employee ID
    due_date = data.get('due_date')
    priority = data.get('priority', 'medium')
    
    assigned_by = session.get('employee_id')
    
    if not all([title, assigned_to, due_date]):
        return jsonify({"error": "Missing required fields (title, assigned_to, due_date)"}), 400
        
    task_id = create_task(title, description, assigned_to, assigned_by, due_date, priority)
    if not task_id:
        return jsonify({"error": "Database error while assigning task."}), 500
        
    return jsonify({
        "message": "Task created and assigned successfully.",
        "task_id": task_id
    }), 201

@task_bp.route('/update-status/<int:task_id>', methods=['POST', 'PUT'])
def update_status(task_id):
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json() or {}
    status = data.get('status')
    
    if status not in ('todo', 'in_progress', 'completed'):
        return jsonify({"error": "Invalid status value (todo, in_progress, completed)"}), 400
        
    task = get_task_by_id(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    # Check authorization: Assignee or Assigner or HR/Admin
    emp_id = session.get('employee_id')
    if task['assigned_to'] != emp_id and task['assigned_by'] != emp_id and not is_hr_or_admin():
        return jsonify({"error": "Unauthorized to update this task."}), 403
        
    success = update_task_status(task_id, status)
    if not success:
        return jsonify({"error": "Failed to update task status."}), 500
        
    # Trigger Completed Workflow if status changed to 'completed'
    if status == 'completed' and task['status'] != 'completed':
        trigger_task_completed_workflow(task_id)
        
    return jsonify({
        "message": f"Task status updated to '{status}'.",
        "task_id": task_id,
        "status": status
    })

@task_bp.route('/stats', methods=['GET'])
def stats():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(get_task_stats())
