import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const feedbackController = {
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
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Helpdesk & Support Center</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">Ticket Center</span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Manage student issue tickets, past paper requests, bug reports, and reviews.</p>
                    </div>
                </div>

                <!-- Category Tabs Toolbar -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap gap-2 items-center justify-between">
                    <div class="flex flex-wrap gap-1.5" id="category-tabs">
                        <button class="cat-tab px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 text-white" data-cat="all">All Tickets</button>
                        <button class="cat-tab px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat="bug">Bugs</button>
                        <button class="cat-tab px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat="paper_request">Paper Requests</button>
                        <button class="cat-tab px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat="feature">Features</button>
                        <button class="cat-tab px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat="review">Reviews</button>
                    </div>

                    <div class="flex items-center gap-2">
                        <select id="filter-ticket-status" class="form-input text-xs py-1.5">
                            <option value="all">All Statuses</option>
                            <option value="pending" selected>Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                <!-- Tickets Table -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div class="table-responsive-wrapper">
                        <table class="min-w-full divide-y divide-slate-100">
                            <thead class="table-header">
                                <tr>
                                    <th>Student & Ticket ID</th>
                                    <th>Category & Rating</th>
                                    <th>Subject & Snippet</th>
                                    <th>Submitted</th>
                                    <th>Status</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="feedback-tbody" class="divide-y divide-slate-100 bg-white">
                                <tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading tickets...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        this.selectedCategory = 'all';
        this.statusFilter = 'pending';
        this.tickets = [];

        await this.loadTickets();
        this.setupEvents();
    },

    setupEvents() {
        document.querySelectorAll('.cat-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.cat-tab').forEach(t => {
                    t.classList.remove('bg-sky-600', 'text-white');
                    t.classList.add('bg-slate-100', 'text-slate-600');
                });
                const b = e.currentTarget;
                b.classList.remove('bg-slate-100', 'text-slate-600');
                b.classList.add('bg-sky-600', 'text-white');

                this.selectedCategory = b.dataset.cat;
                this.loadTickets();
            });
        });

        document.getElementById('filter-ticket-status')?.addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.loadTickets();
        });
    },

    async loadTickets() {
        try {
            const queries = [
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ];

            if (this.selectedCategory !== 'all') {
                queries.push(Query.equal('category', this.selectedCategory));
            }

            if (this.statusFilter !== 'all') {
                queries.push(Query.equal('status', this.statusFilter));
            }

            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.feedbackCol, queries);
            this.tickets = res.documents;
            this.renderTableRows(this.tickets);

        } catch (error) {
            console.error(error);
            document.getElementById('feedback-tbody').innerHTML = `
                <tr><td colspan="6" class="text-center py-12 text-rose-500 text-xs">Failed to load tickets.</td></tr>
            `;
        }
    },

    renderTableRows(data) {
        const tbody = document.getElementById('feedback-tbody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">No support tickets in this queue.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(t => {
            const statusBadge = t.status === 'pending'
                ? '<span class="badge badge-warning text-xs">Pending</span>'
                : t.status === 'in_progress'
                ? '<span class="badge badge-info text-xs">In Progress</span>'
                : t.status === 'resolved'
                ? '<span class="badge badge-success text-xs">Resolved</span>'
                : '<span class="badge badge-error text-xs">Rejected</span>';

            const catBadge = t.category === 'bug'
                ? '<span class="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px] uppercase">Bug</span>'
                : t.category === 'paper_request'
                ? '<span class="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] uppercase">Paper Req</span>'
                : t.category === 'review'
                ? '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase">Review</span>'
                : '<span class="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[10px] uppercase">General</span>';

            return `
                <tr class="table-row">
                    <td class="table-cell">
                        <p class="font-bold text-slate-900 text-xs">${t.user_name || t.full_name || 'Student'}</p>
                        <span class="text-[10px] font-mono text-slate-400">${t.ticket_number || t.$id}</span>
                    </td>
                    <td class="table-cell">
                        <div class="flex items-center gap-2">
                            ${catBadge}
                            ${t.rating ? `<span class="text-xs text-amber-500 font-bold">★ ${t.rating}</span>` : ''}
                        </div>
                    </td>
                    <td class="table-cell text-xs max-w-xs">
                        <p class="font-bold text-slate-800 truncate">${t.subject || 'Support Inquiry'}</p>
                        <p class="text-slate-400 truncate text-[11px]">${t.message || ''}</p>
                    </td>
                    <td class="table-cell text-xs font-mono text-slate-500">
                        ${new Date(t.$createdAt).toLocaleDateString()}
                    </td>
                    <td class="table-cell">
                        ${statusBadge}
                    </td>
                    <td class="table-cell text-right">
                        <a href="#feedback/view/${t.$id}" class="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition">
                            Review Ticket
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    },

    async renderDetails(container, ticketId) {
        container.innerHTML = `<div class="p-12 text-center text-slate-400 text-xs font-semibold uppercase">Loading ticket details...</div>`;
        try {
            const ticket = await databases.getDocument(CONFIG.databaseId, CONFIG.feedbackCol, ticketId);

            container.innerHTML = `
                <div class="space-y-6 max-w-4xl mx-auto">
                    <div class="flex items-center justify-between">
                        <a href="#feedback" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            <span>Back to Ticket Center</span>
                        </a>
                        <span class="badge ${ticket.status === 'resolved' ? 'badge-success' : 'badge-warning'} text-xs">
                            ${(ticket.status || 'pending').toUpperCase()}
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- Left Pane: User & Metadata -->
                        <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Ticket Dossier</h3>
                            <div class="space-y-2 text-xs">
                                <div>
                                    <span class="text-slate-400 block font-medium">Ticket ID</span>
                                    <span class="font-mono font-bold text-slate-800">${ticket.ticket_number || ticket.$id}</span>
                                </div>
                                <div>
                                    <span class="text-slate-400 block font-medium">Submitter</span>
                                    <span class="font-bold text-slate-800">${ticket.user_name || ticket.full_name || 'Student'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-400 block font-medium">Email</span>
                                    <span class="font-mono text-slate-600 truncate block">${ticket.email || 'N/A'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-400 block font-medium">Category</span>
                                    <span class="font-bold text-sky-700 capitalize">${ticket.category || 'General'}</span>
                                </div>
                                ${ticket.device_info ? `
                                    <div class="pt-2 border-t border-slate-50">
                                        <span class="text-slate-400 block font-medium">Device User Agent</span>
                                        <span class="text-[10px] text-slate-500 font-mono break-all">${ticket.device_info}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Right Pane: Ticket Body & Admin Action -->
                        <div class="md:col-span-2 space-y-6">
                            <!-- Message Card -->
                            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                                <div>
                                    <h2 class="text-base font-extrabold text-slate-900">${ticket.subject || 'No Subject'}</h2>
                                    <span class="text-xs text-slate-400 font-mono">${new Date(ticket.$createdAt).toLocaleString()}</span>
                                </div>
                                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                                    ${ticket.message || 'No description provided.'}
                                </div>
                            </div>

                            <!-- Resolution Form -->
                            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                                <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-700">Update Ticket Status & Response</h3>
                                <div>
                                    <label class="form-label">Status</label>
                                    <select id="tk-status" class="form-input text-xs">
                                        <option value="pending" ${ticket.status === 'pending' ? 'selected' : ''}>Pending</option>
                                        <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                                        <option value="rejected" ${ticket.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label">Admin Internal Note / Student Reply</label>
                                    <textarea id="tk-reply" rows="3" placeholder="Enter resolution notes..." class="form-input text-xs">${ticket.admin_reply || ''}</textarea>
                                </div>
                                <div class="flex justify-end">
                                    <button id="save-ticket-btn" class="btn-primary">Save Ticket Resolution</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            document.getElementById('save-ticket-btn')?.addEventListener('click', async () => {
                try {
                    const status = document.getElementById('tk-status').value;
                    const reply = document.getElementById('tk-reply').value.trim();

                    await databases.updateDocument(CONFIG.databaseId, CONFIG.feedbackCol, ticketId, {
                        status: status,
                        admin_reply: reply,
                        updated_at: new Date().toISOString()
                    });

                    showToast("Ticket updated successfully", "success");
                    setTimeout(() => window.location.hash = '#feedback', 1000);

                } catch (e) {
                    console.error(e);
                    showToast("Failed to update ticket", "error");
                }
            });

        } catch (error) {
            console.error(error);
            showToast("Failed to load ticket details", "error");
            window.location.hash = '#feedback';
        }
    }
};
