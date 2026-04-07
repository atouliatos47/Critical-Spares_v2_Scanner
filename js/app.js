// Main App Controller
const App = {
    userName: localStorage.getItem('sparesUser') || '',
    
    init() {
        console.log('App initializing... Current user:', this.userName);
        this.setupEventListeners();
        
        if (this.userName) {
            console.log('User found in localStorage:', this.userName);
            this.showMainApp();
            // Show splash on startup, then start idle timer
            setTimeout(() => {
                UI.showHome();
                UI.startIdleTimer();
            }, 100);
        } else {
            console.log('No user found, showing name screen');
            document.getElementById('nameScreen').classList.remove('hidden');
        }
    },

    setName() {
        const input = document.getElementById('nameInput');
        const name = input.value.trim();
        
        if (!name) {
            Utils.shakeElement(input);
            return;
        }
        
        this.userName = name;
        localStorage.setItem('sparesUser', name);
        console.log('Name set to:', name);
        this.showMainApp();
    },

    showMainApp() {
        document.getElementById('nameScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');
        API.connectSSE(this.userName);
        this.startKeepAlive();
    },

    startKeepAlive() {
        // Ping server every 10 minutes to prevent Render spin-down
        setInterval(() => {
            fetch('/items').catch(() => {});
        }, 10 * 60 * 1000);
    },

    setupEventListeners() {
        document.getElementById('nameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.setName();
        });

        // Auto-select text when clicking into any number input
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('focus', function() {
                this.select();
            });
        });

        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalOverlay')) {
                Utils.closeModal();
            }
        });
    }
};

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => App.init());
