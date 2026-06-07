import os
import sys
from flask import Flask, jsonify, session, request

# Adjust path to import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import Config
from backend.database.db import init_db, execute_query
from backend.routes.auth import auth_bp
from backend.routes.employee import employee_bp
from backend.routes.leave import leave_bp
from backend.routes.task import task_bp
from backend.routes.ai import ai_bp

# Set static folder pointing to the frontend directory
app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.config.from_object(Config)

# Register API blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(employee_bp, url_prefix='/api/employees')
app.register_blueprint(leave_bp, url_prefix='/api/leaves')
app.register_blueprint(task_bp, url_prefix='/api/tasks')
app.register_blueprint(ai_bp, url_prefix='/api/ai')

# Initialize DB on startup
with app.app_context():
    init_db()

# --- Serve Frontend Pages ---
@app.route('/')
def route_landing():
    return app.send_static_file('index.html')

@app.route('/login')
def route_login():
    return app.send_static_file('login.html')

@app.route('/dashboard')
def route_dashboard():
    return app.send_static_file('dashboard.html')

@app.route('/employees')
def route_employees():
    return app.send_static_file('employees.html')

@app.route('/leaves')
def route_leaves():
    return app.send_static_file('leaves.html')

@app.route('/tasks')
def route_tasks():
    return app.send_static_file('tasks.html')

# --- Additional Core API endpoints ---

@app.route('/api/notifications', methods=['GET'])
def list_notifications():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    emp_id = session.get('employee_id')
    if not emp_id:
        return jsonify([])
        
    notifications = execute_query(
        "SELECT * FROM `notifications` WHERE `employee_id` = %s ORDER BY `created_at` DESC LIMIT 10",
        (emp_id,),
        fetch='all'
    )
    for n in notifications:
        n['created_at'] = n['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
    return jsonify(notifications)

@app.route('/api/notifications/read', methods=['POST'])
def mark_notifications_read():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    emp_id = session.get('employee_id')
    if not emp_id:
        return jsonify({"error": "No associated employee"}), 400
        
    execute_query(
        "UPDATE `notifications` SET `is_read` = TRUE WHERE `employee_id` = %s",
        (emp_id,),
        commit=True
    )
    return jsonify({"message": "Notifications marked as read"})

@app.route('/api/automation-logs', methods=['GET'])
def list_automation_logs():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Restrict automation logs to managers
    if session.get('role') not in ('hr', 'admin'):
        return jsonify({"error": "Access Denied"}), 403
        
    logs = execute_query(
        "SELECT * FROM `automation_logs` ORDER BY `created_at` DESC LIMIT 20",
        fetch='all'
    )
    for l in logs:
        l['created_at'] = l['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
    return jsonify(logs)

@app.route('/api/dashboard/kpis', methods=['GET'])
def get_dashboard_kpis():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    # Standard metrics
    emp_count = execute_query("SELECT COUNT(*) as count FROM `employees` WHERE `status` = 'active'", fetch='one')['count']
    pending_leaves = execute_query("SELECT COUNT(*) as count FROM `leaves` WHERE `status` = 'pending'", fetch='one')['count']
    
    # Task completion
    task_rows = execute_query("SELECT `status`, COUNT(*) as count FROM `tasks` GROUP BY `status`")
    task_stats = {'todo': 0, 'in_progress': 0, 'completed': 0}
    total_tasks = 0
    for r in task_rows:
        if r['status'] in task_stats:
            task_stats[r['status']] = r['count']
        total_tasks += r['count']
        
    task_rate = 0.0
    if total_tasks > 0:
        task_rate = round((task_stats['completed'] / total_tasks) * 100, 1)
        
    # Attendance Rate today
    today_str = os.getenv('CURRENT_DATE_MOCK', '') or None # can mock if needed
    attendance_grid = execute_query(
        "SELECT COUNT(*) as count FROM `attendance` WHERE `date` = CURDATE() AND `status` IN ('present', 'late')",
        fetch='one'
    )
    today_present = attendance_grid['count'] if attendance_grid else 0
    
    # Recent Activities Feed (combination of leaves and tasks)
    recent_activities = []
    
    leaves_act = execute_query("""
        SELECT CONCAT(e.first_name, ' ', e.last_name) as title, 
               CONCAT('Applied for ', l.leave_type, ' leave (Status: ', l.status, ')') as description, 
               l.created_at
        FROM `leaves` l
        JOIN `employees` e ON l.employee_id = e.id
        ORDER BY l.created_at DESC LIMIT 5
    """)
    for a in leaves_act:
        a['type'] = 'leave'
        a['created_at'] = a['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        recent_activities.append(a)
        
    tasks_act = execute_query("""
        SELECT title, CONCAT('Status: ', status, ' (Priority: ', priority, ')') as description, created_at
        FROM `tasks`
        ORDER BY created_at DESC LIMIT 5
    """)
    for a in tasks_act:
        a['type'] = 'task'
        a['created_at'] = a['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        recent_activities.append(a)
        
    recent_activities.sort(key=lambda x: x['created_at'], reverse=True)
    recent_activities = recent_activities[:7]
    
    return jsonify({
        "employee_count": emp_count,
        "pending_leaves": pending_leaves,
        "task_completion_rate": task_rate,
        "today_attendance": today_present,
        "task_stats": task_stats,
        "recent_activities": recent_activities
    })

if __name__ == '__main__':
    # Start on port 5173 in debug mode
    app.run(host='0.0.0.0', port=5173, debug=True)
