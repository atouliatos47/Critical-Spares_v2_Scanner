// UI Management
const UI = {
    currentFilter: 'all',
    currentTab: '',
    searchTimeout: null,
    scanner: null,
    clockInterval: null,
    scanProcessed: false,
    idleTimeout: null,
    IDLE_SECONDS: 20,

    // ===== IDLE TIMER =====
    resetIdleTimer() {
        if (this.idleTimeout) clearTimeout(this.idleTimeout);
        this.idleTimeout = setTimeout(() => this.showHome(), this.IDLE_SECONDS * 1000);
    },

    startIdleTimer() {
        ['click','touchstart','keydown','scroll'].forEach(evt =>
            document.addEventListener(evt, () => this.resetIdleTimer(), { passive: true })
        );
        this.resetIdleTimer();
    },

    // ===== HOME SCREEN (splash/screensaver) =====

    showHome() {
        const screen = document.getElementById('homeScreen');
        if (screen) {
            screen.classList.remove('hidden');
            this.startClock();
        }
        const nav = document.querySelector('.bottom-nav');
        if (nav) nav.style.display = 'none';
        // Hide any open modals behind the splash
        document.getElementById('modalOverlay')?.classList.remove('show');
        document.getElementById('contentModalOverlay')?.classList.remove('show');
    },

    hideHome() {
        const screen = document.getElementById('homeScreen');
        if (screen) {
            screen.classList.add('hidden');
            this.stopClock();
        }
        const nav = document.querySelector('.bottom-nav');
        if (nav) nav.style.display = '';
        this.resetIdleTimer();
    },

    // ===== HOME BUTTON → goes to dashboard (not splash) =====
    goToDashboard() {
        // If a content modal is open, close it instead of going to dashboard
        const contentOverlay = document.getElementById('contentModalOverlay');
        if (contentOverlay && contentOverlay.classList.contains('show')) {
            contentOverlay.classList.remove('show');
            this.resetIdleTimer();
            return;
        }
        this.switchTab('');
        this.resetIdleTimer();
    },

    startClock() {
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);
    },

    stopClock() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
    },

    updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');

        const clockEl = document.getElementById('homeClock');
        const secsEl = document.getElementById('homeSeconds');
        const dateEl = document.getElementById('homeDate');

        if (clockEl) clockEl.textContent = h + ':' + m;
        if (secsEl) secsEl.textContent = '';
        if (dateEl) {
            const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            dateEl.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
        }
    },

    // ===== BARCODE SCANNER LOGIC =====

    openScanner() {
        const modal = document.getElementById('scannerModal');
        if (modal) modal.classList.add('active');

        // Clean up any previous scanner instance
        if (this.scanner) {
            try { this.scanner.stop(); } catch (e) {}
            this.scanner = null;
        }

        // Reset scan guard
        this.scanProcessed = false;

        // Small delay so modal is visible before camera init
        setTimeout(() => {
            this.scanner = new Html5Qrcode("reader");
            const config = { 
                fps: 10, 
                qrbox: { width: 250, height: 150 }
            };

            this.scanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => this.handleScanResult(decodedText),
                (errorMessage) => { /* ignore per-frame errors */ }
            ).catch(err => {
                alert("Camera Error: Ensure you are on HTTPS and have granted camera permissions.\n\n" + err);
                this.closeScanner();
            });
        }, 300);
    },

    closeScanner() {
        const modal = document.getElementById('scannerModal');
        
        if (this.scanner) {
            try {
                if (this.scanner.isScanning) {
                    this.scanner.stop().then(() => {
                        if (modal) modal.classList.remove('active');
                        this.scanner = null;
                    }).catch(() => {
                        if (modal) modal.classList.remove('active');
                        this.scanner = null;
                    });
                } else {
                    if (modal) modal.classList.remove('active');
                    this.scanner = null;
                }
            } catch (err) {
                console.error('Error stopping scanner:', err);
                if (modal) modal.classList.remove('active');
                this.scanner = null;
            }
        } else {
            if (modal) modal.classList.remove('active');
        }
    },

    handleScanResult(barcode) {
        if (this.scanProcessed) return;   // ignore duplicate callbacks while scanner stops
        this.scanProcessed = true;

        if (navigator.vibrate) navigator.vibrate(100);

        // Match on partNo (barcode) field — same logic as Bluetooth scanner
        const match = API.items.find(i =>
            (i.partNo || '').trim().toLowerCase() === barcode.trim().toLowerCase() && i.partNo !== ''
        );

        const needsRestock = match && (
            match.quantity === 0 ||
            (match.minStock > 0 && match.quantity <= match.minStock)
        );

        this.closeScanner();

        if (match && !needsRestock) {
            setTimeout(() => {
                if (window.Components) Components.showUseModal(match);
                Utils.showToast('Found: ' + match.name);
            }, 500);
        } else if (needsRestock) {
            setTimeout(() => {
                if (window.Components) Components.showRestockModal(match);
                Utils.showToast('Low stock: ' + match.name);
            }, 500);
        } else {
            // Unknown barcode — open Add modal
            if (window.Components) Components.showAddModal(barcode);
        }
    },

    clearPartNo() {
        const partNoInput = document.getElementById('partNo');
        const clearBtn = document.getElementById('clearPartNo');
        if (partNoInput) {
            partNoInput.value = '';
            partNoInput.readOnly = false;
            partNoInput.style.background = '#f0f2f5';
        }
        if (clearBtn) clearBtn.style.display = 'none';
    },

    // ===== INVENTORY RENDERING =====

    renderItems() {
        const container = document.getElementById('itemsList');
        if (!container) return;
        
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
        
        // DASHBOARD VIEW: Show this when the search bar is empty
        if (!searchTerm && this.currentFilter === 'all') {
            const wsSummary = API.items.reduce((acc, item) => {
                const wsName = API.getWorkstationName(item.workstationId) || 'General';
                acc[wsName] = (acc[wsName] || 0) + item.quantity;
                return acc;
            }, {});

            container.innerHTML = `
                <div class="form-card" style="margin-bottom: 20px; border-top: 4px solid #95C11F;">
                    <h4 style="margin-bottom: 12px; font-size: 13px; color: #2D4A5C;">🏭 STOCK BY PRESS (Tap to view)</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${Object.entries(wsSummary).map(([name, qty]) => `
                            <div onclick="UI.quickFilter('${name}')" style="
                                background: #f0f2f5; 
                                padding: 10px; 
                                border-radius: 8px; 
                                font-size: 12px; 
                                cursor: pointer; 
                                border: 1px solid #e2e5ea;
                            ">
                                <strong style="color: #2D4A5C;">${name}</strong>
                                <div style="color: #6b7280; margin-top: 4px;">${qty} pcs</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="empty-state">
                    <div class="icon">🔍</div>
                    <p>Search above or tap a press to view parts</p>
                </div>
            `;
            return;
        }

        let filtered = API.items;

        if (this.currentFilter === 'low') {
            filtered = filtered.filter(i => i.minStock > 0 && i.quantity <= i.minStock);
        }

        if (searchTerm) {
            filtered = filtered.filter(item => {
                const wsName = API.getWorkstationName(item.workstationId) || '';
                return item.name.toLowerCase().includes(searchTerm) ||
                    (item.location && item.location.toLowerCase().includes(searchTerm)) ||
                    (item.notes && item.notes.toLowerCase().includes(searchTerm)) ||
                    wsName.toLowerCase().includes(searchTerm);
            });
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">${this.currentFilter === 'low' ? '✅' : '📋'}</div>
                    <p>${this.currentFilter === 'low' ? 'No low stock items - all good!' : 'No items found'}</p>
                </div>
            `;
            return;
        }

        // Group items by Workstation
        const groups = filtered.reduce((acc, item) => {
            const wsName = API.getWorkstationName(item.workstationId) || 'Unassigned / General';
            if (!acc[wsName]) acc[wsName] = [];
            acc[wsName].push(item);
            return acc;
        }, {});

        const sortedWorkstations = Object.keys(groups).sort();

        container.innerHTML = sortedWorkstations.map(ws => {
            const items = groups[ws].sort((a, b) => a.name.localeCompare(b.name));
            return `
                <div class="ws-group-container" style="margin-bottom: 25px;">
                    <div class="ws-group-header" style="background: #e2e5ea; padding: 8px 15px; border-radius: 8px; margin-bottom: 10px; font-weight: 700; color: #2D4A5C; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
                        <span>🏭 ${ws}</span>
                        <span style="font-size: 11px; opacity: 0.7;">${items.length} item${items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${items.map(item => this.renderItemCard(item)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    renderItemCard(item) {
        const isLow = item.minStock > 0 && item.quantity <= item.minStock;
        const isCritical = item.quantity === 0;
        const cardClass = isCritical ? 'critical' : (isLow ? 'low-stock' : '');
        const qtyClass = isCritical ? 'critical' : (isLow ? 'low' : '');
        const time = Utils.formatTime(item.lastUpdated || item.createdAt);
        const wsName = API.getWorkstationName(item.workstationId);
        
        return `
            <div class="item-card ${cardClass}">
                <div class="item-header">
                    <span class="item-name">${Utils.escapeHtml(item.name)}</span>
                    <div class="item-stock-badge">
                        ${item.minStock > 0 ? '<span class="item-min">min ' + item.minStock + '</span>' : ''}
                        <span class="item-qty ${qtyClass}">${item.quantity}</span>
                    </div>
                </div>
                <div class="item-meta">
                    ${wsName ? '<span class="ws-tag">🏭 ' + Utils.escapeHtml(wsName) + '</span>' : ''}
                    ${item.location ? '<span>📍 ' + Utils.escapeHtml(item.location) + '</span>' : ''}
                    ${item.partNo ? '<span style="font-family:monospace; font-size:11px; color:#95C11F; font-weight:700; background:#1a2f3d; padding:2px 6px; border-radius:4px;">▦ ' + Utils.escapeHtml(item.partNo) + '</span>' : ''}
                    <span>👤 ${Utils.escapeHtml(item.addedBy)}</span>
                    <span>🕐 ${time}</span>
                </div>
                ${item.notes ? '<div class="item-notes">' + Utils.escapeHtml(item.notes) + '</div>' : ''}
                <div class="item-actions">
                    <button class="act-btn act-use" onclick="UI.handleUseClick(${item.id})" ${item.quantity === 0 ? 'disabled' : ''}>- Use</button>
                    <button class="act-btn act-restock" onclick="UI.handleRestockClick(${item.id})">+ Restock</button>
                    <button class="act-btn act-edit" onclick="UI.handleEditClick(${item.id})">✏️</button>
                    <button class="act-btn act-barcode" onclick="Components.showBarcodeModal(${item.id})" title="Print barcode" style="flex:0; padding:10px 12px; background:#e8f4f8; color:#2D4A5C;">▦</button>
                    <button class="act-btn act-delete" onclick="UI.handleDeleteClick(${item.id})">🗑</button>
                </div>
            </div>
        `;
    },

    handleUseClick(id) {
        const item = API.items.find(i => i.id === id);
        if (item && window.Components) {
            Components.showUseModal(item);
        }
    },

    handleRestockClick(id) {
        const item = API.items.find(i => i.id === id);
        if (item && window.Components) {
            Components.showRestockModal(item);
        }
    },

    handleDeleteClick(id) {
        const item = API.items.find(i => i.id === id);
        if (item && window.Components) {
            Components.showDeleteModal(item);
        }
    },

    handleEditClick(id) {
        const item = API.items.find(i => i.id === id);
        if (item) this.showEditModal(item);
    },

    showEditModal(item) {
        const overlay = document.getElementById('modalOverlay');
        const modal = document.getElementById('modal');
        if (!overlay || !modal) return;

        const wsOptions = API.workstations.map(ws =>
            `<option value="${ws.id}" ${item.workstationId == ws.id ? 'selected' : ''}>${Utils.escapeHtml(ws.name)}</option>`
        ).join('');

        modal.innerHTML = `
            <h3>✏️ Edit Part</h3>
            <p class="modal-sub">${Utils.escapeHtml(item.name)}</p>
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px;">
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Part Number</label>
                    <input type="text" id="editPartNo" value="${Utils.escapeHtml(item.partNo || '')}" placeholder="e.g. BRG-6205" style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;">
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Part Name *</label>
                    <input type="text" id="editPartName" value="${Utils.escapeHtml(item.name || '')}" placeholder="Part name" style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;">
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Location</label>
                    <input type="text" id="editLocation" value="${Utils.escapeHtml(item.location || '')}" placeholder="e.g. Shelf A3" style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;">
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Workstation</label>
                    <select id="editWorkstation" style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;background:white;">
                        <option value="">— No Workstation —</option>
                        ${wsOptions}
                    </select>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Minimum Stock</label>
                    <input type="number" id="editMinStock" value="${item.minStock || 0}" min="0" style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;">
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Notes</label>
                    <textarea id="editNotes" rows="2" placeholder="Optional notes" style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;resize:vertical;">${Utils.escapeHtml(item.notes || '')}</textarea>
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" onclick="Utils.closeModal()">Cancel</button>
                <button class="modal-btn confirm" onclick="UI.saveEdit(${item.id})">💾 Save Changes</button>
            </div>
        `;

        overlay.classList.add('show');
    },

    async saveEdit(id) {
        const name = document.getElementById('editPartName').value.trim();
        if (!name) {
            Utils.shakeElement(document.getElementById('editPartName'));
            return;
        }
        const data = {
            partNo:        document.getElementById('editPartNo').value.trim(),
            name,
            location:      document.getElementById('editLocation').value.trim(),
            workstationId: document.getElementById('editWorkstation').value || null,
            minStock:      parseInt(document.getElementById('editMinStock').value) || 0,
            notes:         document.getElementById('editNotes').value.trim()
        };
        try {
            const res = await fetch(`/items/${id}/edit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.text();
                console.error('Edit failed:', err);
                Utils.showToast('Failed to save: ' + res.status, true);
                return;
            }
            Utils.closeModal();
            Utils.showToast('Part updated ✓');
        } catch (e) {
            console.error('Edit error:', e);
            Utils.showToast('Failed to save changes', true);
        }
    },

    quickFilter(name) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = name;
            this.renderItems();
            window.scrollTo({ top: searchInput.offsetTop - 20, behavior: 'smooth' });
        }
    },

    // ===== WORKSTATION UI =====

    updateWorkstationDropdown() {
        const partSelect = document.getElementById('partWorkstation');
        const quickSelect = document.getElementById('wsQuickSelect');
        if (!partSelect) return;

        const optionsHtml = API.workstations.map(ws => 
            `<option value="${ws.id}">${Utils.escapeHtml(ws.name)}${ws.description ? ' (' + Utils.escapeHtml(ws.description) + ')' : ''}</option>`
        ).join('');

        partSelect.innerHTML = '<option value="">— No Workstation —</option>' + optionsHtml;

        if (quickSelect) {
            const currentQuickVal = quickSelect.value;
            quickSelect.innerHTML = '<option value="">— Select a Workstation —</option>' + optionsHtml;
            quickSelect.value = currentQuickVal;
        }
    },

    renderWorkstations() {
        const container = document.getElementById('workstationsList');
        const quickSelect = document.getElementById('wsQuickSelect');
        if (!container || !quickSelect) return;

        if (!quickSelect.value) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🏭</div>
                    <p>Please select a workstation from the dropdown above to view details.</p>
                </div>
            `;
            return;
        }

        const ws = API.workstations.find(w => w.id == quickSelect.value);
        if (ws) {
            container.innerHTML = this.renderSingleWorkstationCard(ws);
        }
    },

    handleWsSelect(wsId) {
        const container = document.getElementById('workstationsList');
        if (!container) return;

        if (!wsId) {
            sessionStorage.removeItem('selectedWorkstation');
            this.renderWorkstations();
            return;
        }
        
        sessionStorage.setItem('selectedWorkstation', wsId);
        const ws = API.workstations.find(w => w.id == wsId);
        if (ws) {
            container.innerHTML = this.renderSingleWorkstationCard(ws);
        }
    },

    renderSingleWorkstationCard(ws) {
        const partCount = API.items.filter(i => i.workstationId === ws.id).length;
        const lowCount = API.items.filter(i => i.workstationId === ws.id && i.minStock > 0 && i.quantity <= i.minStock).length;
        const time = Utils.formatTime(ws.createdAt);

        return `
            <div class="item-card" style="border-left-color: #2D4A5C;">
                <div class="item-header">
                    <span class="item-name">🏭 ${Utils.escapeHtml(ws.name)}</span>
                    <span class="item-qty">${partCount} part${partCount !== 1 ? 's' : ''}</span>
                </div>
                ${ws.description ? '<div class="item-meta"><span>' + Utils.escapeHtml(ws.description) + '</span></div>' : ''}
                <div class="item-meta">
                    <span>👤 ${Utils.escapeHtml(ws.addedBy)}</span>
                    <span>🕐 ${time}</span>
                    ${lowCount > 0 ? '<span style="color: #ef4444; font-weight: 700;">⚠️ ' + lowCount + ' low stock</span>' : ''}
                </div>
                <div class="item-actions">
                    <button class="act-btn act-restock" onclick="UI.filterByWorkstation(${ws.id})" style="flex: 3;">📋 View Parts</button>
                    <button class="act-btn act-delete" onclick="UI.handleDeleteWorkstation(${ws.id})">🗑</button>
                </div>
            </div>
        `;
    },

    filterByWorkstation(wsId) {
        this.switchTab('list');
        const ws = API.workstations.find(w => w.id === wsId);
        if (ws) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = ws.name;
                this.renderItems();
            }
        }
    },

    async addWorkstation() {
        const nameInput = document.getElementById('wsName');
        const name = nameInput.value.trim();
        if (!name) {
            Utils.shakeElement(nameInput);
            return;
        }
        Utils.showLoading();
        const ws = {
            name: name,
            description: document.getElementById('wsDescription').value.trim(),
            addedBy: App.userName
        };
        try {
            await API.addWorkstation(ws);
            document.getElementById('wsName').value = '';
            document.getElementById('wsDescription').value = '';
            Utils.showToast('Workstation added!');
        } catch (err) { } finally {
            Utils.hideLoading();
        }
    },

    handleDeleteWorkstation(id) {
        const ws = API.workstations.find(w => w.id === id);
        if (ws && window.Components) {
            Components.showDeleteWorkstationModal(ws);
        }
    },

    updateAlerts() {
        const alertsSection = document.getElementById('alertsSection');
        const alertsList = document.getElementById('alertsList');
        if (!alertsSection || !alertsList) return;
        const lowStockItems = API.items.filter(item => item.minStock > 0 && item.quantity <= item.minStock);
        if (lowStockItems.length > 0) {
            const sortedAlerts = lowStockItems.sort((a, b) => (a.quantity / a.minStock) - (b.quantity / b.minStock));
            alertsList.innerHTML = sortedAlerts.map(item => {
                const percentOfMin = Math.round((item.quantity / item.minStock) * 100);
                const isCritical = item.quantity === 0;
                const wsName = API.getWorkstationName(item.workstationId);
                return `
                    <div class="alert-item">
                        <div class="alert-item-left">
                            <div class="alert-item-name">${Utils.escapeHtml(item.name)}${isCritical ? ' ⚠️' : ''}</div>
                            <div class="alert-item-details">
                                <span class="alert-item-stock">Stock: ${item.quantity}</span>
                                <span class="alert-item-min">Min: ${item.minStock}</span>
                                <span style="color: ${percentOfMin < 50 ? '#b91c1c' : '#f59e0b'};">${percentOfMin}% of min</span>
                                ${wsName ? `<span>🏭 ${Utils.escapeHtml(wsName)}</span>` : ''}
                            </div>
                        </div>
                        <button class="alert-item-action" onclick="UI.handleRestockClick(${item.id})">+ Restock Now</button>
                    </div>
                `;
            }).join('');
            alertsSection.classList.remove('hidden');
        } else {
            alertsSection.classList.add('hidden');
        }
    },

    updateStats() {
        document.getElementById('totalItems').textContent = API.items.length;
        const totalQty = API.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
        document.getElementById('totalQty').textContent = totalQty;
        const lowItems = API.items.filter(i => i.minStock > 0 && i.quantity <= i.minStock);
        document.getElementById('lowCount').textContent = lowItems.length;
        const badge = document.getElementById('lowBadge');
        if (badge) {
            badge.style.display = lowItems.length > 0 ? 'inline' : 'none';
            badge.textContent = lowItems.length;
        }
    },

    updateUserList(users) {
        const userList = document.getElementById('userList');
        const userCount = document.getElementById('userCount');
        if (!userList || !userCount) return;
        userCount.textContent = users.length;
        if (users.length === 0) {
            userList.innerHTML = '<div style="color: #6b7280; font-size: 13px; padding: 5px;">No other users connected</div>';
            return;
        }
        userList.innerHTML = users.map(user => {
            const time = Utils.formatTime(user.connectedAt);
            const isYou = user.name === App.userName;
            return `
                <div class="user-avatar online" title="Connected since ${time}">
                    <span class="avatar-dot"></span>
                    <span class="avatar-name">${Utils.escapeHtml(user.name)}${isYou ? ' (you)' : ''}</span>
                    <span class="avatar-time">${time}</span>
                </div>
            `;
        }).join('');
    },

    async addItem() {
        const nameInput = document.getElementById('partName');
        const partNoInput = document.getElementById('partNo');
        const name = nameInput.value.trim();
        if (!name) {
            Utils.shakeElement(nameInput);
            return;
        }
        Utils.showLoading();
        const wsSelect = document.getElementById('partWorkstation');
        const workstationId = wsSelect && wsSelect.value ? parseInt(wsSelect.value) : null;
        const item = {
            partNo: partNoInput ? partNoInput.value.trim() : '',
            name: name,
            location: document.getElementById('partLocation').value.trim(),
            quantity: parseInt(document.getElementById('partQty').value) || 1,
            minStock: parseInt(document.getElementById('partMinStock').value) || 0,
            notes: document.getElementById('partNotes').value.trim(),
            workstationId: workstationId,
            addedBy: App.userName
        };
        try {
            await API.addItem(item);
            if (partNoInput) { partNoInput.value = ''; partNoInput.readOnly = false; partNoInput.style.background = ''; }
            const clearBtn = document.getElementById('clearPartNo');
            if (clearBtn) clearBtn.style.display = 'none';
            document.getElementById('partName').value = '';
            document.getElementById('partLocation').value = '';
            document.getElementById('partQty').value = '1';
            document.getElementById('partMinStock').value = '0';
            document.getElementById('partNotes').value = '';
            if (wsSelect) wsSelect.value = '';
            Utils.showToast('Part added!');
            this.switchTab('list');
        } catch (err) { } finally {
            Utils.hideLoading();
        }
    },

    setFilter(filter) {
        this.currentFilter = filter;
        document.getElementById('filterAll').classList.toggle('active', filter === 'all');
        document.getElementById('filterLow').classList.toggle('active', filter === 'low');
        this.renderItems();
    },

    debounceSearch: function() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.renderItems(), 300);
    },

    switchTab(tab) {
        this.currentTab = tab;
        // Update bottom nav active states
        ['tabAdd', 'tabList', 'tabWorkstations'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
        const activeMap = { add: 'tabAdd', list: 'tabList', workstations: 'tabWorkstations' };
        if (activeMap[tab]) {
            const el = document.getElementById(activeMap[tab]);
            if (el) el.classList.add('active');
        }
        // Hide all views first, then show the selected one
        ['addView', 'listView', 'workstationsView'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        if (tab === 'add') document.getElementById('addView').classList.remove('hidden');
        if (tab === 'list') document.getElementById('listView').classList.remove('hidden');
        if (tab === 'workstations') document.getElementById('workstationsView').classList.remove('hidden');

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = ""; 
        }

        if (tab === 'workstations') {
            const quickSelect = document.getElementById('wsQuickSelect');
            if (quickSelect) {
                quickSelect.value = ""; 
            }
            this.renderWorkstations(); 
        }

        this.renderItems(); 
    },

    scrollToAlerts() {
        const el = document.getElementById('alertsSection');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    },

    showStats() {
        if (window.Components) {
            Components.showStatsModal(API.items);
        }
    }
};

window.UI = UI;
