import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const feedbackController = {
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
                <h2 class="text-2xl font-bold text-gray-900">Feedback</h2>
                <p class="text-sm text-gray-500">Manage user feedback and problem reports.</p>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <select id="filter-status" class="form-input max-w-xs">
                        <option value="all">All Statuses</option>
                        <option value="open" selected>Open</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
                
                <div class="table-container">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 table-header">
                            <tr>
                                <th>User</th>
                                <th>Subject</th>
                                <th>Type / Category</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="feedback-tbody" class="bg-white divide-y divide-gray-200">
                            <tr><td colspan="6" class="text-center py-8 text-gray-500">Loading feedback...</td></tr>
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
        this.statusFilter = 'open';
        
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
                Query.orderDesc('$createdAt'),
                Query.limit(this.limit),
                Query.offset((page - 1) * this.limit)
            ];
            
            if (this.statusFilter !== 'all') {
                queries.push(Query.equal('status', this.statusFilter));
            }
            
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.feedbackCol, queries);
            
            const tbody = document.getElementById('feedback-tbody');
            if (res.documents.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No feedback found.</td></tr>`;
            } else {
                tbody.innerHTML = res.documents.map(doc => `
                    <tr class="table-row">
                        <td class="table-cell">
                            <p class="font-medium text-gray-900">${doc.full_name}</p>
                            <p class="text-xs text-gray-500">${doc.email}</p>
                        </td>
                        <td class="table-cell">
                            <p class="font-medium text-gray-900 line-clamp-1 max-w-[200px]" title="${doc.subject}">${doc.subject}</p>
                        </td>
                        <td class="table-cell">
                            <p class="text-sm text-gray-900">${doc.type}</p>
                            <p class="text-xs text-gray-500">${doc.category}</p>
                        </td>
                        <td class="table-cell text-gray-500 text-sm">
                            ${new Date(doc.$createdAt).toLocaleDateString()}
                        </td>
                        <td class="table-cell">
                            <span class="badge ${doc.status === 'open' ? 'badge-error' : 'badge-success'} capitalize">
                                ${doc.status}
                            </span>
                        </td>
                        <td class="table-cell text-right">
                            <a href="#feedback/view/${doc.$id}" class="text-primary hover:text-secondary text-sm font-medium">
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
            showToast("Failed to load feedback", "error");
        }
    },

    async renderDetails(container, id) {
        container.innerHTML = `<div class="p-8 text-center text-gray-500">Loading details...</div>`;
        try {
            const doc = await databases.getDocument(CONFIG.databaseId, CONFIG.feedbackCol, id);
            
            container.innerHTML = `
                <div class="mb-6 flex items-center justify-between">
                    <div class="flex items-center">
                        <a href="#feedback" class="text-gray-500 hover:text-gray-700 mr-4">
                            <i data-lucide="arrow-left" class="w-5 h-5"></i>
                        </a>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">Feedback Details</h2>
                            <p class="text-sm text-gray-500">Ticket: ${doc.ticket_number}</p>
                        </div>
                    </div>
                    <span class="badge ${doc.status === 'open' ? 'badge-error' : 'badge-success'} capitalize text-lg px-4 py-1">
                        ${doc.status}
                    </span>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="space-y-6">
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 class="text-base font-semibold text-gray-900 mb-4 border-b pb-2">User Information</h3>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div><p class="text-gray-500">Name</p><p class="font-medium">${doc.full_name}</p></div>
                                <div><p class="text-gray-500">Email</p><p class="font-medium">${doc.email}</p></div>
                                <div class="col-span-2 mt-2">
                                    <a href="#users/view/${doc.user_id}" class="text-primary hover:underline text-sm"><i data-lucide="external-link" class="inline w-3 h-3 mr-1"></i>View Profile</a>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 class="text-base font-semibold text-gray-900 mb-4 border-b pb-2">Feedback Content</h3>
                            <div class="space-y-4 text-sm">
                                <div class="grid grid-cols-2 gap-4">
                                    <div><p class="text-gray-500">Type</p><p class="font-medium">${doc.type}</p></div>
                                    <div><p class="text-gray-500">Category</p><p class="font-medium">${doc.category}</p></div>
                                    <div><p class="text-gray-500">Date</p><p class="font-medium">${new Date(doc.$createdAt).toLocaleString()}</p></div>
                                </div>
                                <div>
                                    <p class="text-gray-500 mb-1">Subject</p>
                                    <p class="font-medium text-gray-900 bg-gray-50 p-2 rounded">${doc.subject}</p>
                                </div>
                                <div>
                                    <p class="text-gray-500 mb-1">Message</p>
                                    <p class="text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100">${doc.message}</p>
                                </div>
                                ${doc.device_info ? `
                                <div>
                                    <p class="text-gray-500 mb-1">Device Info</p>
                                    <p class="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded overflow-x-auto">${doc.device_info}</p>
                                </div>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="bg-white rounded-xl shadow-sm border border-blue-200 p-6 bg-blue-50">
                            <h3 class="text-base font-semibold text-gray-900 mb-4 border-b border-blue-100 pb-2">Admin Reply & Resolution</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="form-label text-blue-900">Your Reply</label>
                                    <textarea id="admin-reply" class="form-input bg-white" rows="6" placeholder="Type your response here...">${doc.admin_reply || ''}</textarea>
                                </div>
                                <div>
                                    <label class="form-label text-blue-900">Status</label>
                                    <select id="fb-status" class="form-input bg-white">
                                        <option value="open" ${doc.status === 'open' ? 'selected' : ''}>Open</option>
                                        <option value="resolved" ${doc.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                                    </select>
                                </div>
                                <button id="save-reply-btn" class="btn-primary w-full py-2">Save Reply & Status</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();

            document.getElementById('save-reply-btn').addEventListener('click', async (e) => {
                const btn = e.target;
                btn.disabled = true;
                btn.textContent = 'Saving...';
                
                try {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.feedbackCol, id, {
                        admin_reply: document.getElementById('admin-reply').value,
                        status: document.getElementById('fb-status').value,
                        // admin_id: could be set here
                    });
                    showToast("Feedback updated successfully", "success");
                    setTimeout(() => window.location.hash = '#feedback', 1000);
                } catch (error) {
                    showToast("Failed to update feedback", "error");
                    btn.disabled = false;
                    btn.textContent = 'Save Reply & Status';
                }
            });

        } catch (error) {
            console.error(error);
            showToast("Failed to load feedback details", "error");
            window.location.hash = '#feedback';
        }
    }
};
