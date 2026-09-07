import { databases, storage, CONFIG, ID, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const mockTestsController = {
    async render(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Page Header & Action Bar -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Mock Test Manager</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">v2.0 Triple-File Engine</span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Create and manage exams with independent updates for Pattern, MCQs, and Solutions.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button id="create-mock-btn" class="btn-primary">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            <span>Create Mock Test</span>
                        </button>
                    </div>
                </div>

                <!-- Filter & Search Toolbar -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div class="relative flex-1 w-full md:max-w-md">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="search-tests" placeholder="Search tests by title or university..." class="form-input pl-10 text-xs sm:text-sm">
                    </div>
                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <select id="filter-university" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Universities</option>
                        </select>
                        <select id="filter-status" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Statuses</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </select>
                        <select id="filter-access" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Access</option>
                            <option value="premium">Premium Only</option>
                            <option value="free">Free</option>
                        </select>
                    </div>
                </div>

                <!-- Tests List Card -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden" id="mock-tests-container">
                    <div class="p-12 text-center text-slate-400">
                        <div class="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p class="text-xs font-semibold tracking-wider uppercase">Loading Mock Tests...</p>
                    </div>
                </div>
            </div>

            <!-- Create Mock Test Modal -->
            <div id="create-mock-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <div class="p-2 rounded-xl bg-sky-100 text-sky-700"><i data-lucide="layers" class="w-5 h-5"></i></div>
                            <h2 class="text-lg font-bold text-slate-900">Create New Mock Test</h2>
                        </div>
                        <button class="modal-close-btn p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <div class="p-6 overflow-y-auto flex-1">
                        <form id="create-mock-form" class="space-y-5">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="form-label">University *</label>
                                    <select id="c-university" required class="form-input">
                                        <option value="">Select Target University</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label">Test Title *</label>
                                    <input type="text" id="c-title" required placeholder="e.g. FAST-NUCES CS Grand Mock 1" class="form-input">
                                </div>
                                <div>
                                    <label class="form-label">Test Type</label>
                                    <select id="c-type" class="form-input">
                                        <option value="Full Length">Full Length Mock</option>
                                        <option value="Sectional">Sectional Exam</option>
                                        <option value="Diagnostic">Diagnostic Test</option>
                                        <option value="Past Paper">Past Paper Mock</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label">Duration (Minutes) *</label>
                                    <input type="number" id="c-duration" required value="120" min="10" max="360" class="form-input">
                                </div>
                                <div>
                                    <label class="form-label">Access Restriction</label>
                                    <div class="flex gap-4 mt-2">
                                        <label class="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                            <input type="radio" name="c-access" value="free" class="text-sky-600 focus:ring-sky-500">
                                            <span>Free Access</span>
                                        </label>
                                        <label class="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                            <input type="radio" name="c-access" value="premium" checked class="text-sky-600 focus:ring-sky-500">
                                            <span class="text-amber-700 font-bold">Premium Only 👑</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label class="form-label">Publish Status</label>
                                    <select id="c-status" class="form-input">
                                        <option value="draft">Draft (Hidden from students)</option>
                                        <option value="published">Published (Live immediately)</option>
                                    </select>
                                </div>
                            </div>

                            <!-- 3 Files Upload Section -->
                            <div class="pt-4 border-t border-slate-100 space-y-4">
                                <div class="flex items-center justify-between">
                                    <p class="text-xs font-extrabold uppercase text-slate-600 tracking-wider">Required JSON Files (3-File System)</p>
                                    <span class="text-[11px] text-slate-400">Validates v2.0 schema before commit</span>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                                        <div>
                                            <div class="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                                                <i data-lucide="file-code" class="w-4 h-4 text-sky-600"></i>
                                                <span>1. Pattern JSON *</span>
                                            </div>
                                            <p class="text-[11px] text-slate-500 mb-2">Defines sections, rules, penalty & floor.</p>
                                        </div>
                                        <input type="file" id="c-file-pattern" accept=".json" required class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 w-full">
                                    </div>

                                    <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                                        <div>
                                            <div class="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                                                <i data-lucide="help-circle" class="w-4 h-4 text-indigo-600"></i>
                                                <span>2. MCQ JSON *</span>
                                            </div>
                                            <p class="text-[11px] text-slate-500 mb-2">Question bank, options A-D, answers.</p>
                                        </div>
                                        <input type="file" id="c-file-mcq" accept=".json" required class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 w-full">
                                    </div>

                                    <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                                        <div>
                                            <div class="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                                                <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                                                <span>3. Solution JSON</span>
                                            </div>
                                            <p class="text-[11px] text-slate-500 mb-2">Step-by-step explanations (Optional).</p>
                                        </div>
                                        <input type="file" id="c-file-solution" accept=".json" class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 w-full">
                                    </div>
                                </div>
                            </div>

                            <!-- Live Validation Report -->
                            <div id="c-validation-box" class="hidden p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 font-mono text-xs space-y-1 max-h-48 overflow-y-auto"></div>

                            <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button type="button" class="btn-secondary modal-close-btn">Cancel</button>
                                <button type="submit" id="c-submit-btn" class="btn-primary">
                                    <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                                    <span>Validate & Create Test</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Manage / Update 3 Files Modal (KEY REQUIREMENT) -->
            <div id="update-files-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <div class="p-2 rounded-xl bg-amber-100 text-amber-800"><i data-lucide="refresh-cw" class="w-5 h-5"></i></div>
                            <div>
                                <h2 class="text-lg font-bold text-slate-900">Update Test Files</h2>
                                <p class="text-xs text-slate-500" id="u-modal-subtitle">Replace Pattern, MCQs, or Solution JSON</p>
                            </div>
                        </div>
                        <button class="modal-close-btn p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <div class="p-6 overflow-y-auto flex-1">
                        <form id="update-files-form" class="space-y-5">
                            <input type="hidden" id="u-doc-id">
                            <input type="hidden" id="u-current-pattern-id">
                            <input type="hidden" id="u-current-mcq-id">
                            <input type="hidden" id="u-current-sol-id">

                            <!-- Current Files Status -->
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                                <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">Active Storage References</span>
                                <div class="grid grid-cols-3 gap-2 text-xs">
                                    <div class="p-2 rounded-lg bg-white border border-slate-200">
                                        <span class="text-[10px] text-slate-400 block uppercase font-bold">Pattern JSON</span>
                                        <span id="u-active-pattern" class="font-mono text-slate-700 truncate block">Checking...</span>
                                    </div>
                                    <div class="p-2 rounded-lg bg-white border border-slate-200">
                                        <span class="text-[10px] text-slate-400 block uppercase font-bold">MCQ JSON</span>
                                        <span id="u-active-mcq" class="font-mono text-slate-700 truncate block">Checking...</span>
                                    </div>
                                    <div class="p-2 rounded-lg bg-white border border-slate-200">
                                        <span class="text-[10px] text-slate-400 block uppercase font-bold">Solution JSON</span>
                                        <span id="u-active-sol" class="font-mono text-slate-700 truncate block">Checking...</span>
                                    </div>
                                </div>
                            </div>

                            <p class="text-xs text-slate-600 font-medium">Select any file you wish to replace. Unselected files will retain their existing version.</p>

                            <!-- File Replacement Inputs -->
                            <div class="space-y-4">
                                <div class="p-3.5 rounded-xl border border-slate-200 hover:border-sky-300 transition">
                                    <div class="flex items-center justify-between mb-1">
                                        <label class="text-xs font-bold text-slate-800 flex items-center gap-2">
                                            <i data-lucide="file-code" class="w-4 h-4 text-sky-600"></i>
                                            <span>New Pattern JSON</span>
                                        </label>
                                        <span class="text-[11px] text-slate-400">Optional</span>
                                    </div>
                                    <input type="file" id="u-file-pattern" accept=".json" class="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 w-full">
                                </div>

                                <div class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition">
                                    <div class="flex items-center justify-between mb-1">
                                        <label class="text-xs font-bold text-slate-800 flex items-center gap-2">
                                            <i data-lucide="help-circle" class="w-4 h-4 text-indigo-600"></i>
                                            <span>New MCQ Questions JSON</span>
                                        </label>
                                        <span class="text-[11px] text-slate-400">Optional</span>
                                    </div>
                                    <input type="file" id="u-file-mcq" accept=".json" class="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 w-full">
                                </div>

                                <div class="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 transition">
                                    <div class="flex items-center justify-between mb-1">
                                        <label class="text-xs font-bold text-slate-800 flex items-center gap-2">
                                            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                                            <span>New Solution Explanations JSON</span>
                                        </label>
                                        <span class="text-[11px] text-slate-400">Optional</span>
                                    </div>
                                    <input type="file" id="u-file-sol" accept=".json" class="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 w-full">
                                </div>
                            </div>

                            <!-- Live Validation Box -->
                            <div id="u-validation-box" class="hidden p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 font-mono text-xs space-y-1 max-h-48 overflow-y-auto"></div>

                            <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button type="button" class="btn-secondary modal-close-btn">Cancel</button>
                                <button type="submit" id="u-submit-btn" class="btn-primary">
                                    <i data-lucide="check" class="w-4 h-4"></i>
                                    <span>Validate & Update Files</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Edit Test Metadata Modal -->
            <div id="edit-meta-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 class="text-base font-bold text-slate-900">Edit Test Properties</h2>
                        <button class="modal-close-btn p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <form id="edit-meta-form" class="p-6 space-y-4">
                        <input type="hidden" id="e-doc-id">
                        <div>
                            <label class="form-label">Title *</label>
                            <input type="text" id="e-title" required class="form-input">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Duration (Minutes)</label>
                                <input type="number" id="e-duration" required class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Status</label>
                                <select id="e-status" class="form-input">
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 pt-2">
                            <input type="checkbox" id="e-premium" class="w-4 h-4 text-sky-600 rounded">
                            <label for="e-premium" class="text-sm font-semibold text-slate-700">Premium Locked</label>
                        </div>
                        <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" class="btn-secondary modal-close-btn">Cancel</button>
                            <button type="submit" id="e-submit-btn" class="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        // Load data
        await this.loadUniversitiesDropdown();
        await this.loadTestsList();
        this.setupEvents();
    },

    setupEvents() {
        // Modal toggles
        const createModal = document.getElementById('create-mock-modal');
        const updateFilesModal = document.getElementById('update-files-modal');
        const editMetaModal = document.getElementById('edit-meta-modal');

        document.getElementById('create-mock-btn')?.addEventListener('click', () => {
            document.getElementById('create-mock-form').reset();
            const valBox = document.getElementById('c-validation-box');
            valBox.classList.add('hidden');
            valBox.innerHTML = '';
            createModal.classList.remove('hidden');
            setTimeout(() => createModal.classList.add('modal-active'), 10);
        });

        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                [createModal, updateFilesModal, editMetaModal].forEach(m => {
                    m?.classList.remove('modal-active');
                    setTimeout(() => m?.classList.add('hidden'), 200);
                });
            });
        });

        // Form submits
        document.getElementById('create-mock-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateTest();
        });

        document.getElementById('update-files-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleUpdateFiles();
        });

        document.getElementById('edit-meta-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSaveMeta();
        });

        // Filters
        const searchInput = document.getElementById('search-tests');
        const filterUni = document.getElementById('filter-university');
        const filterStatus = document.getElementById('filter-status');
        const filterAccess = document.getElementById('filter-access');

        const applyFilter = () => {
            const q = (searchInput?.value || '').toLowerCase();
            const u = filterUni?.value || 'all';
            const s = filterStatus?.value || 'all';
            const a = filterAccess?.value || 'all';

            const filtered = (this.testsData || []).filter(item => {
                const matchQ = (item.title || '').toLowerCase().includes(q) || (item.university_name || '').toLowerCase().includes(q);
                const matchU = u === 'all' || item.university_id === u;
                const matchS = s === 'all' || item.status === s;
                const matchA = a === 'all' || (a === 'premium' ? item.is_premium : !item.is_premium);
                return matchQ && matchU && matchS && matchA;
            });

            this.renderTableRows(filtered);
        };

        searchInput?.addEventListener('input', applyFilter);
        filterUni?.addEventListener('change', applyFilter);
        filterStatus?.addEventListener('change', applyFilter);
        filterAccess?.addEventListener('change', applyFilter);
    },

    async loadUniversitiesDropdown() {
        try {
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.universitiesCol, [
                Query.limit(100)
            ]);
            const createSel = document.getElementById('c-university');
            const filterSel = document.getElementById('filter-university');

            res.documents.forEach(uni => {
                const name = uni.name || uni.short_name || uni.$id;
                if (createSel) {
                    const opt = document.createElement('option');
                    opt.value = uni.$id;
                    opt.textContent = name;
                    opt.dataset.name = name;
                    createSel.appendChild(opt);
                }
                if (filterSel) {
                    const opt = document.createElement('option');
                    opt.value = uni.$id;
                    opt.textContent = name;
                    filterSel.appendChild(opt);
                }
            });
        } catch (e) {
            console.error("Failed to load universities dropdown:", e);
        }
    },

    async loadTestsList() {
        try {
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.mockTestsCol, [
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            this.testsData = res.documents;
            this.renderTableRows(this.testsData);
        } catch (error) {
            console.error("Failed to load mock tests:", error);
            document.getElementById('mock-tests-container').innerHTML = `
                <div class="p-8 text-center text-rose-500">Failed to load mock tests. Please check connection.</div>
            `;
        }
    },

    renderTableRows(tests) {
        const container = document.getElementById('mock-tests-container');
        if (!container) return;

        if (!tests || tests.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center text-slate-400">
                    <i data-lucide="layers" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
                    <p class="text-sm font-semibold text-slate-600">No mock tests found</p>
                    <p class="text-xs text-slate-400 mt-0.5">Create your first test using the button above.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        let html = `
            <div class="table-responsive-wrapper">
                <table class="min-w-full divide-y divide-slate-100">
                    <thead class="table-header">
                        <tr>
                            <th>Test Identity & University</th>
                            <th>3-File System Status</th>
                            <th>Configuration</th>
                            <th>Status & Access</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
        `;

        tests.forEach(test => {
            const hasPattern = !!test.pattern_file_id;
            const hasMcq = !!test.mcq_file_id;
            const hasSolution = !!test.solution_file_id;

            const statusBadge = test.status === 'published' 
                ? '<span class="badge badge-success"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Published</span>'
                : test.status === 'draft'
                ? '<span class="badge badge-gray"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Draft</span>'
                : '<span class="badge badge-warning"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Archived</span>';

            const accessBadge = test.is_premium
                ? '<span class="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">👑 Premium</span>'
                : '<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">Free</span>';

            html += `
                <tr class="table-row">
                    <!-- Title & Uni -->
                    <td class="table-cell">
                        <div class="flex items-start gap-3">
                            <div class="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                                <i data-lucide="layers" class="w-4 h-4"></i>
                            </div>
                            <div>
                                <p class="font-bold text-slate-900 text-sm">${test.title || 'Untitled Test'}</p>
                                <p class="text-xs text-slate-500 font-medium">${test.university_name || 'Generic Institute'}</p>
                                <span class="text-[10px] text-slate-400 font-mono">ID: ${test.$id}</span>
                            </div>
                        </div>
                    </td>

                    <!-- 3-File Status -->
                    <td class="table-cell">
                        <div class="flex flex-col gap-1 text-xs">
                            <div class="flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full ${hasPattern ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                                <span class="text-slate-600 font-medium">Pattern:</span>
                                <span class="font-mono text-[11px] text-slate-500">${hasPattern ? 'Uploaded' : 'Missing'}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full ${hasMcq ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                                <span class="text-slate-600 font-medium">MCQs:</span>
                                <span class="font-mono text-[11px] text-slate-500">${hasMcq ? 'Uploaded' : 'Missing'}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full ${hasSolution ? 'bg-emerald-500' : 'bg-amber-400'}"></span>
                                <span class="text-slate-600 font-medium">Solutions:</span>
                                <span class="font-mono text-[11px] text-slate-500">${hasSolution ? 'Uploaded' : 'Pending'}</span>
                            </div>
                        </div>
                    </td>

                    <!-- Specs -->
                    <td class="table-cell text-xs text-slate-600">
                        <p class="font-semibold text-slate-800">${test.test_type || test.type || 'Mock Test'}</p>
                        <p class="text-slate-400 font-mono text-[11px]">${test.slug || test.test_id || ''}</p>
                    </td>

                    <!-- Status & Access -->
                    <td class="table-cell">
                        <div class="flex flex-col items-start gap-1.5">
                            ${statusBadge}
                            ${accessBadge}
                        </div>
                    </td>

                    <!-- Actions -->
                    <td class="table-cell text-right">
                        <div class="flex items-center justify-end gap-1.5">
                            <!-- Update 3 Files Button -->
                            <button class="btn-update-files px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1 transition"
                                data-id="${test.$id}" 
                                data-title="${test.title}"
                                data-pattern="${test.pattern_file_id || ''}"
                                data-mcq="${test.mcq_file_id || ''}"
                                data-sol="${test.solution_file_id || ''}"
                                title="Update or replace any of the 3 JSON files">
                                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                                <span>Update Files</span>
                            </button>

                            <!-- Edit Meta Button -->
                            <button class="btn-edit-meta p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 transition"
                                data-id="${test.$id}"
                                data-title="${test.title}"
                                data-duration="${test.duration_minutes || 120}"
                                data-status="${test.status}"
                                data-premium="${test.is_premium}"
                                title="Edit Title & Properties">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>

                            <!-- Quick Publish/Unpublish Toggle -->
                            <button class="btn-toggle-status p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition"
                                data-id="${test.$id}"
                                data-current-status="${test.status}"
                                title="${test.status === 'published' ? 'Unpublish to Draft' : 'Publish Test'}">
                                <i data-lucide="${test.status === 'published' ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>
                            </button>

                            <!-- Delete Button -->
                            <button class="btn-delete-test p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                data-id="${test.$id}"
                                data-title="${test.title}"
                                title="Delete Test">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();

        // Bind Row Events
        // 1. Update 3 Files Modal
        container.querySelectorAll('.btn-update-files').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget;
                const id = b.dataset.id;
                const title = b.dataset.title;
                const patternId = b.dataset.pattern;
                const mcqId = b.dataset.mcq;
                const solId = b.dataset.sol;

                document.getElementById('update-files-form').reset();
                document.getElementById('u-doc-id').value = id;
                document.getElementById('u-current-pattern-id').value = patternId;
                document.getElementById('u-current-mcq-id').value = mcqId;
                document.getElementById('u-current-sol-id').value = solId;

                document.getElementById('u-modal-subtitle').textContent = `Target: ${title}`;
                document.getElementById('u-active-pattern').textContent = patternId || 'None';
                document.getElementById('u-active-mcq').textContent = mcqId || 'None';
                document.getElementById('u-active-sol').textContent = solId || 'None';

                const valBox = document.getElementById('u-validation-box');
                valBox.classList.add('hidden');
                valBox.innerHTML = '';

                const modal = document.getElementById('update-files-modal');
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('modal-active'), 10);
            });
        });

        // 2. Edit Meta Modal
        container.querySelectorAll('.btn-edit-meta').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget;
                document.getElementById('e-doc-id').value = b.dataset.id;
                document.getElementById('e-title').value = b.dataset.title;
                document.getElementById('e-duration').value = b.dataset.duration;
                document.getElementById('e-status').value = b.dataset.status;
                document.getElementById('e-premium').checked = b.dataset.premium === 'true';

                const modal = document.getElementById('edit-meta-modal');
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('modal-active'), 10);
            });
        });

        // 3. Quick Status Toggle
        container.querySelectorAll('.btn-toggle-status').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const b = e.currentTarget;
                const id = b.dataset.id;
                const current = b.dataset.currentStatus;
                const nextStatus = current === 'published' ? 'draft' : 'published';

                try {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.mockTestsCol, id, {
                        status: nextStatus,
                        updated_at: new Date().toISOString()
                    });
                    showToast(`Test changed to ${nextStatus}`, 'success');
                    await this.loadTestsList();
                } catch (err) {
                    showToast(err.message || 'Failed to toggle status', 'error');
                }
            });
        });

        // 4. Delete Test
        container.querySelectorAll('.btn-delete-test').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const b = e.currentTarget;
                const id = b.dataset.id;
                const title = b.dataset.title;

                if (confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) {
                    try {
                        await databases.deleteDocument(CONFIG.databaseId, CONFIG.mockTestsCol, id);
                        showToast('Test removed successfully', 'success');
                        await this.loadTestsList();
                    } catch (err) {
                        showToast(err.message || 'Failed to delete test', 'error');
                    }
                }
            });
        });
    },

    // Handlers
    async handleCreateTest() {
        const btn = document.getElementById('c-submit-btn');
        const valBox = document.getElementById('c-validation-box');
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Validating Schema...</span>`;
        valBox.classList.remove('hidden');
        valBox.innerHTML = `> [VALIDATOR] Initializing 3-file schema validation...<br>`;

        try {
            const uniSelect = document.getElementById('c-university');
            const uniId = uniSelect.value;
            const uniName = uniSelect.options[uniSelect.selectedIndex].dataset.name || uniSelect.value;
            const title = document.getElementById('c-title').value.trim();
            const type = document.getElementById('c-type').value;
            const duration = parseInt(document.getElementById('c-duration').value) || 120;
            const isPremium = document.querySelector('input[name="c-access"]:checked').value === 'premium';
            const status = document.getElementById('c-status').value;

            const filePattern = document.getElementById('c-file-pattern').files[0];
            const fileMcq = document.getElementById('c-file-mcq').files[0];
            const fileSol = document.getElementById('c-file-solution').files[0];

            if (!filePattern || !fileMcq) {
                throw new Error("Pattern JSON and MCQ JSON are strictly required.");
            }

            // Read files
            const patternRaw = await this.readFileAsText(filePattern);
            const mcqRaw = await this.readFileAsText(fileMcq);
            const solRaw = fileSol ? await this.readFileAsText(fileSol) : null;

            // Validate schemas
            const validation = this.validateTestSchemas(patternRaw, mcqRaw, solRaw, valBox);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            valBox.innerHTML += `> [UPLOAD] Uploading validated files to Appwrite Storage...<br>`;

            // Upload files to respective buckets
            const testId = validation.testId || `test_${Date.now()}`;
            const patternFileObj = new File([filePattern], `${testId}_pattern.json`, { type: 'application/json' });
            const mcqFileObj = new File([fileMcq], `${testId}_mcqs.json`, { type: 'application/json' });

            const patternUp = await storage.createFile(CONFIG.testPatternsBucket, ID.unique(), patternFileObj);
            const mcqUp = await storage.createFile(CONFIG.mockJsonsBucket, ID.unique(), mcqFileObj);

            let solUp = null;
            if (fileSol) {
                const solFileObj = new File([fileSol], `${testId}_solutions.json`, { type: 'application/json' });
                solUp = await storage.createFile(CONFIG.solutionsBucket, ID.unique(), solFileObj);
            }

            valBox.innerHTML += `> [DATABASE] Registering mock test in database...<br>`;

            const now = new Date().toISOString();
            const docId = ID.unique();

            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `test-${Date.now()}`;
            const testId = validation.testId || slug;

            await databases.createDocument(CONFIG.databaseId, CONFIG.mockTestsCol, docId, {
                test_id: testId,
                title: title,
                slug: slug,
                university_id: uniId,
                university_name: uniName,
                test_type: type || 'Mock',
                description: null,
                is_premium: isPremium,
                status: status,
                pattern_file_id: patternUp.$id,
                mcq_file_id: mcqUp.$id,
                solution_file_id: solUp ? solUp.$id : null,
                created_at: now,
                updated_at: now
            });

            showToast("Mock test created and published successfully!", "success");
            
            // Close modal
            const modal = document.getElementById('create-mock-modal');
            modal.classList.remove('modal-active');
            setTimeout(() => modal.classList.add('hidden'), 200);

            await this.loadTestsList();

        } catch (err) {
            console.error(err);
            valBox.innerHTML += `<br><span class="text-rose-400 font-bold">> [ERROR] ${err.message}</span>`;
            showToast(err.message || "Failed to create mock test", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="upload-cloud" class="w-4 h-4"></i><span>Validate & Create Test</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    },

    // Handles the critical requirement: Updating ANY or ALL 3 files for an existing test
    async handleUpdateFiles() {
        const btn = document.getElementById('u-submit-btn');
        const valBox = document.getElementById('u-validation-box');
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Updating Files...</span>`;
        valBox.classList.remove('hidden');
        valBox.innerHTML = `> [VALIDATOR] Checking uploaded file replacements...<br>`;

        try {
            const docId = document.getElementById('u-doc-id').value;
            const currentPatternId = document.getElementById('u-current-pattern-id').value;
            const currentMcqId = document.getElementById('u-current-mcq-id').value;
            const currentSolId = document.getElementById('u-current-sol-id').value;

            const filePattern = document.getElementById('u-file-pattern').files[0];
            const fileMcq = document.getElementById('u-file-mcq').files[0];
            const fileSol = document.getElementById('u-file-sol').files[0];

            if (!filePattern && !fileMcq && !fileSol) {
                throw new Error("No replacement file was selected. Please choose at least one file to update.");
            }

            // Read or fetch active contents for cross-validation
            let patternRaw = null;
            let mcqRaw = null;
            let solRaw = null;

            if (filePattern) {
                patternRaw = await this.readFileAsText(filePattern);
                valBox.innerHTML += `> [INPUT] New Pattern JSON provided (${filePattern.name})<br>`;
            } else if (currentPatternId) {
                patternRaw = JSON.stringify(await this.fetchFileJSON(CONFIG.testPatternsBucket, currentPatternId));
                valBox.innerHTML += `> [SYNC] Fetched active Pattern JSON for validation<br>`;
            }

            if (fileMcq) {
                mcqRaw = await this.readFileAsText(fileMcq);
                valBox.innerHTML += `> [INPUT] New MCQ JSON provided (${fileMcq.name})<br>`;
            } else if (currentMcqId) {
                mcqRaw = JSON.stringify(await this.fetchFileJSON(CONFIG.mockJsonsBucket, currentMcqId));
                valBox.innerHTML += `> [SYNC] Fetched active MCQ JSON for validation<br>`;
            }

            if (fileSol) {
                solRaw = await this.readFileAsText(fileSol);
                valBox.innerHTML += `> [INPUT] New Solution JSON provided (${fileSol.name})<br>`;
            } else if (currentSolId) {
                try {
                    solRaw = JSON.stringify(await this.fetchFileJSON(CONFIG.solutionsBucket, currentSolId));
                } catch (e) {
                    solRaw = null;
                }
            }

            // Run integrity check
            const validation = this.validateTestSchemas(patternRaw, mcqRaw, solRaw, valBox);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            valBox.innerHTML += `> [UPLOAD] Uploading new file versions...<br>`;

            const updatePayload = {
                updated_at: new Date().toISOString()
            };

            // Upload only the files that changed
            if (filePattern) {
                const up = await storage.createFile(CONFIG.testPatternsBucket, ID.unique(), filePattern);
                updatePayload.pattern_file_id = up.$id;
                valBox.innerHTML += `✓ Pattern file replaced: ${up.$id}<br>`;
            }

            if (fileMcq) {
                const up = await storage.createFile(CONFIG.mockJsonsBucket, ID.unique(), fileMcq);
                updatePayload.mcq_file_id = up.$id;
                valBox.innerHTML += `✓ MCQ file replaced: ${up.$id}<br>`;
            }

            if (fileSol) {
                const up = await storage.createFile(CONFIG.solutionsBucket, ID.unique(), fileSol);
                updatePayload.solution_file_id = up.$id;
                valBox.innerHTML += `✓ Solution file replaced: ${up.$id}<br>`;
            }

            valBox.innerHTML += `> [DATABASE] Committing changes to test record...<br>`;
            await databases.updateDocument(CONFIG.databaseId, CONFIG.mockTestsCol, docId, updatePayload);

            showToast("Test files successfully updated!", "success");

            // Close modal
            const modal = document.getElementById('update-files-modal');
            modal.classList.remove('modal-active');
            setTimeout(() => modal.classList.add('hidden'), 200);

            await this.loadTestsList();

        } catch (err) {
            console.error(err);
            valBox.innerHTML += `<br><span class="text-rose-400 font-bold">> [ERROR] ${err.message}</span>`;
            showToast(err.message || "Failed to update test files", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Validate & Update Files</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    },

    async handleSaveMeta() {
        const btn = document.getElementById('e-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const docId = document.getElementById('e-doc-id').value;
            const title = document.getElementById('e-title').value.trim();
            const duration = parseInt(document.getElementById('e-duration').value) || 120;
            const status = document.getElementById('e-status').value;
            const isPremium = document.getElementById('e-premium').checked;

            await databases.updateDocument(CONFIG.databaseId, CONFIG.mockTestsCol, docId, {
                title,
                status,
                is_premium: isPremium,
                updated_at: new Date().toISOString()
            });

            showToast("Test properties updated successfully", "success");

            const modal = document.getElementById('edit-meta-modal');
            modal.classList.remove('modal-active');
            setTimeout(() => modal.classList.add('hidden'), 200);

            await this.loadTestsList();
        } catch (err) {
            console.error(err);
            showToast(err.message || "Failed to update properties", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    },

    // Multi-schema Validator Engine (Supports v2.0 Enterprise & legacy formats)
    validateTestSchemas(patternJsonStr, mcqJsonStr, solJsonStr, logBox) {
        try {
            let pattern = null;
            let mcqs = null;
            let solutions = null;

            if (patternJsonStr) {
                try {
                    pattern = JSON.parse(patternJsonStr);
                    logBox.innerHTML += `✓ Pattern JSON parsed successfully<br>`;
                } catch (e) {
                    return { valid: false, error: "Pattern JSON is not valid JSON." };
                }
            }

            if (mcqJsonStr) {
                try {
                    mcqs = JSON.parse(mcqJsonStr);
                    logBox.innerHTML += `✓ MCQ Questions JSON parsed successfully<br>`;
                } catch (e) {
                    return { valid: false, error: "MCQ JSON is not valid JSON." };
                }
            }

            if (solJsonStr) {
                try {
                    solutions = JSON.parse(solJsonStr);
                    logBox.innerHTML += `✓ Solution Explanations JSON parsed successfully<br>`;
                } catch (e) {
                    return { valid: false, error: "Solution JSON is not valid JSON." };
                }
            }

            // Normalization: MCQ can be array [...] or { questions: [...] }
            let questionsList = [];
            if (Array.isArray(mcqs)) {
                questionsList = mcqs;
            } else if (mcqs && Array.isArray(mcqs.questions)) {
                questionsList = mcqs.questions;
            }

            // Normalization: Solutions can be array [...] or { solutions: [...] }
            let solutionsList = [];
            if (Array.isArray(solutions)) {
                solutionsList = solutions;
            } else if (solutions && Array.isArray(solutions.solutions)) {
                solutionsList = solutions.solutions;
            }

            // Validate Pattern Sections
            let totalPatternQuestions = 0;
            let totalPatternMarks = 0;
            const sectionMap = {};

            if (pattern) {
                const sections = pattern.sections || [];
                sections.forEach(s => {
                    const secId = s.section_id || s.name || s.id;
                    sectionMap[secId] = s;
                    totalPatternQuestions += (s.total_questions || 0);
                    totalPatternMarks += (s.total_marks || (s.total_questions * (s.marks_per_question || 1.0)));
                });
                logBox.innerHTML += `✓ Pattern defines ${sections.length} sections (${totalPatternQuestions} total Qs, ${totalPatternMarks.toFixed(1)} marks)<br>`;
            }

            // Validate MCQ questions
            if (questionsList.length > 0) {
                const qIds = new Set();
                const mcqAnswers = {};

                questionsList.forEach((q, idx) => {
                    const qId = q.id || q.question_id || `q_${idx}`;
                    if (qIds.has(qId)) {
                        throw new Error(`Duplicate question identifier "${qId}" found at question index ${idx}.`);
                    }
                    qIds.add(qId);

                    // Check options
                    const hasOptionsObj = q.options && typeof q.options === 'object';
                    const hasSeparateOptions = q.option_a !== undefined && q.option_b !== undefined;

                    if (!hasOptionsObj && !hasSeparateOptions) {
                        throw new Error(`Question ${qId} lacks required options (A, B, C, D).`);
                    }

                    // Check correct option
                    const correct = q.correct_option || q.answer;
                    if (!correct) {
                        throw new Error(`Question ${qId} is missing correct_option answer key.`);
                    }
                    mcqAnswers[qId] = String(correct).toUpperCase().trim();
                });

                logBox.innerHTML += `✓ Validated ${questionsList.length} unique questions with complete options & keys<br>`;

                // If Pattern is present, check question count parity
                if (totalPatternQuestions > 0 && totalPatternQuestions !== questionsList.length) {
                    logBox.innerHTML += `⚠ Notice: Pattern expects ${totalPatternQuestions} Qs, MCQ has ${questionsList.length} Qs.<br>`;
                }

                // If Solutions present, verify matching keys
                if (solutionsList.length > 0) {
                    let mismatchCount = 0;
                    solutionsList.forEach((sol, sIdx) => {
                        const solId = sol.id || sol.question_id || `q_${sIdx}`;
                        const solKey = (sol.correct_option || sol.answer || '').toUpperCase().trim();
                        const mcqKey = mcqAnswers[solId];

                        if (mcqKey && solKey && mcqKey !== solKey) {
                            mismatchCount++;
                            logBox.innerHTML += `⚠ Mismatch at ${solId}: MCQ key is '${mcqKey}', but Solution says '${solKey}'<br>`;
                        }
                    });

                    if (mismatchCount > 0) {
                        logBox.innerHTML += `⚠ Warning: ${mismatchCount} answer key discrepancies detected between MCQs and Solutions.<br>`;
                    } else {
                        logBox.innerHTML += `✓ All solution answer keys match MCQ answers 100%<br>`;
                    }
                }
            }

            const testId = pattern?.test_id || pattern?.test?.test_id || mcqs?.test_id || 'test';
            return {
                valid: true,
                testId,
                totalQuestions: questionsList.length || totalPatternQuestions || 100,
                totalMarks: totalPatternMarks || 100.0
            };

        } catch (e) {
            return { valid: false, error: e.message };
        }
    },

    async fetchFileJSON(bucketId, fileId) {
        const url = storage.getFileDownload(bucketId, fileId);
        const res = await fetch(url.href);
        if (!res.ok) throw new Error(`Failed to load file ${fileId} from bucket ${bucketId}`);
        return await res.json();
    },

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error("Unable to read local file"));
            reader.readAsText(file);
        });
    }
};
