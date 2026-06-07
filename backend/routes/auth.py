from flask import Blueprint, request, jsonify, session
from backend.models.user import verify_user, create_user, get_user_by_id
from backend.models.employee import create_employee, get_employee_by_user_id
from backend.services.workflow_service import trigger_new_employee_workflow

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
        
    user = verify_user(username, password)
    if not user:
        return jsonify({"error": "Invalid username or password"}), 401
        
    # Get employee details
    employee = get_employee_by_user_id(user['id'])
    
    # Save session details
    session['user_id'] = user['id']
    session['username'] = user['username']
    session['role'] = user['role']
    session['employee_id'] = employee['id'] if employee else None
    
    return jsonify({
        "message": "Login successful",
        "user": user,
        "employee": employee
    })

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone', '')
    department = data.get('department', 'General')
    position = data.get('position', 'Staff')
    
    if not all([username, password, first_name, last_name, email]):
        return jsonify({"error": "Missing required fields (username, password, first_name, last_name, email)"}), 400
        
    # Create the user login account first
    # Default registered user role is 'employee'
    user_id = create_user(username, password, role='employee')
    if not user_id:
        return jsonify({"error": "Username already exists or failed to create user account"}), 400
        
    # Create matching employee profile record
    emp_id = create_employee(
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        department=department,
        position=position
    )
    
    if not emp_id:
        # Rollback or report error
        return jsonify({"error": "Failed to create employee profile"}), 500
        
    # Trigger Auto welcome workflow
    trigger_new_employee_workflow(emp_id)
    
    return jsonify({
        "message": "User registered successfully! Please log in.",
        "user_id": user_id,
        "employee_id": emp_id
    }), 201

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logout successful"})

@auth_bp.route('/session', methods=['GET'])
def get_session():
    if 'user_id' not in session:
        return jsonify({"authenticated": False}), 401
        
    user = get_user_by_id(session['user_id'])
    if not user:
        session.clear()
        return jsonify({"authenticated": False}), 401
        
    employee = get_employee_by_user_id(session['user_id'])
    
    return jsonify({
        "authenticated": True,
        "user": user,
        "employee": employee
    })
