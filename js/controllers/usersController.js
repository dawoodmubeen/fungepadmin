import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';
import { fetchAllDocuments, filterAndPaginate, debounce, formatDuration, formatDateTime } from '../utils/dbHelper.js';

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
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Manage accounts, toggle premium access, view session logs, and audit student exam telemetry.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="refresh-users-btn" class="btn-secondary text-xs sm:text-sm">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div class="relative flex-1 w-full md:max-w-md">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="search-user" 
                            placeholder="Search across all pages by name, email, target uni, auth ID..." 
                            class="form-input pl-10 text-xs sm:text-sm">
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
                                <tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading students from database...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination Footer -->
                    <div class="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <button id="prev-page" class="btn-secondary text-xs" disabled>
                            <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                            <span>Previous</span>
                        </button>
                        <span id="page-info" class="text-xs font-bold text-slate-600">Loading...</span>
                        <button id="next-page" class="btn-secondary text-xs" disabled>
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
        this.allUsers = [];
        
        await this.loadAllUsers();
        this.setupEvents();
    },

    async loadAllUsers() {
        const tbody = document.getElementById('users-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading all students from database...</td></tr>`;
        }

        try {
            this.allUsers = await fetchAllDocuments(CONFIG.databaseId, CONFIG.usersCol, [
                Query.orderDesc('$createdAt')
            ]);
            this.applyFilterAndRender();
        } catch (error) {
            console.error("Failed to load students:", error);
            showToast("Failed to load students: " + (error.message || error), "error");
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-rose-500 text-xs font-semibold">Error loading students: ${error.message || 'Please refresh'}.</td></tr>`;
            }
        }
    },

    applyFilterAndRender() {
        const searchInput = document.getElementById('search-user');
        const filterPremium = document.getElementById('filter-premium');
        const filterStatus = document.getElementById('filter-status');

        const q = searchInput?.value || '';
        const premiumVal = filterPremium?.value || 'all';
        const statusVal = filterStatus?.value || 'all';

        const filterFn = (u) => {
            if (premiumVal === 'premium' && !u.is_premium) return false;
            if (premiumVal === 'free' && u.is_premium) return false;

            const currentStatus = (u.account_status || 'active').toLowerCase();
            if (statusVal === 'active' && currentStatus !== 'active') return false;
            if (statusVal === 'banned' && currentStatus === 'active') return false;

            return true;
        };

        const searchFields = [
            'full_name',
            'email',
            'auth_id',
            'university_target',
            'targeted_university',
            'target_university',
            'field_of_study',
            'targeted_test',
            'target_test',
            'phone',
            'city'
        ];

        const result = filterAndPaginate(this.allUsers, {
            searchQuery: q,
            searchFields,
            filterFn,
            page: this.currentPage,
            limit: this.limit
        });

        this.renderTableRows(result.items);

        const pageInfo = document.getElementById('page-info');
        if (pageInfo) {
            pageInfo.textContent = result.total > 0
                ? `Page ${result.currentPage} of ${result.totalPages} (Showing ${result.startIndex}–${result.endIndex} of ${result.total} students)`
                : 'No matching students found';
        }

        const prevBtn = document.getElementById('prev-page');
        if (prevBtn) prevBtn.disabled = !result.hasPrev;

        const nextBtn = document.getElementById('next-page');
        if (nextBtn) nextBtn.disabled = !result.hasNext;
    },

    setupEvents() {
        const searchInput = document.getElementById('search-user');
        const filterPremium = document.getElementById('filter-premium');
        const filterStatus = document.getElementById('filter-status');

        const onFilterChange = () => {
            this.currentPage = 1;
            this.applyFilterAndRender();
        };

        searchInput?.addEventListener('input', debounce(() => onFilterChange(), 200));
        filterPremium?.addEventListener('change', onFilterChange);
        filterStatus?.addEventListener('change', onFilterChange);

        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.applyFilterAndRender();
            }
        });

        document.getElementById('next-page')?.addEventListener('click', () => {
            this.currentPage++;
            this.applyFilterAndRender();
        });

        document.getElementById('refresh-users-btn')?.addEventListener('click', async () => {
            await this.loadAllUsers();
            showToast("Student directory refreshed", "info");
        });
    },

    renderTableRows(data) {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">No student accounts found matching criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(user => {
            const displayName = user.full_name || (user.email ? user.email.split('@')[0] : 'Student');
            const avatarUrl = user.profile_photo 
                ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.profileImagesBucket}/files/${user.profile_photo}/view?project=${CONFIG.projectId}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00adef&color=fff&bold=true`;

            const isBanned = (user.account_status || 'active') === 'banned' || (user.account_status || 'active') === 'suspended';
            const targetUni = user.university_target || user.targeted_university || user.target_university || 'Not Specified';
            const targetField = user.field_of_study || user.targeted_test || user.target_test || 'Entrance';
            const regDate = user.created_at || user.$createdAt ? new Date(user.created_at || user.$createdAt).toLocaleDateString() : '—';
            const authId = user.auth_id || user.$id;

            return `
                <tr class="table-row">
                    <!-- Student Info -->
                    <td class="table-cell">
                        <div class="flex items-center gap-3">
                            <img class="h-9 w-9 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0" src="${avatarUrl}" alt="Avatar">
                            <div class="min-w-0">
                                <a href="#users/view/${authId}" class="font-bold text-slate-900 text-sm hover:text-sky-600 transition truncate block">
                                    ${displayName}
                                </a>
                                <p class="text-xs text-slate-400 truncate">${user.email || 'No email'}</p>
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
                            data-name="${displayName}"
                            title="Click to toggle student premium state">
                            <span>${user.is_premium ? '👑 Premium' : 'Free Access'}</span>
                            <i data-lucide="refresh-cw" class="w-3 h-3 opacity-60"></i>
                        </button>
                    </td>

                    <!-- Target Academic -->
                    <td class="table-cell text-xs text-slate-600">
                        <p class="font-semibold text-slate-800">${targetUni}</p>
                        <p class="text-slate-400 text-[11px]">${targetField}</p>
                    </td>

                    <!-- Registered Date -->
                    <td class="table-cell text-xs text-slate-500 font-mono">
                        ${regDate}
                    </td>

                    <!-- Actions -->
                    <td class="table-cell text-right">
                        <div class="flex items-center justify-end gap-1.5">
                            <a href="#sessions/user/${authId}" class="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition" title="View Student Sessions & Logins">
                                <i data-lucide="shield-check" class="w-4 h-4"></i>
                            </a>
                            <a href="#users/view/${authId}" class="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition flex items-center gap-1">
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
                        // Update in-memory state and re-render
                        const targetUser = this.allUsers.find(u => u.$id === id);
                        if (targetUser) targetUser.is_premium = nextVal;
                        this.applyFilterAndRender();
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
                        // Update in-memory state and re-render
                        const targetUser = this.allUsers.find(u => u.$id === id);
                        if (targetUser) targetUser.account_status = nextStatus;
                        this.applyFilterAndRender();
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

            // Fetch linked attempts, premium orders, subscriptions, and sessions concurrently
            const [attemptsRes, ordersRes, subsRes, sessionsRes] = await Promise.all([
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
                ]).catch(() => ({ documents: [] })),
                databases.listDocuments(CONFIG.databaseId, CONFIG.userSessionsCol, [
                    Query.equal('userId', authId),
                    Query.orderDesc('loginAt'),
                    Query.limit(10)
                ]).catch(() => ({ documents: [] }))
            ]);

            const avatarUrl = user.profile_photo 
                ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.profileImagesBucket}/files/${user.profile_photo}/view?project=${CONFIG.projectId}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'Student')}&background=0284c7&color=fff&bold=true`;

            const sessionsList = sessionsRes.documents || [];

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <a href="#users" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            <span>Back to Student Directory</span>
                        </a>
                        <div class="flex items-center gap-2">
                            <a href="#sessions/user/${authId}" class="btn-secondary text-xs flex items-center gap-1.5">
                                <i data-lucide="shield-check" class="w-3.5 h-3.5 text-sky-600"></i>
                                <span>All User Sessions (${sessionsList.length})</span>
                            </a>
                            <span class="badge ${user.is_premium ? 'badge-warning' : 'badge-gray'} text-xs">
                                ${user.is_premium ? '👑 Active Premium Member' : 'Free Tier Student'}
                            </span>
                        </div>
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
                                    <span class="text-slate-400">User ID</span>
                                    <span class="font-mono font-bold text-slate-800 select-all">${authId}</span>
                                </div>
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
                            <!-- Recent User Sessions & Logins -->
                            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
                                        <span>Recent Login Sessions & Telemetry (${sessionsList.length})</span>
                                    </h3>
                                    <a href="#sessions/user/${authId}" class="text-xs font-bold text-sky-600 hover:underline">View All Sessions</a>
                                </div>
                                <div class="p-0">
                                    ${sessionsList.length === 0 ? `
                                        <div class="p-8 text-center text-slate-400 text-xs font-semibold">No recent session logs recorded for this student.</div>
                                    ` : `
                                        <div class="table-responsive-wrapper">
                                            <table class="min-w-full divide-y divide-slate-100 text-xs">
                                                <thead class="table-header">
                                                    <tr>
                                                        <th>Device & Browser</th>
                                                        <th>IP & Location</th>
                                                        <th>Login Time</th>
                                                        <th>Duration</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="divide-y divide-slate-100">
                                                    ${sessionsList.map(s => {
                                                        const devIcon = (s.deviceType || '').toLowerCase() === 'mobile' ? 'smartphone' : 'monitor';
                                                        return `
                                                            <tr class="table-row">
                                                                <td class="table-cell">
                                                                    <div class="flex items-center gap-2">
                                                                        <i data-lucide="${devIcon}" class="w-3.5 h-3.5 text-sky-600"></i>
                                                                        <span class="font-bold text-slate-800">${s.deviceType || 'Desktop'}</span>
                                                                        <span class="text-slate-400 font-normal">(${s.browser || 'Browser'}, ${s.os || 'OS'})</span>
                                                                    </div>
                                                                </td>
                                                                <td class="table-cell font-mono">
                                                                    <span class="font-bold text-slate-700">${s.ipAddress || '—'}</span>
                                                                    <span class="text-slate-400 block text-[10px]">${[s.city, s.country].filter(Boolean).join(', ') || 'Unknown'}</span>
                                                                </td>
                                                                <td class="table-cell text-slate-600">
                                                                    ${formatDateTime(s.loginAt || s.$createdAt)}
                                                                </td>
                                                                <td class="table-cell font-mono">
                                                                    ${formatDuration(s.sessionDuration)}
                                                                </td>
                                                                <td class="table-cell">
                                                                    ${s.isActive 
                                                                        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Active</span>`
                                                                        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">Ended</span>`
                                                                    }
                                                                </td>
                                                            </tr>
                                                        `;
                                                    }).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    `}
                                </div>
                            </div>

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
