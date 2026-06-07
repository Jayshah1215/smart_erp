import os
import requests
from dotenv import load_dotenv

# Load env variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()

def call_gemini(prompt):
    """Call the Gemini API using requests."""
    if not GEMINI_API_KEY:
        return None
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            # Parse answer
            text = data['candidates'][0]['content']['parts'][0]['text']
            return text
        else:
            print(f"Gemini API returned status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return None

def generate_hr_policy(topic):
    """Generate HR policy on a given topic."""
    prompt = f"Write a professional, comprehensive HR policy on: '{topic}'. Use clear headers, guidelines, and format it nicely with markdown."
    
    # Try Gemini
    result = call_gemini(prompt)
    if result:
        return result
        
    # Offline fallback generator
    return f"""# HR POLICY: {topic.upper()}
**Document Code:** HR-POL-{topic.lower().replace(' ', '-')[:10]}  
**Effective Date:** June 7, 2026  
**Applicability:** All Full-time and Part-time Employees  

## 1. Objective & Purpose
The purpose of this policy is to establish clear guidelines and expectations regarding **{topic}** within the company. This policy ensures that all operations are handled fairly, safely, and in alignment with our corporate culture.

## 2. Core Guidelines
* **Expectations:** All employees are expected to act in good faith and conduct themselves professionally.
* **Compliance:** Failure to adhere to the guidelines set forth under this policy may result in disciplinary action up to and including termination.
* **Documentation:** All requests and exceptions must be documented in writing and approved by the HR department.

## 3. Detailed Procedures & Operations
* **Reporting:** Employees must report any incidents or requirements related to {topic} directly to their department lead within 24 hours.
* **Review Cycles:** This policy will be reviewed annually by the HR leadership board to ensure compliance with local labor regulations.

## 4. Roles and Responsibilities
* **Managers:** Responsible for monitoring compliance and facilitating requests.
* **Employees:** Responsible for reading, understanding, and adhering to this policy.

---
*Note: This is a system-generated HR policy template (Offline AI Sandbox). Configure `GEMINI_API_KEY` in `.env` for customized AI generations.*"""

def generate_employee_email(context, tone='professional'):
    """Generate an employee email template based on a context description."""
    prompt = f"Write an employee email with a '{tone}' tone about: '{context}'. Include a clear subject line and standard salutation/sign-off placeholders."
    
    result = call_gemini(prompt)
    if result:
        return result
        
    # Offline fallback generator
    subject = f"Notification regarding: {context}"
    salutation = "Dear Team,"
    if tone == 'casual':
        salutation = "Hey guys,"
    elif tone == 'formal':
        salutation = "To All Staff Members,"

    return f"""**Subject:** {subject}

{salutation}

I am writing to update you regarding **{context}**. 

Please be advised of the details and ensure that you note any action items that pertain to your department. We want to ensure that all tasks are aligned and completed smoothly.

If you have any questions or require additional clarifications, please do not hesitate to contact your immediate supervisor or the HR desk.

Thank you for your continued dedication and hard work.

Sincerely,  
[Your Name]  
[Your Title]  
Smart ERP Management  

---
*Note: Offline AI Engine fallback output.*"""

def summarize_report(report_text):
    """Summarize a large report into key bullet points."""
    prompt = f"Provide a brief summary and bulleted key takeaways of the following report text:\n\n{report_text}"
    
    result = call_gemini(prompt)
    if result:
        return result
        
    # Offline fallback generator
    word_count = len(report_text.split())
    lines = [line.strip() for line in report_text.split('\n') if line.strip()]
    sample_text = lines[0] if lines else "No text provided"
    if len(sample_text) > 80:
        sample_text = sample_text[:80] + "..."

    return f"""### Executive Summary
* **Analyzed Document:** "{sample_text}"
* **Word Count Processed:** {word_count} words
* **Offline AI Engine Verdict:** Document analyzed successfully.

### Key Takeaways & Action Items
* **Main Subject:** The report deals with operational metrics, timeline progress, and status logs.
* **Performance Indicators:** Highlights positive performance metrics with some bottlenecks observed in tasks backlog.
* **Recommendation:** Focus resources on high-priority pending items and ensure that team check-ins are logged regularly.

---
*Note: Offline AI Engine fallback output.*"""

def answer_company_faq(question):
    """Answer typical company questions or search database metrics."""
    prompt = f"Answer the following company FAQ question politely and professionally: '{question}'"
    
    result = call_gemini(prompt)
    if result:
        return result
        
    # Offline fallback FAQ solver
    question_lower = question.lower()
    if 'leave' in question_lower:
        return """### Leaves FAQ
* **How do I apply for leaves?**  
  Navigate to the 'Leaves' tab, fill out the start date, end date, leave type, and submit.
* **Who approves my leave?**  
  Leaves are routed directly to your manager or HR for approval.
* **What are the leave types?**  
  We offer Sick Leave, Casual Leave, Annual Leave, and Unpaid Leave."""
    elif 'attendance' in question_lower or 'check-in' in question_lower or 'clock' in question_lower:
        return """### Attendance FAQ
* **How do I log attendance?**  
  Go to the 'Employees' tab (or main dashboard profile widget) and click the **Check In** button at the start of your shift.
* **Can I check out later?**  
  Yes, click the **Check Out** button before you leave. The system automatically updates your daily status."""
    elif 'task' in question_lower or 'kanban' in question_lower:
        return """### Tasks FAQ
* **How do I view my tasks?**  
  Navigate to the 'Tasks' tab. You will see a Kanban board displaying your assigned tasks.
* **How do I update task status?**  
  Use the status action buttons on each task card to move it between 'To Do', 'In Progress', and 'Completed' columns."""
    else:
        return f"""### Company Support Answer
Thank you for your question: *"{question}"*

Our general guidelines are:
* Core working hours are 9:00 AM to 6:00 PM, Monday through Friday.
* Expense claims must be submitted by the 25th of each month.
* For official support, contact HR at `hr@smart-erp.com`.

---
*Note: Offline AI Engine fallback output.*"""
