// Utility Functions
const Utils = {
    toastTimeout: null,

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatTime(date) {
        return new Date(date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },

    formatDate(date) {
        return new Date(date).toLocaleString();
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showLoading() {
        document.getElementById('loadingSpinner').classList.add('show');
    },

    hideLoading() {
        document.getElementById('loadingSpinner').classList.remove('show');
    },

    showToast(msg, isWarning = false) {
        const toast = document.getElementById('toast');
        // Clear any existing timeout so overlapping calls don't cancel each other
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
        toast.textContent = msg;
        toast.className = `toast ${isWarning ? 'warning' : ''} show`;
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            this.toastTimeout = null;
        }, 3000);
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('show');
        document.getElementById('modal').innerHTML = '';
    },

    setConnected(connected) {
        const badge = document.getElementById('connBadge');
        badge.className = `connection-badge ${connected ? '' : 'offline'}`;
        badge.innerHTML = connected ? '● Live' : '○ Offline';
    },

    shakeElement(element) {
        element.classList.add('error');
        setTimeout(() => element.classList.remove('error'), 1500);
    }
};
