import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const usersController = {
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
                        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Student & User Directory</h1>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Manage accounts, toggle premium access, suspend users, and view test attempts.</p>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div class="relative flex-1 w-full md:max-w-md">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="search-user" placeholder="Search by student name, email, target university..." class="form-input pl-10 text-xs sm:text-sm">
                    </div>
                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <select id="filter-premium" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Plans</option>
                            <option value="premium">Premium Only 👑</option>
                            <option value="free">Free Tier</option>
                        </select>
                        <select id="filter-status" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="banned">Banned / Suspended</option>
                        </select>
                    </div>
                </div>

                <!-- Users Table -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div class="table-responsive-wrapper">
                        <table class="min-w-full divide-y divide-slate-100">
                            <thead class="table-header">
                                <tr>
                                    <th>Student / Account</th>
                                    <th>Role & Status</th>
                                    <th>Premium Tier</th>
                                    <th>Target Academic</th>
                                    <th>Registered</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="users-tbody" class="divide-y divide-slate-100 bg-white">
                                <tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading students...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination Footer -->
                    <div class="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <button id="prev-page" class="btn-secondary text-xs" disabled>
                            <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                            <span>Previous</span>
                        </button>
                        <span id="page-info" class="text-xs font-bold text-slate-600">Page 1</span>
                        <button id="next-page" class="btn-secondary text-xs">
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
        this.premiumFilter = 'all';
        this.statusFilter = 'all';
        this.users = [];
        
        await this.loadPage(1);
        this.setupEvents();
    },

    setupEvents() {
        const searchInput = document.getElementById('search-user');
        const filterPremium = document.getElementById('filter-premium');
        const filterStatus = document.getElementById('filter-status');

        searchInput?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = this.users.filter(u => 
                (u.full_name && u.full_name.toLowerCase().includes(q)) || 
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.university_target && u.university_target.toLowerCase().includes(q))
            );
            this.renderTableRows(filtered);
        });

        filterPremium?.addEventListener('change', (e) => {
            this.premiumFilter = e.target.value;
            this.currentPage = 1;
            this.loadPage(1);
        });

        filterStatus?.addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.currentPage = 1;
            this.loadPage(1);
        });
        
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadPage(this.currentPage);
            }
        });
        
        document.getElementById('next-page')?.addEventListener('click', () => {
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
            
            if (this.premiumFilter === 'premium') {
                queries.push(Query.equal('is_premium', true));
            } else if (this.premiumFilter === 'free') {
                queries.push(Query.equal('is_premium', false));
            }

            if (this.statusFilter === 'active') {
                queries.push(Query.equal('account_status', 'active'));
            } else if (this.statusFilter === 'banned') {
                queries.push(Query.notEqual('account_status', 'active'));
            }
            
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.usersCol, queries);
            this.users = res.documents;
            
            this.renderTableRows(this.users);
            
            document.getElementById('page-info').textContent = `Page ${page} (Showing ${res.documents.length} of ${res.total || res.documents.length})`;
            document.getElementById('prev-page').disabled = page === 1;
            document.getElementById('next-page').disabled = res.documents.length < this.limit;
            
        } catch (error) {
            console.error(error);
            showToast("Failed to load students", "error");
        }
    },

    renderTableRows(data) {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">No student accounts found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(user => {
            const avatarUrl = user.profile_photo 
                ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.profileImagesBucket}/files/${user.profile_photo}/view?project=${CONFIG.projectId}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'Student')}&background=0284c7&color=fff&bold=true`;

            const isBanned = (user.account_status || 'active') === 'banned' || (user.account_status || 'active') === 'suspended';

            return `
                <tr class="table-row">
                    <!-- Student Info -->
                    <td class="table-cell">
                        <div class="flex items-center gap-3">
                            <img class="h-9 w-9 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0" src="${avatarUrl}" alt="Avatar">
                            <div class="min-w-0">
                                <p class="font-bold text-slate-900 text-sm truncate">${user.full_name || 'Anonymous Student'}</p>
                                <p class="text-xs text-slate-400 truncate">${user.email}</p>
                            </div>
                        </div>
                    </td>

                    <!-- Role & Account Status -->
                    <td class="table-cell">
                        <div class="flex flex-col items-start gap-1">
                            <span class="text-xs font-semibold px-2 py-0.5 rounded ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'} capitalize">
                                ${user.role || 'student'}
                            </span>
                            <span class="badge ${isBanned ? 'badge-error' : 'badge-success'} text-[10px]">
                                ${isBanned ? 'Banned' : 'Active'}
                            </span>
                        </div>
                    </td>

                    <!-- Premium Toggle -->
                    <td class="table-cell">
                        <button class="btn-toggle-premium inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition ${user.is_premium ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}"
                            data-id="${user.$id}"
                            data-premium="${user.is_premium}"
                            data-name="${user.full_name || user.email}"
                            title="Click to toggle student premium state">
                            <span>${user.is_premium ? '👑 Premium' : 'Free Access'}</span>
                            <i data-lucide="refresh-cw" class="w-3 h-3 opacity-60"></i>
                        </button>
                    </td>

                    <!-- Target Academic -->
                    <td class="table-cell text-xs text-slate-600">
                        <p class="font-semibold text-slate-800">${user.university_target || user.targeted_university || 'Not Specified'}</p>
                        <p class="text-slate-400 text-[11px]">${user.field_of_study || user.targeted_test || 'Entrance'}</p>
                    </td>

                    <!-- Registered Date -->
                    <td class="table-cell text-xs text-slate-500 font-mono">
                        ${new Date(user.created_at || user.$createdAt).toLocaleDateString()}
                    </td>

                    <!-- Actions -->
                    <td class="table-cell text-right">
                        <div class="flex items-center justify-end gap-2">
                            <a href="#users/view/${user.auth_id || user.$id}" class="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition flex items-center gap-1">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                <span>Inspect</span>
                            </a>
                            <button class="btn-toggle-ban p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                data-id="${user.$id}"
                                data-status="${user.account_status || 'active'}"
                                title="${isBanned ? 'Unban Account' : 'Suspend / Ban Account'}">
                                <i data-lucide="${isBanned ? 'user-check' : 'user-x'}" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();

        // Bind 1-Click Premium Toggle
        tbody.querySelectorAll('.btn-toggle-premium').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const b = e.currentTarget;
                const id = b.dataset.id;
                const current = b.dataset.premium === 'true';
                const nextVal = !current;
                const name = b.dataset.name;

                if (confirm(`Change premium status for ${name} to ${nextVal ? 'PREMIUM (1-year access)' : 'FREE'}?`)) {
                    try {
                        await databases.updateDocument(CONFIG.databaseId, CONFIG.usersCol, id, {
                            is_premium: nextVal,
                            updated_at: new Date().toISOString()
                        });
                        showToast(`Updated ${name} to ${nextVal ? 'Premium' : 'Free'}!`, "success");
                        await this.loadPage(this.currentPage);
                    } catch (err) {
                        showToast(err.message || "Failed to toggle premium", "error");
                    }
                }
            });
        });

        // Bind Ban / Suspend Toggle
        tbody.querySelectorAll('.btn-toggle-ban').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const b = e.currentTarget;
                const id = b.dataset.id;
                const current = b.dataset.status;
                const nextStatus = current === 'active' ? 'banned' : 'active';

                if (confirm(`Change account status to ${nextStatus.toUpperCase()}?`)) {
                    try {
                        await databases.updateDocument(CONFIG.databaseId, CONFIG.usersCol, id, {
                            account_status: nextStatus,
                            updated_at: new Date().toISOString()
                        });
                        showToast(`Account marked as ${nextStatus}`, "success");
                        await this.loadPage(this.currentPage);
                    } catch (err) {
                        showToast(err.message || "Failed to update account status", "error");
                    }
                }
            });
        });
    },

    async renderDetails(container, userKey) {
        container.innerHTML = `<div class="p-12 text-center text-slate-400 text-xs font-semibold uppercase">Loading student dossier...</div>`;
        try {
            // Lookup user by auth_id or doc $id
            let user = null;
            const uRes = await databases.listDocuments(CONFIG.databaseId, CONFIG.usersCol, [
                Query.equal('auth_id', userKey),
                Query.limit(1)
            ]);
            if (uRes.documents.length > 0) {
                user = uRes.documents[0];
            } else {
                user = await databases.getDocument(CONFIG.databaseId, CONFIG.usersCol, userKey);
            }

            const authId = user.auth_id || user.$id;

            // Fetch linked attempts, premium orders, and subscriptions concurrently
            const [attemptsRes, ordersRes, subsRes] = await Promise.all([
                databases.listDocuments(CONFIG.databaseId, CONFIG.testAttemptsCol, [
                    Query.equal('user_id', authId),
                    Query.orderDesc('started_at'),
                    Query.limit(10)
                ]).catch(() => ({ documents: [] })),
                databases.listDocuments(CONFIG.databaseId, CONFIG.premiumRequestsCol, [
                    Query.equal('user_id', authId),
                    Query.orderDesc('$createdAt'),
                    Query.limit(5)
                ]).catch(() => ({ documents: [] })),
                databases.listDocuments(CONFIG.databaseId, CONFIG.subscriptionsCol, [
                    Query.equal('user_id', authId),
                    Query.orderDesc('$createdAt'),
                    Query.limit(5)
                ]).catch(() => ({ documents: [] }))
            ]);

            const avatarUrl = user.profile_photo 
                ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.profileImagesBucket}/files/${user.profile_photo}/view?project=${CONFIG.projectId}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'Student')}&background=0284c7&color=fff&bold=true`;

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <a href="#users" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            <span>Back to Student Directory</span>
                        </a>
                        <span class="badge ${user.is_premium ? 'badge-warning' : 'badge-gray'} text-xs">
                            ${user.is_premium ? '👑 Active Premium Member' : 'Free Tier Student'}
                        </span>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Student Profile Card (Col 1) -->
                        <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                            <div class="text-center">
                                <img class="w-24 h-24 rounded-3xl object-cover mx-auto border-2 border-slate-100 shadow-md mb-4" src="${avatarUrl}" alt="Avatar">
                                <h2 class="text-lg font-extrabold text-slate-900">${user.full_name || 'Student'}</h2>
                                <p class="text-xs text-slate-400 font-mono">${user.email}</p>
                                <span class="inline-block mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                                    Role: ${user.role || 'Student'}
                                </span>
                            </div>

                            <div class="border-t border-slate-100 pt-4 space-y-3 text-xs">
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-400">Target University</span>
                                    <span class="font-bold text-slate-800">${user.university_target || user.targeted_university || 'Not set'}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-400">Field of Study</span>
                                    <span class="font-bold text-slate-800">${user.field_of_study || 'Engineering/CS'}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-400">Resident City</span>
                                    <span class="font-bold text-slate-800">${user.city || 'Pakistan'}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-400">Contact Phone</span>
                                    <span class="font-mono text-slate-800">${user.phone || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-400">Account Status</span>
                                    <span class="font-bold capitalize ${user.account_status === 'banned' ? 'text-rose-600' : 'text-emerald-600'}">${user.account_status || 'active'}</span>
                                </div>
                                <div class="flex justify-between py-1">
                                    <span class="text-slate-400">Member Since</span>
                                    <span class="font-mono text-slate-600">${new Date(user.created_at || user.$createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Main Activity & Examination Telemetry (Cols 2-3) -->
                        <div class="lg:col-span-2 space-y-6">
                            <!-- Examination Attempts History -->
                            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <i data-lucide="activity" class="w-4 h-4 text-sky-600"></i>
                                        <span>Mock Exam Attempt History (${attemptsRes.documents.length})</span>
                                    </h3>
                                </div>
                                <div class="p-0">
                                    ${attemptsRes.documents.length === 0 ? `
                                        <div class="p-8 text-center text-slate-400 text-xs font-semibold">No recorded test sessions for this student.</div>
                                    ` : `
                                        <div class="table-responsive-wrapper">
                                            <table class="min-w-full divide-y divide-slate-100 text-xs">
                                                <thead class="table-header">
                                                    <tr>
                                                        <th>Exam Title</th>
                                                        <th>Score Achieved</th>
                                                        <th>Percentage</th>
                                                        <th>Status</th>
                                                        <th>Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="divide-y divide-slate-100">
                                                    ${attemptsRes.documents.map(att => `
                                                        <tr class="table-row">
                                                            <td class="table-cell font-bold text-slate-900">${att.test_title || 'Mock Test'}</td>
                                                            <td class="table-cell font-mono">${(att.marks_obtained !== null && att.marks_obtained !== undefined) ? Number(att.marks_obtained).toFixed(2) : '-'} / ${att.total_marks || 100}</td>
                                                            <td class="table-cell font-bold text-sky-600">${att.percentage ? Math.round(att.percentage) + '%' : '-'}</td>
                                                            <td class="table-cell"><span class="badge ${att.status === 'completed' ? 'badge-success' : 'badge-warning'} capitalize">${att.status}</span></td>
                                                            <td class="table-cell text-slate-400 font-mono">${new Date(att.started_at || att.$createdAt).toLocaleDateString()}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    `}
                                </div>
                            </div>

                            <!-- Payment & Subscription Orders -->
                            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <i data-lucide="credit-card" class="w-4 h-4 text-amber-600"></i>
                                        <span>Payment Receipts & Subscriptions</span>
                                    </h3>
                                </div>
                                <div class="p-0">
                                    ${ordersRes.documents.length === 0 ? `
                                        <div class="p-8 text-center text-slate-400 text-xs font-semibold">No payment receipts submitted.</div>
                                    ` : `
                                        <ul class="divide-y divide-slate-100 text-xs">
                                            ${ordersRes.documents.map(ord => `
                                                <li class="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                                    <div>
                                                        <p class="font-bold text-slate-900">Order ID: ${ord.order_id || ord.$id}</p>
                                                        <p class="text-slate-400 font-mono">TID: ${ord.transaction_id || 'N/A'} • PKR ${ord.final_amount || ord.amount}</p>
                                                    </div>
                                                    <div class="flex items-center gap-3">
                                                        <span class="badge ${ord.status === 'approved' ? 'badge-success' : (ord.status === 'rejected' ? 'badge-error' : 'badge-warning')} capitalize">${ord.status}</span>
                                                        <a href="#premium-requests/view/${ord.$id}" class="text-sky-600 font-bold hover:underline">Review</a>
                                                    </div>
                                                </li>
                                            `).join('')}
                                        </ul>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();

        } catch (error) {
            console.error("Failed to load user details:", error);
            showToast("Failed to load student details", "error");
            window.location.hash = '#users';
        }
    }
};
