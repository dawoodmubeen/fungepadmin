import { databases, CONFIG, Query, ID } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const couponsController = {
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
            <div class="mb-6 flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">Coupons</h2>
                    <p class="text-sm text-gray-500">Manage discount codes for premium subscriptions.</p>
                </div>
                <a href="#coupons/new" class="btn-primary inline-flex items-center">
                    <i data-lucide="plus" class="w-4 h-4 mr-2"></i> Create Coupon
                </a>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="table-container">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 table-header">
                            <tr>
                                <th>Code & Name</th>
                                <th>Discount</th>
                                <th>Uses</th>
                                <th>Expires At</th>
                                <th>Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="coupons-tbody" class="bg-white divide-y divide-gray-200">
                            <tr><td colspan="6" class="text-center py-8 text-gray-500">Loading coupons...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        try {
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.couponsCol, [
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]);
            
            const tbody = document.getElementById('coupons-tbody');
            if (res.documents.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No coupons found.</td></tr>`;
            } else {
                tbody.innerHTML = res.documents.map(doc => `
                    <tr class="table-row">
                        <td class="table-cell">
                            <p class="font-mono font-bold text-primary">${doc.code}</p>
                            <p class="text-xs text-gray-500">${doc.name}</p>
                        </td>
                        <td class="table-cell font-medium">
                            ${doc.discount_type === 'percentage' ? `${doc.discount_value}%` : `PKR ${doc.discount_value}`}
                        </td>
                        <td class="table-cell text-sm text-gray-600">
                            ${doc.total_uses} / ${doc.max_uses ? doc.max_uses : '∞'}
                        </td>
                        <td class="table-cell text-sm text-gray-500">
                            ${doc.expires_at ? new Date(doc.expires_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td class="table-cell">
                            <span class="badge ${doc.is_active ? 'badge-success' : 'badge-error'}">
                                ${doc.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td class="table-cell text-right">
                            <a href="#coupons/edit/${doc.$id}" class="text-primary hover:text-secondary text-sm font-medium">
                                Edit
                            </a>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to load coupons", "error");
        }
    },

    async renderForm(container, id) {
        let coupon = { 
            code: '', name: '', description: '', discount_type: 'percentage', 
            discount_value: 0, max_uses: null, total_uses: 0, per_user_limit: 1, 
            is_active: true, expires_at: ''
        };
        let isEdit = false;

        if (id) {
            try {
                coupon = await databases.getDocument(CONFIG.databaseId, CONFIG.couponsCol, id);
                isEdit = true;
            } catch (err) {
                showToast("Failed to load coupon", "error");
                window.location.hash = '#coupons';
                return;
            }
        }

        container.innerHTML = `
            <div class="mb-6 flex items-center">
                <a href="#coupons" class="text-gray-500 hover:text-gray-700 mr-4">
                    <i data-lucide="arrow-left" class="w-5 h-5"></i>
                </a>
                <h2 class="text-2xl font-bold text-gray-900">${isEdit ? 'Edit Coupon' : 'Create Coupon'}</h2>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
                <form id="coupon-form" class="p-6 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">Coupon Code *</label>
                            <input type="text" id="c-code" class="form-input uppercase font-mono" required value="${coupon.code}" ${isEdit ? 'readonly' : ''}>
                        </div>
                        <div>
                            <label class="form-label">Name *</label>
                            <input type="text" id="c-name" class="form-input" required value="${coupon.name}">
                        </div>
                        <div>
                            <label class="form-label">Discount Type *</label>
                            <select id="c-type" class="form-input" required>
                                <option value="percentage" ${coupon.discount_type === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                                <option value="fixed" ${coupon.discount_type === 'fixed' ? 'selected' : ''}>Fixed Amount (PKR)</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Discount Value *</label>
                            <input type="number" id="c-value" class="form-input" required min="1" step="0.01" value="${coupon.discount_value}">
                        </div>
                        <div>
                            <label class="form-label">Max Total Uses (Leave empty for infinite)</label>
                            <input type="number" id="c-max-uses" class="form-input" min="1" value="${coupon.max_uses || ''}">
                        </div>
                        <div>
                            <label class="form-label">Per User Limit *</label>
                            <input type="number" id="c-user-limit" class="form-input" required min="1" value="${coupon.per_user_limit || 1}">
                        </div>
                        <div>
                            <label class="form-label">Expiry Date (Optional)</label>
                            <input type="date" id="c-expiry" class="form-input" value="${coupon.expires_at ? coupon.expires_at.split('T')[0] : ''}">
                        </div>
                        <div class="flex items-center pt-8">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" id="c-active" class="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" ${coupon.is_active ? 'checked' : ''}>
                                <span class="text-sm font-medium text-gray-700">Is Active</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <a href="#coupons" class="btn-secondary">Cancel</a>
                        <button type="submit" class="btn-primary" id="save-btn">Save Coupon</button>
                    </div>
                </form>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        document.getElementById('coupon-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                const maxUsesVal = document.getElementById('c-max-uses').value;
                const expiresVal = document.getElementById('c-expiry').value;
                
                const data = {
                    code: document.getElementById('c-code').value.toUpperCase(),
                    name: document.getElementById('c-name').value,
                    discount_type: document.getElementById('c-type').value,
                    discount_value: parseFloat(document.getElementById('c-value').value),
                    max_uses: maxUsesVal ? parseInt(maxUsesVal) : null,
                    per_user_limit: parseInt(document.getElementById('c-user-limit').value),
                    is_active: document.getElementById('c-active').checked,
                    expires_at: expiresVal ? new Date(expiresVal).toISOString() : null
                };

                if (isEdit) {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.couponsCol, id, data);
                    showToast("Coupon updated", "success");
                } else {
                    data.total_uses = 0;
                    data.created_at = new Date().toISOString();
                    data.created_by = 'admin'; // Ideally from auth
                    await databases.createDocument(CONFIG.databaseId, CONFIG.couponsCol, ID.unique(), data);
                    showToast("Coupon created", "success");
                }
                window.location.hash = '#coupons';
            } catch (error) {
                console.error(error);
                showToast(error.message || "Failed to save coupon", "error");
                btn.disabled = false;
                btn.textContent = 'Save Coupon';
            }
        });
    }
};
