// API base URL
const API_URL = window.location.origin + '/api';

// Get authentication token
function getToken() {
    return localStorage.getItem('token');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// Logout user
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// API calls
const api = {
    // Get all bread types (authenticated)
    getBreadTypes: async () => {
        const token = getToken();
        const response = await fetch(`${API_URL}/bread/types`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            if (response.status === 401) {
                logout();
            }
            throw new Error('Failed to fetch bread types');
        }
        return await response.json();
    },

    // Create new bread type (admin only)
    createBreadType: async (sku, name, expirationDays) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/bread/types`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sku, name, expiration_days: expirationDays })
        });
        if (!response.ok) {
            if (response.status === 401) {
                logout();
            }
            const data = await response.json();
            throw new Error(data.error || 'Failed to create bread type');
        }
        return await response.json();
    },

    // Update bread type (admin only)
    updateBreadType: async (typeId, sku, name, expirationDays) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/bread/types/${typeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sku, name, expiration_days: expirationDays })
        });
        if (!response.ok) {
            if (response.status === 401) {
                logout();
            }
            const data = await response.json();
            throw new Error(data.error || 'Failed to update bread type');
        }
        return await response.json();
    },

    // Delete bread type (admin only)
    deleteBreadType: async (typeId) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/bread/types/${typeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            if (response.status === 401) {
                logout();
            }
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete bread type');
        }
        return await response.json();
    },

    // Verify token
    verifyToken: async () => {
        const token = getToken();
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            return null;
        }
        return await response.json();
    },

    // Change current user's password
    changePassword: async (currentPassword, newPassword) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update password');
        }
        return data;
    },

    // Forgot password request
    forgotPassword: async (email) => {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to request password reset');
        }
        return data;
    },

    // Reset password with token
    resetPassword: async (token, newPassword) => {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, newPassword })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to reset password');
        }
        return data;
    },

    // Admin: users
    getUsers: async () => {
        const token = getToken();
        const response = await fetch(`${API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch users');
        }
        return data;
    },

    createUser: async (name, email, password) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create user');
        }
        return data;
    },

    updateUserPassword: async (userId, password) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${userId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update user password');
        }
        return data;
    },

    activateUser: async (userId) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${userId}/activate`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to activate user');
        return data;
    },

    deactivateUser: async (userId) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${userId}/deactivate`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to deactivate user');
        return data;
    },

    promoteUser: async (userId) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${userId}/promote`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to promote user');
        return data;
    },

    demoteUser: async (userId) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${userId}/demote`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to demote user');
        return data;
    },

    deleteUser: async (userId) => {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete user');
        }
        return data;
    },

    getActivityLogs: async () => {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/activity/logs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch activity logs');
        }
        return data;
    }
};

// Utility functions
function calculateExpirationDate(freezeDate, expirationDays) {
    const date = new Date(freezeDate);
    date.setDate(date.getDate() + expirationDays);
    return date;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getDaysUntil(dateString) {
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Auto-logout after 5 minutes of inactivity
function initAutoLogout() {
    const TIMEOUT = 5 * 60 * 1000; // 5 minutes
    let timer;

    function resetTimer() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            alert('Session expired due to 5 minutes of inactivity.');
            logout();
        }, TIMEOUT);
    }

    const events = ['mousemove', 'click', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
}
