// Login form handling and validation for StackIt
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
            const token = localStorage.getItem('stackit_token');
            if (!token) return;

            const response = await fetch('/api/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.redirectToDashboard();
            } else {
                localStorage.removeItem('stackit_token');
            }
        } catch (error) {
            console.error('Session check error:', error);
            localStorage.removeItem('stackit_token');
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
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: email, // StackIt uses 'identifier' field
                    password: password
                })
            });

            const data = await response.json();

            if (data.success) {
                // Store JWT token
                localStorage.setItem('stackit_token', data.token);
                
                // Handle "Remember Me" functionality
                this.handleRememberMe(email, rememberMe);
                
                // Show success message
                this.showSuccess("Login successful! Redirecting to StackIt...");
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/dashboard';
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
        window.location.href = '/dashboard';
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
    }

    clearError() {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    setLoadingState(loading) {
        if (this.submitButton) {
            this.submitButton.disabled = loading;
            this.submitButton.textContent = loading ? 'Launching...' : 'Launch Login';
        }
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

// Global logout function
async function logout() {
    try {
        const token = localStorage.getItem('stackit_token');
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear local storage and redirect
        localStorage.removeItem('stackit_token');
        localStorage.removeItem('stackit_user');
        window.location.href = '/login';
    }
}

// Check if user is logged in
async function isLoggedIn() {
    const token = localStorage.getItem('stackit_token');
    if (!token) return false;

    try {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// Get current user data
async function getCurrentUser() {
    const token = localStorage.getItem('stackit_token');
    if (!token) return null;

    try {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('stackit_user', JSON.stringify(data.user));
            return data.user;
        }
        return null;
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
} 