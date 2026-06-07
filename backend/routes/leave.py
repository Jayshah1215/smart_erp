from flask import Blueprint, request, jsonify, session
from backend.models.leave import (
    get_leaves_by_employee, get_all_leaves, create_leave_request, update_leave_status, get_leave_stats
)
from backend.services.workflow_service import trigger_leave_request_workflow

leave_bp = Blueprint('leave', __name__)

def check_login():
    return 'user_id' in session

def is_hr_or_admin():
    return session.get('role') in ('hr', 'admin')

@leave_bp.route('/', methods=['GET'])
def list_leaves():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
        
    emp_id = session.get('employee_id')
    
    # HR/Admin gets all records, standard employee only gets their own
    if is_hr_or_admin():
        leaves = get_all_leaves()
    else:
        leaves = get_leaves_by_employee(emp_id)
        
    # Format dates to string
    for l in leaves:
        l['start_date'] = l['start_date'].strftime('%Y-%m-%d')
        l['end_date'] = l['end_date'].strftime('%Y-%m-%d')
        l['created_at'] = l['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
    return jsonify(leaves)

@leave_bp.route('/apply', methods=['POST'])
def apply_leave():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
        
    emp_id = session.get('employee_id')
    if not emp_id:
        return jsonify({"error": "No associated employee record"}), 400
        
    data = request.get_json() or {}
    leave_type = data.get('leave_type')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    reason = data.get('reason', '')
    
    if not all([leave_type, start_date, end_date]):
        return jsonify({"error": "Missing required fields (leave_type, start_date, end_date)"}), 400
        
    leave_id = create_leave_request(emp_id, leave_type, start_date, end_date, reason)
    if not leave_id:
        return jsonify({"error": "Database error while creating leave request"}), 500
        
    # Trigger leave request workflow (sends DB notifications and emails managers)
    trigger_leave_request_workflow(leave_id)
    
    return jsonify({
        "message": "Leave request submitted successfully.",
        "leave_id": leave_id
    }), 201

@leave_bp.route('/approve/<int:leave_id>', methods=['POST'])
def approve_leave(leave_id):
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
    if not is_hr_or_admin():
        return jsonify({"error": "Access Denied. Management role required."}), 403
        
    approver_emp_id = session.get('employee_id')
    success = update_leave_status(leave_id, 'approved', approver_emp_id)
    if success:
        return jsonify({"message": "Leave request approved successfully."})
    return jsonify({"error": "Failed to update leave status."}), 500

@leave_bp.route('/reject/<int:leave_id>', methods=['POST'])
def reject_leave(leave_id):
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
    if not is_hr_or_admin():
        return jsonify({"error": "Access Denied. Management role required."}), 403
        
    approver_emp_id = session.get('employee_id')
    success = update_leave_status(leave_id, 'rejected', approver_emp_id)
    if success:
        return jsonify({"message": "Leave request rejected successfully."})
    return jsonify({"error": "Failed to update leave status."}), 500

@leave_bp.route('/stats', methods=['GET'])
def stats_leaves():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(get_leave_stats())
