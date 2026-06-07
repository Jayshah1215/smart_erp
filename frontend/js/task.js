/* Smart ERP Task Board Client Logic */

let currentUserSession = null;

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
                document.getElementById('assign-task-btn').classList.remove('hidden');
                populateAssigneeDropdown();
            }

            // Load board
            loadTaskBoard();
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

    // --- Assign Task Modal ---
    const assignBtn = document.getElementById('assign-task-btn');
    const assignModal = document.getElementById('assign-task-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const assignForm = document.getElementById('assign-task-form');
    const assigneeSelect = document.getElementById('task-assignee');

    assignBtn.addEventListener('click', () => {
        assignModal.classList.remove('hidden');
    });

    function closeModal() {
        assignModal.classList.add('hidden');
        assignForm.reset();
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    assignModal.addEventListener('click', (e) => {
        if (e.target === assignModal) closeModal();
    });

    async function populateAssigneeDropdown() {
        try {
            const response = await fetch('/api/employees/');
            if (response.ok) {
                const employees = await response.json();
                
                // Clear dropdown first keeping placeholder
                assigneeSelect.innerHTML = `<option value="">Select Employee...</option>`;
                
                employees.forEach(emp => {
                    const opt = document.createElement('option');
                    opt.value = emp.id;
                    opt.textContent = `${emp.first_name} ${emp.last_name} (${emp.department})`;
                    assigneeSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error populating select list: ", err);
        }
    }

    assignForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-desc').value.trim();
        const assigned_to = assigneeSelect.value;
        const due_date = document.getElementById('task-duedate').value;
        const priority = document.getElementById('task-priority').value;

        try {
            const response = await fetch('/api/tasks/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, assigned_to, due_date, priority })
            });
            const data = await response.json();

            if (response.ok) {
                showToast("Task assigned and created successfully!", "success");
                closeModal();
                loadTaskBoard();
            } else {
                showToast(data.error || "Failed to create task.", "danger");
            }
        } catch (err) {
            showToast("Network connection error.", "danger");
            console.error(err);
        }
    });

    // --- Kanban Board Load & Status toggling ---
    const cardsTodo = document.getElementById('cards-todo');
    const cardsInprogress = document.getElementById('cards-inprogress');
    const cardsCompleted = document.getElementById('cards-completed');

    const countTodo = document.getElementById('count-todo');
    const countInprogress = document.getElementById('count-inprogress');
    const countCompleted = document.getElementById('count-completed');

    async function loadTaskBoard() {
        try {
            const response = await fetch('/api/tasks/');
            if (!response.ok) return;
            const tasks = await response.json();

            // Clear columns
            cardsTodo.innerHTML = "";
            cardsInprogress.innerHTML = "";
            cardsCompleted.innerHTML = "";

            let todoCount = 0;
            let ipCount = 0;
            let compCount = 0;

            const personalEmpId = currentUserSession.employee.id;
            const role = currentUserSession.user.role;

            tasks.forEach(t => {
                // Determine authorization to edit
                const isAuthorized = (t.assigned_to === personalEmpId) || (t.assigned_by === personalEmpId) || (role === 'hr' || role === 'admin');
                
                const card = createTaskCardHtml(t, isAuthorized);
                
                if (t.status === 'todo') {
                    cardsTodo.appendChild(card);
                    todoCount++;
                } else if (t.status === 'in_progress') {
                    cardsInprogress.appendChild(card);
                    ipCount++;
                } else if (t.status === 'completed') {
                    cardsCompleted.appendChild(card);
                    compCount++;
                }
            });

            // Set headers count
            countTodo.textContent = todoCount;
            countInprogress.textContent = ipCount;
            countCompleted.textContent = compCount;

            // Render empty state if column count is 0
            if (todoCount === 0) cardsTodo.innerHTML = `<div class="empty-state">No tasks pending</div>`;
            if (ipCount === 0) cardsInprogress.innerHTML = `<div class="empty-state">No active tasks</div>`;
            if (compCount === 0) cardsCompleted.innerHTML = `<div class="empty-state">No tasks completed</div>`;

            // Attach Arrow Click listeners
            document.querySelectorAll('.task-shift-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const taskId = btn.getAttribute('data-id');
                    const nextStatus = btn.getAttribute('data-next');
                    await transitionTaskStatus(taskId, nextStatus);
                });
            });

        } catch (err) {
            console.error("Error fetching tasks board: ", err);
        }
    }

    function createTaskCardHtml(task, isAuthorized) {
        const card = document.createElement('div');
        card.className = "task-card";
        
        let controlActions = '';
        if (isAuthorized) {
            if (task.status === 'todo') {
                controlActions = `
                    <div class="task-control-actions">
                        <button class="task-action-arrow task-shift-btn" data-id="${task.id}" data-next="in_progress" title="Start Working">→</button>
                    </div>
                `;
            } else if (task.status === 'in_progress') {
                controlActions = `
                    <div class="task-control-actions">
                        <button class="task-action-arrow task-shift-btn" data-id="${task.id}" data-next="todo" title="Move back to Todo">←</button>
                        <button class="task-action-arrow task-shift-btn" data-id="${task.id}" data-next="completed" title="Complete Task">✔</button>
                    </div>
                `;
            } else if (task.status === 'completed') {
                controlActions = `
                    <div class="task-control-actions">
                        <button class="task-action-arrow task-shift-btn" data-id="${task.id}" data-next="in_progress" title="Reopen Task">←</button>
                    </div>
                `;
            }
        }

        const creatorName = task.creator_first ? `Assigned by: ${escapeHtml(task.creator_first)} ${escapeHtml(task.creator_last.charAt(0))}.` : '';
        const assigneeName = task.assignee_first ? `${escapeHtml(task.assignee_first)} ${escapeHtml(task.assignee_last)}` : 'Unassigned';

        card.innerHTML = `
            <div class="task-priority-row">
                <span class="priority-badge ${task.priority}">${task.priority}</span>
                <span class="small text-muted">Due: ${task.due_date}</span>
            </div>
            <h4 class="task-title-text">${escapeHtml(task.title)}</h4>
            <p class="task-desc-text">${escapeHtml(task.description || 'No description.')}</p>
            <div class="task-meta-row">
                <span class="task-assignee-text">👤 ${assigneeName}</span>
                <span class="small text-muted">${creatorName}</span>
            </div>
            ${controlActions}
        `;
        return card;
    }

    async function transitionTaskStatus(taskId, nextStatus) {
        try {
            const response = await fetch(`/api/tasks/update-status/${taskId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            const data = await response.json();

            if (response.ok) {
                if (nextStatus === 'completed') {
                    showToast("Task completed! Notification logged to workflow timeline.", "success");
                } else {
                    showToast(`Task moved to '${nextStatus.replace('_', ' ')}'.`, "info");
                }
                loadTaskBoard();
            } else {
                showToast(data.error || "Failed to update status.", "danger");
            }
        } catch (err) {
            console.error(err);
        }
    }

    // --- Notifications logic duplicate ---
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
