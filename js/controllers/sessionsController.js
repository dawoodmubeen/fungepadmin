import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';
import { fetchAllDocuments, filterAndPaginate, debounce, formatDuration, formatDateTime } from '../utils/dbHelper.js';

export const sessionsController = {
    async render(container, args) {
        // Check if filtered by specific user ID from URL (e.g., #sessions/user/:userId)
        this.targetUserId = (args && args[0] === 'user' && args[1]) ? args[1] : null;
        await this.renderDashboard(container);
    },

    async renderDashboard(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header Banner -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div class="flex items-center gap-2.5">
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">User Sessions & Logins</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">Security Telemetry</span>
                            ${this.targetUserId ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Filtered for User: ${this.targetUserId}</span>` : ''}
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Audit active user sessions, login methods, IP geolocation, client devices, and session lifecycles.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        ${this.targetUserId ? `
                            <a href="#sessions" class="btn-secondary text-xs sm:text-sm">
                                <i data-lucide="x" class="w-4 h-4"></i>
                                <span>Clear User Filter</span>
                            </a>
                        ` : ''}
                        <button id="refresh-sessions-btn" class="btn-secondary text-xs sm:text-sm">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <!-- KPI Metrics Ribbon -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="sessions-stats-container">
                    <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Sessions</span>
                            <div class="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                                <i data-lucide="monitor" class="w-4 h-4"></i>
                            </div>
                        </div>
                        <p class="text-2xl font-extrabold text-slate-900 mt-2" id="stat-total-sessions">—</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">Recorded across all time</p>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-emerald-600">Active Now</span>
                            <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            </div>
                        </div>
                        <p class="text-2xl font-extrabold text-emerald-600 mt-2" id="stat-active-sessions">—</p>
                        <p class="text-[11px] text-emerald-600/80 mt-0.5 font-medium">Currently online students</p>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Unique Users</span>
                            <div class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <i data-lucide="users" class="w-4 h-4"></i>
                            </div>
                        </div>
                        <p class="text-2xl font-extrabold text-slate-900 mt-2" id="stat-unique-users">—</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">With logged telemetry</p>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Avg. Duration</span>
                            <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <i data-lucide="clock" class="w-4 h-4"></i>
                            </div>
                        </div>
                        <p class="text-2xl font-extrabold text-slate-900 mt-2" id="stat-avg-duration">—</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">Per student session</p>
                    </div>
                </div>

                <!-- Search & Filters Toolbar -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div class="relative flex-1 w-full md:max-w-md">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="search-sessions" 
                            placeholder="Search by student name, email, userId, IP, city, browser, OS..." 
                            class="form-input pl-10 text-xs sm:text-sm">
                    </div>
                    <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <select id="filter-session-status" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Statuses</option>
                            <option value="active">Active Online 🟢</option>
                            <option value="ended">Ended / Logged Out</option>
                        </select>
                        <select id="filter-session-device" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Devices</option>
                            <option value="Desktop">Desktop</option>
                            <option value="Mobile">Mobile</option>
                            <option value="Tablet">Tablet</option>
                        </select>
                        <select id="sort-sessions" class="form-input text-xs sm:text-sm py-2">
                            <option value="login_desc">Newest Login First</option>
                            <option value="login_asc">Oldest Login First</option>
                            <option value="duration_desc">Longest Duration</option>
                        </select>
                    </div>
                </div>

                <!-- Sessions Table Card -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div class="table-responsive-wrapper">
                        <table class="min-w-full divide-y divide-slate-100">
                            <thead class="table-header">
                                <tr>
                                    <th>Student / User</th>
                                    <th>Device & Environment</th>
                                    <th>IP & Geolocation</th>
                                    <th>Login & Last Active</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="sessions-tbody" class="divide-y divide-slate-100 bg-white">
                                <tr><td colspan="7" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading session telemetry...</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination Footer -->
                    <div class="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <button id="prev-session-page" class="btn-secondary text-xs" disabled>
                            <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                            <span>Previous</span>
                        </button>
                        <span id="session-page-info" class="text-xs font-bold text-slate-600">Page 1</span>
                        <button id="next-session-page" class="btn-secondary text-xs" disabled>
                            <span>Next</span>
                            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Inspect Telemetry Modal -->
            <div id="inspect-session-modal" class="modal-backdrop hidden">
                <div class="modal-container max-w-2xl">
                    <div class="flex items-center justify-between p-6 border-b border-slate-100">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                                <i data-lucide="terminal" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-slate-900">Session Diagnostic Telemetry</h3>
                                <p class="text-xs text-slate-500" id="modal-session-id">ID: —</p>
                            </div>
                        </div>
                        <button class="modal-close-btn p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto" id="modal-session-content">
                        <!-- Dynamic Telemetry Payload -->
                    </div>

                    <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button class="modal-close-btn btn-secondary text-xs">Close</button>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        this.currentPage = 1;
        this.limit = 20;
        this.allSessions = [];
        this.usersMap = new Map(); // userId -> userDoc

        await this.loadData();
        this.setupEvents();
    },

    async loadData() {
        const tbody = document.getElementById('sessions-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Fetching complete sessions dataset from database...</td></tr>`;
        }

        try {
            // Concurrently fetch sessions and users
            const [sessionsDocs, usersDocs] = await Promise.all([
                fetchAllDocuments(CONFIG.databaseId, CONFIG.userSessionsCol, [
                    Query.orderDesc('loginAt')
                ]),
                fetchAllDocuments(CONFIG.databaseId, CONFIG.usersCol, [
                    Query.limit(100)
                ])
            ]);

            // Index users by auth_id and $id for instantaneous O(1) joins
            this.usersMap = new Map();
            usersDocs.forEach(u => {
                if (u.auth_id) this.usersMap.set(u.auth_id, u);
                if (u.$id) this.usersMap.set(u.$id, u);
            });

            // If targetUserId filter is present from URL hash
            let sessions = sessionsDocs || [];
            if (this.targetUserId) {
                sessions = sessions.filter(s => s.userId === this.targetUserId);
            }

            // Enrich sessions with user metadata for seamless search
            this.allSessions = sessions.map(s => {
                const user = this.usersMap.get(s.userId);
                return {
                    ...s,
                    _userName: user?.full_name || (user?.email ? user.email.split('@')[0] : 'Unknown Student'),
                    _userEmail: user?.email || '',
                    _userAvatar: user?.profile_photo 
                        ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.profileImagesBucket}/files/${user.profile_photo}/view?project=${CONFIG.projectId}`
                        : null
                };
            });

            this.updateStats();
            this.applyFilterAndRender();

        } catch (error) {
            console.error("Failed to load user sessions:", error);
            showToast("Failed to load session logs: " + (error.message || error), "error");
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-rose-500 text-xs font-semibold">Error loading sessions: ${error.message || 'Please refresh'}.</td></tr>`;
            }
        }
    },

    updateStats() {
        const total = this.allSessions.length;
        const active = this.allSessions.filter(s => s.isActive).length;
        const uniqueUsers = new Set(this.allSessions.map(s => s.userId).filter(Boolean)).size;

        const totalDuration = this.allSessions.reduce((acc, s) => acc + (s.sessionDuration || 0), 0);
        const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;

        const elTotal = document.getElementById('stat-total-sessions');
        const elActive = document.getElementById('stat-active-sessions');
        const elUsers = document.getElementById('stat-unique-users');
        const elAvg = document.getElementById('stat-avg-duration');

        if (elTotal) elTotal.textContent = total.toLocaleString();
        if (elActive) elActive.textContent = active.toLocaleString();
        if (elUsers) elUsers.textContent = uniqueUsers.toLocaleString();
        if (elAvg) elAvg.textContent = formatDuration(avgDuration);
    },

    applyFilterAndRender() {
        const searchInput = document.getElementById('search-sessions');
        const statusFilter = document.getElementById('filter-session-status');
        const deviceFilter = document.getElementById('filter-session-device');
        const sortSelect = document.getElementById('sort-sessions');

        const q = searchInput?.value || '';
        const statusVal = statusFilter?.value || 'all';
        const deviceVal = deviceFilter?.value || 'all';
        const sortVal = sortSelect?.value || 'login_desc';

        // Filter Predicate
        const filterFn = (s) => {
            if (statusVal === 'active' && !s.isActive) return false;
            if (statusVal === 'ended' && s.isActive) return false;
            if (deviceVal !== 'all' && (s.deviceType || '').toLowerCase() !== deviceVal.toLowerCase()) return false;
            return true;
        };

        // Sort Comparator
        const sortFn = (a, b) => {
            if (sortVal === 'login_asc') {
                return new Date(a.loginAt || 0) - new Date(b.loginAt || 0);
            }
            if (sortVal === 'duration_desc') {
                return (b.sessionDuration || 0) - (a.sessionDuration || 0);
            }
            // default: login_desc
            return new Date(b.loginAt || 0) - new Date(a.loginAt || 0);
        };

        // Run full-database search and pagination
        const searchFields = [
            '_userName',
            '_userEmail',
            'userId',
            'ipAddress',
            'city',
            'country',
            'browser',
            'os',
            'deviceType',
            'sessionId',
            'loginMethod'
        ];

        const result = filterAndPaginate(this.allSessions, {
            searchQuery: q,
            searchFields,
            filterFn,
            sortFn,
            page: this.currentPage,
            limit: this.limit
        });

        this.renderTableRows(result.items);

        // Update Pagination Controls
        const pageInfo = document.getElementById('session-page-info');
        if (pageInfo) {
            pageInfo.textContent = result.total > 0
                ? `Page ${result.currentPage} of ${result.totalPages} (Showing ${result.startIndex}–${result.endIndex} of ${result.total} sessions)`
                : 'No matching sessions';
        }

        const prevBtn = document.getElementById('prev-session-page');
        if (prevBtn) prevBtn.disabled = !result.hasPrev;

        const nextBtn = document.getElementById('next-session-page');
        if (nextBtn) nextBtn.disabled = !result.hasNext;
    },

    setupEvents() {
        const searchInput = document.getElementById('search-sessions');
        const statusFilter = document.getElementById('filter-session-status');
        const deviceFilter = document.getElementById('filter-session-device');
        const sortSelect = document.getElementById('sort-sessions');

        const onFilterChange = () => {
            this.currentPage = 1;
            this.applyFilterAndRender();
        };

        searchInput?.addEventListener('input', debounce(() => onFilterChange(), 200));
        statusFilter?.addEventListener('change', onFilterChange);
        deviceFilter?.addEventListener('change', onFilterChange);
        sortSelect?.addEventListener('change', onFilterChange);

        document.getElementById('prev-session-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.applyFilterAndRender();
            }
        });

        document.getElementById('next-session-page')?.addEventListener('click', () => {
            this.currentPage++;
            this.applyFilterAndRender();
        });

        document.getElementById('refresh-sessions-btn')?.addEventListener('click', async () => {
            await this.loadData();
            showToast("Session telemetry refreshed", "info");
        });

        // Setup Inspect Modal Close Events
        const modal = document.getElementById('inspect-session-modal');
        modal?.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('modal-active');
                setTimeout(() => modal.classList.add('hidden'), 200);
            });
        });
    },

    renderTableRows(sessions) {
        const tbody = document.getElementById('sessions-tbody');
        if (!tbody) return;

        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">No sessions match current criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = sessions.map(s => {
            const userName = s._userName;
            const userEmail = s._userEmail;
            const avatarUrl = s._userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=00adef&color=fff&bold=true`;

            // Device Icon & Badge
            const deviceType = s.deviceType || 'Desktop';
            const deviceIcon = deviceType.toLowerCase() === 'mobile' 
                ? 'smartphone' 
                : (deviceType.toLowerCase() === 'tablet' ? 'tablet' : 'monitor');

            // Browser & OS text
            const browser = s.browser || 'Unknown';
            const os = s.os || 'Unknown';

            // Geolocation text
            const location = [s.city, s.country].filter(Boolean).join(', ') || 'Location Unknown';

            // Timestamps
            const loginFormatted = formatDateTime(s.loginAt || s.$createdAt);
            const lastActiveFormatted = formatDateTime(s.lastActiveAt);

            // Duration
            const durationText = s.isActive && !s.logoutAt
                ? `<span class="inline-flex items-center gap-1 text-emerald-600 font-bold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Active (${formatDuration(s.sessionDuration)})</span>`
                : `<span class="text-slate-600 font-medium">${formatDuration(s.sessionDuration)}</span>`;

            // Status Badge
            const statusBadge = s.isActive
                ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Online</span>
                   </span>`
                : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                    <span>Ended</span>
                   </span>`;

            return `
                <tr class="table-row">
                    <!-- Student / Account -->
                    <td class="table-cell">
                        <div class="flex items-center gap-3">
                            <img class="h-9 w-9 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0" src="${avatarUrl}" alt="Avatar">
                            <div class="min-w-0">
                                <a href="#users/view/${s.userId}" class="font-bold text-slate-900 text-sm hover:text-sky-600 transition truncate block">
                                    ${userName}
                                </a>
                                <p class="text-xs text-slate-400 truncate">${userEmail || 'No email'}</p>
                                <span class="text-[10px] font-mono text-slate-400">UID: ${s.userId.substring(0, 12)}...</span>
                            </div>
                        </div>
                    </td>

                    <!-- Device & OS / Browser -->
                    <td class="table-cell">
                        <div class="flex flex-col gap-1">
                            <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <i data-lucide="${deviceIcon}" class="w-3.5 h-3.5 text-sky-600"></i>
                                <span>${deviceType}</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span class="px-1.5 py-0.5 rounded bg-slate-100 font-medium">${browser}</span>
                                <span>•</span>
                                <span class="px-1.5 py-0.5 rounded bg-slate-100 font-medium">${os}</span>
                            </div>
                        </div>
                    </td>

                    <!-- IP & Geolocation -->
                    <td class="table-cell">
                        <div class="flex flex-col gap-1 text-xs">
                            <div class="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                                <i data-lucide="globe" class="w-3.5 h-3.5 text-slate-400"></i>
                                <span>${s.ipAddress || '—'}</span>
                            </div>
                            <div class="flex items-center gap-1 text-[11px] text-slate-500">
                                <i data-lucide="map-pin" class="w-3 h-3 text-rose-500"></i>
                                <span>${location}</span>
                            </div>
                        </div>
                    </td>

                    <!-- Login & Last Active -->
                    <td class="table-cell text-xs">
                        <div>
                            <span class="font-bold text-slate-800 block">${loginFormatted}</span>
                            <span class="text-[11px] text-slate-400 block">Active: ${lastActiveFormatted}</span>
                        </div>
                    </td>

                    <!-- Duration -->
                    <td class="table-cell text-xs font-mono">
                        ${durationText}
                    </td>

                    <!-- Status -->
                    <td class="table-cell">
                        ${statusBadge}
                    </td>

                    <!-- Actions -->
                    <td class="table-cell text-right">
                        <div class="flex items-center justify-end gap-1.5">
                            <button class="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition btn-inspect-session" 
                                data-id="${s.$id}" title="Inspect Telemetry Details">
                                <i data-lucide="file-code" class="w-4 h-4"></i>
                            </button>
                            <a href="#users/view/${s.userId}" class="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="View Student Profile">
                                <i data-lucide="user" class="w-4 h-4"></i>
                            </a>
                            ${s.isActive ? `
                                <button class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition btn-revoke-session" 
                                    data-id="${s.$id}" data-user="${userName}" title="Revoke / Terminate Session">
                                    <i data-lucide="power" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();

        // Bind Inspect buttons
        tbody.querySelectorAll('.btn-inspect-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const session = this.allSessions.find(s => s.$id === id);
                if (session) this.showInspectModal(session);
            });
        });

        // Bind Revoke buttons
        tbody.querySelectorAll('.btn-revoke-session').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const user = e.currentTarget.dataset.user;
                if (confirm(`Terminate active session for ${user}?`)) {
                    try {
                        const now = new Date().toISOString();
                        await databases.updateDocument(CONFIG.databaseId, CONFIG.userSessionsCol, id, {
                            isActive: false,
                            logoutAt: now,
                            lastActiveAt: now
                        });
                        showToast(`Session for ${user} terminated`, "success");
                        // Update in-memory state and re-render
                        const target = this.allSessions.find(s => s.$id === id);
                        if (target) {
                            target.isActive = false;
                            target.logoutAt = now;
                            target.lastActiveAt = now;
                        }
                        this.updateStats();
                        this.applyFilterAndRender();
                    } catch (err) {
                        showToast(err.message || "Failed to terminate session", "error");
                    }
                }
            });
        });
    },

    showInspectModal(session) {
        const modal = document.getElementById('inspect-session-modal');
        const modalTitle = document.getElementById('modal-session-id');
        const modalContent = document.getElementById('modal-session-content');
        if (!modal || !modalContent) return;

        modalTitle.textContent = `Session ID: ${session.sessionId || session.$id}`;

        modalContent.innerHTML = `
            <!-- Overview Grid -->
            <div class="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">Student / User</span>
                    <span class="font-bold text-slate-800">${session._userName}</span>
                    <span class="text-slate-500 block">${session._userEmail || '—'}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">User ID</span>
                    <span class="font-mono text-slate-700 select-all">${session.userId}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">IP Address</span>
                    <span class="font-mono text-slate-800 font-bold">${session.ipAddress || '—'}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">Location</span>
                    <span class="font-semibold text-slate-800">${[session.city, session.country].filter(Boolean).join(', ') || 'Unknown'}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">Device / OS / Browser</span>
                    <span class="font-semibold text-slate-800">${session.deviceType || 'Desktop'} • ${session.os || 'Unknown'} • ${session.browser || 'Unknown'}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">Session Status</span>
                    <span class="font-bold ${session.isActive ? 'text-emerald-600' : 'text-slate-600'}">${session.isActive ? 'Active Online' : 'Ended'}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">Login Timestamp</span>
                    <span class="font-medium text-slate-700">${formatDateTime(session.loginAt)}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">Last Active</span>
                    <span class="font-medium text-slate-700">${formatDateTime(session.lastActiveAt)}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">Logout Timestamp</span>
                    <span class="font-medium text-slate-700">${session.logoutAt ? formatDateTime(session.logoutAt) : 'Session Active'}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-semibold uppercase text-[10px] block">Duration</span>
                    <span class="font-mono font-bold text-slate-800">${formatDuration(session.sessionDuration)}</span>
                </div>
            </div>

            <!-- User Agent Breakdown -->
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full User-Agent String</label>
                <div class="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed break-all select-all">
                    ${session.userAgent || 'No user agent provided'}
                </div>
            </div>

            <!-- Raw JSON Inspector -->
            <details class="group border border-slate-200 rounded-xl overflow-hidden">
                <summary class="cursor-pointer bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-between">
                    <span>Raw Document Payload (JSON)</span>
                    <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
                </summary>
                <pre class="p-3 bg-slate-900 text-emerald-400 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-48">${JSON.stringify(session, null, 2)}</pre>
            </details>
        `;

        if (window.lucide) window.lucide.createIcons();

        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('modal-active'), 10);
    }
};
