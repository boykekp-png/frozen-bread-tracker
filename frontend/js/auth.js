// API base URL
const API_URL = window.location.origin + '/api';

function switchTab(tab) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const authForms = document.querySelectorAll('.auth-form');

    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    authForms.forEach(form => {
        form.classList.toggle('active', form.id === `${tab}-form`);
    });
}

// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const authForms = document.querySelectorAll('.auth-form');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    const showForgotBtn = document.getElementById('show-forgot');
    if (showForgotBtn) {
        showForgotBtn.addEventListener('click', () => switchTab('forgot'));
    }

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token is still valid
        fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/dashboard';
            } else {
                localStorage.removeItem('token');
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
        });
    }
});

// Login form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/dashboard';
        } else {
            errorDiv.textContent = data.error || 'Login failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
    }
});

// Register form submission
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorDiv = document.getElementById('register-error');

    // Validate passwords match
    if (password !== confirm) {
        errorDiv.textContent = 'Passwords do not match';
        return;
    }

    // Validate password length
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            errorDiv.style.color = '#4CAF50';
            errorDiv.textContent = data.message || 'Registration successful. Please wait for admin activation.';
            switchTab('login');
        } else {
            errorDiv.textContent = data.error || 'Registration failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
    }
});

// Forgot password
document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const errorDiv = document.getElementById('forgot-error');
    errorDiv.textContent = '';

    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.error || 'Failed to request reset token';
            return;
        }

        errorDiv.style.color = '#4CAF50';
        errorDiv.textContent = `${data.message}${data.resetToken ? ` Token: ${data.resetToken}` : ''}`;
        switchTab('reset');
        if (data.resetToken) {
            document.getElementById('reset-token').value = data.resetToken;
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
    }
});

// Reset password
document.getElementById('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.getElementById('reset-token').value;
    const newPassword = document.getElementById('reset-password').value;
    const errorDiv = document.getElementById('reset-error');
    errorDiv.textContent = '';

    try {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });
        const data = await response.json();

        if (!response.ok) {
            errorDiv.textContent = data.error || 'Failed to reset password';
            return;
        }

        errorDiv.style.color = '#4CAF50';
        errorDiv.textContent = 'Password reset successful. Please log in.';
        switchTab('login');
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
    }
});