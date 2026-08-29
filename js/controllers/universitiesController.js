import { databases, CONFIG, Query, ID } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const universitiesController = {
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
                    <h2 class="text-2xl font-bold text-gray-900">Universities</h2>
                    <p class="text-sm text-gray-500">Manage universities and their admission tests.</p>
                </div>
                <a href="#universities/new" class="btn-primary inline-flex items-center">
                    <i data-lucide="plus" class="w-4 h-4 mr-2"></i> Add University
                </a>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
                    <div class="relative w-full max-w-md">
                        <i data-lucide="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"></i>
                        <input type="text" id="search-university" placeholder="Search universities..." class="form-input pl-9">
                    </div>
                </div>
                
                <div class="table-container">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 table-header">
                            <tr>
                                <th>Name</th>
                                <th>Short Name</th>
                                <th>Slug</th>
                                <th>Status</th>
                                <th>Sort Order</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="universities-tbody" class="bg-white divide-y divide-gray-200">
                            <tr><td colspan="6" class="text-center py-8 text-gray-500">Loading universities...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        try {
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.universitiesCol, [
                Query.orderAsc('sort_order'),
                Query.limit(100)
            ]);
            
            const tbody = document.getElementById('universities-tbody');
            if (res.documents.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No universities found.</td></tr>`;
            } else {
                this.universities = res.documents;
                this.renderTableRows(tbody, this.universities);
                
                document.getElementById('search-university').addEventListener('input', (e) => {
                    const q = e.target.value.toLowerCase();
                    const filtered = this.universities.filter(u => 
                        (u.name && u.name.toLowerCase().includes(q)) || 
                        (u.short_name && u.short_name.toLowerCase().includes(q))
                    );
                    this.renderTableRows(tbody, filtered);
                });
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to load universities", "error");
        }
    },

    renderTableRows(tbody, data) {
        tbody.innerHTML = data.map(doc => `
            <tr class="table-row">
                <td class="table-cell font-medium text-gray-900">${doc.name}</td>
                <td class="table-cell text-gray-500">${doc.short_name}</td>
                <td class="table-cell text-gray-500">${doc.slug}</td>
                <td class="table-cell">
                    <span class="badge ${doc.is_active ? 'badge-success' : 'badge-error'}">
                        ${doc.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="table-cell text-gray-500">${doc.sort_order}</td>
                <td class="table-cell text-right">
                    <a href="#universities/edit/${doc.$id}" class="text-primary hover:text-secondary inline-flex items-center text-sm font-medium">
                        <i data-lucide="edit" class="w-4 h-4 mr-1"></i> Edit
                    </a>
                </td>
            </tr>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    },

    async renderForm(container, id) {
        let uni = { name: '', short_name: '', slug: '', description: '', tests: '[]', active: true, is_active: true, sort_order: 0 };
        let isEdit = false;

        if (id) {
            try {
                uni = await databases.getDocument(CONFIG.databaseId, CONFIG.universitiesCol, id);
                isEdit = true;
            } catch (err) {
                showToast("Failed to load university", "error");
                window.location.hash = '#universities';
                return;
            }
        }

        container.innerHTML = `
            <div class="mb-6 flex items-center">
                <a href="#universities" class="text-gray-500 hover:text-gray-700 mr-4">
                    <i data-lucide="arrow-left" class="w-5 h-5"></i>
                </a>
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">${isEdit ? 'Edit University' : 'Add University'}</h2>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
                <form id="uni-form" class="p-6 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">Name *</label>
                            <input type="text" id="uni-name" class="form-input" required value="${uni.name}">
                        </div>
                        <div>
                            <label class="form-label">Short Name *</label>
                            <input type="text" id="uni-short" class="form-input" required value="${uni.short_name}">
                        </div>
                        <div>
                            <label class="form-label">Slug *</label>
                            <input type="text" id="uni-slug" class="form-input" required value="${uni.slug}">
                        </div>
                        <div>
                            <label class="form-label">Sort Order *</label>
                            <input type="number" id="uni-sort" class="form-input" required value="${uni.sort_order}">
                        </div>
                        <div class="md:col-span-2">
                            <label class="form-label">Description</label>
                            <textarea id="uni-desc" class="form-input" rows="3">${uni.description || ''}</textarea>
                        </div>
                        <div class="md:col-span-2">
                            <label class="form-label">Tests (JSON Array of Strings) *</label>
                            <input type="text" id="uni-tests" class="form-input font-mono text-sm" required value='${uni.tests || "[]"}'>
                            <p class="text-xs text-gray-500 mt-1">Example: ["NET", "NTS"]</p>
                        </div>
                        <div>
                            <label class="flex items-center space-x-2 mt-4 cursor-pointer">
                                <input type="checkbox" id="uni-active" class="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" ${uni.is_active ? 'checked' : ''}>
                                <span class="text-sm font-medium text-gray-700">Is Active</span>
                            </label>
                            <p class="text-xs text-gray-500 ml-6 mt-1">This sets both active and is_active fields</p>
                        </div>
                    </div>
                    
                    <div class="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <a href="#universities" class="btn-secondary">Cancel</a>
                        <button type="submit" class="btn-primary" id="save-btn">Save University</button>
                    </div>
                </form>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        document.getElementById('uni-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                let testsArr = '[]';
                try {
                    const parsed = JSON.parse(document.getElementById('uni-tests').value);
                    if (!Array.isArray(parsed)) throw new Error("Must be array");
                    testsArr = JSON.stringify(parsed);
                } catch(e) {
                    showToast("Tests must be a valid JSON array of strings", "error");
                    btn.disabled = false;
                    btn.textContent = 'Save University';
                    return;
                }

                const isActive = document.getElementById('uni-active').checked;
                const data = {
                    name: document.getElementById('uni-name').value,
                    short_name: document.getElementById('uni-short').value,
                    slug: document.getElementById('uni-slug').value,
                    description: document.getElementById('uni-desc').value,
                    sort_order: parseInt(document.getElementById('uni-sort').value),
                    tests: testsArr,
                    is_active: isActive,
                    active: isActive,
                    updated_at: new Date().toISOString()
                };

                if (isEdit) {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.universitiesCol, id, data);
                    showToast("University updated", "success");
                } else {
                    data.created_at = new Date().toISOString();
                    await databases.createDocument(CONFIG.databaseId, CONFIG.universitiesCol, ID.unique(), data);
                    showToast("University created", "success");
                }
                window.location.hash = '#universities';
            } catch (error) {
                console.error(error);
                showToast(error.message, "error");
                btn.disabled = false;
                btn.textContent = 'Save University';
            }
        });
    }
};
