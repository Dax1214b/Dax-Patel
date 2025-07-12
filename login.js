// Login form handling and validation
class LoginManager {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.rememberMeCheckbox = document.getElementById('remember_me');
        this.submitButton = document.querySelector('.btn-primary');
        this.errorContainer = document.getElementById('errorContainer');
        this.successContainer = document.getElementById('successContainer');
        
        this.init();
    }

    init() {
        // Check if user is already logged in
        this.checkLoginStatus();
        
        // Load saved email if "Remember Me" was previously checked
        this.loadSavedEmail();
        
        // Add event listeners
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.emailInput.addEventListener('input', () => this.clearError());
        this.passwordInput.addEventListener('input', () => this.clearError());
    }

    async checkLoginStatus() {
        try {
            const response = await fetch('/api/check-session', {
                method: 'GET',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.redirectToDashboard();
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }

    loadSavedEmail() {
        const savedEmail = this.getCookie('user_email');
        if (savedEmail) {
            this.emailInput.value = savedEmail;
            this.rememberMeCheckbox.checked = true;
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        // Clear previous messages
        this.clearMessages();
        
        // Get form data
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const rememberMe = this.rememberMeCheckbox.checked;
        
        // Validate form
        const validation = this.validateForm(email, password);
        if (!validation.isValid) {
            this.showError(validation.message);
            return;
        }
        
        // Show loading state
        this.setLoadingState(true);
        
        // Attempt login
        this.attemptLogin(email, password, rememberMe);
    }

    validateForm(email, password) {
        // Validate email
        if (!email) {
            return { isValid: false, message: "Email is required" };
        }
        
        if (!this.isValidEmail(email)) {
            return { isValid: false, message: "Invalid email format" };
        }
        
        // Validate password
        if (!password) {
            return { isValid: false, message: "Password is required" };
        }
        
        return { isValid: true };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async attemptLogin(email, password, rememberMe) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: email,
                    password: password,
                    remember_me: rememberMe
                })
            });

            const data = await response.json();

            if (data.success) {
                // Handle "Remember Me" functionality
                this.handleRememberMe(email, rememberMe);
                
                // Show success message
                this.showSuccess("Login successful! Redirecting...");
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = data.redirect || '/dashboard.html';
                }, 1000);
                
            } else {
                this.showError(data.message || "Invalid email or password");
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError("An error occurred during login. Please try again.");
        } finally {
            this.setLoadingState(false);
        }
    }

    handleRememberMe(email, rememberMe) {
        if (rememberMe) {
            // Set cookie for 30 days
            this.setCookie('user_email', email, 30);
        } else {
            // Clear the email cookie
            this.setCookie('user_email', '', -1);
        }
    }

    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    redirectToDashboard() {
        window.location.href = '/dashboard.html';
    }

    showError(message) {
        if (this.errorContainer) {
            this.errorContainer.textContent = message;
            this.errorContainer.style.display = 'block';
        } else {
            this.createMessageContainer('error', message);
        }
    }

    showSuccess(message) {
        if (this.successContainer) {
            this.successContainer.textContent = message;
            this.successContainer.style.display = 'block';
        } else {
            this.createMessageContainer('success', message);
        }
    }

    createMessageContainer(type, message) {
        const container = document.createElement('div');
        container.className = `alert alert-${type === 'error' ? 'danger' : 'success'}`;
        container.textContent = message;
        
        // Insert after the h2 element
        const h2 = document.querySelector('h2');
        h2.parentNode.insertBefore(container, h2.nextSibling);
    }

    clearMessages() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
        if (this.successContainer) {
            this.successContainer.style.display = 'none';
        }
        
        // Remove any dynamically created message containers
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => alert.remove());
    }

    clearError() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    setLoadingState(loading) {
        if (loading) {
            this.submitButton.disabled = true;
            this.submitButton.textContent = 'Logging in...';
        } else {
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Launch Login';
        }
    }
}

// Utility functions
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear local storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear cookies
            document.cookie = 'user_email=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
            
            // Redirect to login page
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if logout fails
        window.location.href = '/login.html';
    }
}

async function isLoggedIn() {
    try {
        const response = await fetch('/api/check-session', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Session check error:', error);
        return false;
    }
}

async function getCurrentUser() {
    try {
        const response = await fetch('/api/check-session', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        return data.success ? data.user : null;
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LoginManager, logout, isLoggedIn, getCurrentUser };
} 