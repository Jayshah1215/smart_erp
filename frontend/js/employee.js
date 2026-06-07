/* Smart ERP Employee Directory & Attendance Client Logic */

let currentUserSession = null;
let allEmployeesData = [];

// Toast Alert Helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button class="toast-close">&times;</button>
    `;
    container.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Validate session
    async function initSession() {
        try {
            const response = await fetch('/api/auth/session');
            if (!response.ok) {
                window.location.href = '/login';
                return;
            }
            const sessionData = await response.json();
            currentUserSession = sessionData;
            
            // Set Sidebar details
            document.getElementById('sidebar-name').textContent = `${sessionData.employee.first_name} ${sessionData.employee.last_name}`;
            document.getElementById('sidebar-role').textContent = sessionData.user.role;
            document.getElementById('sidebar-avatar').textContent = sessionData.employee.first_name.charAt(0);
            
            // Toggle Manager options
            if (sessionData.user.role === 'hr' || sessionData.user.role === 'admin') {
                document.getElementById('add-employee-btn').classList.remove('hidden');
                document.getElementById('team-attendance-card').classList.remove('hidden');
                loadTeamAttendance();
            }

            // Load contents
            loadAttendanceStatus();
            loadEmployeeDirectory();
            loadPersonalAttendanceLogs();
            loadNotifications();
        } catch (err) {
            console.error(err);
            window.location.href = '/login';
        }
    }

    initSession();

    // Logout
    document.getElementById('logout-button').addEventListener('click', async () => {
        try {
            const res = await fetch('/api/auth/logout', { method: 'POST' });
            if (res.ok) {
                window.location.href = '/login';
            }
        } catch(e) { console.error(e); }
    });

    // --- Clock-in Attendance Widget ---
    const statusDot = document.getElementById('attendance-status-dot');
    const statusLabel = document.getElementById('attendance-status-label');
    const checkinBtn = document.getElementById('checkin-btn');
    const checkoutBtn = document.getElementById('checkout-btn');

    async function loadAttendanceStatus() {
        try {
            const response = await fetch('/api/employees/attendance/today');
            if (!response.ok) return;
            const data = await response.json();

            // Enable check-in by default if no record
            checkinBtn.disabled = false;
            checkinBtn.classList.remove('hidden');
            checkoutBtn.classList.add('hidden');
            statusDot.className = "status-indicator yellow";
            statusLabel.textContent = "Not Checked In";

            if (data) {
                if (data.check_in && !data.check_out) {
                    // Checked in but not out
                    checkinBtn.classList.add('hidden');
                    checkoutBtn.classList.remove('hidden');
                    statusDot.className = "status-indicator green";
                    statusLabel.textContent = `Checked In (${data.check_in})`;
                } else if (data.check_in && data.check_out) {
                    // Fully checked out today
                    checkinBtn.classList.add('hidden');
                    checkoutBtn.classList.add('hidden');
                    statusDot.className = "status-indicator red";
                    statusLabel.textContent = `Checked Out (${data.check_out})`;
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    checkinBtn.addEventListener('click', async () => {
        checkinBtn.disabled = true;
        try {
            const response = await fetch('/api/employees/attendance/checkin', { method: 'POST' });
            const data = await response.json();
            
            if (response.ok) {
                showToast(`Checked in successfully! Status: ${data.status.toUpperCase()}`, "success");
                loadAttendanceStatus();
                loadPersonalAttendanceLogs();
                if (currentUserSession.user.role === 'hr' || currentUserSession.user.role === 'admin') {
                    loadTeamAttendance();
                }
            } else {
                showToast(data.error || "Failed check-in.", "danger");
                checkinBtn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            checkinBtn.disabled = false;
        }
    });

    checkoutBtn.addEventListener('click', async () => {
        checkoutBtn.disabled = true;
        try {
            const response = await fetch('/api/employees/attendance/checkout', { method: 'POST' });
            const data = await response.json();
            
            if (response.ok) {
                showToast("Checked out successfully.", "success");
                loadAttendanceStatus();
                loadPersonalAttendanceLogs();
                if (currentUserSession.user.role === 'hr' || currentUserSession.user.role === 'admin') {
                    loadTeamAttendance();
                }
            } else {
                showToast(data.error || "Failed check-out.", "danger");
                checkoutBtn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            checkoutBtn.disabled = false;
        }
    });

    // --- Directory Listings ---
    const directoryContainer = document.getElementById('employees-list');
    const searchInput = document.getElementById('employee-search');

    async function loadEmployeeDirectory() {
        try {
            const response = await fetch('/api/employees/');
            if (response.ok) {
                const employees = await response.json();
                allEmployeesData = employees;
                renderDirectory(employees);
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderDirectory(employees) {
        if (employees.length === 0) {
            directoryContainer.innerHTML = `<div class="empty-state">No employees found.</div>`;
            return;
        }

        directoryContainer.innerHTML = employees.map(emp => {
            const initials = emp.first_name.charAt(0) + emp.last_name.charAt(0);
            return `
                <div class="emp-row-card">
                    <div class="emp-profile-block">
                        <div class="emp-avatar">${initials}</div>
                        <div class="emp-text-details">
                            <span class="emp-name">${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</span>
                            <span class="emp-sub">${escapeHtml(emp.position)} &bull; ${escapeHtml(emp.department)}</span>
                        </div>
                    </div>
                    <div class="emp-contact-details">
                        <span>📧 ${escapeHtml(emp.email)}</span>
                        <span>📞 ${escapeHtml(emp.phone || 'N/A')}</span>
                    </div>
                    <div>
                        <span class="emp-status-badge ${emp.status}">${emp.status}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Search bar filter
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = allEmployeesData.filter(emp => {
            const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
            const dept = emp.department.toLowerCase();
            return name.includes(query) || dept.includes(query);
        });
        renderDirectory(filtered);
    });

    // --- Attendance Logs list ---
    const personalLogs = document.getElementById('personal-attendance-list');
    const teamLogs = document.getElementById('team-attendance-list');

    async function loadPersonalAttendanceLogs() {
        try {
            const response = await fetch('/api/employees/attendance/history');
            if (response.ok) {
                const history = await response.json();
                if (history.length === 0) {
                    personalLogs.innerHTML = `<div class="empty-state">No attendance logs.</div>`;
                    return;
                }

                personalLogs.innerHTML = history.map(h => {
                    const statusClass = h.status === 'present' ? 'present' : h.status === 'late' ? 'late' : 'absent';
                    const clockoutText = h.check_out ? `Check Out: ${h.check_out}` : 'No Check Out';
                    return `
                        <div class="attendance-item ${statusClass}">
                            <div>
                                <span class="bold">${h.date}</span>
                                <span class="text-muted small block">Check In: ${h.check_in}</span>
                            </div>
                            <div class="text-right">
                                <span class="badge status-indicator ${statusClass}"></span> ${h.status.toUpperCase()}<br>
                                <span class="text-muted small">${clockoutText}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function loadTeamAttendance() {
        try {
            const response = await fetch('/api/employees/attendance/today-grid');
            if (response.ok) {
                const team = await response.json();
                
                // Filter out those who haven't checked in today
                const activeTeam = team.filter(t => t.status !== null);
                
                if (activeTeam.length === 0) {
                    teamLogs.innerHTML = `<div class="empty-state">No team members checked in today.</div>`;
                    return;
                }

                teamLogs.innerHTML = activeTeam.map(t => {
                    const statusClass = t.status === 'present' ? 'present' : t.status === 'late' ? 'late' : 'absent';
                    const clockout = t.check_out ? `Out: ${t.check_out}` : 'Working';
                    return `
                        <div class="attendance-item ${statusClass}">
                            <div>
                                <span class="bold">${escapeHtml(t.first_name)} ${escapeHtml(t.last_name)}</span>
                                <span class="text-muted small block">${escapeHtml(t.department)}</span>
                            </div>
                            <div class="text-right">
                                <span class="bold">In: ${t.check_in}</span><br>
                                <span class="text-muted small">${clockout}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error(err);
        }
    }

    // --- Modal Add Employee ---
    const addBtn = document.getElementById('add-employee-btn');
    const addModal = document.getElementById('add-employee-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const addForm = document.getElementById('add-employee-form');

    addBtn.addEventListener('click', () => {
        addModal.classList.remove('hidden');
    });

    function closeModal() {
        addModal.classList.add('hidden');
        addForm.reset();
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) closeModal();
    });

    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('emp-username').value.trim();
        const password = document.getElementById('emp-password').value.trim();
        const first_name = document.getElementById('emp-firstname').value.trim();
        const last_name = document.getElementById('emp-lastname').value.trim();
        const email = document.getElementById('emp-email').value.trim();
        const phone = document.getElementById('emp-phone').value.trim();
        const department = document.getElementById('emp-department').value;
        const position = document.getElementById('emp-position').value.trim();
        const role = document.getElementById('emp-role').value;

        try {
            const response = await fetch('/api/employees/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, password, first_name, last_name, email, phone, department, position, role
                })
            });
            const data = await response.json();

            if (response.ok) {
                showToast("Employee profile created successfully!", "success");
                closeModal();
                loadEmployeeDirectory();
            } else {
                showToast(data.error || "Failed to create profile.", "danger");
            }
        } catch (err) {
            showToast("Network connection error.", "danger");
            console.error(err);
        }
    });

    // --- Notifications logic (duplication helper) ---
    async function loadNotifications() {
        const notifBadge = document.getElementById('notif-badge');
        const notifList = document.getElementById('notif-list');
        const notifBtn = document.getElementById('notif-btn');
        const notifDropdown = document.getElementById('notif-dropdown');
        const markReadBtn = document.getElementById('mark-read-btn');

        if (!notifBtn) return;
        
        notifBtn.onclick = (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('hidden');
        };
        document.onclick = () => { notifDropdown.classList.add('hidden'); };
        notifDropdown.onclick = (e) => { e.stopPropagation(); };

        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const notifications = await response.json();
                const unreadCount = notifications.filter(n => !n.is_read).length;
                if (unreadCount > 0) {
                    notifBadge.textContent = unreadCount;
                    notifBadge.classList.remove('hidden');
                } else {
                    notifBadge.classList.add('hidden');
                }

                if (notifications.length === 0) {
                    notifList.innerHTML = `<div class="empty-state">No new alerts</div>`;
                    return;
                }

                notifList.innerHTML = notifications.map(n => `
                    <div class="dropdown-item ${n.is_read ? '' : 'unread'}">
                        <p>${escapeHtml(n.message)}</p>
                        <span class="notif-time">${n.created_at}</span>
                    </div>
                `).join('');
            }
        } catch (err) { console.error(err); }

        markReadBtn.onclick = async () => {
            try {
                const response = await fetch('/api/notifications/read', { method: 'POST' });
                if (response.ok) {
                    showToast("Marked all notifications as read.", "success");
                    loadNotifications();
                }
            } catch (err) { console.error(err); }
        };
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text ? text.toString().replace(/[&<>"']/g, m => map[m]) : '';
    }
});
