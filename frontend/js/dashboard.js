/* Smart ERP Dashboard & AI Playground Client Logic */

let currentUserSession = null;
let tasksChartInstance = null;
let leavesChartInstance = null;

// Global Toast System
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
    
    // Close button click listener
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto-remove toast
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication and Load Profile details
    async function initSession() {
        try {
            const response = await fetch('/api/auth/session');
            if (!response.ok) {
                window.location.href = '/login';
                return;
            }
            const sessionData = await response.json();
            currentUserSession = sessionData;
            
            // Set Sidebar Profile Details
            const empName = `${sessionData.employee.first_name} ${sessionData.employee.last_name}`;
            document.getElementById('sidebar-name').textContent = empName;
            document.getElementById('sidebar-role').textContent = sessionData.user.role;
            document.getElementById('sidebar-avatar').textContent = sessionData.employee.first_name.charAt(0);
            
            // Load dashboard widgets
            loadNotifications();
            
            // Route Tab depending on URL search params or load default
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('tab') === 'ai') {
                switchTab('ai');
            } else {
                switchTab('overview');
            }
            
            // Set clock
            setInterval(updateClock, 1000);
            updateClock();
        } catch (err) {
            console.error("Session initialization failed: ", err);
            window.location.href = '/login';
        }
    }
    
    initSession();

    // Clock display helper
    function updateClock() {
        const clockEl = document.getElementById('current-date');
        if (!clockEl) return;
        const now = new Date();
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        clockEl.textContent = now.toLocaleDateString('en-US', options);
    }

    // Sidebar navigation clicks
    const navDashboard = document.getElementById('nav-dashboard');
    const navAi = document.getElementById('nav-ai');

    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState({}, '', '/dashboard');
        switchTab('overview');
    });

    navAi.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState({}, '', '/dashboard?tab=ai');
        switchTab('ai');
    });

    // Tab switcher
    function switchTab(tab) {
        const paneOverview = document.getElementById('pane-overview');
        const paneAi = document.getElementById('pane-ai');
        const pageTitle = document.getElementById('page-title');
        const pageSubtitle = document.getElementById('page-subtitle');
        
        navDashboard.classList.remove('active');
        navAi.classList.remove('active');
        
        if (tab === 'overview') {
            paneOverview.classList.remove('hidden');
            paneAi.classList.add('hidden');
            navDashboard.classList.add('active');
            pageTitle.textContent = "Corporate Overview";
            pageSubtitle.textContent = "Real-time business intelligence and KPI logs";
            
            loadOverviewKPIs();
        } else if (tab === 'ai') {
            paneOverview.classList.add('hidden');
            paneAi.classList.remove('hidden');
            navAi.classList.add('active');
            pageTitle.textContent = "AI Co-pilot Workspace";
            pageSubtitle.textContent = "Powered by Google Gemini 1.5 Flash API";
            
            initAIPlayground();
        }
    }

    // Logout Action
    document.getElementById('logout-button').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            if (response.ok) {
                showToast("Signed out successfully.", "info");
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            }
        } catch (e) {
            console.error(e);
        }
    });

    // --- Notifications logic ---
    const notifBtn = document.getElementById('notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    const markReadBtn = document.getElementById('mark-read-btn');
    const notifList = document.getElementById('notif-list');
    const notifBadge = document.getElementById('notif-badge');

    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        notifDropdown.classList.add('hidden');
    });

    notifDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    async function loadNotifications() {
        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const notifications = await response.json();
                
                // Count unread notifications
                const unreadCount = notifications.filter(n => !n.is_read).length;
                if (unreadCount > 0) {
                    notifBadge.textContent = unreadCount;
                    notifBadge.classList.remove('hidden');
                } else {
                    notifBadge.classList.add('hidden');
                }

                // Render lists
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
        } catch (err) {
            console.error("Error loading notifications: ", err);
        }
    }

    markReadBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/notifications/read', { method: 'POST' });
            if (response.ok) {
                showToast("Marked all notifications as read.", "success");
                loadNotifications();
            }
        } catch (err) {
            console.error(err);
        }
    });

    // --- Overview Tab logic ---
    async function loadOverviewKPIs() {
        try {
            const response = await fetch('/api/dashboard/kpis');
            if (!response.ok) return;
            const data = await response.json();

            // Populate cards
            document.getElementById('kpi-employees').textContent = data.employee_count;
            document.getElementById('kpi-leaves').textContent = data.pending_leaves;
            document.getElementById('kpi-tasks').textContent = `${data.task_completion_rate}%`;
            document.getElementById('kpi-attendance').textContent = data.today_attendance;

            // Render Activity list
            const activityList = document.getElementById('activity-list');
            if (data.recent_activities.length === 0) {
                activityList.innerHTML = `<div class="empty-state">No recent activity</div>`;
            } else {
                activityList.innerHTML = data.recent_activities.map(act => `
                    <div class="timeline-item ${act.type}">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <span class="timeline-title">${escapeHtml(act.title)}</span>
                            <p class="timeline-desc">${escapeHtml(act.description)}</p>
                            <span class="timeline-time">${act.created_at}</span>
                        </div>
                    </div>
                `).join('');
            }

            // Render Automation Logs (Manager only check)
            const autoSection = document.getElementById('automation-logs-section');
            if (currentUserSession.user.role === 'hr' || currentUserSession.user.role === 'admin') {
                autoSection.classList.remove('hidden');
                loadAutomationLogs();
            } else {
                autoSection.classList.add('hidden');
            }

            // Fetch Charts details
            loadChartsData();
        } catch (err) {
            console.error("Error loading metrics: ", err);
        }
    }

    async function loadAutomationLogs() {
        try {
            const response = await fetch('/api/automation-logs');
            if (!response.ok) return;
            const logs = await response.json();
            
            const autoList = document.getElementById('automation-list');
            if (logs.length === 0) {
                autoList.innerHTML = `<div class="empty-state">No automation logs.</div>`;
                return;
            }

            autoList.innerHTML = logs.map(l => `
                <div class="timeline-item automation">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <span class="timeline-title">${escapeHtml(l.event_type)}</span>
                        <p class="timeline-desc">${escapeHtml(l.description)}</p>
                        <span class="timeline-time">${l.created_at}</span>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error(e);
        }
    }

    async function loadChartsData() {
        try {
            // Task Stats Chart
            const tasksRes = await fetch('/api/tasks/stats');
            const leavesRes = await fetch('/api/leaves/stats');
            
            if (tasksRes.ok && leavesRes.ok) {
                const taskStats = await tasksRes.json();
                const leaveStats = await leavesRes.json();

                renderTasksChart(taskStats);
                renderLeavesChart(leaveStats);
            }
        } catch (err) {
            console.error("Error setting up charts: ", err);
        }
    }

    // Chart.js render helpers styled for Glassmorphism
    function renderTasksChart(stats) {
        const ctx = document.getElementById('tasksChart').getContext('2d');
        
        if (tasksChartInstance) {
            tasksChartInstance.destroy();
        }

        tasksChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['To Do', 'In Progress', 'Completed'],
                datasets: [{
                    label: 'Tasks Count',
                    data: [stats.todo, stats.in_progress, stats.completed],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.4)', // Info
                        'rgba(245, 158, 11, 0.4)',  // Warning
                        'rgba(16, 185, 129, 0.4)'  // Success
                    ],
                    borderColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#9ca3af' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function renderLeavesChart(stats) {
        const ctx = document.getElementById('leavesChart').getContext('2d');

        if (leavesChartInstance) {
            leavesChartInstance.destroy();
        }

        const labels = [];
        const data = [];
        const bgColors = [];

        if (stats.type_casual) { labels.push('Casual'); data.push(stats.type_casual); bgColors.push('rgba(59, 130, 246, 0.4)'); }
        if (stats.type_sick) { labels.push('Sick'); data.push(stats.type_sick); bgColors.push('rgba(239, 68, 68, 0.4)'); }
        if (stats.type_annual) { labels.push('Annual'); data.push(stats.type_annual); bgColors.push('rgba(16, 185, 129, 0.4)'); }
        if (stats.type_unpaid) { labels.push('Unpaid'); data.push(stats.type_unpaid); bgColors.push('rgba(245, 158, 11, 0.4)'); }

        if (labels.length === 0) {
            labels.push('No leaves logged');
            data.push(1);
            bgColors.push('rgba(255,255,255,0.05)');
        }

        leavesChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } }
                    }
                }
            }
        });
    }

    // --- AI Assistant Tab logic ---
    let activeAIType = 'policy';

    function initAIPlayground() {
        const menuItems = document.querySelectorAll('.ai-menu-item');
        const inputTitle = document.getElementById('ai-input-title');
        const inputDesc = document.getElementById('ai-input-desc');

        // Fields
        const fgTopic = document.getElementById('form-group-topic');
        const fgContext = document.getElementById('form-group-context');
        const fgTone = document.getElementById('form-group-tone');
        const fgReport = document.getElementById('form-group-report');
        const fgFaq = document.getElementById('form-group-faq');

        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                activeAIType = item.getAttribute('data-type');
                
                // Reset fields
                fgTopic.classList.add('hidden');
                fgContext.classList.add('hidden');
                fgTone.classList.add('hidden');
                fgReport.classList.add('hidden');
                fgFaq.classList.add('hidden');

                // Toggle visibility based on selected action
                if (activeAIType === 'policy') {
                    inputTitle.textContent = "HR Policy Generator";
                    inputDesc.textContent = "Draft comprehensive corporate compliance standards and office guidelines.";
                    fgTopic.classList.remove('hidden');
                } else if (activeAIType === 'email') {
                    inputTitle.textContent = "Employee Email Composer";
                    inputDesc.textContent = "Draft emails to employees with professional, formal or casual settings.";
                    fgContext.classList.remove('hidden');
                    fgTone.classList.remove('hidden');
                } else if (activeAIType === 'summary') {
                    inputTitle.textContent = "Report Summarizer";
                    inputDesc.textContent = "Compress long documents, updates, or spreadsheets into short takeaways.";
                    fgReport.classList.remove('hidden');
                } else if (activeAIType === 'faq') {
                    inputTitle.textContent = "Company FAQs Solver";
                    inputDesc.textContent = "Ask details about leave policies, work timing details, dress codes or payroll schedules.";
                    fgFaq.classList.remove('hidden');
                }
            });
        });

        // Generate click handler
        const genBtn = document.getElementById('ai-generate-btn');
        const resultBody = document.getElementById('ai-result');
        const copyBtn = document.getElementById('ai-copy-btn');

        genBtn.addEventListener('click', async () => {
            let payload = {};
            let endpoint = '';

            if (activeAIType === 'policy') {
                const topic = document.getElementById('ai-topic').value.trim();
                if (!topic) { showToast("Please enter a policy topic.", "warning"); return; }
                payload = { topic };
                endpoint = '/api/ai/generate-policy';
            } else if (activeAIType === 'email') {
                const context = document.getElementById('ai-context').value.trim();
                const tone = document.getElementById('ai-tone').value;
                if (!context) { showToast("Please explain email context.", "warning"); return; }
                payload = { context, tone };
                endpoint = '/api/ai/generate-email';
            } else if (activeAIType === 'summary') {
                const report_text = document.getElementById('ai-report').value.trim();
                if (!report_text) { showToast("Please paste report text.", "warning"); return; }
                payload = { report_text };
                endpoint = '/api/ai/summarize-report';
            } else if (activeAIType === 'faq') {
                const question = document.getElementById('ai-question').value.trim();
                if (!question) { showToast("Please input FAQ question.", "warning"); return; }
                payload = { question };
                endpoint = '/api/ai/answer-faq';
            }

            // Disable buttons & show loader status
            genBtn.disabled = true;
            copyBtn.classList.add('hidden');
            resultBody.innerHTML = `<div class="empty-state">✨ Gemini AI is thinking, please wait...</div>`;

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if (res.ok) {
                    // Render simple HTML representation of markdown headers/bold text
                    resultBody.innerHTML = formatMarkdown(data.result);
                    copyBtn.classList.remove('hidden');
                    
                    // Attach content to copy helper
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(data.result);
                        showToast("Copied AI output to clipboard!", "success");
                    };
                } else {
                    resultBody.innerHTML = `<div class="error-container" style="display:block">${data.error || 'Failed to generate content.'}</div>`;
                }
            } catch (err) {
                console.error(err);
                resultBody.innerHTML = `<div class="error-container" style="display:block">Network connection error during AI request.</div>`;
            } finally {
                genBtn.disabled = false;
            }
        });
    }

    // Markdown Parser (Offline Simple Regex replacement)
    function formatMarkdown(text) {
        if (!text) return "";
        let formatted = text
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
        
        // Wrap lists if any
        if (formatted.includes('<li>')) {
            // Very simple list tag wrapping helper
        }
        return formatted;
    }

    // Safe helper against XSS
    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text ? text.toString().replace(/[&<>"']/g, m => map[m]) : '';
    }
});
