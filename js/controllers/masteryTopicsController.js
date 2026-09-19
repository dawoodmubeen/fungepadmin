import { databases, storage, CONFIG, ID, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';
import { fetchAllDocuments, debounce } from '../utils/dbHelper.js';

export const masteryTopicsController = {
    currentTab: 'topics', // 'topics' | 'sections'
    sections: [],
    topics: [],

    async render(container, args) {
        if (args && args.length > 0 && args[0] === 'sections') {
            this.currentTab = 'sections';
        } else {
            this.currentTab = 'topics';
        }

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Page Header & Action Bar -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Mastery Topics & Sections</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">Topic-Wise Engine</span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Organize tests by academic sections and upload topic mastery JSON files.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button id="add-section-top-btn" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition flex items-center gap-2">
                            <i data-lucide="folder-plus" class="w-4 h-4 text-slate-600"></i>
                            <span>New Section</span>
                        </button>
                        <button id="upload-topic-top-btn" class="btn-primary">
                            <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                            <span>Upload Topic JSON</span>
                        </button>
                    </div>
                </div>

                <!-- Tabs Navigation -->
                <div class="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                    <button id="tab-btn-topics" class="tab-nav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${this.currentTab === 'topics' ? 'bg-white text-sky-700 shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-800'}">
                        <i data-lucide="book-open" class="w-4 h-4"></i>
                        <span>Topic Tests</span>
                        <span id="badge-topics-count" class="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[11px] font-extrabold">0</span>
                    </button>
                    <button id="tab-btn-sections" class="tab-nav-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${this.currentTab === 'sections' ? 'bg-white text-sky-700 shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-800'}">
                        <i data-lucide="folder" class="w-4 h-4"></i>
                        <span>Academic Sections</span>
                        <span id="badge-sections-count" class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-extrabold">0</span>
                    </button>
                </div>

                <!-- Tab 1: Topic Tests Content -->
                <div id="tab-content-topics" class="${this.currentTab === 'topics' ? '' : 'hidden'} space-y-4">
                    <!-- Filters & Search Toolbar -->
                    <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div class="relative flex-1 w-full md:max-w-md">
                            <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                            <input type="text" id="search-topics" placeholder="Search topic tests by title or section..." class="form-input pl-10 text-xs sm:text-sm">
                        </div>
                        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <select id="filter-topic-section" class="form-input text-xs sm:text-sm py-2">
                                <option value="all">All Sections</option>
                            </select>
                            <select id="filter-topic-status" class="form-input text-xs sm:text-sm py-2">
                                <option value="all">All Statuses</option>
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Archived</option>
                            </select>
                            <select id="filter-topic-access" class="form-input text-xs sm:text-sm py-2">
                                <option value="all">All Access</option>
                                <option value="premium">Premium Only</option>
                                <option value="free">Free Access</option>
                            </select>
                        </div>
                    </div>

                    <!-- Topics Table Container -->
                    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden" id="topics-table-container">
                        <div class="p-12 text-center text-slate-400">
                            <div class="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p class="text-xs font-semibold tracking-wider uppercase">Loading Topic Tests...</p>
                        </div>
                    </div>
                </div>

                <!-- Tab 2: Sections Content -->
                <div id="tab-content-sections" class="${this.currentTab === 'sections' ? '' : 'hidden'} space-y-4">
                    <div class="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                        <div class="relative flex-1 max-w-md">
                            <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                            <input type="text" id="search-sections" placeholder="Search sections by name or ID..." class="form-input pl-10 text-xs sm:text-sm">
                        </div>
                        <button id="add-section-inner-btn" class="btn-primary text-xs sm:text-sm">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            <span>Add New Section</span>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="sections-cards-container">
                        <div class="col-span-full p-12 text-center text-slate-400">
                            <div class="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p class="text-xs font-semibold tracking-wider uppercase">Loading Sections...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Upload / Create Topic Test Modal -->
            <div id="upload-topic-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <div class="p-2 rounded-xl bg-sky-100 text-sky-700">
                                <i data-lucide="upload-cloud" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h2 class="text-lg font-bold text-slate-900">Upload Topic Mastery Test</h2>
                                <p class="text-xs text-slate-500">Upload JSON question bank and assign to an academic section</p>
                            </div>
                        </div>
                        <button class="modal-close-btn p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <div class="p-6 overflow-y-auto flex-1">
                        <form id="upload-topic-form" class="space-y-4">
                            <!-- Section Selector with Quick Add Button -->
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <label class="form-label mb-0">Academic Section *</label>
                                    <button type="button" id="quick-add-section-btn" class="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
                                        <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                                        <span>Create New Section</span>
                                    </button>
                                </div>
                                <select id="c-topic-section" required class="form-input">
                                    <option value="">-- Select Section --</option>
                                </select>
                                <p class="text-[11px] text-slate-400 mt-1">Select the academic section this mastery topic belongs to.</p>
                            </div>

                            <!-- Topic Title -->
                            <div>
                                <label class="form-label">Topic Title *</label>
                                <input type="text" id="c-topic-title" required maxlength="200" placeholder="e.g. Algebra & Functions - Level 1" class="form-input">
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <!-- Total Questions -->
                                <div>
                                    <label class="form-label">Total Questions *</label>
                                    <input type="number" id="c-topic-questions" required min="1" max="5000" placeholder="Auto-calculated from JSON" class="form-input">
                                    <span class="text-[11px] text-slate-400 mt-1 block">Auto-filled when JSON is parsed, editable if needed.</span>
                                </div>

                                <!-- Publish Status -->
                                <div>
                                    <label class="form-label">Publish Status *</label>
                                    <select id="c-topic-status" class="form-input">
                                        <option value="published">Published (Live for students)</option>
                                        <option value="draft">Draft (Hidden)</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Access Restriction -->
                            <div>
                                <label class="form-label">Access Level</label>
                                <div class="flex gap-4 mt-1.5">
                                    <label class="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                        <input type="radio" name="c-topic-access" value="free" class="text-sky-600 focus:ring-sky-500">
                                        <span>Free Access</span>
                                    </label>
                                    <label class="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                        <input type="radio" name="c-topic-access" value="premium" checked class="text-sky-600 focus:ring-sky-500">
                                        <span class="text-amber-700 font-bold">Premium Only 👑</span>
                                    </label>
                                </div>
                            </div>

                            <!-- JSON File Upload -->
                            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                                <div class="flex items-center justify-between">
                                    <label class="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <i data-lucide="file-code" class="w-4 h-4 text-sky-600"></i>
                                        <span>Topic Test JSON File *</span>
                                    </label>
                                    <span class="text-[11px] font-semibold text-slate-500">Destination: mastery_jsons</span>
                                </div>
                                <input type="file" id="c-topic-file" accept=".json" required class="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-800 hover:file:bg-sky-200 w-full">
                                
                                <!-- File Validation Status Box -->
                                <div id="c-topic-file-status" class="hidden p-3 rounded-xl text-xs font-mono"></div>
                            </div>

                            <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button type="button" class="btn-secondary modal-close-btn">Cancel</button>
                                <button type="submit" id="c-topic-submit-btn" class="btn-primary">
                                    <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                                    <span>Upload & Save Topic Test</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Update / Replace JSON File Modal -->
            <div id="replace-json-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <div class="p-2 rounded-xl bg-amber-100 text-amber-800">
                                <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h2 class="text-base font-bold text-slate-900">Replace Topic JSON</h2>
                                <p class="text-xs text-slate-500" id="replace-modal-subtitle">Upload updated question bank</p>
                            </div>
                        </div>
                        <button class="modal-close-btn p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <form id="replace-json-form" class="p-6 space-y-4">
                        <input type="hidden" id="r-topic-id">
                        <input type="hidden" id="r-current-file-id">

                        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                            <p><span class="font-bold text-slate-600">Current File ID:</span> <span id="r-display-file-id" class="font-mono text-slate-800 break-all">None</span></p>
                            <p><span class="font-bold text-slate-600">Current Question Count:</span> <span id="r-display-q-count" class="font-bold text-sky-700">0</span></p>
                        </div>

                        <div>
                            <label class="form-label">New JSON File *</label>
                            <input type="file" id="r-topic-file" accept=".json" required class="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 w-full">
                        </div>

                        <div>
                            <label class="form-label">Updated Total Questions *</label>
                            <input type="number" id="r-topic-questions" required min="1" class="form-input">
                            <span class="text-[11px] text-slate-400 mt-1 block">Auto-updated from the new file.</span>
                        </div>

                        <div id="r-topic-file-status" class="hidden p-3 rounded-xl text-xs font-mono"></div>

                        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button type="button" class="btn-secondary modal-close-btn">Cancel</button>
                            <button type="submit" id="r-submit-btn" class="btn-primary">
                                <i data-lucide="check" class="w-4 h-4"></i>
                                <span>Save & Replace File</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Edit Topic Properties Modal -->
            <div id="edit-topic-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <div class="p-2 rounded-xl bg-sky-100 text-sky-700">
                                <i data-lucide="edit-3" class="w-5 h-5"></i>
                            </div>
                            <h2 class="text-base font-bold text-slate-900">Edit Topic Test Details</h2>
                        </div>
                        <button class="modal-close-btn p-2 text-slate-400 hover:text-slate-600 rounded-lg transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <form id="edit-topic-form" class="p-6 space-y-4">
                        <input type="hidden" id="e-topic-id">

                        <div>
                            <label class="form-label">Title *</label>
                            <input type="text" id="e-topic-title" required maxlength="200" class="form-input">
                        </div>

                        <div>
                            <label class="form-label">Academic Section *</label>
                            <select id="e-topic-section" required class="form-input">
                                <option value="">-- Select Section --</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Total Questions</label>
                                <input type="number" id="e-topic-questions" required min="1" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Status</label>
                                <select id="e-topic-status" class="form-input">
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 pt-2">
                            <input type="checkbox" id="e-topic-premium" class="w-4 h-4 text-sky-600 rounded">
                            <label for="e-topic-premium" class="text-sm font-semibold text-slate-700">Lock for Premium Students 👑</label>
                        </div>

                        <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" class="btn-secondary modal-close-btn">Cancel</button>
                            <button type="submit" id="e-topic-submit-btn" class="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Add / Edit Section Modal -->
            <div id="section-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <div class="p-2 rounded-xl bg-sky-100 text-sky-700">
                                <i data-lucide="folder-plus" class="w-5 h-5"></i>
                            </div>
                            <h2 class="text-base font-bold text-slate-900" id="section-modal-title">Add Academic Section</h2>
                        </div>
                        <button class="modal-close-btn p-2 text-slate-400 hover:text-slate-600 rounded-lg transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <form id="section-form" class="p-6 space-y-4">
                        <input type="hidden" id="sec-id">

                        <div>
                            <label class="form-label">Section Name *</label>
                            <input type="text" id="sec-name" required maxlength="150" placeholder="e.g. Mathematics, English, Analytical Reasoning" class="form-input">
                            <span class="text-[11px] text-slate-400 mt-1 block">Maximum 150 characters.</span>
                        </div>

                        <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" class="btn-secondary modal-close-btn">Cancel</button>
                            <button type="submit" id="sec-submit-btn" class="btn-primary">
                                <span id="sec-submit-text">Create Section</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        // Bind events and load data
        this.setupEventListeners();
        await this.loadInitialData();
    },

    setupEventListeners() {
        // Tab switching
        const tabTopics = document.getElementById('tab-btn-topics');
        const tabSections = document.getElementById('tab-btn-sections');
        const contentTopics = document.getElementById('tab-content-topics');
        const contentSections = document.getElementById('tab-content-sections');

        const switchTab = (tab) => {
            this.currentTab = tab;
            if (tab === 'topics') {
                tabTopics?.classList.add('bg-white', 'text-sky-700', 'shadow-sm', 'border', 'border-slate-200/80');
                tabTopics?.classList.remove('text-slate-500');
                tabSections?.classList.remove('bg-white', 'text-sky-700', 'shadow-sm', 'border', 'border-slate-200/80');
                tabSections?.classList.add('text-slate-500');

                contentTopics?.classList.remove('hidden');
                contentSections?.classList.add('hidden');
            } else {
                tabSections?.classList.add('bg-white', 'text-sky-700', 'shadow-sm', 'border', 'border-slate-200/80');
                tabSections?.classList.remove('text-slate-500');
                tabTopics?.classList.remove('bg-white', 'text-sky-700', 'shadow-sm', 'border', 'border-slate-200/80');
                tabTopics?.classList.add('text-slate-500');

                contentSections?.classList.remove('hidden');
                contentTopics?.classList.add('hidden');
            }
            if (window.lucide) window.lucide.createIcons();
        };

        tabTopics?.addEventListener('click', () => switchTab('topics'));
        tabSections?.addEventListener('click', () => switchTab('sections'));

        // Modals management
        const uploadModal = document.getElementById('upload-topic-modal');
        const replaceModal = document.getElementById('replace-json-modal');
        const editTopicModal = document.getElementById('edit-topic-modal');
        const sectionModal = document.getElementById('section-modal');

        const openModal = (m) => {
            if (!m) return;
            m.classList.remove('hidden');
            setTimeout(() => m.classList.add('modal-active'), 10);
        };

        const closeModal = (m) => {
            if (!m) return;
            m.classList.remove('modal-active');
            setTimeout(() => m.classList.add('hidden'), 200);
        };

        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                [uploadModal, replaceModal, editTopicModal, sectionModal].forEach(closeModal);
            });
        });

        // Top button to open upload topic modal
        document.getElementById('upload-topic-top-btn')?.addEventListener('click', () => {
            document.getElementById('upload-topic-form')?.reset();
            const statusBox = document.getElementById('c-topic-file-status');
            if (statusBox) {
                statusBox.classList.add('hidden');
                statusBox.innerHTML = '';
            }
            openModal(uploadModal);
        });

        // Top & inner buttons to open add section modal
        const openAddSection = () => {
            document.getElementById('section-form')?.reset();
            document.getElementById('sec-id').value = '';
            document.getElementById('section-modal-title').textContent = 'Add Academic Section';
            document.getElementById('sec-submit-text').textContent = 'Create Section';
            openModal(sectionModal);
        };
        document.getElementById('add-section-top-btn')?.addEventListener('click', openAddSection);
        document.getElementById('add-section-inner-btn')?.addEventListener('click', openAddSection);
        document.getElementById('quick-add-section-btn')?.addEventListener('click', () => {
            openAddSection();
        });

        // File input auto-parsing for upload topic modal
        const uploadFileInput = document.getElementById('c-topic-file');
        uploadFileInput?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const statusBox = document.getElementById('c-topic-file-status');
            const questionsInput = document.getElementById('c-topic-questions');

            if (!file) return;

            statusBox.classList.remove('hidden');
            statusBox.className = 'p-3 rounded-xl text-xs font-mono bg-sky-50 text-sky-800 border border-sky-200';
            statusBox.innerHTML = `> Parsing ${file.name}...`;

            try {
                const text = await this.readFileAsText(file);
                const parsed = JSON.parse(text);
                const qCount = this.detectQuestionCount(parsed);

                if (qCount > 0) {
                    questionsInput.value = qCount;
                    statusBox.className = 'p-3 rounded-xl text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200';
                    statusBox.innerHTML = `✓ Valid JSON: Detected ${qCount} question${qCount === 1 ? '' : 's'}. Total questions field has been auto-populated.`;
                } else {
                    statusBox.className = 'p-3 rounded-xl text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200';
                    statusBox.innerHTML = `⚠ Valid JSON, but could not automatically determine question array length. Please enter Total Questions manually.`;
                }
            } catch (err) {
                statusBox.className = 'p-3 rounded-xl text-xs font-mono bg-rose-50 text-rose-800 border border-rose-200';
                statusBox.innerHTML = `❌ JSON Syntax Error: ${err.message}`;
            }
        });

        // File input auto-parsing for replace JSON modal
        const replaceFileInput = document.getElementById('r-topic-file');
        replaceFileInput?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const statusBox = document.getElementById('r-topic-file-status');
            const questionsInput = document.getElementById('r-topic-questions');

            if (!file) return;

            statusBox.classList.remove('hidden');
            statusBox.className = 'p-3 rounded-xl text-xs font-mono bg-sky-50 text-sky-800 border border-sky-200';
            statusBox.innerHTML = `> Parsing ${file.name}...`;

            try {
                const text = await this.readFileAsText(file);
                const parsed = JSON.parse(text);
                const qCount = this.detectQuestionCount(parsed);

                if (qCount > 0) {
                    questionsInput.value = qCount;
                    statusBox.className = 'p-3 rounded-xl text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200';
                    statusBox.innerHTML = `✓ Valid JSON: Detected ${qCount} question${qCount === 1 ? '' : 's'}.`;
                } else {
                    statusBox.className = 'p-3 rounded-xl text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200';
                    statusBox.innerHTML = `⚠ Valid JSON, but could not automatically determine question count. Please verify the question count field.`;
                }
            } catch (err) {
                statusBox.className = 'p-3 rounded-xl text-xs font-mono bg-rose-50 text-rose-800 border border-rose-200';
                statusBox.innerHTML = `❌ JSON Syntax Error: ${err.message}`;
            }
        });

        // Form Submit: Upload Topic Test
        document.getElementById('upload-topic-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleUploadTopic();
        });

        // Form Submit: Replace JSON
        document.getElementById('replace-json-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleReplaceJson();
        });

        // Form Submit: Edit Topic Properties
        document.getElementById('edit-topic-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditTopic();
        });

        // Form Submit: Add / Edit Section
        document.getElementById('section-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSaveSection();
        });

        // Filters for Topic Tests
        const searchTopics = document.getElementById('search-topics');
        const filterSection = document.getElementById('filter-topic-section');
        const filterStatus = document.getElementById('filter-topic-status');
        const filterAccess = document.getElementById('filter-topic-access');

        const applyTopicFilters = () => {
            const q = (searchTopics?.value || '').trim().toLowerCase();
            const sId = filterSection?.value || 'all';
            const status = filterStatus?.value || 'all';
            const access = filterAccess?.value || 'all';

            const sectionMap = this.getSectionMap();

            const filtered = (this.topics || []).filter(topic => {
                const secName = (sectionMap[topic.section_id] || '').toLowerCase();
                const matchQ = !q ||
                    (topic.title || '').toLowerCase().includes(q) ||
                    secName.includes(q) ||
                    (topic.$id || '').toLowerCase().includes(q) ||
                    (topic.file_id || '').toLowerCase().includes(q);

                const matchSec = sId === 'all' || topic.section_id === sId;
                const matchStatus = status === 'all' || topic.status === status;
                const matchAccess = access === 'all' || (access === 'premium' ? topic.is_premium : !topic.is_premium);

                return matchQ && matchSec && matchStatus && matchAccess;
            });

            this.renderTopicsTable(filtered);
        };

        searchTopics?.addEventListener('input', debounce(applyTopicFilters, 200));
        filterSection?.addEventListener('change', applyTopicFilters);
        filterStatus?.addEventListener('change', applyTopicFilters);
        filterAccess?.addEventListener('change', applyTopicFilters);

        // Search for Sections
        const searchSections = document.getElementById('search-sections');
        searchSections?.addEventListener('input', debounce((e) => {
            const q = (e.target.value || '').trim().toLowerCase();
            const filtered = (this.sections || []).filter(sec =>
                (sec.name || '').toLowerCase().includes(q) ||
                (sec.$id || '').toLowerCase().includes(q)
            );
            this.renderSectionsCards(filtered);
        }, 200));
    },

    async loadInitialData() {
        await this.loadSections();
        await this.loadTopics();
    },

    async loadSections() {
        try {
            this.sections = await fetchAllDocuments(CONFIG.databaseId, CONFIG.sectionsCol, [
                Query.orderAsc('name')
            ]);

            // Update badge
            const badge = document.getElementById('badge-sections-count');
            if (badge) badge.textContent = this.sections.length;

            // Populate dropdowns
            this.populateSectionDropdowns();
            this.renderSectionsCards(this.sections);
        } catch (error) {
            console.error("Failed to load sections:", error);
            const container = document.getElementById('sections-cards-container');
            if (container) {
                container.innerHTML = `
                    <div class="col-span-full p-8 text-center text-rose-500 bg-rose-50 rounded-2xl border border-rose-200">
                        <p class="font-bold">Failed to load academic sections</p>
                        <p class="text-xs text-rose-400 mt-1">${error.message || 'Please check Appwrite collection permissions.'}</p>
                    </div>
                `;
            }
        }
    },

    async loadTopics() {
        try {
            this.topics = await fetchAllDocuments(CONFIG.databaseId, CONFIG.masteryTopicsCol, [
                Query.orderDesc('$createdAt')
            ]);

            // Update badge
            const badge = document.getElementById('badge-topics-count');
            if (badge) badge.textContent = this.topics.length;

            this.renderTopicsTable(this.topics);
            // Re-render sections cards to update topic counts
            this.renderSectionsCards(this.sections);
        } catch (error) {
            console.error("Failed to load mastery topics:", error);
            const container = document.getElementById('topics-table-container');
            if (container) {
                container.innerHTML = `
                    <div class="p-8 text-center text-rose-500 bg-rose-50 rounded-2xl border border-rose-200 m-4">
                        <p class="font-bold">Failed to load mastery topics</p>
                        <p class="text-xs text-rose-400 mt-1">${error.message || 'Please check Appwrite collection permissions.'}</p>
                    </div>
                `;
            }
        }
    },

    getSectionMap() {
        const map = {};
        (this.sections || []).forEach(sec => {
            map[sec.$id] = sec.name;
        });
        return map;
    },

    populateSectionDropdowns() {
        const createSelect = document.getElementById('c-topic-section');
        const filterSelect = document.getElementById('filter-topic-section');
        const editSelect = document.getElementById('e-topic-section');

        // Create modal dropdown
        if (createSelect) {
            const currVal = createSelect.value;
            createSelect.innerHTML = '<option value="">-- Select Section --</option>';
            this.sections.forEach(sec => {
                const opt = document.createElement('option');
                opt.value = sec.$id;
                opt.textContent = sec.name;
                createSelect.appendChild(opt);
            });
            if (currVal) createSelect.value = currVal;
        }

        // Filter dropdown
        if (filterSelect) {
            const currVal = filterSelect.value;
            filterSelect.innerHTML = '<option value="all">All Sections</option>';
            this.sections.forEach(sec => {
                const opt = document.createElement('option');
                opt.value = sec.$id;
                opt.textContent = sec.name;
                filterSelect.appendChild(opt);
            });
            if (currVal) filterSelect.value = currVal;
        }

        // Edit modal dropdown
        if (editSelect) {
            const currVal = editSelect.value;
            editSelect.innerHTML = '<option value="">-- Select Section --</option>';
            this.sections.forEach(sec => {
                const opt = document.createElement('option');
                opt.value = sec.$id;
                opt.textContent = sec.name;
                editSelect.appendChild(opt);
            });
            if (currVal) editSelect.value = currVal;
        }
    },

    renderTopicsTable(topics) {
        const container = document.getElementById('topics-table-container');
        if (!container) return;

        if (!topics || topics.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center text-slate-400">
                    <i data-lucide="book-open" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
                    <p class="text-sm font-semibold text-slate-600">No topic mastery tests found</p>
                    <p class="text-xs text-slate-400 mt-0.5">Upload your first topic test JSON using the button above.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const sectionMap = this.getSectionMap();

        let html = `
            <div class="table-responsive-wrapper">
                <table class="min-w-full divide-y divide-slate-100">
                    <thead class="table-header">
                        <tr>
                            <th>Topic Title</th>
                            <th>Section</th>
                            <th>Questions</th>
                            <th>Access & Status</th>
                            <th>JSON File</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
        `;

        topics.forEach(topic => {
            const sectionName = sectionMap[topic.section_id] || 'Unknown Section';
            const status = topic.status || 'published';

            const statusBadge = status === 'published'
                ? '<span class="badge badge-success"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Published</span>'
                : status === 'draft'
                ? '<span class="badge badge-gray"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Draft</span>'
                : '<span class="badge badge-warning"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Archived</span>';

            const accessBadge = topic.is_premium
                ? '<span class="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">👑 Premium</span>'
                : '<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">Free</span>';

            const fileUrl = topic.file_id 
                ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.masteryJsonsBucket}/files/${topic.file_id}/view?project=${CONFIG.projectId}`
                : null;

            html += `
                <tr class="table-row">
                    <!-- Title -->
                    <td class="table-cell">
                        <div class="flex items-start gap-3">
                            <div class="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                                <i data-lucide="target" class="w-4 h-4"></i>
                            </div>
                            <div>
                                <p class="font-bold text-slate-900 text-sm">${topic.title || 'Untitled Topic'}</p>
                                <span class="text-[10px] text-slate-400 font-mono">ID: ${topic.$id}</span>
                            </div>
                        </div>
                    </td>

                    <!-- Section Name -->
                    <td class="table-cell">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="folder" class="w-3.5 h-3.5 text-sky-600"></i>
                            <span class="font-semibold text-xs text-slate-800">${sectionName}</span>
                        </div>
                        <span class="text-[10px] text-slate-400 font-mono">Sec ID: ${topic.section_id || 'None'}</span>
                    </td>

                    <!-- Total Questions -->
                    <td class="table-cell">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 text-xs font-bold">
                            <i data-lucide="help-circle" class="w-3.5 h-3.5 text-sky-600"></i>
                            <span>${topic.total_questions || 0} Questions</span>
                        </span>
                    </td>

                    <!-- Status & Access -->
                    <td class="table-cell">
                        <div class="flex flex-col items-start gap-1.5">
                            ${statusBadge}
                            ${accessBadge}
                        </div>
                    </td>

                    <!-- JSON File -->
                    <td class="table-cell">
                        ${topic.file_id ? `
                            <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition" title="View / Download JSON">
                                <i data-lucide="file-text" class="w-3.5 h-3.5 text-slate-500"></i>
                                <span class="max-w-[100px] truncate">${topic.file_id}</span>
                                <i data-lucide="external-link" class="w-3 h-3 text-slate-400"></i>
                            </a>
                        ` : `
                            <span class="text-[11px] text-slate-400 italic">No file attached</span>
                        `}
                    </td>

                    <!-- Actions -->
                    <td class="table-cell text-right">
                        <div class="flex items-center justify-end gap-1.5">
                            <!-- Replace JSON Button -->
                            <button class="btn-replace-json px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1 transition"
                                data-id="${topic.$id}"
                                data-title="${topic.title || ''}"
                                data-file="${topic.file_id || ''}"
                                data-questions="${topic.total_questions || 0}"
                                title="Upload replacement JSON question bank">
                                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                                <span>Replace JSON</span>
                            </button>

                            <!-- Edit Properties Button -->
                            <button class="btn-edit-topic p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 transition"
                                data-id="${topic.$id}"
                                data-title="${topic.title || ''}"
                                data-section="${topic.section_id || ''}"
                                data-questions="${topic.total_questions || 0}"
                                data-premium="${topic.is_premium}"
                                data-status="${topic.status || 'published'}"
                                title="Edit Topic Properties">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>

                            <!-- Quick Status Toggle -->
                            <button class="btn-toggle-topic-status p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition"
                                data-id="${topic.$id}"
                                data-current-status="${topic.status || 'published'}"
                                title="${topic.status === 'published' ? 'Switch to Draft' : 'Publish Topic'}">
                                <i data-lucide="${topic.status === 'published' ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>
                            </button>

                            <!-- Delete Button -->
                            <button class="btn-delete-topic p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                data-id="${topic.$id}"
                                data-title="${topic.title || ''}"
                                data-file="${topic.file_id || ''}"
                                title="Delete Topic Test">
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

        // Bind table row actions
        // 1. Replace JSON
        container.querySelectorAll('.btn-replace-json').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget;
                const id = b.dataset.id;
                const title = b.dataset.title;
                const fileId = b.dataset.file;
                const qCount = b.dataset.questions;

                document.getElementById('replace-json-form')?.reset();
                document.getElementById('r-topic-id').value = id;
                document.getElementById('r-current-file-id').value = fileId;
                document.getElementById('r-display-file-id').textContent = fileId || 'None';
                document.getElementById('r-display-q-count').textContent = qCount || '0';
                document.getElementById('r-topic-questions').value = qCount || 0;
                document.getElementById('replace-modal-subtitle').textContent = `Target: ${title}`;

                const statusBox = document.getElementById('r-topic-file-status');
                if (statusBox) {
                    statusBox.classList.add('hidden');
                    statusBox.innerHTML = '';
                }

                const modal = document.getElementById('replace-json-modal');
                modal?.classList.remove('hidden');
                setTimeout(() => modal?.classList.add('modal-active'), 10);
            });
        });

        // 2. Edit Properties
        container.querySelectorAll('.btn-edit-topic').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget;
                document.getElementById('e-topic-id').value = b.dataset.id;
                document.getElementById('e-topic-title').value = b.dataset.title;
                document.getElementById('e-topic-section').value = b.dataset.section;
                document.getElementById('e-topic-questions').value = b.dataset.questions;
                document.getElementById('e-topic-premium').checked = b.dataset.premium === 'true';
                document.getElementById('e-topic-status').value = b.dataset.status;

                const modal = document.getElementById('edit-topic-modal');
                modal?.classList.remove('hidden');
                setTimeout(() => modal?.classList.add('modal-active'), 10);
            });
        });

        // 3. Quick Status Toggle
        container.querySelectorAll('.btn-toggle-topic-status').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const b = e.currentTarget;
                const id = b.dataset.id;
                const current = b.dataset.currentStatus;
                const next = current === 'published' ? 'draft' : 'published';

                try {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.masteryTopicsCol, id, {
                        status: next
                    });
                    showToast(`Topic test changed to ${next}`, 'success');
                    await this.loadTopics();
                } catch (err) {
                    showToast(err.message || 'Failed to toggle status', 'error');
                }
            });
        });

        // 4. Delete Topic Test
        container.querySelectorAll('.btn-delete-topic').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const b = e.currentTarget;
                const id = b.dataset.id;
                const title = b.dataset.title;
                const fileId = b.dataset.file;

                if (confirm(`Are you sure you want to delete topic test "${title}"? This cannot be undone.`)) {
                    try {
                        // Delete document
                        await databases.deleteDocument(CONFIG.databaseId, CONFIG.masteryTopicsCol, id);

                        // Optionally delete storage file if present
                        if (fileId) {
                            try {
                                await storage.deleteFile(CONFIG.masteryJsonsBucket, fileId);
                            } catch (storageErr) {
                                console.warn("Failed to delete storage file on topic delete:", storageErr);
                            }
                        }

                        showToast("Topic test deleted successfully", "success");
                        await this.loadTopics();
                    } catch (err) {
                        showToast(err.message || "Failed to delete topic test", "error");
                    }
                }
            });
        });
    },

    renderSectionsCards(sections) {
        const container = document.getElementById('sections-cards-container');
        if (!container) return;

        if (!sections || sections.length === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80">
                    <i data-lucide="folder-plus" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
                    <p class="text-sm font-bold text-slate-700">No academic sections created yet</p>
                    <p class="text-xs text-slate-400 mt-0.5">Create sections (e.g. Mathematics, English, Analytical) to categorize topic tests.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        // Count topics per section
        const topicCounts = {};
        (this.topics || []).forEach(t => {
            if (t.section_id) {
                topicCounts[t.section_id] = (topicCounts[t.section_id] || 0) + 1;
            }
        });

        container.innerHTML = sections.map(sec => {
            const count = topicCounts[sec.$id] || 0;
            return `
                <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between gap-3 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                                <i data-lucide="folder" class="w-5 h-5"></i>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700">
                                ${count} ${count === 1 ? 'Test' : 'Tests'}
                            </span>
                        </div>

                        <h3 class="text-base font-extrabold text-slate-900">${sec.name}</h3>
                        <p class="text-[11px] font-mono text-slate-400 mt-1">ID: ${sec.$id}</p>
                    </div>

                    <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button class="btn-filter-by-sec text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1" data-id="${sec.$id}">
                            <span>View Tests</span>
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                        </button>
                        <div class="flex items-center gap-1">
                            <button class="btn-edit-sec p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition"
                                data-id="${sec.$id}"
                                data-name="${sec.name}"
                                title="Rename Section">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button class="btn-delete-sec p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                data-id="${sec.$id}"
                                data-name="${sec.name}"
                                data-count="${count}"
                                title="Delete Section">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();

        // Bind Section Actions
        // 1. View Tests of this Section
        container.querySelectorAll('.btn-filter-by-sec').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const secId = e.currentTarget.dataset.id;
                const tabTopics = document.getElementById('tab-btn-topics');
                tabTopics?.click();

                const filterSel = document.getElementById('filter-topic-section');
                if (filterSel) {
                    filterSel.value = secId;
                    filterSel.dispatchEvent(new Event('change'));
                }
            });
        });

        // 2. Edit Section Name
        container.querySelectorAll('.btn-edit-sec').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget;
                document.getElementById('sec-id').value = b.dataset.id;
                document.getElementById('sec-name').value = b.dataset.name;
                document.getElementById('section-modal-title').textContent = 'Edit Academic Section';
                document.getElementById('sec-submit-text').textContent = 'Save Changes';

                const modal = document.getElementById('section-modal');
                modal?.classList.remove('hidden');
                setTimeout(() => modal?.classList.add('modal-active'), 10);
            });
        });

        // 3. Delete Section
        container.querySelectorAll('.btn-delete-sec').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const b = e.currentTarget;
                const id = b.dataset.id;
                const name = b.dataset.name;
                const count = parseInt(b.dataset.count) || 0;

                if (count > 0) {
                    if (!confirm(`Warning: Section "${name}" has ${count} topic test(s) linked to it. Deleting this section will leave those tests without a section. Proceed anyway?`)) {
                        return;
                    }
                } else {
                    if (!confirm(`Are you sure you want to delete section "${name}"?`)) {
                        return;
                    }
                }

                try {
                    await databases.deleteDocument(CONFIG.databaseId, CONFIG.sectionsCol, id);
                    showToast("Section deleted successfully", "success");
                    await this.loadSections();
                } catch (err) {
                    showToast(err.message || "Failed to delete section", "error");
                }
            });
        });
    },

    // Handlers
    async handleUploadTopic() {
        const btn = document.getElementById('c-topic-submit-btn');
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Uploading to Appwrite...</span>`;

        try {
            const sectionId = document.getElementById('c-topic-section').value;
            const title = document.getElementById('c-topic-title').value.trim();
            const totalQuestions = parseInt(document.getElementById('c-topic-questions').value) || 0;
            const status = document.getElementById('c-topic-status').value;
            const isPremium = document.querySelector('input[name="c-topic-access"]:checked').value === 'premium';
            const fileInput = document.getElementById('c-topic-file');

            if (!sectionId) throw new Error("Please select an academic section.");
            if (!title) throw new Error("Please provide a topic title.");
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                throw new Error("Please select a valid JSON file to upload.");
            }

            const file = fileInput.files[0];

            // 1. Upload file to Appwrite Storage bucket 'mastery_jsons'
            const sanitizedFileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}_${Date.now()}.json`;
            const fileToUpload = new File([file], sanitizedFileName, { type: 'application/json' });
            const uploadRes = await storage.createFile(CONFIG.masteryJsonsBucket, ID.unique(), fileToUpload);
            const fileId = uploadRes.$id;

            // 2. Create document in 'mastery_topics'
            await databases.createDocument(CONFIG.databaseId, CONFIG.masteryTopicsCol, ID.unique(), {
                title: title,
                section_id: sectionId,
                file_id: fileId,
                total_questions: totalQuestions,
                is_premium: isPremium,
                status: status
            });

            showToast("Topic test uploaded and registered successfully!", "success");

            // Close modal
            const modal = document.getElementById('upload-topic-modal');
            modal?.classList.remove('modal-active');
            setTimeout(() => modal?.classList.add('hidden'), 200);

            // Reload data
            await this.loadTopics();

        } catch (err) {
            console.error("Upload topic error:", err);
            showToast(err.message || "Failed to upload topic test", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="upload-cloud" class="w-4 h-4"></i><span>Upload & Save Topic Test</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    },

    async handleReplaceJson() {
        const btn = document.getElementById('r-submit-btn');
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Replacing File...</span>`;

        try {
            const topicId = document.getElementById('r-topic-id').value;
            const oldFileId = document.getElementById('r-current-file-id').value;
            const totalQuestions = parseInt(document.getElementById('r-topic-questions').value) || 0;
            const fileInput = document.getElementById('r-topic-file');

            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                throw new Error("Please select a new JSON file.");
            }

            const file = fileInput.files[0];

            // 1. Upload new file to mastery_jsons
            const sanitizedFileName = `topic_${topicId.slice(0, 10)}_${Date.now()}.json`;
            const fileToUpload = new File([file], sanitizedFileName, { type: 'application/json' });
            const uploadRes = await storage.createFile(CONFIG.masteryJsonsBucket, ID.unique(), fileToUpload);
            const newFileId = uploadRes.$id;

            // 2. Update document in mastery_topics
            await databases.updateDocument(CONFIG.databaseId, CONFIG.masteryTopicsCol, topicId, {
                file_id: newFileId,
                total_questions: totalQuestions
            });

            // 3. Delete old file if present
            if (oldFileId) {
                try {
                    await storage.deleteFile(CONFIG.masteryJsonsBucket, oldFileId);
                } catch (delErr) {
                    console.warn("Could not delete old file from bucket:", delErr);
                }
            }

            showToast("JSON file replaced and question count updated!", "success");

            // Close modal
            const modal = document.getElementById('replace-json-modal');
            modal?.classList.remove('modal-active');
            setTimeout(() => modal?.classList.add('hidden'), 200);

            await this.loadTopics();

        } catch (err) {
            console.error("Replace JSON error:", err);
            showToast(err.message || "Failed to replace JSON file", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Save & Replace File</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    },

    async handleEditTopic() {
        const btn = document.getElementById('e-topic-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const topicId = document.getElementById('e-topic-id').value;
            const title = document.getElementById('e-topic-title').value.trim();
            const sectionId = document.getElementById('e-topic-section').value;
            const totalQuestions = parseInt(document.getElementById('e-topic-questions').value) || 0;
            const isPremium = document.getElementById('e-topic-premium').checked;
            const status = document.getElementById('e-topic-status').value;

            if (!title) throw new Error("Title is required.");
            if (!sectionId) throw new Error("Academic section is required.");

            await databases.updateDocument(CONFIG.databaseId, CONFIG.masteryTopicsCol, topicId, {
                title: title,
                section_id: sectionId,
                total_questions: totalQuestions,
                is_premium: isPremium,
                status: status
            });

            showToast("Topic test properties updated!", "success");

            // Close modal
            const modal = document.getElementById('edit-topic-modal');
            modal?.classList.remove('modal-active');
            setTimeout(() => modal?.classList.add('hidden'), 200);

            await this.loadTopics();

        } catch (err) {
            console.error("Edit topic error:", err);
            showToast(err.message || "Failed to update topic properties", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    },

    async handleSaveSection() {
        const btn = document.getElementById('sec-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const id = document.getElementById('sec-id').value;
            const name = document.getElementById('sec-name').value.trim();

            if (!name) throw new Error("Section name is required.");

            if (id) {
                // Update
                await databases.updateDocument(CONFIG.databaseId, CONFIG.sectionsCol, id, {
                    name: name
                });
                showToast("Section updated successfully!", "success");
            } else {
                // Create
                await databases.createDocument(CONFIG.databaseId, CONFIG.sectionsCol, ID.unique(), {
                    name: name
                });
                showToast("Section created successfully!", "success");
            }

            // Close modal
            const modal = document.getElementById('section-modal');
            modal?.classList.remove('modal-active');
            setTimeout(() => modal?.classList.add('hidden'), 200);

            await this.loadSections();
            await this.loadTopics();

        } catch (err) {
            console.error("Save section error:", err);
            showToast(err.message || "Failed to save section", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span id="sec-submit-text">Create Section</span>`;
        }
    },

    // Utilities
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    },

    detectQuestionCount(parsed) {
        if (!parsed) return 0;
        if (Array.isArray(parsed)) return parsed.length;
        if (Array.isArray(parsed.questions)) return parsed.questions.length;
        if (Array.isArray(parsed.mcqs)) return parsed.mcqs.length;
        if (Array.isArray(parsed.data)) return parsed.data.length;
        if (typeof parsed.total_questions === 'number') return parsed.total_questions;
        return 0;
    }
};
