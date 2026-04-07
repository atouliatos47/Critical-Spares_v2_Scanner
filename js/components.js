// Modal Components
const Components = {
    showUseModal(item) {
        const modal = document.getElementById('modal');
        modal.innerHTML = `
            <h3>Use Part</h3>
            <div class="modal-sub">${Utils.escapeHtml(item.name)} — Current stock: ${item.quantity}</div>
            <div class="form-row">
                <label>How many used?</label>
                <input type="number" id="useAmount" value="1" min="1" max="${item.quantity}" onfocus="this.select()" style="width:100%; padding:12px; border:2px solid #e2e5ea; border-radius:8px;">
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" onclick="Components.closeModal()">Cancel</button>
                <button class="modal-btn danger" onclick="Components.confirmUse(${item.id})">Use Part</button>
            </div>
        `;
        document.getElementById('modalOverlay').classList.add('show');
        setTimeout(() => document.getElementById('useAmount')?.select(), 100);
    },

    async confirmUse(id) {
        const amount = parseInt(document.getElementById('useAmount').value) || 1;
        Components.closeModal();
        Utils.showLoading();
        try {
            await API.useItem(id, amount, App.userName);
            Utils.showToast('Part used successfully');
        } catch(e) {
            Utils.showToast('Error using part', true);
        } finally {
            Utils.hideLoading();
        }
    },

    showRestockModal(item) {
        const modal = document.getElementById('modal');
        modal.innerHTML = `
            <h3>Restock Part</h3>
            <div class="modal-sub">${Utils.escapeHtml(item.name)} — Current stock: ${item.quantity}</div>
            <div class="form-row">
                <label>How many to add?</label>
                <input type="number" id="restockAmount" value="1" min="1" onfocus="this.select()" style="width:100%; padding:12px; border:2px solid #e2e5ea; border-radius:8px;">
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" onclick="Components.closeModal()">Cancel</button>
                <button class="modal-btn confirm" onclick="Components.confirmRestock(${item.id})">Restock</button>
            </div>
        `;
        document.getElementById('modalOverlay').classList.add('show');
        setTimeout(() => document.getElementById('restockAmount')?.select(), 100);
    },

    async confirmRestock(id) {
        const amount = parseInt(document.getElementById('restockAmount').value) || 1;
        Components.closeModal();
        Utils.showLoading();
        try {
            await API.restockItem(id, amount);
            Utils.showToast('Restocked successfully');
        } catch(e) {
            Utils.showToast('Error restocking', true);
        } finally {
            Utils.hideLoading();
        }
    },

    showDeleteModal(item) {
        const modal = document.getElementById('modal');
        modal.innerHTML = `
            <h3>Delete Part</h3>
            <div class="modal-sub">Remove <strong>${Utils.escapeHtml(item.name)}</strong> from the list?</div>
            <div class="modal-actions">
                <button class="modal-btn cancel" onclick="Components.closeModal()">Cancel</button>
                <button class="modal-btn danger" onclick="Components.confirmDelete(${item.id})">Delete</button>
            </div>
        `;
        document.getElementById('modalOverlay').classList.add('show');
    },

    async confirmDelete(id) {
        Components.closeModal();
        Components.closeContentModal();
        Utils.showLoading();
        try {
            await API.deleteItem(id);
            Utils.showToast('Part deleted');
        } catch(e) {
            Utils.showToast('Error deleting part', true);
        } finally {
            Utils.hideLoading();
        }
    },

    showDeleteWorkstationModal(ws) {
        const partCount = API.items.filter(i => i.workstationId === ws.id).length;
        const modal = document.getElementById('modal');
        modal.innerHTML = `
            <h3>Delete Workstation</h3>
            <div class="modal-sub">
                Remove <strong>${Utils.escapeHtml(ws.name)}</strong>?
                ${partCount > 0
                    ? '<br><br><span style="color:#f59e0b;font-weight:600;">⚠️ ' + partCount + ' part' + (partCount !== 1 ? 's are' : ' is') + ' assigned. They will be unassigned but not deleted.</span>'
                    : ''}
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" onclick="Components.closeModal()">Cancel</button>
                <button class="modal-btn danger" onclick="Components.confirmDeleteWorkstation(${ws.id})">Delete</button>
            </div>
        `;
        document.getElementById('modalOverlay').classList.add('show');
    },

    async confirmDeleteWorkstation(id) {
        Components.closeModal();
        Components.closeContentModal();
        Utils.showLoading();
        try {
            await API.deleteWorkstation(id);
            Utils.showToast('Workstation deleted');
        } catch(e) {
            Utils.showToast('Error deleting workstation', true);
        } finally {
            Utils.hideLoading();
        }
    },

    showStatsModal(items) {
        const totalItems = items.length;
        const totalStock = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
        const lowStock   = items.filter(i => i.minStock > 0 && i.quantity <= i.minStock).length;
        const outOfStock = items.filter(i => i.quantity === 0).length;
        const wsCount    = API.workstations.length;
        const assigned   = items.filter(i => i.workstationId).length;
        const modal = document.getElementById('modal');
        modal.innerHTML = `
            <h3>Statistics</h3>
            <div style="padding:10px 0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Total Parts:</span><strong>${totalItems}</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Total Stock:</span><strong>${totalStock}</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Low Stock:</span><strong style="color:#f59e0b;">${lowStock}</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Out of Stock:</span><strong style="color:#ef4444;">${outOfStock}</strong></div>
                <div style="border-top:1px solid #e2e5ea;margin:10px 0;"></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Workstations:</span><strong>${wsCount}</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Assigned to WS:</span><strong>${assigned}</strong></div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" onclick="Components.closeModal()">Close</button>
            </div>
        `;
        document.getElementById('modalOverlay').classList.add('show');
    },

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) { modal.style.maxHeight = ''; modal.style.overflowY = ''; }
        document.getElementById('modalOverlay').classList.remove('show');
    },

    // ===== ADD PART MODAL =====

    showAddModal(barcode) {
        const wsOptions = API.workstations.map(ws =>
            '<option value="' + ws.id + '">' + Utils.escapeHtml(ws.name) + '</option>'
        ).join('');
        const modal = document.getElementById('modal');
        modal.style.maxHeight = '85vh';
        modal.style.overflowY = 'auto';
        modal.innerHTML = `
            <h3>Add Spare Part</h3>
            <div class="form-row">
                <label>Part No. (Barcode)</label>
                <input type="text" id="modalPartNo" placeholder="Scan or enter part number"
                    value="${barcode ? Utils.escapeHtml(barcode) : ''}"
                    style="width:100%; padding:12px; border:2px solid ${barcode ? '#86efac' : '#e2e5ea'}; border-radius:8px; background:${barcode ? '#f0fdf4' : '#f0f2f5'};">
            </div>
            <div class="form-row">
                <label>Part Name *</label>
                <input type="text" id="modalPartName" placeholder="e.g. Contactor LC1D25"
                    style="width:100%; padding:12px; border:2px solid #e2e5ea; border-radius:8px;">
            </div>
            <div class="form-row">
                <label>Workstation</label>
                <select id="modalPartWorkstation" class="form-select">
                    <option value="">— No Workstation —</option>
                    ${wsOptions}
                </select>
            </div>
            <div class="form-row">
                <label>Location</label>
                <input type="text" id="modalPartLocation" placeholder="e.g. Press 4, Bay 2"
                    style="width:100%; padding:12px; border:2px solid #e2e5ea; border-radius:8px;">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-row">
                    <label>Quantity</label>
                    <input type="number" id="modalPartQty" value="1" min="0" onclick="this.select()"
                        style="width:100%; padding:12px; border:2px solid #e2e5ea; border-radius:8px;">
                </div>
                <div class="form-row">
                    <label>Min Stock</label>
                    <input type="number" id="modalPartMinStock" value="0" min="0" onclick="this.select()"
                        style="width:100%; padding:12px; border:2px solid #e2e5ea; border-radius:8px;">
                </div>
            </div>
            <div class="form-row">
                <label>Notes</label>
                <textarea id="modalPartNotes" rows="2" placeholder="Supplier, part number, etc."
                    style="width:100%; padding:12px; border:2px solid #e2e5ea; border-radius:8px; resize:vertical;"></textarea>
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" onclick="Components.closeModal()">Cancel</button>
                <button class="modal-btn confirm" onclick="Components.confirmAddItem()">Add to Stock</button>
            </div>
        `;
        document.getElementById('modalOverlay').classList.add('show');
        setTimeout(() => {
            const f = barcode ? document.getElementById('modalPartName') : document.getElementById('modalPartNo');
            if (f) f.focus();
        }, 100);
    },

    async confirmAddItem() {
        const nameInput = document.getElementById('modalPartName');
        const name = nameInput.value.trim();
        if (!name) { Utils.shakeElement(nameInput); return; }
        const wsSelect = document.getElementById('modalPartWorkstation');
        const item = {
            partNo:        document.getElementById('modalPartNo').value.trim(),
            name,
            location:      document.getElementById('modalPartLocation').value.trim(),
            quantity:      parseInt(document.getElementById('modalPartQty').value) || 1,
            minStock:      parseInt(document.getElementById('modalPartMinStock').value) || 0,
            notes:         document.getElementById('modalPartNotes').value.trim(),
            workstationId: wsSelect && wsSelect.value ? parseInt(wsSelect.value) : null,
            addedBy:       App.userName
        };
        Components.closeModal();
        Utils.showLoading();
        try {
            const saved = await API.addItem(item);
            // If no part number was given, auto-assign CLAM-XXXXX and save it
            if (!saved.partNo || !saved.partNo.trim()) {
                const autoCode = 'CLAM-' + String(saved.id).padStart(5, '0');
                await fetch('/items/' + saved.id + '/edit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        partNo: autoCode,
                        name: saved.name,
                        location: saved.location || '',
                        workstationId: saved.workstationId || null,
                        minStock: saved.minStock || 0,
                        notes: saved.notes || ''
                    })
                });
            }
            Utils.showToast('Part added!');
        } catch(e) {
            Utils.showToast('Error adding part', true);
        } finally {
            Utils.hideLoading();
        }
    },

    // ===== STOCK MODAL =====

    _stockFilter: 'all',

    showStockModal() {
        const overlay = document.getElementById('contentModalOverlay');
        const modal   = document.getElementById('contentModal');
        if (!overlay || !modal) return;
        Components._stockFilter = 'all';
        modal.innerHTML = `
            <div style="padding:16px 20px; border-bottom:1px solid #e2e5ea; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <h3 style="margin:0; color:#2D4A5C;">📦 Stock</h3>
                
            </div>
            <div style="padding:12px 20px; border-bottom:1px solid #e2e5ea; flex-shrink:0; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button id="sFilterAll" class="filter-btn active" onclick="Components._setStockFilter('all')">All</button>
                    <button id="sFilterLow" class="filter-btn danger" onclick="Components._setStockFilter('low')">Low Stock</button>
                </div>
                <input type="text" id="stockSearch" placeholder="Search parts or workstations..."
                    oninput="Components._renderStock()"
                    style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; box-sizing:border-box;">
            </div>
            <div id="stockModalList" style="overflow-y:auto; flex:1; padding:16px 20px;"></div>
        `;
        overlay.classList.add('show');
        Components._renderStock();
    },

    _setStockFilter(f) {
        Components._stockFilter = f;
        document.getElementById('sFilterAll')?.classList.toggle('active', f === 'all');
        document.getElementById('sFilterLow')?.classList.toggle('active', f === 'low');
        Components._renderStock();
    },

    _renderStock() {
        const container = document.getElementById('stockModalList');
        if (!container) return;
        const search = (document.getElementById('stockSearch')?.value || '').toLowerCase();
        let items = API.items;
        if (Components._stockFilter === 'low') items = items.filter(i => i.minStock > 0 && i.quantity <= i.minStock);
        if (search) items = items.filter(i => {
            const ws = API.getWorkstationName(i.workstationId) || '';
            return i.name.toLowerCase().includes(search) ||
                (i.location || '').toLowerCase().includes(search) ||
                ws.toLowerCase().includes(search);
        });
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">' +
                (Components._stockFilter === 'low' ? '✅' : '📋') + '</div><p>' +
                (Components._stockFilter === 'low' ? 'No low stock items!' : 'No items found') + '</p></div>';
            return;
        }
        const groups = items.reduce((acc, item) => {
            const ws = API.getWorkstationName(item.workstationId) || 'Unassigned / General';
            if (!acc[ws]) acc[ws] = [];
            acc[ws].push(item);
            return acc;
        }, {});
        container.innerHTML = Object.keys(groups).sort().map(ws => {
            const wsItems = groups[ws].sort((a, b) => a.name.localeCompare(b.name));
            return '<div style="margin-bottom:20px;">' +
                '<div style="background:#e2e5ea; padding:8px 12px; border-radius:8px; margin-bottom:10px; font-weight:700; color:#2D4A5C; font-size:13px; display:flex; justify-content:space-between;">' +
                '<span>🏭 ' + Utils.escapeHtml(ws) + '</span>' +
                '<span style="font-size:11px; opacity:0.7;">' + wsItems.length + ' item' + (wsItems.length !== 1 ? 's' : '') + '</span></div>' +
                wsItems.map(item => UI.renderItemCard(item)).join('') +
                '</div>';
        }).join('');
    },

    // ===== MACHINES MODAL =====

    showMachinesModal() {
        const overlay = document.getElementById('contentModalOverlay');
        const modal   = document.getElementById('contentModal');
        if (!overlay || !modal) return;
        const wsOptions = API.workstations.map(ws =>
            '<option value="' + ws.id + '">' + Utils.escapeHtml(ws.name) + '</option>'
        ).join('');
        modal.innerHTML = `
            <div style="padding:16px 20px; border-bottom:1px solid #e2e5ea; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <h3 style="margin:0; color:#2D4A5C;">🏭 Machines</h3>
                
            </div>
            <div style="padding:12px 20px; border-bottom:1px solid #e2e5ea; flex-shrink:0; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <input type="text" id="modalWsName" placeholder="Workstation name *"
                        style="flex:1; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px;">
                    <input type="text" id="modalWsDesc" placeholder="Description"
                        style="flex:1; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px;">
                    <button class="btn-submit" onclick="Components._addWs()" style="padding:10px 16px; white-space:nowrap; margin:0;">Add</button>
                </div>
                <select id="modalWsSelect" class="form-select" onchange="Components._renderMachines()">
                    <option value="">— Select a Workstation —</option>
                    ${wsOptions}
                </select>
            </div>
            <div id="machinesModalList" style="overflow-y:auto; flex:1; padding:16px 20px;">
                <div class="empty-state"><div class="icon">🏭</div><p>Select a workstation above</p></div>
            </div>
        `;
        overlay.classList.add('show');
    },

    _renderMachines() {
        const container = document.getElementById('machinesModalList');
        const wsId = document.getElementById('modalWsSelect')?.value;
        if (!container) return;
        if (!wsId) {
            container.innerHTML = '<div class="empty-state"><div class="icon">🏭</div><p>Select a workstation above</p></div>';
            return;
        }
        const ws = API.workstations.find(w => w.id == wsId);
        if (ws) container.innerHTML = UI.renderSingleWorkstationCard(ws);
    },

    async _addWs() {
        const nameInput = document.getElementById('modalWsName');
        const name = nameInput?.value.trim();
        if (!name) { Utils.shakeElement(nameInput); return; }
        Utils.showLoading();
        try {
            await API.addWorkstation({ name, description: document.getElementById('modalWsDesc')?.value.trim() || '', addedBy: App.userName });
            nameInput.value = '';
            document.getElementById('modalWsDesc').value = '';
            Utils.showToast('Workstation added!');
            Components.closeContentModal();
            setTimeout(() => Components.showMachinesModal(), 150);
        } catch(e) {
            Utils.showToast('Error adding workstation', true);
        } finally {
            Utils.hideLoading();
        }
    },


    // ===== BARCODE MODAL =====

    showBarcodeModal(id) {
        const item = API.items.find(i => i.id === id);
        if (!item) return;

        // Use partNo if set, otherwise generate CLAM-XXXXX from id
        const barcodeValue = item.partNo && item.partNo.trim()
            ? item.partNo.trim()
            : 'CLAM-' + String(item.id).padStart(5, '0');

        const wsName = API.getWorkstationName(item.workstationId) || '';
        const modal = document.getElementById('modal');
        modal.style.maxWidth = '320px';
        modal.innerHTML = `
            <h3>Barcode Label</h3>
            <div id="barcodeLabel" style="background:#ffffff; border:2px solid #2D4A5C; border-radius:4px; padding:6px 10px; margin:16px auto; text-align:center; font-family:Arial,sans-serif; width:245px; box-sizing:border-box;">
                <div style="font-size:9px; font-weight:700; color:#2D4A5C; text-transform:uppercase; letter-spacing:2px; margin-bottom:3px;">Clamason</div>
                <svg id="barcodesvg" style="display:block; margin:0 auto;"></svg>
                <div style="font-size:9px; color:#1a1a2e; margin-top:3px; letter-spacing:1.5px; font-weight:600;">${Utils.escapeHtml(barcodeValue)}</div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" onclick="Components.closeModal()">Close</button>
                <button class="modal-btn cancel" onclick="Components.downloadBarcode('${Utils.escapeHtml(item.name)}')">⬇ Download</button>
                <button class="modal-btn confirm" onclick="Components.printBarcode()">🖨 Print</button>
            </div>
        `;
        document.getElementById('modalOverlay').classList.add('show');

        // Generate barcode after modal renders
        setTimeout(() => {
            try {
                JsBarcode('#barcodesvg', barcodeValue, {
                    format: 'CODE128',
                    width: 1.5,
                    height: 38,
                    displayValue: false,
                    margin: 2
                });
            } catch(e) {
                console.error('Barcode error:', e);
            }
        }, 100);
    },

    printBarcode() {
        const label = document.getElementById('barcodeLabel');
        if (!label) return;
        const win = window.open('', '_blank');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Barcode</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: 'DM Sans', Arial, sans-serif; display: flex; justify-content: center; }
                    @media print { body { padding: 0; } button { display: none; } }
                </style>
            </head>
            <body>
                ${label.outerHTML}
                <br>
                <button onclick="window.print()">Print</button>
            </body>
            </html>
        `);
        win.document.close();
        setTimeout(() => win.print(), 500);
    },

    downloadBarcode(name) {
        const svg = document.getElementById('barcodesvg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const a = document.createElement('a');
            a.download = (name || 'barcode') + '.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    },

    closeContentModal() {
        document.getElementById('contentModalOverlay').classList.remove('show');
    }

};

// Make Components globally available
window.Components = Components;
