# Smart ERP - AI-Powered Business Management System

A dark-themed, glassmorphic Single Page Application styled Dashboard system powered by a Python/Flask backend, MySQL database, and Google Gemini 1.5 Flash API.

## Features
1. **User Authentication:** Session-based authentication with role-based access control (Admin, HR, Employee).
2. **Employee Management:** Directory list with real-time searches, profiles, and attendance status check-ins.
3. **Leave Planner:** Apply for casual or sick leaves. Managers receive database notifications and emails to approve/reject.
4. **Task Kanban Board:** Interactive columns (To Do, In Progress, Completed). Updating to Completed triggers workflow emails.
5. **AI Assistant Co-pilot:** Connected to Gemini 1.5 Flash. Instantly drafts HR policies, drafts emails, summarizes report text, and answers company FAQs (falls back to smart local offline templates if key is missing).
6. **Automation Workflow Timeline:** Real-time log audits visible to managers documenting automated system background actions.

---

## Tech Stack
* **Frontend:** Vanilla HTML5, Vanilla CSS3 (Glassmorphism), Vanilla JavaScript, Chart.js.
* **Backend:** Python 3.10+, Flask.
* **Database:** MySQL 8.0 / MariaDB (PyMySQL connector).
* **AI Integration:** Google Gemini API (via HTTP requests).

---

## Getting Started (Local Run)

### 1. Pre-requisites
Make sure you have **Python** and **MySQL Server** installed and running on your system.
* MySQL Password: Ensure your MySQL password is set (or configured in `backend/.env`).
* PyMySQL: Installed via requirements.

### 2. Configure Environment variables
Navigate to `backend/.env` and update credentials if needed:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=12345678
DB_NAME=smart_erp

# To enable real Gemini AI, input your API key here:
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install dependencies & Run
Open terminal in the project directory:
```powershell
# Navigate to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the Flask server
python app.py
```
Flask will boot up at **`http://127.0.0.1:5000/`**.
Upon starting, the backend will **automatically create the `smart_erp` database** and execute `database/schema.sql` and `database/sample_data.sql` to initialize tables and seed data.

---

## Pre-seeded Accounts (For Testing)
All accounts are pre-seeded with the password: **`password123`**

| Role | Username | Full Name | Department |
| ---- | -------- | --------- | ---------- |
| **System Admin** | `admin` | System Admin | Executive |
| **HR Manager** | `hr_sarah` | Sarah Jenkins | Human Resources |
| **Employee** | `emp_john` | John Doe | Engineering |
| **Employee** | `emp_alice` | Alice Smith | Marketing |
| **Employee** | `emp_david` | David Miller | Engineering |

---

## Running with Docker

Orchestrate the application using Docker:
```bash
# Navigate to docker folder
cd docker

# Build and start services
docker-compose up --build
```
This launches a MySQL container and binds it to the Flask container, serving the application at **`http://localhost:5000/`**.
