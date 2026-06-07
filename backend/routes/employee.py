from flask import Blueprint, request, jsonify, session
from backend.models.employee import (
    get_all_employees, get_employee_by_id, get_employee_by_user_id,
    create_employee, update_employee, get_attendance_today, log_check_in, log_check_out,
    get_employee_attendance_history, get_all_attendance_today
)
from backend.models.user import create_user
from backend.services.workflow_service import trigger_new_employee_workflow
from datetime import datetime

employee_bp = Blueprint('employee', __name__)

def check_login():
    """Helper to check if user is logged in."""
    return 'user_id' in session

def is_hr_or_admin():
    """Helper to check if user has managerial roles."""
    return session.get('role') in ('hr', 'admin')

@employee_bp.route('/', methods=['GET'])
def list_employees():
    if not check_login():
        return jsonify({"error": "Unauthorized. Please log in."}), 401
    return jsonify(get_all_employees())

@employee_bp.route('/<int:emp_id>', methods=['GET'])
def get_profile(emp_id):
    if not check_login():
        return jsonify({"error": "Unauthorized."}), 401
    
    # Employees can only view their own profile, unless they are HR/Admin
    if not is_hr_or_admin() and session.get('employee_id') != emp_id:
        return jsonify({"error": "Access Denied."}), 403
        
    emp = get_employee_by_id(emp_id)
    if not emp:
        return jsonify({"error": "Employee not found."}), 404
    return jsonify(emp)

@employee_bp.route('/add', methods=['POST'])
def add_employee():
    if not check_login():
        return jsonify({"error": "Unauthorized."}), 401
    if not is_hr_or_admin():
        return jsonify({"error": "Access Denied. HR or Admin permissions required."}), 403
        
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password', 'password123') # default password
    role = data.get('role', 'employee')
    
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone', '')
    department = data.get('department', 'Engineering')
    position = data.get('position', 'Developer')
    joining_date = data.get('joining_date')
    
    if not all([username, first_name, last_name, email]):
        return jsonify({"error": "Missing required fields (username, first_name, last_name, email)"}), 400
        
    # Create credentials
    user_id = create_user(username, password, role=role)
    if not user_id:
        return jsonify({"error": "Username already exists or database error"}), 400
        
    # Create employee profile
    emp_id = create_employee(
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        department=department,
        position=position,
        joining_date=joining_date
    )
    if not emp_id:
        return jsonify({"error": "Failed to create profile record"}), 500
        
    # Trigger workflows
    trigger_new_employee_workflow(emp_id)
    
    return jsonify({
        "message": "Employee profile created successfully!",
        "employee_id": emp_id
    }), 201

@employee_bp.route('/update/<int:emp_id>', methods=['POST', 'PUT'])
def update_profile(emp_id):
    if not check_login():
        return jsonify({"error": "Unauthorized."}), 401
    
    # Self-update or HR/Admin update
    if not is_hr_or_admin() and session.get('employee_id') != emp_id:
        return jsonify({"error": "Access Denied."}), 403
        
    data = request.get_json() or {}
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone', '')
    department = data.get('department')
    position = data.get('position')
    status = data.get('status', 'active')
    
    if not all([first_name, last_name, email]):
        return jsonify({"error": "Missing required fields"}), 400
        
    # Fetch old profile to preserve fields if needed
    old_profile = get_employee_by_id(emp_id)
    if not old_profile:
        return jsonify({"error": "Employee not found."}), 404
        
    # Limit department/position/status updates to Managers only
    if not is_hr_or_admin():
        department = old_profile['department']
        position = old_profile['position']
        status = old_profile['status']
        
    success = update_employee(
        emp_id=emp_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        department=department,
        position=position,
        status=status
    )
    
    if success:
        return jsonify({"message": "Employee profile updated successfully."})
    return jsonify({"error": "Database error while updating profile."}), 500

# Attendance API routes
@employee_bp.route('/attendance/today', methods=['GET'])
def attendance_today():
    if not check_login():
        return jsonify({"error": "Unauthorized."}), 401
    
    emp_id = session.get('employee_id')
    if not emp_id:
        return jsonify({"error": "No associated employee record."}), 400
        
    record = get_attendance_today(emp_id)
    # Convert timedelta to string for JSON serialization
    if record:
        if record['check_in']:
            record['check_in'] = str(record['check_in'])
        if record['check_out']:
            record['check_out'] = str(record['check_out'])
            
    return jsonify(record)

@employee_bp.route('/attendance/checkin', methods=['POST'])
def attendance_checkin():
    if not check_login():
        return jsonify({"error": "Unauthorized."}), 401
        
    emp_id = session.get('employee_id')
    if not emp_id:
        return jsonify({"error": "No associated employee record."}), 400
        
    now = datetime.now()
    date_str = now.date().strftime('%Y-%m-%d')
    time_str = now.time().strftime('%H:%M:%S')
    
    # Check if already checked in
    existing = get_attendance_today(emp_id)
    if existing:
        return jsonify({"error": "Already checked in today."}), 400
        
    # Determine status (late after 9:15 AM)
    status = 'present'
    if now.hour > 9 or (now.hour == 9 and now.minute > 15):
        status = 'late'
        
    attn_id = log_check_in(emp_id, date_str, time_str, status)
    if attn_id:
        return jsonify({
            "message": "Checked in successfully.",
            "check_in": time_str,
            "status": status
        })
    return jsonify({"error": "Failed to log attendance check-in."}), 500

@employee_bp.route('/attendance/checkout', methods=['POST'])
def attendance_checkout():
    if not check_login():
        return jsonify({"error": "Unauthorized."}), 401
        
    emp_id = session.get('employee_id')
    if not emp_id:
        return jsonify({"error": "No employee record linked."}), 400
        
    now = datetime.now()
    date_str = now.date().strftime('%Y-%m-%d')
    time_str = now.time().strftime('%H:%M:%S')
    
    existing = get_attendance_today(emp_id)
    if not existing:
        return jsonify({"error": "Cannot check out. No check-in record found for today."}), 400
    if existing['check_out']:
        return jsonify({"error": "Already checked out today."}), 400
        
    success = log_check_out(emp_id, date_str, time_str)
    if success:
        return jsonify({
            "message": "Checked out successfully.",
            "check_out": time_str
        })
    return jsonify({"error": "Failed to log attendance check-out."}), 500

@employee_bp.route('/attendance/history', methods=['GET'])
def attendance_history():
    if not check_login():
        return jsonify({"error": "Unauthorized."}), 401
        
    emp_id = session.get('employee_id')
    history = get_employee_attendance_history(emp_id)
    for h in history:
        h['date'] = h['date'].strftime('%Y-%m-%d')
        if h['check_in']:
            h['check_in'] = str(h['check_in'])
        if h['check_out']:
            h['check_out'] = str(h['check_out'])
            
    return jsonify(history)

@employee_bp.route('/attendance/today-grid', methods=['GET'])
def attendance_grid():
    if not check_login():
        return jsonify({"error": "Unauthorized."}), 401
    if not is_hr_or_admin():
        return jsonify({"error": "Access Denied."}), 403
        
    grid = get_all_attendance_today()
    for row in grid:
        if row['check_in']:
            row['check_in'] = str(row['check_in'])
        if row['check_out']:
            row['check_out'] = str(row['check_out'])
            
    return jsonify(grid)
