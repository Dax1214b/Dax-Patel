// Questions management for StackIt
class QuestionsManager {
    constructor() {
        this.questionsContainer = document.getElementById('questions-container');
        this.askQuestionForm = document.getElementById('ask-question-form');
        this.searchInput = document.getElementById('search-input');
        this.filterSelect = document.getElementById('filter-select');
        this.currentUser = null;
        this.questions = [];
        
        this.init();
    }

    async init() {
        // Check authentication
        await this.checkAuth();
        
        // Load questions
        await this.loadQuestions();
        
        // Add event listeners
        this.addEventListeners();
        
        // Initialize real-time updates
        this.initSocketConnection();
    }

    async checkAuth() {
        const token = localStorage.getItem('stackit_token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                this.currentUser = data.user;
                this.updateUserInterface();
            } else {
                localStorage.removeItem('stackit_token');
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Auth check error:', error);
            window.location.href = '/login';
        }
    }

    updateUserInterface() {
        // Update profile picture and user info
        const profilePic = document.querySelector('.profile-pic');
        const username = document.querySelector('.username');
        
        if (profilePic) {
            profilePic.src = this.currentUser.avatar || '/default-avatar.png';
            profilePic.alt = this.currentUser.username;
        }
        
        if (username) {
            username.textContent = this.currentUser.username;
        }
    }

    addEventListeners() {
        // Search functionality
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Filter functionality
        if (this.filterSelect) {
            this.filterSelect.addEventListener('change', (e) => {
                this.handleFilter(e.target.value);
            });
        }

        // Ask question form
        if (this.askQuestionForm) {
            this.askQuestionForm.addEventListener('submit', (e) => {
                this.handleAskQuestion(e);
            });
        }
    }

    async loadQuestions() {
        try {
            const token = localStorage.getItem('stackit_token');
            const response = await fetch('/api/questions', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                this.questions = data.questions;
                this.renderQuestions();
            }
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showError('Failed to load questions');
        }
    }

    renderQuestions() {
        if (!this.questionsContainer) return;

        if (this.questions.length === 0) {
            this.questionsContainer.innerHTML = `
                <div class="no-questions">
                    <h3>No questions yet</h3>
                    <p>Be the first to ask a question!</p>
                </div>
            `;
            return;
        }

        const questionsHTML = this.questions.map(question => this.createQuestionCard(question)).join('');
        this.questionsContainer.innerHTML = questionsHTML;

        // Add event listeners to question cards
        this.addQuestionCardListeners();
    }

    createQuestionCard(question) {
        const tags = question.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        const timeAgo = this.getTimeAgo(question.createdAt);
        
        return `
            <div class="question-card" data-question-id="${question._id}">
                <div class="question-stats">
                    <div class="stat">
                        <span class="number">${question.votes}</span>
                        <span class="label">votes</span>
                    </div>
                    <div class="stat">
                        <span class="number">${question.answers.length}</span>
                        <span class="label">answers</span>
                    </div>
                    <div class="stat">
                        <span class="number">${question.views}</span>
                        <span class="label">views</span>
                    </div>
                </div>
                <div class="question-content">
                    <h3 class="question-title">
                        <a href="/answers?question=${question._id}">${question.title}</a>
                    </h3>
                    <p class="question-excerpt">${this.truncateText(question.description, 200)}</p>
                    <div class="question-meta">
                        <div class="tags">${tags}</div>
                        <div class="author">
                            Asked by <span class="author-name">${question.author.username}</span>
                            <span class="time">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    addQuestionCardListeners() {
        const questionCards = document.querySelectorAll('.question-card');
        questionCards.forEach(card => {
            const voteButtons = card.querySelectorAll('.vote-btn');
            voteButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const questionId = card.dataset.questionId;
                    const voteType = btn.dataset.voteType;
                    this.handleVote(questionId, voteType);
                });
            });
        });
    }

    async handleVote(questionId, voteType) {
        try {
            const token = localStorage.getItem('stackit_token');
            const response = await fetch(`/api/questions/${questionId}/vote`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ voteType })
            });
            
            const data = await response.json();
            if (data.success) {
                // Update the question in the list
                const questionIndex = this.questions.findIndex(q => q._id === questionId);
                if (questionIndex !== -1) {
                    this.questions[questionIndex] = data.question;
                    this.renderQuestions();
                }
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Vote error:', error);
            this.showError('Failed to vote');
        }
    }

    async handleAskQuestion(e) {
        e.preventDefault();
        
        const formData = new FormData(this.askQuestionForm);
        const title = formData.get('title');
        const description = formData.get('description');
        const tags = formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag);
        
        if (!title || !description) {
            this.showError('Title and description are required');
            return;
        }
        
        try {
            const token = localStorage.getItem('stackit_token');
            const response = await fetch('/api/questions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    description,
                    tags
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.showSuccess('Question posted successfully!');
                this.askQuestionForm.reset();
                await this.loadQuestions(); // Reload questions
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Ask question error:', error);
            this.showError('Failed to post question');
        }
    }

    handleSearch(searchTerm) {
        if (!searchTerm) {
            this.renderQuestions();
            return;
        }
        
        const filteredQuestions = this.questions.filter(question => 
            question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            question.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            question.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        this.renderFilteredQuestions(filteredQuestions);
    }

    handleFilter(filterType) {
        let filteredQuestions = [...this.questions];
        
        switch (filterType) {
            case 'newest':
                filteredQuestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                filteredQuestions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'most-voted':
                filteredQuestions.sort((a, b) => b.votes - a.votes);
                break;
            case 'most-answered':
                filteredQuestions.sort((a, b) => b.answers.length - a.answers.length);
                break;
            case 'unanswered':
                filteredQuestions = filteredQuestions.filter(q => q.answers.length === 0);
                break;
        }
        
        this.renderFilteredQuestions(filteredQuestions);
    }

    renderFilteredQuestions(questions) {
        if (!this.questionsContainer) return;

        if (questions.length === 0) {
            this.questionsContainer.innerHTML = `
                <div class="no-questions">
                    <h3>No questions found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            `;
            return;
        }

        const questionsHTML = questions.map(question => this.createQuestionCard(question)).join('');
        this.questionsContainer.innerHTML = questionsHTML;
        this.addQuestionCardListeners();
    }

    initSocketConnection() {
        // Initialize Socket.IO connection for real-time updates
        const socket = io();
        
        socket.on('questionCreated', (question) => {
            this.questions.unshift(question);
            this.renderQuestions();
        });
        
        socket.on('questionUpdated', (updatedQuestion) => {
            const index = this.questions.findIndex(q => q._id === updatedQuestion._id);
            if (index !== -1) {
                this.questions[index] = updatedQuestion;
                this.renderQuestions();
            }
        });
        
        socket.on('questionDeleted', (questionId) => {
            this.questions = this.questions.filter(q => q._id !== questionId);
            this.renderQuestions();
        });
    }

    // Utility functions
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.getElementById('error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-message';
            errorDiv.className = 'alert alert-danger';
            document.body.insertBefore(errorDiv, document.body.firstChild);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        // Create or update success message
        let successDiv = document.getElementById('success-message');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'success-message';
            successDiv.className = 'alert alert-success';
            document.body.insertBefore(successDiv, document.body.firstChild);
        }
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

// Initialize questions manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuestionsManager();
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
        localStorage.removeItem('stackit_token');
        localStorage.removeItem('stackit_user');
        window.location.href = '/login';
    }
} 