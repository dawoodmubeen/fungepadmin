import { databases, storage, CONFIG, Query, ID, Permission, Role } from '../appwrite/config.js';
import { authService } from '../services/authService.js';
import { showToast } from '../components/toast.js';
import { fetchAllDocuments, filterAndPaginate, debounce } from '../utils/dbHelper.js';

export const pastPapersController = {
    async render(container, args) {
        if (args && args.length > 0 && args[0] === 'new') {
            await this.renderForm(container, null);
        } else if (args && args.length > 0 && args[0] === 'edit' && args[1]) {
            await this.renderForm(container, args[1]);
        } else {
            await this.renderList(container);
        }
    },

    async renderList(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Action Bar -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Past Papers & Digital Drive</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">PDF & Drive Vault</span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Upload verified previous entrance exam PDFs and configure global Google Drive access links.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button id="configure-drive-btn" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition flex items-center gap-2">
                            <i data-lucide="hard-drive" class="w-4 h-4"></i>
                            <span>Drive Links</span>
                        </button>
                        <a href="#past-papers/new" class="btn-primary">
                            <i data-lucide="upload" class="w-4 h-4"></i>
                            <span>Upload Past Paper</span>
                        </a>
                    </div>
                </div>

                <!-- Filters -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div class="relative flex-1 w-full md:max-w-md">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="search-paper" placeholder="Search by paper title, university, or subject..." class="form-input pl-10 text-xs sm:text-sm">
                    </div>
                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <select id="filter-paper-access" class="form-input text-xs sm:text-sm py-2">
                            <option value="all">All Access</option>
                            <option value="premium">Premium Locked Only</option>
                            <option value="free">Free Access Only</option>
                        </select>
                    </div>
                </div>

                <!-- Papers Table -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div class="table-responsive-wrapper">
                        <table class="min-w-full divide-y divide-slate-100">
                            <thead class="table-header">
                                <tr>
                                    <th>Paper Title</th>
                                    <th>University & Test</th>
                                    <th>Year & Subject</th>
                                    <th>Access Lock</th>
                                    <th>Status</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="papers-tbody" class="divide-y divide-slate-100 bg-white">
                                <tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading papers...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <button id="prev-paper-page" class="btn-secondary text-xs" disabled>Previous</button>
                        <span id="paper-page-info" class="text-xs font-bold text-slate-600">Page 1</span>
                        <button id="next-paper-page" class="btn-secondary text-xs">Next</button>
                    </div>
                </div>
            </div>

            <!-- PDF Viewer Modal -->
            <div id="pdf-preview-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 id="pdf-modal-title" class="text-sm font-bold text-slate-900">PDF Document Inspection</h3>
                        <button id="close-pdf-modal" class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <div class="flex-1 p-0 relative bg-slate-100">
                        <iframe id="pdf-iframe" class="w-full h-full border-0" src=""></iframe>
                    </div>
                </div>
            </div>

            <!-- Drive Links Configurator Modal -->
            <div id="drive-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden modal-overlay">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg modal-content overflow-hidden border border-slate-100">
                    <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-2">
                            <i data-lucide="hard-drive" class="w-5 h-5 text-sky-600"></i>
                            <h3 class="text-base font-bold text-slate-900">Digital Drive Link Configurator</h3>
                        </div>
                        <button id="close-drive-modal" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <form id="drive-config-form" class="p-6 space-y-4">
                        <p class="text-xs text-slate-500">Update global Google Drive cloud repository URLs accessed by student dashboards.</p>
                        <div>
                            <label class="form-label">Free Tier Google Drive Folder Link</label>
                            <input type="url" id="drive-free-url" placeholder="https://drive.google.com/drive/folders/..." class="form-input text-xs">
                        </div>
                        <div>
                            <label class="form-label">Premium Master Google Drive Folder Link</label>
                            <input type="url" id="drive-premium-url" placeholder="https://drive.google.com/drive/folders/..." class="form-input text-xs">
                        </div>
                        <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" id="cancel-drive-btn" class="btn-secondary">Cancel</button>
                            <button type="submit" class="btn-primary">Save Drive Links</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        this.currentPage = 1;
        this.limit = 20;
        this.allPapers = [];
        this.accessFilter = 'all';

        await this.loadAllPapers();
        this.setupEvents();
    },

    async loadAllPapers() {
        const tbody = document.getElementById('papers-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading past papers from database...</td></tr>`;
        }

        try {
            this.allPapers = await fetchAllDocuments(CONFIG.databaseId, CONFIG.pastPapersCol, [
                Query.orderDesc('$createdAt')
            ]);
            this.applyFilterAndRender();
        } catch (error) {
            console.error("Failed to load past papers:", error);
            showToast("Failed to load past papers", "error");
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-rose-500 text-xs font-semibold">Error loading past papers.</td></tr>`;
            }
        }
    },

    applyFilterAndRender() {
        const searchInput = document.getElementById('search-paper');
        const filterAccess = document.getElementById('filter-paper-access');

        const q = searchInput?.value || '';
        const accessVal = filterAccess?.value || 'all';

        const filterFn = (p) => {
            if (accessVal === 'premium' && !p.is_premium) return false;
            if (accessVal === 'free' && p.is_premium) return false;
            return true;
        };

        const searchFields = [
            'title',
            'university_name',
            'subject',
            'exam_type',
            'year'
        ];

        const result = filterAndPaginate(this.allPapers, {
            searchQuery: q,
            searchFields,
            filterFn,
            page: this.currentPage,
            limit: this.limit
        });

        this.renderTableRows(result.items);

        const pageInfo = document.getElementById('paper-page-info');
        if (pageInfo) {
            pageInfo.textContent = result.total > 0
                ? `Page ${result.currentPage} of ${result.totalPages} (Showing ${result.startIndex}–${result.endIndex} of ${result.total} papers)`
                : 'No matching papers found';
        }

        const prevBtn = document.getElementById('prev-paper-page');
        if (prevBtn) prevBtn.disabled = !result.hasPrev;

        const nextBtn = document.getElementById('next-paper-page');
        if (nextBtn) nextBtn.disabled = !result.hasNext;
    },

    setupEvents() {
        const searchInput = document.getElementById('search-paper');
        const filterAccess = document.getElementById('filter-paper-access');

        const onFilterChange = () => {
            this.currentPage = 1;
            this.applyFilterAndRender();
        };

        searchInput?.addEventListener('input', debounce(() => onFilterChange(), 200));
        filterAccess?.addEventListener('change', onFilterChange);

        document.getElementById('prev-paper-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.applyFilterAndRender();
            }
        });

        document.getElementById('next-paper-page')?.addEventListener('click', () => {
            this.currentPage++;
            this.applyFilterAndRender();
        });

        // PDF Modal
        const pdfModal = document.getElementById('pdf-preview-modal');
        document.getElementById('close-pdf-modal')?.addEventListener('click', () => {
            pdfModal.classList.remove('modal-active');
            setTimeout(() => {
                pdfModal.classList.add('hidden');
                document.getElementById('pdf-iframe').src = '';
            }, 200);
        });

        // Drive Modal
        const driveModal = document.getElementById('drive-modal');
        document.getElementById('configure-drive-btn')?.addEventListener('click', () => {
            document.getElementById('drive-free-url').value = localStorage.getItem('fungep_free_drive') || '';
            document.getElementById('drive-premium-url').value = localStorage.getItem('fungep_premium_drive') || '';
            driveModal.classList.remove('hidden');
            setTimeout(() => driveModal.classList.add('modal-active'), 10);
        });

        const closeDrive = () => {
            driveModal.classList.remove('modal-active');
            setTimeout(() => driveModal.classList.add('hidden'), 200);
        };
        document.getElementById('close-drive-modal')?.addEventListener('click', closeDrive);
        document.getElementById('cancel-drive-btn')?.addEventListener('click', closeDrive);

        document.getElementById('drive-config-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const free = document.getElementById('drive-free-url').value.trim();
            const prem = document.getElementById('drive-premium-url').value.trim();
            localStorage.setItem('fungep_free_drive', free);
            localStorage.setItem('fungep_premium_drive', prem);
            showToast("Global Drive links saved!", "success");
            closeDrive();
        });
    },

    renderTableRows(data) {
        const tbody = document.getElementById('papers-tbody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">No past papers found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(paper => `
            <tr class="table-row">
                <td class="table-cell">
                    <p class="font-bold text-slate-900 text-sm">${paper.title}</p>
                    <span class="text-[10px] text-slate-400 font-mono">ID: ${paper.$id}</span>
                </td>
                <td class="table-cell text-xs">
                    <p class="font-semibold text-slate-800">${paper.university_name || 'Generic'}</p>
                    <p class="text-slate-400">${paper.test_name || ''}</p>
                </td>
                <td class="table-cell text-xs text-slate-600">
                    <span class="font-bold text-slate-800">${paper.year}</span> • ${paper.subject || 'All Subjects'}
                </td>
                <td class="table-cell">
                    <span class="badge ${paper.is_premium ? 'badge-warning' : 'badge-success'} text-xs">
                        ${paper.is_premium ? '👑 Premium' : 'Free Access'}
                    </span>
                </td>
                <td class="table-cell">
                    <span class="badge ${paper.status === 'published' ? 'badge-success' : 'badge-gray'} text-xs capitalize">
                        ${paper.status || 'published'}
                    </span>
                </td>
                <td class="table-cell text-right">
                    <div class="flex items-center justify-end gap-2">
                        ${paper.file_id ? `
                            <button class="btn-preview-pdf px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                                data-file="${paper.file_id}"
                                data-title="${paper.title}">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                <span>Preview</span>
                            </button>
                        ` : ''}
                        <a href="#past-papers/edit/${paper.$id}" class="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition">
                            Edit
                        </a>
                    </div>
                </td>
            </tr>
        `).join('');

        if (window.lucide) window.lucide.createIcons();

        // Bind Preview
        tbody.querySelectorAll('.btn-preview-pdf').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget;
                const fileId = b.dataset.file;
                const title = b.dataset.title;
                const url = `${CONFIG.endpoint}/storage/buckets/${CONFIG.pastPapersBucket}/files/${fileId}/view?project=${CONFIG.projectId}`;

                document.getElementById('pdf-modal-title').textContent = title;
                document.getElementById('pdf-iframe').src = url;

                const modal = document.getElementById('pdf-preview-modal');
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('modal-active'), 10);
            });
        });
    },

    async renderForm(container, id) {
        let paper = { 
            title: '', university_id: '', university_name: '', test_name: '', 
            year: new Date().getFullYear(), subject: '', is_premium: false, status: 'published', file_id: '' 
        };
        let isEdit = false;

        container.innerHTML = `<div class="p-12 text-center text-slate-400 text-xs font-semibold uppercase">Loading form...</div>`;

        let universities = [];
        try {
            const uniRes = await databases.listDocuments(CONFIG.databaseId, CONFIG.universitiesCol, [Query.limit(100)]);
            universities = uniRes.documents;
        } catch (e) {}

        if (id) {
            try {
                paper = await databases.getDocument(CONFIG.databaseId, CONFIG.pastPapersCol, id);
                isEdit = true;
            } catch (err) {
                showToast("Failed to load paper", "error");
                window.location.hash = '#past-papers';
                return;
            }
        }

        container.innerHTML = `
            <div class="max-w-3xl mx-auto space-y-6">
                <div class="flex items-center justify-between">
                    <a href="#past-papers" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        <span>Back to Past Papers</span>
                    </a>
                    <span class="text-xs font-bold text-slate-400">${isEdit ? 'Edit Paper' : 'Upload New Paper'}</span>
                </div>

                <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
                    <h2 class="text-lg font-bold text-slate-900 mb-6">${isEdit ? 'Edit Past Paper Properties' : 'Upload Past Paper PDF'}</h2>

                    <form id="paper-form" class="space-y-4">
                        <div>
                            <label class="form-label">Paper Title *</label>
                            <input type="text" id="p-title" required value="${paper.title || ''}" placeholder="e.g. FAST NUCES 2024 Past Examination Paper" class="form-input">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Associated University *</label>
                                <select id="p-uni" required class="form-input">
                                    <option value="">Select University</option>
                                    ${universities.map(u => `<option value="${u.$id}" data-name="${u.name || u.short_name}" ${paper.university_id === u.$id ? 'selected' : ''}>${u.name || u.short_name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="form-label">Test Name</label>
                                <input type="text" id="p-test" value="${paper.test_name || ''}" placeholder="e.g. NET, NU-Test" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Examination Year *</label>
                                <input type="number" id="p-year" required value="${paper.year || 2024}" min="2000" max="2030" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Subject / Faculty</label>
                                <input type="text" id="p-subject" value="${paper.subject || ''}" placeholder="e.g. CS & Engineering" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Publish Status</label>
                                <select id="p-status" class="form-input">
                                    <option value="published" ${paper.status === 'published' ? 'selected' : ''}>Published</option>
                                    <option value="draft" ${paper.status === 'draft' ? 'selected' : ''}>Draft</option>
                                    <option value="archived" ${paper.status === 'archived' ? 'selected' : ''}>Archived</option>
                                </select>
                            </div>
                            <div class="pt-6 flex items-center gap-2">
                                <input type="checkbox" id="p-premium" class="w-4 h-4 text-sky-600 rounded" ${paper.is_premium ? 'checked' : ''}>
                                <label for="p-premium" class="text-xs font-bold text-amber-800">Lock for Premium Students Only 👑</label>
                            </div>
                        </div>

                        <!-- PDF File Input -->
                        <div class="pt-4 border-t border-slate-100">
                            <label class="form-label">PDF File Document ${isEdit ? '(Leave empty to preserve existing file)' : '*'}</label>
                            <input type="file" id="p-file" accept="application/pdf" class="form-input text-xs" ${!isEdit ? 'required' : ''}>
                            ${isEdit && paper.file_id ? `<p class="text-xs text-emerald-600 mt-1 font-semibold">✓ Existing PDF attached (ID: ${paper.file_id})</p>` : ''}
                        </div>

                        <div class="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                            <a href="#past-papers" class="btn-secondary">Cancel</a>
                            <button type="submit" id="p-submit-btn" class="btn-primary">
                                <span>Save Past Paper</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        document.getElementById('paper-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('p-submit-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                let fileId = paper.file_id;
                const fileInput = document.getElementById('p-file');

                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const upRes = await storage.createFile(CONFIG.pastPapersBucket, ID.unique(), file);
                    fileId = upRes.$id;
                }

                const uniSelect = document.getElementById('p-uni');
                const uniName = uniSelect.options[uniSelect.selectedIndex].getAttribute('data-name');

                const payload = {
                    title: document.getElementById('p-title').value.trim(),
                    university_id: uniSelect.value,
                    university_name: uniName,
                    test_name: document.getElementById('p-test').value.trim(),
                    year: parseInt(document.getElementById('p-year').value) || 2024,
                    subject: document.getElementById('p-subject').value.trim(),
                    is_premium: document.getElementById('p-premium').checked,
                    status: document.getElementById('p-status').value,
                    file_id: fileId
                };

                if (isEdit) {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.pastPapersCol, id, payload);
                    showToast("Past paper updated successfully", "success");
                } else {
                    await databases.createDocument(CONFIG.databaseId, CONFIG.pastPapersCol, ID.unique(), payload);
                    showToast("Past paper uploaded successfully", "success");
                }

                window.location.hash = '#past-papers';

            } catch (err) {
                console.error(err);
                showToast(err.message || "Failed to save paper", "error");
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Past Paper';
            }
        });
    }
};
