/* Smart ERP Authentication Client Script */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const goToRegister = document.getElementById('go-to-register');
    const goToLogin = document.getElementById('go-to-login');
    const errorMsg = document.getElementById('error-message');
    const successMsg = document.getElementById('success-message');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');

    // Helper: Show Error Banner
    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        successMsg.style.display = 'none';
    }

    // Helper: Show Success Banner
    function showSuccess(message) {
        successMsg.textContent = message;
        successMsg.style.display = 'block';
        errorMsg.style.display = 'none';
    }

    // Helper: Clear message banners
    function clearMessages() {
        errorMsg.style.display = 'none';
        successMsg.style.display = 'none';
    }

    // Redirect to dashboard if session is already active
    async function checkActiveSession() {
        try {
            const response = await fetch('/api/auth/session');
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    window.location.href = '/dashboard';
                }
            }
        } catch (e) {
            console.log("No active session detected.");
        }
    }
    checkActiveSession();

    // Toggle forms
    goToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        clearMessages();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        authTitle.textContent = "Create Profile";
        authSubtitle.textContent = "Register employee credentials on Smart ERP";
    });

    goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        clearMessages();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        authTitle.textContent = "Welcome Back";
        authSubtitle.textContent = "Login to access your corporate dashboard";
    });

    // Check query params on load (to auto-open registration if ?register=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('register') === 'true') {
        goToRegister.click();
    }

    // LOGIN Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();
        
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();

        if (!username || !password) {
            showError("Please fill in all fields.");
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok) {
                showSuccess("Sign-in successful! Redirecting...");
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                showError(data.error || "Login failed. Check your credentials.");
            }
        } catch (err) {
            showError("Network connection error. Try again.");
            console.error(err);
        }
    });

    // REGISTER Form Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const first_name = document.getElementById('reg-firstname').value.trim();
        const last_name = document.getElementById('reg-lastname').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const department = document.getElementById('reg-department').value;
        const position = document.getElementById('reg-position').value.trim();

        if (!username || !password || !first_name || !last_name || !email || !position) {
            showError("Missing required registration fields.");
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, password, first_name, last_name, email, phone, department, position
                })
            });
            const data = await response.json();

            if (response.status === 201) {
                showSuccess("Account created successfully! Switching to login...");
                setTimeout(() => {
                    // Pre-fill username
                    document.getElementById('login-username').value = username;
                    document.getElementById('login-password').value = "";
                    goToLogin.click();
                }, 2000);
            } else {
                showError(data.error || "Failed to create account. Check username/details.");
            }
        } catch (err) {
            showError("Network connection error. Try again.");
            console.error(err);
        }
    });
});
