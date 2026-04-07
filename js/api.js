// API Communication
const API = {
    eventSource: null,
    items: [],
    workstations: [],
    
    connectSSE(userName) {
        console.log('Connecting SSE with username:', userName);
        
        if (this.eventSource) {
            console.log('Closing existing connection');
            this.eventSource.close();
        }

        const safeName = userName || 'Anonymous';
        const encodedName = encodeURIComponent(safeName);
        const url = '/events?name=' + encodedName;
        console.log('Connecting to:', url);
        
        this.eventSource = new EventSource(url);

        this.eventSource.addEventListener('init', (e) => {
            console.log('Received init event');
            const data = JSON.parse(e.data);
            this.items = data.items || [];
            this.workstations = data.workstations || [];
            UI.renderItems();
            UI.updateStats();
            UI.updateAlerts();
            UI.updateWorkstationDropdown();
            UI.renderWorkstations();
            Utils.setConnected(true);
            Utils.hideLoading();
        });

        this.eventSource.addEventListener('users', (e) => {
            console.log('Received users event with data:', e.data);
            try {
                const users = JSON.parse(e.data);
                UI.updateUserList(users);
            } catch (err) {
                console.error('Error parsing users data:', err);
            }
        });

        this.eventSource.addEventListener('newItem', (e) => {
            const item = JSON.parse(e.data);
            this.items.push(item);
            UI.renderItems();
            UI.updateStats();
            UI.updateAlerts();
            if (item.addedBy !== userName) {
                Utils.showToast(`${item.addedBy} added: ${item.name}`);
            }
        });

        this.eventSource.addEventListener('updateItem', (e) => {
            const updated = JSON.parse(e.data);
            const index = this.items.findIndex(i => i.id === updated.id);
            if (index !== -1) {
                this.items[index] = updated;
                UI.renderItems();
                UI.updateStats();
                UI.updateAlerts();
                
                if (updated.minStock > 0 && updated.quantity <= updated.minStock) {
                    Utils.showToast('⚠️ LOW STOCK: ' + updated.name + ' (' + updated.quantity + ' left)', true);
                }
            }
        });

        this.eventSource.addEventListener('deleteItem', (e) => {
            const data = JSON.parse(e.data);
            this.items = this.items.filter(i => i.id !== data.id);
            UI.renderItems();
            UI.updateStats();
            UI.updateAlerts();
            Utils.showToast('Item removed');
        });

        // Workstation SSE events
        this.eventSource.addEventListener('newWorkstation', (e) => {
            const ws = JSON.parse(e.data);
            this.workstations.push(ws);
            UI.updateWorkstationDropdown();
            UI.renderWorkstations();
            if (ws.addedBy !== userName) {
                Utils.showToast(`${ws.addedBy} added workstation: ${ws.name}`);
            }
        });

        this.eventSource.addEventListener('deleteWorkstation', (e) => {
            const data = JSON.parse(e.data);
            this.workstations = this.workstations.filter(ws => ws.id !== data.id);
            // Unassign items linked to deleted workstation
            this.items.forEach(item => {
                if (item.workstationId === data.id) {
                    item.workstationId = null;
                }
            });
            UI.updateWorkstationDropdown();
            UI.renderWorkstations();
            UI.renderItems();
            Utils.showToast('Workstation removed');
        });

        this.eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            Utils.setConnected(false);
            Utils.showToast('Connection lost. Reconnecting...', true);
            setTimeout(() => this.connectSSE(userName), 3000);
        };

        this.eventSource.onopen = () => {
            console.log('SSE connection opened');
            Utils.setConnected(true);
        };
    },

    // ===== ITEM METHODS =====

    async addItem(item) {
        try {
            const response = await fetch('/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (!response.ok) throw new Error('Failed to add item');
            return await response.json();
        } catch (err) {
            Utils.showToast('Error adding part', true);
            throw err;
        }
    },

    async useItem(id, amount, usedBy) {
        const response = await fetch(`/items/${id}/use`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, usedBy })
        });
        if (!response.ok) throw new Error('Failed to use item');
        return await response.json();
    },

    async restockItem(id, amount) {
        const response = await fetch(`/items/${id}/restock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        if (!response.ok) throw new Error('Failed to restock');
        return await response.json();
    },

    async deleteItem(id) {
        const response = await fetch(`/items/${id}/delete`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to delete');
        return await response.json();
    },

    async updateItem(id, data) {
        const response = await fetch(`/items/${id}/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update item');
        return await response.json();
    },

    // ===== WORKSTATION METHODS =====

    async addWorkstation(ws) {
        try {
            const response = await fetch('/workstations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ws)
            });
            if (!response.ok) throw new Error('Failed to add workstation');
            return await response.json();
        } catch (err) {
            Utils.showToast('Error adding workstation', true);
            throw err;
        }
    },

    async deleteWorkstation(id) {
        const response = await fetch(`/workstations/${id}/delete`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to delete workstation');
        return await response.json();
    },

    // Helper: get workstation name by ID
    getWorkstationName(id) {
        if (!id) return null;
        const ws = this.workstations.find(w => w.id === id);
        return ws ? ws.name : null;
    }
};
