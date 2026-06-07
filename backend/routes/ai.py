from flask import Blueprint, request, jsonify, session
from backend.services.ai_service import (
    generate_hr_policy, generate_employee_email, summarize_report, answer_company_faq
)

ai_bp = Blueprint('ai', __name__)

def check_login():
    return 'user_id' in session

@ai_bp.route('/generate-policy', methods=['POST'])
def policy():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json() or {}
    topic = data.get('topic')
    if not topic:
        return jsonify({"error": "Topic is required"}), 400
        
    result = generate_hr_policy(topic)
    return jsonify({"result": result})

@ai_bp.route('/generate-email', methods=['POST'])
def email():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json() or {}
    context = data.get('context')
    tone = data.get('tone', 'professional')
    if not context:
        return jsonify({"error": "Context is required"}), 400
        
    result = generate_employee_email(context, tone)
    return jsonify({"result": result})

@ai_bp.route('/summarize-report', methods=['POST'])
def summarize():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json() or {}
    report_text = data.get('report_text')
    if not report_text:
        return jsonify({"error": "Report text is required"}), 400
        
    result = summarize_report(report_text)
    return jsonify({"result": result})

@ai_bp.route('/answer-faq', methods=['POST'])
def faq():
    if not check_login():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json() or {}
    question = data.get('question')
    if not question:
        return jsonify({"error": "Question is required"}), 400
        
    result = answer_company_faq(question)
    return jsonify({"result": result})
