import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const attemptsController = {
    async render(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Action Bar -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Live Exam Telemetry & Sessions</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Sync Active
                            </span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Monitor in-progress test attempts, review scoring evaluations, and inspect student response telemetry.</p>
                    </div>
                    <button id="refresh-attempts-btn" class="btn-secondary">
                        <i data-lucide="rotate-cw" class="w-4 h-4"></i>
                        <span>Refresh Telemetry</span>
                    </button>
                </div>

                <!-- Telemetry KPI Summary Cards -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="attempts-summary-grid">
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Live In-Progress</span>
                        <p class="text-2xl font-extrabold text-sky-600" id="stat-in-progress">0</p>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Completed Exams</span>
                        <p class="text-2xl font-extrabold text-emerald-600" id="stat-completed">0</p>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Average Score</span>
                        <p class="text-2xl font-extrabold text-indigo-600" id="stat-avg-score">--</p>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Monitored</span>
                        <p class="text-2xl font-extrabold text-slate-800" id="stat-total-monitored">0</p>
                    </div>
                </div>

                <!-- Attempts Filters Toolbar -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div class="relative flex-1 w-full md:max-w-md">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="search-attempts" placeholder="Filter by test title or student user ID..." class="form-input pl-10 text-xs sm:text-sm">
                    </div>
                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <select id="filter-att-status" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Session States</option>
                            <option value="in_progress">In-Progress Sessions</option>
                            <option value="completed">Completed Sessions</option>
                            <option value="expired">Expired / Timed Out</option>
                        </select>
                    </div>
                </div>

                <!-- Attempts Table -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div class="table-responsive-wrapper">
                        <table class="min-w-full divide-y divide-slate-100">
                            <thead class="table-header">
                                <tr>
                                    <th>Student & Attempt ID</th>
                                    <th>Test Exam Title</th>
                                    <th>Telemetry Progress</th>
                                    <th>Marks & Percentage</th>
                                    <th>Status</th>
                                    <th>Timestamp</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="attempts-tbody" class="divide-y divide-slate-100 bg-white">
                                <tr><td colspan="7" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading telemetry...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Inspect Telemetry Modal -->
            <div id="inspect-attempt-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <div class="p-2 rounded-xl bg-sky-100 text-sky-700"><i data-lucide="activity" class="w-5 h-5"></i></div>
                            <div>
                                <h2 class="text-base font-bold text-slate-900" id="telemetry-modal-title">Exam Session Telemetry</h2>
                                <p class="text-xs text-slate-400 font-mono" id="telemetry-modal-id">Attempt ID</p>
                            </div>
                        </div>
                        <button class="modal-close-btn p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <div class="p-6 overflow-y-auto flex-1 space-y-6" id="telemetry-modal-body">
                        <!-- Populated dynamically -->
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        await this.loadAttempts();
        this.setupEvents();
    },

    setupEvents() {
        document.getElementById('refresh-attempts-btn')?.addEventListener('click', async () => {
            await this.loadAttempts();
            showToast("Telemetry updated", "info");
        });

        const modal = document.getElementById('inspect-attempt-modal');
        modal.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('modal-active');
                setTimeout(() => modal.classList.add('hidden'), 200);
            });
        });

        // Filter events
        const searchInput = document.getElementById('search-attempts');
        const filterStatus = document.getElementById('filter-att-status');

        const applyFilter = () => {
            const q = (searchInput?.value || '').toLowerCase();
            const s = filterStatus?.value || 'all';

            const filtered = (this.attemptsData || []).filter(item => {
                const matchQ = (item.test_title || '').toLowerCase().includes(q) || (item.user_id || '').toLowerCase().includes(q) || (item.$id || '').toLowerCase().includes(q);
                const matchS = s === 'all' || item.status === s;
                return matchQ && matchS;
            });

            this.renderTableRows(filtered);
        };

        searchInput?.addEventListener('input', applyFilter);
        filterStatus?.addEventListener('change', applyFilter);
    },

    async loadAttempts() {
        try {
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.testAttemptsCol, [
                Query.orderDesc('started_at'),
                Query.limit(100)
            ]);

            this.attemptsData = res.documents;

            // Compute summary
            let inProgress = 0;
            let completed = 0;
            let totalPct = 0;
            let pctCount = 0;

            this.attemptsData.forEach(a => {
                if (a.status === 'in_progress') inProgress++;
                if (a.status === 'completed') {
                    completed++;
                    if (a.percentage !== null && a.percentage !== undefined) {
                        totalPct += Number(a.percentage);
                        pctCount++;
                    }
                }
            });

            document.getElementById('stat-in-progress').textContent = inProgress;
            document.getElementById('stat-completed').textContent = completed;
            document.getElementById('stat-avg-score').textContent = pctCount > 0 ? `${Math.round(totalPct / pctCount)}%` : '--';
            document.getElementById('stat-total-monitored').textContent = res.total || this.attemptsData.length;

            this.renderTableRows(this.attemptsData);

        } catch (error) {
            console.error("Failed to load attempts:", error);
            document.getElementById('attempts-tbody').innerHTML = `
                <tr><td colspan="7" class="text-center py-12 text-rose-500 text-xs">Failed to load telemetry data.</td></tr>
            `;
        }
    },

    renderTableRows(data) {
        const tbody = document.getElementById('attempts-tbody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">No attempt sessions found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(att => {
            const statusBadge = att.status === 'in_progress'
                ? '<span class="badge badge-info"><span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>Live Testing</span>'
                : att.status === 'completed'
                ? '<span class="badge badge-success">Completed</span>'
                : '<span class="badge badge-error">Expired</span>';

            const scoreDisplay = att.marks_obtained !== null && att.marks_obtained !== undefined
                ? `<span class="font-extrabold text-slate-900 font-mono">${Number(att.marks_obtained).toFixed(1)}</span> <span class="text-slate-400 text-xs">/ ${att.total_marks || 100}</span>`
                : `<span class="text-slate-400 italic text-xs">In Progress</span>`;

            const percentageDisplay = att.percentage !== null && att.percentage !== undefined
                ? `<span class="font-bold text-xs px-2 py-0.5 rounded ${att.percentage >= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">${Math.round(att.percentage)}%</span>`
                : '-';

            return `
                <tr class="table-row">
                    <!-- Student / Attempt ID -->
                    <td class="table-cell">
                        <div class="flex flex-col">
                            <span class="font-bold text-slate-900 text-xs">Student ID: ${att.user_id ? att.user_id.substring(0, 12) + '...' : 'Anonymous'}</span>
                            <span class="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">${att.$id}</span>
                        </div>
                    </td>

                    <!-- Test Title -->
                    <td class="table-cell">
                        <p class="font-bold text-slate-900 text-xs truncate max-w-[200px]">${att.test_title || 'Mock Test'}</p>
                        <span class="text-[10px] text-slate-400">Attempt #${att.attempt_number || 1}</span>
                    </td>

                    <!-- Telemetry Progress -->
                    <td class="table-cell text-xs text-slate-600">
                        <p><span class="font-semibold">${att.attempted_questions || 0}</span> / ${att.total_questions || '?'} Answered</p>
                        <p class="text-[10px] text-slate-400 font-mono">Sync Rev: ${att.sync_revision || 1} • Last Q: #${att.last_question_index !== undefined ? att.last_question_index + 1 : 1}</p>
                    </td>

                    <!-- Marks & Score -->
                    <td class="table-cell">
                        <div class="flex items-center gap-2">
                            <div>${scoreDisplay}</div>
                            <div>${percentageDisplay}</div>
                        </div>
                    </td>

                    <!-- Status -->
                    <td class="table-cell">
                        ${statusBadge}
                    </td>

                    <!-- Timestamp -->
                    <td class="table-cell text-xs text-slate-500 font-mono">
                        ${new Date(att.started_at || att.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <!-- Actions -->
                    <td class="table-cell text-right">
                        <button class="btn-inspect-telemetry px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition flex items-center gap-1"
                            data-id="${att.$id}">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                            <span>Telemetry</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();

        // Bind Inspect Modal
        tbody.querySelectorAll('.btn-inspect-telemetry').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attId = e.currentTarget.dataset.id;
                const att = this.attemptsData.find(a => a.$id === attId);
                if (att) this.showTelemetryModal(att);
            });
        });
    },

    showTelemetryModal(att) {
        document.getElementById('telemetry-modal-title').textContent = att.test_title || 'Mock Exam';
        document.getElementById('telemetry-modal-id').textContent = `Session: ${att.$id} • Student: ${att.user_id}`;

        let answersObj = {};
        if (typeof att.answers === 'string') {
            try { answersObj = JSON.parse(att.answers); } catch(e) {}
        } else if (typeof att.answers === 'object') {
            answersObj = att.answers || {};
        }

        const answeredCount = Object.keys(answersObj).length;

        const bodyEl = document.getElementById('telemetry-modal-body');
        bodyEl.innerHTML = `
            <!-- Score & Stats Bar -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Net Score</span>
                    <span class="text-xl font-extrabold text-slate-900">${att.marks_obtained !== null ? Number(att.marks_obtained).toFixed(2) : '-'}</span>
                </div>
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Percentage</span>
                    <span class="text-xl font-extrabold text-sky-600">${att.percentage !== null ? Math.round(att.percentage) + '%' : '-'}</span>
                </div>
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Correct Choices</span>
                    <span class="text-xl font-extrabold text-emerald-600">${att.correct_answers || 0}</span>
                </div>
                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span class="text-[10px] text-slate-400 font-bold uppercase block">Wrong Deductions</span>
                    <span class="text-xl font-extrabold text-rose-600">${att.wrong_answers || 0}</span>
                </div>
            </div>

            <!-- Session Details -->
            <div class="p-4 rounded-2xl border border-slate-100 bg-white space-y-2 text-xs">
                <div class="flex justify-between py-1 border-b border-slate-50">
                    <span class="text-slate-400">Exam Status</span>
                    <span class="font-bold uppercase text-slate-800">${att.status}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-50">
                    <span class="text-slate-400">Elapsed Test Duration</span>
                    <span class="font-mono text-slate-800">${att.time_taken_seconds ? Math.floor(att.time_taken_seconds / 60) + 'm ' + (att.time_taken_seconds % 60) + 's' : 'Active'}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-50">
                    <span class="text-slate-400">Pinned MCQ File</span>
                    <span class="font-mono text-slate-600">${att.mcq_file_id || 'Latest'}</span>
                </div>
                <div class="flex justify-between py-1">
                    <span class="text-slate-400">Pinned Pattern File</span>
                    <span class="font-mono text-slate-600">${att.pattern_file_id || 'Latest'}</span>
                </div>
            </div>

            <!-- Answer Telemetry Payload -->
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold uppercase tracking-wider text-slate-700">Answer Telemetry (${answeredCount} selections)</span>
                    <span class="text-[11px] text-slate-400 font-mono">Sync Revision #${att.sync_revision || 1}</span>
                </div>
                <div class="code-box max-h-56 overflow-y-auto">
                    ${Object.keys(answersObj).length > 0 ? JSON.stringify(answersObj, null, 2) : 'No answer selections recorded yet.'}
                </div>
            </div>
        `;

        const modal = document.getElementById('inspect-attempt-modal');
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('modal-active'), 10);
    }
};
