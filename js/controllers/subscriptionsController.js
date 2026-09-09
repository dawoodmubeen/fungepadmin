import { databases, CONFIG, Query, functions } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';
import { fetchAllDocuments, filterAndPaginate, debounce } from '../utils/dbHelper.js';

export const subscriptionsController = {
    async render(container, args) {
        if (args && args.length > 0 && args[0] === 'edit' && args[1]) {
            await this.renderForm(container, args[1]);
        } else {
            await this.renderList(container);
        }
    },

    async renderList(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Action Bar -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Active Subscriptions</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">Financial Ledger</span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Audit active student subscriptions, expiration periods, and cancellations.</p>
                    </div>
                </div>

                <!-- Filters Toolbar -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div class="relative flex-1 w-full md:max-w-md">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="search-sub" placeholder="Search by student, email, or TID..." class="form-input pl-10 text-xs sm:text-sm">
                    </div>
                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <select id="filter-sub-status" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Statuses</option>
                            <option value="active" selected>Active Subscriptions</option>
                            <option value="expired">Expired</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div class="table-responsive-wrapper">
                        <table class="min-w-full divide-y divide-slate-100">
                            <thead class="table-header">
                                <tr>
                                    <th>Student & Account</th>
                                    <th>Plan & Paid Amount</th>
                                    <th>Status</th>
                                    <th>Start Date</th>
                                    <th>Expiry Date</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="subs-tbody" class="divide-y divide-slate-100 bg-white">
                                <tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading subscriptions...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <button id="prev-sub-page" class="btn-secondary text-xs" disabled>Previous</button>
                        <span id="sub-page-info" class="text-xs font-bold text-slate-600">Page 1</span>
                        <button id="next-sub-page" class="btn-secondary text-xs">Next</button>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        this.currentPage = 1;
        this.limit = 20;
        this.statusFilter = 'active';
        this.allSubs = [];

        await this.loadAllSubs();
        this.setupEvents();
    },

    async loadAllSubs() {
        const tbody = document.getElementById('subs-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading subscriptions from database...</td></tr>`;
        }

        try {
            this.allSubs = await fetchAllDocuments(CONFIG.databaseId, CONFIG.subscriptionsCol, [
                Query.orderDesc('$createdAt')
            ]);
            this.applyFilterAndRender();
        } catch (error) {
            console.error("Failed to load subscriptions:", error);
            showToast("Failed to load subscriptions", "error");
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-rose-500 text-xs font-semibold">Error loading subscriptions.</td></tr>`;
            }
        }
    },

    applyFilterAndRender() {
        const searchInput = document.getElementById('search-sub');
        const filterStatus = document.getElementById('filter-sub-status');

        const q = searchInput?.value || '';
        const statusVal = filterStatus?.value || 'all';

        const filterFn = (s) => {
            if (statusVal !== 'all' && (s.status || '').toLowerCase() !== statusVal.toLowerCase()) return false;
            return true;
        };

        const searchFields = [
            'user_name',
            'user_email',
            'email',
            'transaction_id',
            'plan',
            'user_id'
        ];

        const result = filterAndPaginate(this.allSubs, {
            searchQuery: q,
            searchFields,
            filterFn,
            page: this.currentPage,
            limit: this.limit
        });

        this.renderTableRows(result.items);

        const pageInfo = document.getElementById('sub-page-info');
        if (pageInfo) {
            pageInfo.textContent = result.total > 0
                ? `Page ${result.currentPage} of ${result.totalPages} (Showing ${result.startIndex}–${result.endIndex} of ${result.total} subscriptions)`
                : 'No matching subscriptions found';
        }

        const prevBtn = document.getElementById('prev-sub-page');
        if (prevBtn) prevBtn.disabled = !result.hasPrev;

        const nextBtn = document.getElementById('next-sub-page');
        if (nextBtn) nextBtn.disabled = !result.hasNext;
    },

    setupEvents() {
        const searchInput = document.getElementById('search-sub');
        const filterStatus = document.getElementById('filter-sub-status');

        const onFilterChange = () => {
            this.currentPage = 1;
            this.applyFilterAndRender();
        };

        searchInput?.addEventListener('input', debounce(() => onFilterChange(), 200));
        filterStatus?.addEventListener('change', onFilterChange);

        document.getElementById('prev-sub-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.applyFilterAndRender();
            }
        });

        document.getElementById('next-sub-page')?.addEventListener('click', () => {
            this.currentPage++;
            this.applyFilterAndRender();
        });
    },

    renderTableRows(data) {
        const tbody = document.getElementById('subs-tbody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">No subscription records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(sub => {
            const statusBadge = sub.status === 'active'
                ? '<span class="badge badge-success text-xs">Active</span>'
                : sub.status === 'expired'
                ? '<span class="badge badge-warning text-xs">Expired</span>'
                : '<span class="badge badge-error text-xs">Cancelled</span>';

            return `
                <tr class="table-row">
                    <td class="table-cell">
                        <p class="font-bold text-slate-900 text-xs">${sub.user_name || 'Student'}</p>
                        <p class="text-slate-400 text-[11px] font-mono">${sub.email || sub.user_email || sub.user_id}</p>
                    </td>
                    <td class="table-cell text-xs">
                        <span class="font-bold text-slate-900 capitalize">${sub.plan || 'Premium'}</span>
                        <p class="text-slate-400 font-mono">PKR ${sub.amount || sub.amount_paid || 1500}</p>
                    </td>
                    <td class="table-cell">
                        ${statusBadge}
                    </td>
                    <td class="table-cell text-xs font-mono text-slate-500">
                        ${new Date(sub.start_date || sub.started_at || sub.$createdAt).toLocaleDateString()}
                    </td>
                    <td class="table-cell text-xs font-mono text-slate-500">
                        ${new Date(sub.expiry_date || sub.expires_at || new Date()).toLocaleDateString()}
                    </td>
                    <td class="table-cell text-right">
                        <a href="#subscriptions/edit/${sub.$id}" class="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition">
                            Edit Period
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    },

    async renderForm(container, subId) {
        container.innerHTML = `<div class="p-12 text-center text-slate-400 text-xs font-semibold uppercase">Loading subscription data...</div>`;

        try {
            const sub = await databases.getDocument(CONFIG.databaseId, CONFIG.subscriptionsCol, subId);

            container.innerHTML = `
                <div class="max-w-xl mx-auto space-y-6">
                    <div class="flex items-center justify-between">
                        <a href="#subscriptions" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            <span>Back to Subscriptions</span>
                        </a>
                        <span class="text-xs font-bold text-slate-400">Edit Subscription</span>
                    </div>

                    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
                        <h2 class="text-base font-bold text-slate-900 mb-6">Modify Subscription Duration</h2>

                        <form id="sub-edit-form" class="space-y-4">
                            <div>
                                <label class="form-label">Student</label>
                                <input type="text" readonly value="${sub.user_name || sub.user_id}" class="form-input bg-slate-50 font-bold">
                            </div>
                            <div>
                                <label class="form-label">Plan Tier</label>
                                <input type="text" id="se-plan" value="${sub.plan || 'premium'}" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Status</label>
                                <select id="se-status" class="form-input text-xs">
                                    <option value="active" ${sub.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="expired" ${sub.status === 'expired' ? 'selected' : ''}>Expired</option>
                                    <option value="cancelled" ${sub.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="form-label">Start Date</label>
                                    <input type="date" id="se-start" value="${(sub.start_date || sub.started_at || '').split('T')[0]}" class="form-input text-xs">
                                </div>
                                <div>
                                    <label class="form-label">Expiry Date</label>
                                    <input type="date" id="se-expiry" value="${(sub.expiry_date || sub.expires_at || '').split('T')[0]}" class="form-input text-xs">
                                </div>
                            </div>

                            <div class="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                                <a href="#subscriptions" class="btn-secondary">Cancel</a>
                                <button type="submit" id="se-save-btn" class="btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            document.getElementById('sub-edit-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('se-save-btn');
                btn.disabled = true;
                btn.textContent = 'Saving...';

                try {
                    const status = document.getElementById('se-status').value;
                    const plan = document.getElementById('se-plan').value;
                    const start = document.getElementById('se-start').value;
                    const expiry = document.getElementById('se-expiry').value;

                    await databases.updateDocument(CONFIG.databaseId, CONFIG.subscriptionsCol, subId, {
                        status: status,
                        plan: plan,
                        start_date: start ? new Date(start).toISOString() : new Date().toISOString(),
                        expiry_date: expiry ? new Date(expiry).toISOString() : new Date().toISOString()
                    });

                    // Sync user premium state if cancelled
                    if (status === 'cancelled' || status === 'expired') {
                        const uRes = await databases.listDocuments(CONFIG.databaseId, CONFIG.usersCol, [
                            Query.equal('auth_id', sub.user_id),
                            Query.limit(1)
                        ]);
                        if (uRes.documents.length > 0) {
                            await databases.updateDocument(CONFIG.databaseId, CONFIG.usersCol, uRes.documents[0].$id, {
                                is_premium: false
                            });
                        }
                    }

                    showToast("Subscription updated successfully", "success");
                    window.location.hash = '#subscriptions';

                } catch (err) {
                    console.error(err);
                    showToast(err.message || "Failed to update subscription", "error");
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Save Changes';
                }
            });

        } catch (error) {
            console.error(error);
            showToast("Failed to load subscription", "error");
            window.location.hash = '#subscriptions';
        }
    }
};
