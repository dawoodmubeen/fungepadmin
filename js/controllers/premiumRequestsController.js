import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const premiumRequestsController = {
    async render(container, args) {
        if (args.length > 0 && args[0] === 'view' && args[1]) {
            this.renderDetails(container, args[1]);
        } else {
            this.renderList(container);
        }
    },

    async renderList(container) {
        container.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900">Premium Requests</h2>
                <p class="text-sm text-gray-500">Manage user premium subscription requests.</p>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <select id="filter-status" class="form-input max-w-xs">
                        <option value="all">All Statuses</option>
                        <option value="pending" selected>Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                
                <div class="table-container">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 table-header">
                            <tr>
                                <th>User</th>
                                <th>Plan / Amount</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="reqs-tbody" class="bg-white divide-y divide-gray-200">
                            <tr><td colspan="5" class="text-center py-8 text-gray-500">Loading requests...</td></tr>
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

        this.currentPage = 1;
        this.limit = 20;
        this.statusFilter = 'pending';
        
        await this.loadPage(1);

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
                Query.orderDesc('submitted_at'),
                Query.limit(this.limit),
                Query.offset((page - 1) * this.limit)
            ];
            
            if (this.statusFilter !== 'all') {
                queries.push(Query.equal('status', this.statusFilter));
            }
            
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.premiumRequestsCol, queries);
            
            const tbody = document.getElementById('reqs-tbody');
            if (res.documents.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">No requests found.</td></tr>`;
            } else {
                tbody.innerHTML = res.documents.map(doc => `
                    <tr class="table-row">
                        <td class="table-cell">
                            <p class="font-medium text-gray-900">${doc.user_name}</p>
                            <p class="text-xs text-gray-500">${doc.email}</p>
                        </td>
                        <td class="table-cell">
                            <p class="text-sm text-gray-900">${doc.plan}</p>
                            <p class="text-xs text-gray-500">PKR ${doc.final_amount || doc.amount}</p>
                        </td>
                        <td class="table-cell text-gray-500">
                            ${new Date(doc.submitted_at || doc.$createdAt).toLocaleDateString()}
                        </td>
                        <td class="table-cell">
                            <span class="badge ${doc.status === 'pending' ? 'badge-warning' : (doc.status === 'approved' ? 'badge-success' : 'badge-error')} capitalize">
                                ${doc.status}
                            </span>
                        </td>
                        <td class="table-cell text-right">
                            <a href="#premium-requests/view/${doc.$id}" class="text-primary hover:text-secondary text-sm font-medium">
                                Review
                            </a>
                        </td>
                    </tr>
                `).join('');
            }
            
            document.getElementById('page-info').textContent = `Page ${page}`;
            document.getElementById('prev-page').disabled = page === 1;
            document.getElementById('next-page').disabled = res.documents.length < this.limit;
            
        } catch (error) {
            console.error(error);
            showToast("Failed to load requests", "error");
        }
    },

    async renderDetails(container, id) {
        container.innerHTML = `<div class="p-8 text-center text-gray-500">Loading details...</div>`;
        try {
            const req = await databases.getDocument(CONFIG.databaseId, CONFIG.premiumRequestsCol, id);
            const receiptUrl = req.receipt_file_id ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.paymentReceiptsBucket}/files/${req.receipt_file_id}/view?project=${CONFIG.projectId}` : null;
            
            container.innerHTML = `
                <div class="mb-6 flex items-center justify-between">
                    <div class="flex items-center">
                        <a href="#premium-requests" class="text-gray-500 hover:text-gray-700 mr-4">
                            <i data-lucide="arrow-left" class="w-5 h-5"></i>
                        </a>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">Review Request</h2>
                            <p class="text-sm text-gray-500">Order ID: ${req.order_id}</p>
                        </div>
                    </div>
                    <span class="badge ${req.status === 'pending' ? 'badge-warning' : (req.status === 'approved' ? 'badge-success' : 'badge-error')} capitalize text-lg px-4 py-1">
                        ${req.status}
                    </span>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="space-y-6">
                        <!-- User Info -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 class="text-base font-semibold text-gray-900 mb-4 border-b pb-2">User Information</h3>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p class="text-gray-500">Name</p>
                                    <p class="font-medium text-gray-900">${req.user_name}</p>
                                </div>
                                <div>
                                    <p class="text-gray-500">Email</p>
                                    <p class="font-medium text-gray-900">${req.email}</p>
                                </div>
                                <div class="col-span-2 mt-2">
                                    <a href="#users/view/${req.user_id}" class="text-primary hover:underline text-sm"><i data-lucide="external-link" class="inline w-3 h-3 mr-1"></i>View Full Profile</a>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Payment Info -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 class="text-base font-semibold text-gray-900 mb-4 border-b pb-2">Payment Details</h3>
                            <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div><p class="text-gray-500">Plan</p><p class="font-medium">${req.plan}</p></div>
                                <div><p class="text-gray-500">Transaction ID</p><p class="font-medium">${req.transaction_id || 'N/A'}</p></div>
                                <div><p class="text-gray-500">Amount Sent</p><p class="font-medium">PKR ${req.final_amount || req.amount}</p></div>
                                <div><p class="text-gray-500">Submitted</p><p class="font-medium">${new Date(req.submitted_at || req.$createdAt).toLocaleString()}</p></div>
                                ${req.coupon_code ? `<div class="col-span-2"><p class="text-gray-500">Coupon Used</p><p class="font-medium text-primary">${req.coupon_code}</p></div>` : ''}
                            </div>
                        </div>

                        <!-- Admin Action -->
                        ${req.status === 'pending' ? `
                            <div class="bg-white rounded-xl shadow-sm border border-blue-200 p-6 bg-blue-50">
                                <h3 class="text-base font-semibold text-gray-900 mb-4">Process Request</h3>
                                <div class="mb-4">
                                    <label class="form-label">Admin Note / Reason (Visible to user if rejected)</label>
                                    <textarea id="admin-note" class="form-input" rows="3" placeholder="e.g., Receipt is blurry, please re-upload..."></textarea>
                                </div>
                                <div class="flex gap-3">
                                    <button id="btn-approve" class="btn-success bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 w-1/2 transition-colors">Approve & Grant Premium</button>
                                    <button id="btn-reject" class="btn-danger w-1/2">Reject</button>
                                </div>
                            </div>
                        ` : `
                            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 class="text-base font-semibold text-gray-900 mb-4 border-b pb-2">Admin Resolution</h3>
                                <div class="text-sm">
                                    <p class="text-gray-500">Resolved By</p><p class="font-medium mb-2">${req.reviewed_by || 'Unknown'}</p>
                                    <p class="text-gray-500">Resolved At</p><p class="font-medium mb-2">${req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : 'N/A'}</p>
                                    <p class="text-gray-500">Admin Note</p><p class="font-medium">${req.admin_note || 'No note provided'}</p>
                                </div>
                            </div>
                        `}
                    </div>

                    <!-- Receipt Preview -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col min-h-[600px]">
                        <div class="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 class="text-sm font-bold text-gray-900">Payment Receipt</h3>
                            ${receiptUrl ? `<a href="${receiptUrl}" target="_blank" class="text-primary text-xs hover:underline"><i data-lucide="external-link" class="inline w-3 h-3 mr-1"></i>Open Full</a>` : ''}
                        </div>
                        <div class="flex-1 bg-gray-100 relative p-4 flex items-center justify-center">
                            ${receiptUrl ? `<img src="${receiptUrl}" alt="Receipt" class="max-w-full max-h-full object-contain shadow-md rounded">` : `<span class="text-gray-400">No receipt found</span>`}
                        </div>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();

            if (req.status === 'pending') {
                document.getElementById('btn-approve').addEventListener('click', async () => {
                    if (confirm("Are you sure you want to APPROVE this request? The user will be granted premium access immediately.")) {
                        await this.processRequest(req, 'approved');
                    }
                });
                document.getElementById('btn-reject').addEventListener('click', async () => {
                    const note = document.getElementById('admin-note').value.trim();
                    if (!note) {
                        alert("Please provide an Admin Note explaining why the request is rejected.");
                        return;
                    }
                    if (confirm("Are you sure you want to REJECT this request?")) {
                        await this.processRequest(req, 'rejected', note);
                    }
                });
            }

        } catch (error) {
            console.error(error);
            showToast("Failed to load request details", "error");
            window.location.hash = '#premium-requests';
        }
    },

    async processRequest(req, newStatus, note = '') {
        try {
            // 1. Verify it's still pending
            const currentReq = await databases.getDocument(CONFIG.databaseId, CONFIG.premiumRequestsCol, req.$id);
            if (currentReq.status !== 'pending') {
                showToast("This request has already been processed by another administrator.", "error");
                setTimeout(() => window.location.reload(), 2000);
                return;
            }

            const now = new Date().toISOString();

            // 3. Update the request
            await databases.updateDocument(CONFIG.databaseId, CONFIG.premiumRequestsCol, req.$id, {
                status: newStatus,
                admin_note: note || (newStatus === 'approved' ? 'Approved automatically' : ''),
                reviewed_at: now
            });

            showToast(`Request successfully ${newStatus}!`, "success");
            setTimeout(() => window.location.hash = '#premium-requests', 1500);

        } catch (error) {
            console.error(error);
            showToast("Error processing request.", "error");
        }
    }
};
