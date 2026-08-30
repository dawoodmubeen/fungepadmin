import { databases, CONFIG, Query, functions } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const subscriptionsController = {
    async render(container, args) {
        if (args.length > 0 && args[0] === 'edit' && args[1]) {
            this.renderForm(container, args[1]);
        } else {
            this.renderList(container);
        }
    },

    async renderList(container) {
        container.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900">Subscriptions</h2>
                <p class="text-sm text-gray-500">Manage user premium subscriptions.</p>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <div class="relative flex-1 max-w-md">
                        <i data-lucide="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"></i>
                        <input type="text" id="search-sub" placeholder="Search by name, email..." class="form-input pl-9">
                    </div>
                    <select id="filter-status" class="form-input max-w-[150px]">
                        <option value="all">All Statuses</option>
                        <option value="active" selected>Active</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                
                <div class="table-container">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 table-header">
                            <tr>
                                <th>User</th>
                                <th>Plan</th>
                                <th>Status</th>
                                <th>Start Date</th>
                                <th>Expiry Date</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="subs-tbody" class="bg-white divide-y divide-gray-200">
                            <tr><td colspan="6" class="text-center py-8 text-gray-500">Loading subscriptions...</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <button id="prev-page" class="btn-secondary" disabled>Previous</button>
                    <span id="page-info" class="text-sm text-gray-600">Page 1</span>
                    <button id="next-page" class="btn-secondary">Next</button>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        this.currentPage = 1;
        this.limit = 20;
        this.statusFilter = 'active';
        this.subs = [];
        
        await this.loadPage(1);

        document.getElementById('search-sub').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = this.subs.filter(s => 
                (s.user_name && s.user_name.toLowerCase().includes(q)) || 
                (s.email && s.email.toLowerCase().includes(q)) ||
                (s.user_email && s.user_email.toLowerCase().includes(q))
            );
            this.renderTableRows(document.getElementById('subs-tbody'), filtered);
        });

        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.currentPage = 1;
            this.loadPage(1);
        });
        
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadPage(this.currentPage);
            }
        });
        
        document.getElementById('next-page').addEventListener('click', () => {
            this.currentPage++;
            this.loadPage(this.currentPage);
        });
    },

    async loadPage(page) {
        try {
            const queries = [
                Query.orderDesc('created_at'),
                Query.limit(this.limit),
                Query.offset((page - 1) * this.limit)
            ];
            
            if (this.statusFilter !== 'all') {
                queries.push(Query.equal('status', this.statusFilter));
            }
            
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.subscriptionsCol, queries);
            this.subs = res.documents;
            
            const tbody = document.getElementById('subs-tbody');
            if (this.subs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No subscriptions found.</td></tr>`;
            } else {
                this.renderTableRows(tbody, this.subs);
            }
            
            document.getElementById('page-info').textContent = `Page ${page}`;
            document.getElementById('prev-page').disabled = page === 1;
            document.getElementById('next-page').disabled = res.documents.length < this.limit;
            
        } catch (error) {
            console.error(error);
            showToast("Failed to load subscriptions", "error");
        }
    },

    renderTableRows(tbody, data) {
        tbody.innerHTML = data.map(doc => {
            return `
            <tr class="table-row">
                <td class="table-cell">
                    <p class="font-medium text-gray-900">${doc.user_name || 'Unknown'}</p>
                    <p class="text-xs text-gray-500">${doc.email || doc.user_email || 'No email'}</p>
                </td>
                <td class="table-cell font-medium">
                    ${doc.plan}
                </td>
                <td class="table-cell">
                    <span class="badge ${doc.status === 'active' ? 'badge-success' : (doc.status === 'expired' ? 'badge-warning' : 'badge-error')} capitalize">
                        ${doc.status}
                    </span>
                </td>
                <td class="table-cell text-sm text-gray-600">
                    ${new Date(doc.started_at || doc.start_date || doc.$createdAt).toLocaleDateString()}
                </td>
                <td class="table-cell text-sm text-gray-600">
                    ${new Date(doc.expires_at || doc.expiry_date || new Date()).toLocaleDateString()}
                </td>
                <td class="table-cell text-right">
                    <a href="#subscriptions/edit/${doc.$id}" class="text-primary hover:text-secondary text-sm font-medium">
                        Edit
                    </a>
                </td>
            </tr>
        `}).join('');
    },

    async renderForm(container, id) {
        let sub = null;
        try {
            sub = await databases.getDocument(CONFIG.databaseId, CONFIG.subscriptionsCol, id);
        } catch (err) {
            showToast("Failed to load subscription", "error");
            window.location.hash = '#subscriptions';
            return;
        }

        container.innerHTML = `
            <div class="mb-6 flex items-center">
                <a href="#subscriptions" class="text-gray-500 hover:text-gray-700 mr-4">
                    <i data-lucide="arrow-left" class="w-5 h-5"></i>
                </a>
                <h2 class="text-2xl font-bold text-gray-900">Edit Subscription</h2>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
                <form id="sub-form" class="p-6 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">User Name</label>
                            <input type="text" class="form-input bg-gray-50" readonly value="${sub.user_name}">
                        </div>
                        <div>
                            <label class="form-label">User Email</label>
                            <input type="text" class="form-input bg-gray-50" readonly value="${sub.email || sub.user_email || ''}">
                        </div>
                        <div>
                            <label class="form-label">Plan *</label>
                            <input type="text" id="s-plan" class="form-input" required value="${sub.plan}">
                        </div>
                        <div>
                            <label class="form-label">Status *</label>
                            <select id="s-status" class="form-input" required>
                                <option value="active" ${sub.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="expired" ${sub.status === 'expired' ? 'selected' : ''}>Expired</option>
                                <option value="cancelled" ${sub.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Start Date *</label>
                            <input type="date" id="s-start" class="form-input" required value="${(sub.started_at || sub.start_date) ? (sub.started_at || sub.start_date).split('T')[0] : ''}">
                        </div>
                        <div>
                            <label class="form-label">Expiry Date *</label>
                            <input type="date" id="s-expiry" class="form-input" required value="${(sub.expires_at || sub.expiry_date) ? (sub.expires_at || sub.expiry_date).split('T')[0] : ''}">
                        </div>
                        <div id="cancel-reason-container" class="col-span-1 md:col-span-2 hidden">
                            <label class="form-label">Cancellation Reason *</label>
                            <textarea id="s-cancel-reason" class="form-input" rows="3" placeholder="Reason for cancellation..."></textarea>
                        </div>
                    </div>
                    
                    <div class="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <a href="#subscriptions" class="btn-secondary">Back</a>
                        <button type="submit" class="btn-primary" id="save-btn">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        const statusSelect = document.getElementById('s-status');
        const reasonContainer = document.getElementById('cancel-reason-container');
        const origStatus = sub.status;

        statusSelect.addEventListener('change', (e) => {
            if (e.target.value === 'cancelled' && origStatus === 'active') {
                reasonContainer.classList.remove('hidden');
                document.getElementById('s-cancel-reason').required = true;
            } else {
                reasonContainer.classList.add('hidden');
                document.getElementById('s-cancel-reason').required = false;
            }
        });

        document.getElementById('sub-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                const newStatus = statusSelect.value;
                
                if (newStatus === 'cancelled' && origStatus === 'active') {
                    // Use Appwrite Function for cancellation
                    const cancelReason = document.getElementById('s-cancel-reason').value.trim();
                    if (!cancelReason) {
                        alert("Cancellation reason is required.");
                        btn.disabled = false;
                        btn.textContent = 'Save Changes';
                        return;
                    }

                    const payload = JSON.stringify({
                        action: 'cancel',
                        subscriptionId: id,
                        cancellationReason: cancelReason
                    });

                    const execution = await functions.createExecution(
                        CONFIG.premiumOpsFunctionId,
                        payload,
                        false
                    );

                    if (execution.status === 'failed') throw new Error(execution.responseBody || "Server function failed.");
                    const response = JSON.parse(execution.responseBody);
                    if (!response.success) throw new Error(response.error || "Operation failed.");
                    
                } else {
                    // Regular update (fallback for manually tweaking dates/plans)
                    const data = {
                        plan: document.getElementById('s-plan').value,
                        status: newStatus,
                        started_at: new Date(document.getElementById('s-start').value).toISOString(),
                        expires_at: new Date(document.getElementById('s-expiry').value).toISOString()
                    };

                    await databases.updateDocument(CONFIG.databaseId, CONFIG.subscriptionsCol, id, data);
                    
                    const isPremium = (newStatus === 'active');
                    const uRes = await databases.listDocuments(CONFIG.databaseId, CONFIG.usersCol, [Query.equal('auth_id', sub.user_id)]);
                    if (uRes.documents.length > 0) {
                        await databases.updateDocument(CONFIG.databaseId, CONFIG.usersCol, uRes.documents[0].$id, {
                            is_premium: isPremium
                        });
                    }
                }
                
                showToast("Subscription updated successfully", "success");
                window.location.hash = '#subscriptions';
            } catch (error) {
                console.error(error);
                showToast(error.message || "Failed to save subscription", "error");
                btn.disabled = false;
                btn.textContent = 'Save Changes';
            }
        });
    }
};
