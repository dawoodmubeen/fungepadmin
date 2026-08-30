import { databases, storage, CONFIG, Query, ID, Permission, Role } from '../appwrite/config.js';
import { authService } from '../services/authService.js';
import { showToast } from '../components/toast.js';

export const pastPapersController = {
    async render(container, args) {
        if (args.length > 0 && args[0] === 'new') {
            this.renderForm(container, null);
        } else if (args.length > 0 && args[0] === 'edit' && args[1]) {
            this.renderForm(container, args[1]);
        } else {
            this.renderList(container);
        }
    },

    async renderList(container) {
        container.innerHTML = `
            <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">Past Papers</h2>
                    <p class="text-sm text-gray-500">Manage past paper PDFs.</p>
                </div>
                <a href="#past-papers/new" class="btn-primary inline-flex items-center">
                    <i data-lucide="upload" class="w-4 h-4 mr-2"></i> Upload Paper
                </a>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <div class="relative flex-1 max-w-md">
                        <i data-lucide="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"></i>
                        <input type="text" id="search-paper" placeholder="Search by title, subject..." class="form-input pl-9">
                    </div>
                </div>
                
                <div class="table-container">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 table-header">
                            <tr>
                                <th>Title</th>
                                <th>University / Test</th>
                                <th>Year & Subject</th>
                                <th>Access</th>
                                <th>Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="papers-tbody" class="bg-white divide-y divide-gray-200">
                            <tr><td colspan="6" class="text-center py-8 text-gray-500">Loading past papers...</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <button id="prev-page" class="btn-secondary" disabled>Previous</button>
                    <span id="page-info" class="text-sm text-gray-600">Page 1</span>
                    <button id="next-page" class="btn-secondary">Next</button>
                </div>
            </div>
            
            <div id="pdf-preview-modal" class="fixed inset-0 z-[100] flex items-center justify-center modal-overlay">
                <div class="absolute inset-0 bg-gray-900 bg-opacity-75"></div>
                <div class="bg-white rounded-xl shadow-2xl overflow-hidden z-10 w-full max-w-5xl h-[90vh] flex flex-col modal-content">
                    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h3 id="pdf-modal-title" class="text-lg font-bold text-gray-900">PDF Preview</h3>
                        <button id="close-pdf-modal" class="text-gray-400 hover:text-gray-600 focus:outline-none">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                    <div class="flex-1 p-0 relative" id="pdf-container">
                        <iframe id="pdf-iframe" class="w-full h-full border-0" src=""></iframe>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        this.currentPage = 1;
        this.papers = [];
        this.limit = 20;
        
        await this.loadPage(1);

        document.getElementById('search-paper').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = this.papers.filter(p => 
                (p.title && p.title.toLowerCase().includes(q)) || 
                (p.subject && p.subject.toLowerCase().includes(q)) ||
                (p.university_name && p.university_name.toLowerCase().includes(q))
            );
            this.renderTableRows(document.getElementById('papers-tbody'), filtered);
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

        // Modal Close
        const modal = document.getElementById('pdf-preview-modal');
        document.getElementById('close-pdf-modal').addEventListener('click', () => {
            modal.classList.remove('modal-active');
            document.getElementById('pdf-iframe').src = '';
        });
    },

    async loadPage(page) {
        try {
            const queries = [
                Query.orderDesc('$createdAt'),
                Query.limit(this.limit),
                Query.offset((page - 1) * this.limit)
            ];
            
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.pastPapersCol, queries);
            this.papers = res.documents;
            
            const tbody = document.getElementById('papers-tbody');
            if (this.papers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No past papers found.</td></tr>`;
            } else {
                this.renderTableRows(tbody, this.papers);
            }
            
            document.getElementById('page-info').textContent = `Page ${page}`;
            document.getElementById('prev-page').disabled = page === 1;
            document.getElementById('next-page').disabled = this.papers.length < this.limit;
            
        } catch (error) {
            console.error(error);
            showToast("Failed to load past papers", "error");
        }
    },

    renderTableRows(tbody, data) {
        tbody.innerHTML = data.map(doc => `
            <tr class="table-row">
                <td class="table-cell">
                    <p class="font-medium text-gray-900">${doc.title}</p>
                </td>
                <td class="table-cell">
                    <p class="text-sm text-gray-900">${doc.university_name}</p>
                    <p class="text-xs text-gray-500">${doc.test_name}</p>
                </td>
                <td class="table-cell text-gray-500">
                    ${doc.year} • ${doc.subject}
                </td>
                <td class="table-cell">
                    <span class="badge ${doc.is_premium ? 'badge-warning' : 'badge-success'}">
                        ${doc.is_premium ? 'Premium' : 'Free'}
                    </span>
                </td>
                <td class="table-cell">
                    <span class="badge ${doc.status === 'published' ? 'badge-success' : 'badge-gray'} capitalize">
                        ${doc.status}
                    </span>
                </td>
                <td class="table-cell text-right space-x-3">
                    <button onclick="window.previewPdf('${doc.file_id}', '${doc.title.replace(/'/g, "\\'")}')" class="text-gray-500 hover:text-gray-700 text-sm font-medium">
                        Preview
                    </button>
                    <a href="#past-papers/edit/${doc.$id}" class="text-primary hover:text-secondary text-sm font-medium">
                        Edit
                    </a>
                </td>
            </tr>
        `).join('');
        
        window.previewPdf = (fileId, title) => {
            const url = `${CONFIG.endpoint}/storage/buckets/${CONFIG.pastPapersBucket}/files/${fileId}/view?project=${CONFIG.projectId}`;
            document.getElementById('pdf-modal-title').textContent = title;
            document.getElementById('pdf-iframe').src = url;
            document.getElementById('pdf-preview-modal').classList.add('modal-active');
        };
    },

    async renderForm(container, id) {
        let paper = { 
            title: '', university_id: '', test_id: '', university_name: '', test_name: '', 
            year: new Date().getFullYear(), subject: '', is_premium: false, status: 'draft', file_id: '' 
        };
        let isEdit = false;

        container.innerHTML = `<div class="p-8 text-center text-gray-500">Loading form...</div>`;

        let universities = [];
        try {
            const uniRes = await databases.listDocuments(CONFIG.databaseId, CONFIG.universitiesCol, [Query.limit(100), Query.equal('active', true)]);
            universities = uniRes.documents;
        } catch(e) {}

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

        const currentUrl = paper.file_id ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.pastPapersBucket}/files/${paper.file_id}/view?project=${CONFIG.projectId}` : '';

        container.innerHTML = `
            <div class="mb-6 flex items-center">
                <a href="#past-papers" class="text-gray-500 hover:text-gray-700 mr-4">
                    <i data-lucide="arrow-left" class="w-5 h-5"></i>
                </a>
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">${isEdit ? 'Edit Past Paper' : 'Upload Past Paper'}</h2>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <form id="paper-form" class="p-6 space-y-6">
                            <div>
                                <label class="form-label">Title *</label>
                                <input type="text" id="p-title" class="form-input" required value="${paper.title}">
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="form-label">University *</label>
                                    <select id="p-uni" class="form-input" required>
                                        <option value="">Select University</option>
                                        ${universities.map(u => `<option value="${u.$id}" data-name="${u.name}" ${paper.university_id === u.$id ? 'selected' : ''}>${u.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label">Test Name *</label>
                                    <input type="text" id="p-test" class="form-input" required value="${paper.test_name}" placeholder="e.g. NET, NTS">
                                </div>
                                <div>
                                    <label class="form-label">Year *</label>
                                    <input type="number" id="p-year" class="form-input" required value="${paper.year}">
                                </div>
                                <div>
                                    <label class="form-label">Subject *</label>
                                    <input type="text" id="p-subject" class="form-input" required value="${paper.subject}">
                                </div>
                                <div>
                                    <label class="form-label">Status</label>
                                    <select id="p-status" class="form-input">
                                        <option value="draft" ${paper.status === 'draft' ? 'selected' : ''}>Draft</option>
                                        <option value="published" ${paper.status === 'published' ? 'selected' : ''}>Published</option>
                                    </select>
                                </div>
                                <div class="flex items-center">
                                    <label class="flex items-center space-x-2 mt-6 cursor-pointer">
                                        <input type="checkbox" id="p-premium" class="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" ${paper.is_premium ? 'checked' : ''}>
                                        <span class="text-sm font-medium text-gray-700">Premium Paper</span>
                                    </label>
                                </div>
                            </div>

                            <div class="pt-6">
                                <label class="form-label">PDF File ${isEdit ? '(Leave empty to keep current)' : '*'}</label>
                                <input type="file" id="p-file" class="form-input" accept="application/pdf" ${!isEdit ? 'required' : ''}>
                                ${isEdit && paper.file_id ? `<p class="text-sm text-green-600 mt-2"><i data-lucide="check-circle" class="inline w-4 h-4 mr-1"></i> Has existing file</p>` : ''}
                            </div>
                            
                            <div class="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <a href="#past-papers" class="btn-secondary">Cancel</a>
                                <button type="submit" class="btn-primary" id="save-btn">Save Paper</button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="lg:col-span-1">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px] flex flex-col">
                        <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h3 class="text-sm font-bold text-gray-900">PDF Preview</h3>
                        </div>
                        <div class="flex-1 bg-gray-100 relative">
                            ${currentUrl ? `<iframe src="${currentUrl}" class="w-full h-full border-0"></iframe>` : `<div class="absolute inset-0 flex items-center justify-center text-gray-400">No PDF selected</div>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        document.getElementById('paper-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-btn');
            btn.disabled = true;
            btn.textContent = 'Uploading...';

            try {
                let fileId = paper.file_id;
                const fileInput = document.getElementById('p-file');
                
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    if (file.type !== 'application/pdf') throw new Error("Only PDF files are allowed");
                    const permissions = [
                        Permission.read(Role.any()),
                        Permission.update(Role.team('6a11fc7200202af19f62')),
                        Permission.delete(Role.team('6a11fc7200202af19f62'))
                    ];
                    const upRes = await storage.createFile(CONFIG.pastPapersBucket, ID.unique(), file, permissions);
                    fileId = upRes.$id;
                }

                const uniSelect = document.getElementById('p-uni');
                const uniName = uniSelect.options[uniSelect.selectedIndex].getAttribute('data-name');
                const user = await authService.getCurrentUser();

                const data = {
                    title: document.getElementById('p-title').value,
                    university_id: uniSelect.value,
                    university_name: uniName,
                    test_id: document.getElementById('p-test').value, // In fungepweb, test_name and test_id might be similar
                    test_name: document.getElementById('p-test').value,
                    year: parseInt(document.getElementById('p-year').value),
                    subject: document.getElementById('p-subject').value,
                    is_premium: document.getElementById('p-premium').checked,
                    status: document.getElementById('p-status').value,
                    file_id: fileId,
                    updated_at: new Date().toISOString()
                };

                if (isEdit) {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.pastPapersCol, id, data);
                    showToast("Paper updated", "success");
                } else {
                    data.created_at = new Date().toISOString();
                    data.uploaded_by = user.$id;
                    const permissions = [
                        Permission.read(Role.any()),
                        Permission.update(Role.team('6a11fc7200202af19f62')),
                        Permission.delete(Role.team('6a11fc7200202af19f62'))
                    ];
                    await databases.createDocument(CONFIG.databaseId, CONFIG.pastPapersCol, ID.unique(), data, permissions);
                    showToast("Paper published", "success");
                }
                window.location.hash = '#past-papers';
            } catch (error) {
                console.error(error);
                showToast(error.message || "Failed to save paper", "error");
                btn.disabled = false;
                btn.textContent = 'Save Paper';
            }
        });
    }
};
