import { databases, storage, CONFIG, Query, ID, functions } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';
import { fetchAllDocuments, filterAndPaginate, debounce } from '../utils/dbHelper.js';

export const premiumRequestsController = {
    async render(container, args) {
        if (args && args.length > 0 && args[0] === 'view' && args[1]) {
            await this.renderDetails(container, args[1]);
        } else {
            await this.renderList(container);
        }
    },

    async renderList(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Premium Order Approval Terminal</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Time-Critical Queue</span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Verify student payment slips, cross-reference JazzCash/Easypaisa TIDs, and activate accounts.</p>
                    </div>
                </div>

                <!-- Filters & Order Queue -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div class="relative flex-1 w-full md:max-w-md">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="search-orders" placeholder="Search by student, email, Order ID, or TID..." class="form-input pl-10 text-xs sm:text-sm">
                    </div>
                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <select id="filter-order-status" class="form-input text-xs sm:text-sm py-2">
                            <option value="pending" selected>Pending Verification Only</option>
                            <option value="all">All Orders</option>
                            <option value="approved">Approved Orders</option>
                            <option value="rejected">Rejected Orders</option>
                        </select>
                    </div>
                </div>

                <!-- Orders Table -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div class="table-responsive-wrapper">
                        <table class="min-w-full divide-y divide-slate-100">
                            <thead class="table-header">
                                <tr>
                                    <th>Student & Contact</th>
                                    <th>Order Reference & TID</th>
                                    <th>Payable Amount</th>
                                    <th>Submitted At</th>
                                    <th>Status</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="orders-tbody" class="divide-y divide-slate-100 bg-white">
                                <tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading orders queue...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination Footer -->
                    <div class="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <button id="prev-order-page" class="btn-secondary text-xs" disabled>
                            <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                            <span>Previous</span>
                        </button>
                        <span id="order-page-info" class="text-xs font-bold text-slate-600">Page 1</span>
                        <button id="next-order-page" class="btn-secondary text-xs">
                            <span>Next</span>
                            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        this.currentPage = 1;
        this.limit = 20;
        this.statusFilter = 'pending';
        this.allOrders = [];
        
        await this.loadAllOrders();
        this.setupEvents();
    },

    async loadAllOrders() {
        const tbody = document.getElementById('orders-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading orders queue from database...</td></tr>`;
        }

        try {
            this.allOrders = await fetchAllDocuments(CONFIG.databaseId, CONFIG.premiumRequestsCol, [
                Query.orderDesc('$createdAt')
            ]);
            this.applyFilterAndRender();
        } catch (error) {
            console.error("Failed to load orders:", error);
            showToast("Failed to load orders", "error");
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-rose-500 text-xs font-semibold">Error loading orders.</td></tr>`;
            }
        }
    },

    applyFilterAndRender() {
        const searchInput = document.getElementById('search-orders');
        const filterStatus = document.getElementById('filter-order-status');

        const q = searchInput?.value || '';
        const statusVal = filterStatus?.value || 'pending';

        const filterFn = (o) => {
            if (statusVal !== 'all' && (o.status || '').toLowerCase() !== statusVal.toLowerCase()) return false;
            return true;
        };

        const searchFields = [
            'user_name',
            'email',
            'transaction_id',
            'order_id',
            'user_id',
            'plan'
        ];

        const result = filterAndPaginate(this.allOrders, {
            searchQuery: q,
            searchFields,
            filterFn,
            page: this.currentPage,
            limit: this.limit
        });

        this.renderTableRows(result.items);

        const pageInfo = document.getElementById('order-page-info');
        if (pageInfo) {
            pageInfo.textContent = result.total > 0
                ? `Page ${result.currentPage} of ${result.totalPages} (Showing ${result.startIndex}–${result.endIndex} of ${result.total} orders)`
                : 'No matching orders found';
        }

        const prevBtn = document.getElementById('prev-order-page');
        if (prevBtn) prevBtn.disabled = !result.hasPrev;

        const nextBtn = document.getElementById('next-order-page');
        if (nextBtn) nextBtn.disabled = !result.hasNext;
    },

    setupEvents() {
        const searchInput = document.getElementById('search-orders');
        const filterStatus = document.getElementById('filter-order-status');

        const onFilterChange = () => {
            this.currentPage = 1;
            this.applyFilterAndRender();
        };

        searchInput?.addEventListener('input', debounce(() => onFilterChange(), 200));
        filterStatus?.addEventListener('change', onFilterChange);

        document.getElementById('prev-order-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.applyFilterAndRender();
            }
        });

        document.getElementById('next-order-page')?.addEventListener('click', () => {
            this.currentPage++;
            this.applyFilterAndRender();
        });
    },

    renderTableRows(data) {
        const tbody = document.getElementById('orders-tbody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">No matching premium orders found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(ord => {
            const statusBadge = ord.status === 'pending'
                ? '<span class="badge badge-warning"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>Pending Review</span>'
                : ord.status === 'approved'
                ? '<span class="badge badge-success">Approved</span>'
                : '<span class="badge badge-error">Rejected</span>';

            return `
                <tr class="table-row">
                    <!-- Student -->
                    <td class="table-cell">
                        <div class="flex flex-col">
                            <span class="font-bold text-slate-900 text-sm">${ord.user_name || 'Anonymous Student'}</span>
                            <span class="text-xs text-slate-400">${ord.email}</span>
                        </div>
                    </td>

                    <!-- Order ID & TID -->
                    <td class="table-cell">
                        <div class="flex flex-col font-mono text-xs">
                            <span class="font-bold text-sky-700">${ord.order_id || ord.$id}</span>
                            <span class="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5 font-semibold">TID: ${ord.transaction_id || 'Not entered'}</span>
                        </div>
                    </td>

                    <!-- Amount -->
                    <td class="table-cell text-xs">
                        <p class="font-extrabold text-slate-900 text-sm">PKR ${ord.final_amount || ord.amount || 1500}</p>
                        ${ord.coupon_code ? `<span class="text-[10px] font-bold text-emerald-600">Promo: ${ord.coupon_code}</span>` : `<span class="text-[10px] text-slate-400">Regular Plan</span>`}
                    </td>

                    <!-- Date -->
                    <td class="table-cell text-xs text-slate-500 font-mono">
                        ${new Date(ord.submitted_at || ord.$createdAt).toLocaleString()}
                    </td>

                    <!-- Status -->
                    <td class="table-cell">
                        ${statusBadge}
                    </td>

                    <!-- Actions -->
                    <td class="table-cell text-right">
                        <a href="#premium-requests/view/${ord.$id}" class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                            <span>Inspect & Verify</span>
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    },

    async renderDetails(container, orderId) {
        container.innerHTML = `<div class="p-12 text-center text-slate-400 text-xs font-semibold uppercase">Loading order telemetry...</div>`;
        try {
            const req = await databases.getDocument(CONFIG.databaseId, CONFIG.premiumRequestsCol, orderId);
            const receiptUrl = req.receipt_file_id 
                ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.paymentReceiptsBucket}/files/${req.receipt_file_id}/view?project=${CONFIG.projectId}`
                : null;

            container.innerHTML = `
                <div class="space-y-6">
                    <!-- Top Navigation & Status -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <a href="#premium-requests" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            <span>Back to Orders Terminal</span>
                        </a>
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-slate-400 font-mono">Order: ${req.order_id || req.$id}</span>
                            <span class="badge ${req.status === 'pending' ? 'badge-warning' : (req.status === 'approved' ? 'badge-success' : 'badge-error')} text-xs">
                                ${req.status.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <!-- Split Review Grid (Left: Details & Decision, Right: High-Res Receipt) -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <!-- Left Pane: Data & Decision Center -->
                        <div class="space-y-6">
                            <!-- Student Dossier Card -->
                            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                                <h3 class="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Student Information</h3>
                                <div class="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span class="text-slate-400 block font-medium">Full Name</span>
                                        <span class="font-bold text-slate-900 text-sm">${req.user_name || 'Student'}</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 block font-medium">Email Address</span>
                                        <span class="font-bold text-slate-900 text-sm truncate block">${req.email}</span>
                                    </div>
                                    <div class="col-span-2 pt-2">
                                        <a href="#users/view/${req.user_id}" class="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">
                                            <span>Open Student Profile Dossier</span>
                                            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <!-- Payment & Transaction Details -->
                            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                                <h3 class="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Financial Breakdown</h3>
                                
                                <!-- Highlighted TID Copy Box -->
                                <div class="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                                    <div>
                                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">Entered Transaction ID (TID)</span>
                                        <span id="tid-text" class="text-base font-extrabold font-mono text-amber-900 tracking-wide">${req.transaction_id || 'NOT_ENTERED'}</span>
                                    </div>
                                    <button id="copy-tid-btn" class="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs shadow-xs hover:bg-amber-100 transition flex items-center gap-1.5">
                                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                        <span>Copy TID</span>
                                    </button>
                                </div>

                                <div class="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span class="text-slate-400 block font-medium">Payment Method</span>
                                        <span class="font-bold text-slate-900 capitalize">${req.payment_method || 'easypaisa_jazzcash'}</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 block font-medium">Net Paid Amount</span>
                                        <span class="font-extrabold text-emerald-600 text-sm">PKR ${req.final_amount || req.amount || 1500}</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 block font-medium">Standard Plan Price</span>
                                        <span class="font-medium text-slate-600">PKR ${req.original_amount || 1500}</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 block font-medium">Coupon Promo Code</span>
                                        <span class="font-bold text-slate-800">${req.coupon_code || 'None'}</span>
                                    </div>
                                    <div class="col-span-2 pt-2 border-t border-slate-50">
                                        <span class="text-slate-400 block font-medium">Submission Timestamp</span>
                                        <span class="font-mono text-slate-700">${new Date(req.submitted_at || req.$createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Decision Terminal Area -->
                            ${req.status === 'pending' ? `
                                <div class="bg-white rounded-3xl border border-sky-200 shadow-lg shadow-sky-900/5 p-6 space-y-4">
                                    <h3 class="text-sm font-extrabold uppercase tracking-wider text-sky-900">Execute Order Decision</h3>
                                    
                                    <div>
                                        <label class="form-label">Internal Note / Rejection Reason</label>
                                        <textarea id="order-admin-note" rows="2" placeholder="Visible to student if order is rejected (e.g. 'TID not found in JazzCash statement')" class="form-input text-xs"></textarea>
                                    </div>

                                    <div class="grid grid-cols-2 gap-3 pt-2">
                                        <button id="btn-approve-order" class="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2">
                                            <i data-lucide="check" class="w-4 h-4"></i>
                                            <span>Approve & Unlock</span>
                                        </button>
                                        <button id="btn-reject-order" class="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2">
                                            <i data-lucide="x" class="w-4 h-4"></i>
                                            <span>Reject Order</span>
                                        </button>
                                    </div>
                                </div>
                            ` : `
                                <div class="bg-white rounded-3xl border border-slate-200 p-6 space-y-2">
                                    <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Resolution Archive</h3>
                                    <p class="text-xs text-slate-600"><strong>Reviewed By:</strong> ${req.reviewed_by || 'Admin'}</p>
                                    <p class="text-xs text-slate-600 font-mono"><strong>Reviewed At:</strong> ${req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : 'N/A'}</p>
                                    ${req.rejection_reason || req.admin_note ? `<div class="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 mt-2 font-medium">Note: ${req.rejection_reason || req.admin_note}</div>` : ''}
                                </div>
                            `}
                        </div>

                        <!-- Right Pane: High-Resolution Payment Receipt Viewer -->
                        <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col min-h-[500px]">
                            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="image" class="w-4 h-4 text-sky-600"></i>
                                    <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-700">Payment Screenshot Verification</h3>
                                </div>
                                ${receiptUrl ? `
                                    <div class="flex items-center gap-2">
                                        <a href="${receiptUrl}" target="_blank" download class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1">
                                            <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                            <span>Download</span>
                                        </a>
                                        <a href="${receiptUrl}" target="_blank" class="p-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold transition flex items-center gap-1">
                                            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                            <span>Full Screen</span>
                                        </a>
                                    </div>
                                ` : ''}
                            </div>

                            <div class="flex-1 bg-slate-900/5 p-4 flex items-center justify-center relative min-h-[440px]">
                                ${receiptUrl ? `
                                    <img src="${receiptUrl}" alt="Payment Receipt" class="max-w-full max-h-[600px] object-contain rounded-2xl shadow-md border border-white">
                                ` : `
                                    <div class="text-center text-slate-400">
                                        <i data-lucide="file-question" class="w-12 h-12 mx-auto mb-2 text-slate-300"></i>
                                        <p class="text-xs font-bold text-slate-600">No payment slip file attached.</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            // Copy TID button
            document.getElementById('copy-tid-btn')?.addEventListener('click', () => {
                const tid = document.getElementById('tid-text').textContent.trim();
                navigator.clipboard.writeText(tid);
                showToast("TID copied to clipboard!", "info");
            });

            // Handle Decisions
            if (req.status === 'pending') {
                document.getElementById('btn-approve-order')?.addEventListener('click', async () => {
                    if (confirm(`APPROVE order ${req.order_id || req.$id} for ${req.user_name}? This immediately grants 1-year Premium access.`)) {
                        await this.executeApproval(req);
                    }
                });

                document.getElementById('btn-reject-order')?.addEventListener('click', async () => {
                    const note = document.getElementById('order-admin-note').value.trim();
                    if (!note) {
                        alert("Please enter a rejection reason in the note field to inform the student.");
                        return;
                    }
                    if (confirm(`REJECT this order? The student will be notified.`)) {
                        await this.executeRejection(req, note);
                    }
                });
            }

        } catch (error) {
            console.error(error);
            showToast("Failed to load order details", "error");
            window.location.hash = '#premium-requests';
        }
    },

    async executeApproval(req) {
        try {
            // First attempt to invoke serverless function if available
            let handledByFunction = false;
            if (CONFIG.premiumOpsFunctionId) {
                try {
                    const payload = JSON.stringify({
                        action: 'approve',
                        requestId: req.$id,
                        adminNote: document.getElementById('order-admin-note')?.value || ''
                    });
                    const execution = await functions.createExecution(CONFIG.premiumOpsFunctionId, payload, false);
                    if (execution.status === 'completed') {
                        handledByFunction = true;
                    }
                } catch (e) {
                    console.warn("Function execution skipped, falling back to direct database updates.");
                }
            }

            if (!handledByFunction) {
                // Direct database orchestration
                const now = new Date();
                const expiry = new Date();
                expiry.setFullYear(expiry.getFullYear() + 1);

                // 1. Create subscription
                await databases.createDocument(CONFIG.databaseId, CONFIG.subscriptionsCol, ID.unique(), {
                    user_id: req.user_id,
                    plan: req.plan || 'premium',
                    status: 'active',
                    amount: parseFloat(req.final_amount || req.amount || 1500),
                    start_date: now.toISOString(),
                    expiry_date: expiry.toISOString(),
                    transaction_id: req.transaction_id || '',
                    payment_method: req.payment_method || 'easypaisa_jazzcash'
                });

                // 2. Update user is_premium
                const uRes = await databases.listDocuments(CONFIG.databaseId, CONFIG.usersCol, [
                    Query.equal('auth_id', req.user_id),
                    Query.limit(1)
                ]);
                if (uRes.documents.length > 0) {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.usersCol, uRes.documents[0].$id, {
                        is_premium: true,
                        updated_at: now.toISOString()
                    });
                }

                // 3. Update order status
                await databases.updateDocument(CONFIG.databaseId, CONFIG.premiumRequestsCol, req.$id, {
                    status: 'approved',
                    reviewed_at: now.toISOString(),
                    reviewed_by: 'admin'
                });
            }

            showToast("Order approved! Premium access unlocked.", "success");
            setTimeout(() => window.location.hash = '#premium-requests', 1200);

        } catch (error) {
            console.error(error);
            showToast(error.message || "Failed to approve order", "error");
        }
    },

    async executeRejection(req, reason) {
        try {
            const now = new Date().toISOString();
            await databases.updateDocument(CONFIG.databaseId, CONFIG.premiumRequestsCol, req.$id, {
                status: 'rejected',
                rejection_reason: reason,
                reviewed_at: now,
                reviewed_by: 'admin'
            });

            showToast("Order rejected.", "info");
            setTimeout(() => window.location.hash = '#premium-requests', 1200);

        } catch (error) {
            console.error(error);
            showToast(error.message || "Failed to reject order", "error");
        }
    }
};
