/* Smart ERP Leave Management Client Logic */

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
                document.getElementById('manager-approvals-card').classList.remove('hidden');
            }

            // Load contents
            loadLeaves();
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

    // --- Leave Duration Date calculations ---
    const startDateInput = document.getElementById('leave-start');
    const endDateInput = document.getElementById('leave-end');
    const durationInput = document.getElementById('leave-days');

    function calculateDuration() {
        const startVal = startDateInput.value;
        const endVal = endDateInput.value;
        
        if (!startVal || !endVal) {
            durationInput.value = "0 days";
            return;
        }

        const start = new Date(startVal);
        const end = new Date(endVal);

        if (end < start) {
            showToast("End date cannot be before start date.", "warning");
            durationInput.value = "Invalid dates";
            return;
        }

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
        durationInput.value = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }

    startDateInput.addEventListener('change', calculateDuration);
    endDateInput.addEventListener('change', calculateDuration);

    // --- Apply Leave Form Submit ---
    const applyForm = document.getElementById('apply-leave-form');
    applyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const leave_type = document.getElementById('leave-type').value;
        const start_date = startDateInput.value;
        const end_date = endDateInput.value;
        const reason = document.getElementById('leave-reason').value.trim();

        const start = new Date(start_date);
        const end = new Date(end_date);
        if (end < start) {
            showToast("Please fix the dates before submitting.", "danger");
            return;
        }

        try {
            const response = await fetch('/api/leaves/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leave_type, start_date, end_date, reason })
            });
            const data = await response.json();

            if (response.ok) {
                showToast("Leave request applied successfully!", "success");
                applyForm.reset();
                durationInput.value = "0 days";
                loadLeaves();
            } else {
                showToast(data.error || "Failed to submit request.", "danger");
            }
        } catch (err) {
            showToast("Network error submitting request.", "danger");
            console.error(err);
        }
    });

    // --- Leaves Lists Loader ---
    const personalHistoryList = document.getElementById('personal-leaves-list');
    const managerReviewList = document.getElementById('manager-approvals-list');

    async function loadLeaves() {
        try {
            const response = await fetch('/api/leaves/');
            if (!response.ok) return;
            const leaves = await response.json();

            // Populate Personal History list (if user is standard, they receive their own.
            // If manager, they receive all - let's render appropriately)
            const role = currentUserSession.user.role;
            const personalEmpId = currentUserSession.employee.id;

            let personalLeaves = [];
            let pendingReviews = [];

            if (role === 'hr' || role === 'admin') {
                // Split list
                personalLeaves = leaves.filter(l => l.employee_id === personalEmpId);
                pendingReviews = leaves.filter(l => l.status === 'pending');
            } else {
                personalLeaves = leaves;
            }

            // Render Personal History
            if (personalLeaves.length === 0) {
                personalHistoryList.innerHTML = `<div class="empty-state">No leave applications found.</div>`;
            } else {
                personalHistoryList.innerHTML = personalLeaves.map(l => {
                    const approver = l.approved_by ? `&bull; Approved by: ${escapeHtml(l.approver_first)} ${escapeHtml(l.approver_last)}` : '';
                    return `
                        <div class="history-item">
                            <div class="history-row-top">
                                <span class="leave-badge ${l.leave_type}">${l.leave_type.toUpperCase()}</span>
                                <span class="status-badge ${l.status}">${l.status}</span>
                            </div>
                            <span class="leave-dates">${l.start_date} to ${l.end_date}</span>
                            <p class="leave-reason-text">Reason: "${escapeHtml(l.reason)}"</p>
                            <span class="leave-approver-name">Applied: ${l.created_at} ${approver}</span>
                        </div>
                    `;
                }).join('');
            }

            // Render Manager approvals grid
            if (role === 'hr' || role === 'admin') {
                if (pendingReviews.length === 0) {
                    managerReviewList.innerHTML = `<div class="empty-state">No pending leave reviews.</div>`;
                } else {
                    managerReviewList.innerHTML = pendingReviews.map(l => `
                        <div class="approval-row-card">
                            <div>
                                <span class="bold block">${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</span>
                                <span class="text-muted small">${escapeHtml(l.department)} &bull; Type: <span class="leave-badge ${l.leave_type}">${l.leave_type}</span></span>
                                <p class="leave-dates margin-top">${l.start_date} to ${l.end_date}</p>
                                <p class="leave-reason-text margin-top">Reason: "${escapeHtml(l.reason)}"</p>
                            </div>
                            <div class="approval-actions">
                                <button class="btn btn-primary btn-small approve-action-btn" data-id="${l.id}">Approve</button>
                                <button class="btn btn-danger btn-small reject-action-btn" data-id="${l.id}">Reject</button>
                            </div>
                        </div>
                    `).join('');

                    // Attach approvals listeners
                    document.querySelectorAll('.approve-action-btn').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const leaveId = btn.getAttribute('data-id');
                            await triggerApproval(leaveId, 'approve');
                        });
                    });

                    document.querySelectorAll('.reject-action-btn').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const leaveId = btn.getAttribute('data-id');
                            await triggerApproval(leaveId, 'reject');
                        });
                    });
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function triggerApproval(leaveId, action) {
        const endpoint = `/api/leaves/${action}/${leaveId}`;
        try {
            const response = await fetch(endpoint, { method: 'POST' });
            const data = await response.json();
            
            if (response.ok) {
                showToast(`Leave request ${action}ed successfully!`, "success");
                loadLeaves();
            } else {
                showToast(data.error || "Failed to update review.", "danger");
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
