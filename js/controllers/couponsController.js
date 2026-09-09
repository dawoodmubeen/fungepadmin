import { databases, CONFIG, Query, ID } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';
import { fetchAllDocuments, filterAndPaginate, debounce } from '../utils/dbHelper.js';

export const couponsController = {
    async render(container, args) {
        if (args && args.length > 0 && args[0] === 'new') {
            await this.renderForm(container, null);
        } else if (args && args.length > 0 && args[0] === 'edit' && args[1]) {
            await this.renderForm(container, args[1]);
        } else if (args && args.length > 0 && args[0] === 'audit' && args[1]) {
            await this.renderAudit(container, args[1]);
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
                            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Coupons & Promo Engine</h1>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700">Discount System</span>
                        </div>
                        <p class="text-xs sm:text-sm text-slate-500 mt-1">Generate discount vouchers, limit redemption quotas, and audit student usage logs.</p>
                    </div>
                    <a href="#coupons/new" class="btn-primary">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Create Promo Code</span>
                    </a>
                </div>

                <!-- Toolbar -->
                <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div class="relative flex-1 w-full sm:max-w-md">
                        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="search-coupon" placeholder="Search promo codes by code or rule..." class="form-input pl-10 text-xs sm:text-sm">
                    </div>
                </div>

                <!-- Coupons Table -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div class="table-responsive-wrapper">
                        <table class="min-w-full divide-y divide-slate-100">
                            <thead class="table-header">
                                <tr>
                                    <th>Coupon Code</th>
                                    <th>Discount Rule</th>
                                    <th>Usage Quota</th>
                                    <th>Expiration</th>
                                    <th>Active Status</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="coupons-tbody" class="divide-y divide-slate-100 bg-white">
                                <tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">Loading coupons...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        this.allCoupons = [];
        await this.loadCoupons();
        this.setupEvents();
    },

    setupEvents() {
        const searchInput = document.getElementById('search-coupon');
        searchInput?.addEventListener('input', debounce((e) => {
            const q = (e.target.value || '').trim().toLowerCase();
            const filtered = (this.allCoupons || []).filter(c => 
                (c.code && c.code.toLowerCase().includes(q)) ||
                (c.discount_type && c.discount_type.toLowerCase().includes(q)) ||
                (c.$id && c.$id.toLowerCase().includes(q))
            );
            this.renderTableRows(filtered);
        }, 200));
    },

    async loadCoupons() {
        try {
            this.allCoupons = await fetchAllDocuments(CONFIG.databaseId, CONFIG.couponsCol, [
                Query.orderDesc('$createdAt')
            ]);
            this.renderTableRows(this.allCoupons);
        } catch (error) {
            console.error("Failed to load coupons:", error);
            const tbody = document.getElementById('coupons-tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-rose-500 text-xs">Failed to load coupons.</td></tr>`;
        }
    },

    renderTableRows(data) {
        const tbody = document.getElementById('coupons-tbody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-400 text-xs font-semibold uppercase">No promo codes found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(coupon => {
            const discountText = coupon.discount_type === 'percentage'
                ? `${coupon.discount_value}% Off ${coupon.maximum_discount ? `(Cap PKR ${coupon.maximum_discount})` : ''}`
                : `Flat PKR ${coupon.discount_value} Off`;

            const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
            const statusBadge = (!coupon.is_active || isExpired)
                ? `<span class="badge badge-gray text-xs">${isExpired ? 'Expired' : 'Inactive'}</span>`
                : `<span class="badge badge-success text-xs">Active</span>`;

            return `
                <tr class="table-row">
                    <td class="table-cell">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-mono font-extrabold text-sm border border-sky-200/60">${coupon.code}</span>
                        </div>
                    </td>
                    <td class="table-cell text-xs">
                        <p class="font-extrabold text-slate-900">${discountText}</p>
                        ${coupon.minimum_purchase ? `<p class="text-slate-400 text-[10px]">Min. purchase PKR ${coupon.minimum_purchase}</p>` : ''}
                    </td>
                    <td class="table-cell text-xs font-mono">
                        <span class="font-bold text-slate-800">${coupon.total_uses || 0}</span> / ${coupon.max_uses ? coupon.max_uses : '∞'} uses
                    </td>
                    <td class="table-cell text-xs text-slate-500 font-mono">
                        ${coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'No Expiry'}
                    </td>
                    <td class="table-cell">
                        ${statusBadge}
                    </td>
                    <td class="table-cell text-right">
                        <div class="flex items-center justify-end gap-2">
                            <a href="#coupons/audit/${coupon.code}" class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
                                Audit Logs
                            </a>
                            <a href="#coupons/edit/${coupon.$id}" class="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition">
                                Edit
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    },

    async renderForm(container, id) {
        let coupon = {
            code: '', discount_type: 'percentage', discount_value: 20, maximum_discount: null,
            minimum_purchase: null, is_active: true, expires_at: '', max_uses: null, per_user_limit: 1
        };
        let isEdit = false;

        if (id) {
            try {
                coupon = await databases.getDocument(CONFIG.databaseId, CONFIG.couponsCol, id);
                isEdit = true;
            } catch (e) {
                showToast("Failed to load coupon", "error");
                window.location.hash = '#coupons';
                return;
            }
        }

        container.innerHTML = `
            <div class="max-w-2xl mx-auto space-y-6">
                <div class="flex items-center justify-between">
                    <a href="#coupons" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        <span>Back to Coupons</span>
                    </a>
                    <span class="text-xs font-bold text-slate-400">${isEdit ? 'Edit Promo' : 'New Promo Code'}</span>
                </div>

                <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
                    <h2 class="text-lg font-bold text-slate-900 mb-6">${isEdit ? 'Edit Promo Code' : 'Generate Promo Code'}</h2>

                    <form id="coupon-form" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Coupon Code (Uppercase) *</label>
                                <input type="text" id="cp-code" required value="${coupon.code || ''}" placeholder="e.g. FAST2026" class="form-input uppercase font-mono">
                            </div>
                            <div>
                                <label class="form-label">Discount Calculation Type *</label>
                                <select id="cp-type" class="form-input">
                                    <option value="percentage" ${coupon.discount_type === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                                    <option value="fixed" ${coupon.discount_type === 'fixed' ? 'selected' : ''}>Fixed Amount (PKR)</option>
                                </select>
                            </div>
                            <div>
                                <label class="form-label">Discount Value *</label>
                                <input type="number" id="cp-val" required value="${coupon.discount_value || 20}" step="1" min="1" class="form-input font-bold">
                            </div>
                            <div>
                                <label class="form-label">Max Discount Cap (PKR)</label>
                                <input type="number" id="cp-cap" value="${coupon.maximum_discount || ''}" placeholder="e.g. 500 (for percentage)" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Total Allowed Uses (Blank for infinite)</label>
                                <input type="number" id="cp-max-uses" value="${coupon.max_uses || ''}" placeholder="e.g. 100" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Per Student Limit</label>
                                <input type="number" id="cp-user-limit" value="${coupon.per_user_limit || 1}" min="1" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Expiration Date</label>
                                <input type="date" id="cp-expiry" value="${coupon.expires_at ? coupon.expires_at.split('T')[0] : ''}" class="form-input">
                            </div>
                            <div class="pt-6 flex items-center gap-2">
                                <input type="checkbox" id="cp-active" class="w-4 h-4 text-sky-600 rounded" ${coupon.is_active ? 'checked' : ''}>
                                <label for="cp-active" class="text-xs font-bold text-slate-700">Coupon Active & Redeemable</label>
                            </div>
                        </div>

                        <div class="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                            <a href="#coupons" class="btn-secondary">Cancel</a>
                            <button type="submit" id="cp-save-btn" class="btn-primary">Save Coupon</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        document.getElementById('coupon-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('cp-save-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                const expiryVal = document.getElementById('cp-expiry').value;
                const maxUsesVal = document.getElementById('cp-max-uses').value;
                const capVal = document.getElementById('cp-cap').value;

                const payload = {
                    code: document.getElementById('cp-code').value.trim().toUpperCase(),
                    discount_type: document.getElementById('cp-type').value,
                    discount_value: parseFloat(document.getElementById('cp-val').value),
                    maximum_discount: capVal ? parseFloat(capVal) : null,
                    max_uses: maxUsesVal ? parseInt(maxUsesVal) : null,
                    per_user_limit: parseInt(document.getElementById('cp-user-limit').value) || 1,
                    is_active: document.getElementById('cp-active').checked,
                    expires_at: expiryVal ? new Date(expiryVal).toISOString() : null
                };

                if (isEdit) {
                    await databases.updateDocument(CONFIG.databaseId, CONFIG.couponsCol, id, payload);
                    showToast("Coupon updated successfully", "success");
                } else {
                    payload.total_uses = 0;
                    await databases.createDocument(CONFIG.databaseId, CONFIG.couponsCol, ID.unique(), payload);
                    showToast("Coupon created successfully", "success");
                }

                window.location.hash = '#coupons';

            } catch (err) {
                console.error(err);
                showToast(err.message || "Failed to save coupon", "error");
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Coupon';
            }
        });
    },

    async renderAudit(container, couponId) {
        container.innerHTML = `<div class="p-12 text-center text-slate-400 text-xs font-semibold uppercase">Loading redemption audit trail...</div>`;

        try {
            const [coupon, usagesRes] = await Promise.all([
                databases.getDocument(CONFIG.databaseId, CONFIG.couponsCol, couponId),
                databases.listDocuments(CONFIG.databaseId, CONFIG.couponUsagesCol, [
                    Query.equal('coupon_id', couponId),
                    Query.orderDesc('used_at'),
                    Query.limit(50)
                ]).catch(() => ({ documents: [] }))
            ]);

            container.innerHTML = `
                <div class="space-y-6 max-w-4xl mx-auto">
                    <div class="flex items-center justify-between">
                        <a href="#coupons" class="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            <span>Back to Coupons</span>
                        </a>
                        <span class="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">Audit: ${coupon.code}</span>
                    </div>

                    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-base font-bold text-slate-900">Redemption History for "${coupon.code}"</h2>
                                <p class="text-xs text-slate-400">Total redemptions recorded: ${usagesRes.documents.length}</p>
                            </div>
                        </div>

                        <div class="table-responsive-wrapper">
                            <table class="min-w-full divide-y divide-slate-100 text-xs">
                                <thead class="table-header">
                                    <tr>
                                        <th>Student User ID</th>
                                        <th>Order ID</th>
                                        <th>Redeemed Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${usagesRes.documents.length === 0 ? `
                                        <tr><td colspan="3" class="text-center py-8 text-slate-400">No redemptions found for this coupon yet.</td></tr>
                                    ` : usagesRes.documents.map(u => `
                                        <tr class="table-row">
                                            <td class="table-cell font-mono">${u.user_id}</td>
                                            <td class="table-cell font-mono font-bold text-sky-700">${u.order_id || 'N/A'}</td>
                                            <td class="table-cell font-mono text-slate-500">${new Date(u.used_at || u.$createdAt).toLocaleString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

        } catch (error) {
            console.error(error);
            showToast("Failed to load audit history", "error");
            window.location.hash = '#coupons';
        }
    }
};
