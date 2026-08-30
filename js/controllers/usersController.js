import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const usersController = {
    async render(container, args) {
        if (args.length > 0 && args[0] === 'view' && args[1]) {
            this.renderDetails(container, args[1]);
        } else {
            this.renderList(container);
        }
    },

    async renderList(container) {
        container.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900">Users</h2>
                <p class="text-sm text-gray-500">Manage FUNGEP students and administrators.</p>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <div class="relative flex-1 max-w-md">
                        <i data-lucide="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"></i>
                        <input type="text" id="search-user" placeholder="Search by name, email..." class="form-input pl-9">
                    </div>
                    <select id="filter-premium" class="form-input max-w-[150px]">
                        <option value="all">All Users</option>
                        <option value="premium">Premium</option>
                        <option value="free">Free</option>
                    </select>
                </div>
                
                <div class="table-container">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 table-header">
                            <tr>
                                <th>Name & Email</th>
                                <th>Role</th>
                                <th>Access</th>
                                <th>Target Test</th>
                                <th>Joined</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="users-tbody" class="bg-white divide-y divide-gray-200">
                            <tr><td colspan="6" class="text-center py-8 text-gray-500">Loading users...</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <button id="prev-page" class="btn-secondary" disabled>Previous</button>
                    <span id="page-info" class="text-sm text-gray-600">Page 1</span>
                    <button id="next-page" class="btn-secondary">Next</button>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        this.currentPage = 1;
        this.limit = 20;
        this.premiumFilter = 'all';
        this.users = [];
        
        await this.loadPage(1);

        document.getElementById('search-user').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = this.users.filter(u => 
                (u.full_name && u.full_name.toLowerCase().includes(q)) || 
                (u.email && u.email.toLowerCase().includes(q))
            );
            this.renderTableRows(document.getElementById('users-tbody'), filtered);
        });

        document.getElementById('filter-premium').addEventListener('change', (e) => {
            this.premiumFilter = e.target.value;
            this.currentPage = 1;
            this.loadPage(1);
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
    },

    async loadPage(page) {
        try {
            const queries = [
                Query.orderDesc('$createdAt'),
                Query.limit(this.limit),
                Query.offset((page - 1) * this.limit)
            ];
            
            if (this.premiumFilter === 'premium') {
                queries.push(Query.equal('is_premium', true));
            } else if (this.premiumFilter === 'free') {
                queries.push(Query.equal('is_premium', false));
            }
            
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.usersCol, queries);
            this.users = res.documents;
            
            const tbody = document.getElementById('users-tbody');
            if (this.users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No users found.</td></tr>`;
            } else {
                this.renderTableRows(tbody, this.users);
            }
            
            document.getElementById('page-info').textContent = `Page ${page}`;
            document.getElementById('prev-page').disabled = page === 1;
            document.getElementById('next-page').disabled = res.documents.length < this.limit;
            
        } catch (error) {
            console.error(error);
            showToast("Failed to load users", "error");
        }
    },

    renderTableRows(tbody, data) {
        tbody.innerHTML = data.map(doc => {
            const avatarUrl = doc.profile_photo 
                ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.profileImagesBucket}/files/${doc.profile_photo}/view?project=${CONFIG.projectId}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.full_name || 'U')}&background=2563eb&color=fff`;
            
            return `
            <tr class="table-row">
                <td class="table-cell">
                    <div class="flex items-center">
                        <img class="h-8 w-8 rounded-full object-cover mr-3" src="${avatarUrl}" alt="">
                        <div>
                            <p class="font-medium text-gray-900">${doc.full_name || 'Unknown'}</p>
                            <p class="text-xs text-gray-500">${doc.email}</p>
                        </div>
                    </div>
                </td>
                <td class="table-cell">
                    <span class="badge badge-gray">${doc.role || 'Student'}</span>
                </td>
                <td class="table-cell">
                    <span class="badge ${doc.is_premium ? 'badge-warning' : 'badge-gray'}">
                        ${doc.is_premium ? 'Premium' : 'Free'}
                    </span>
                </td>
                <td class="table-cell text-gray-500">
                    ${doc.targeted_university || '-'}<br>
                    <span class="text-xs">${doc.targeted_test || ''}</span>
                </td>
                <td class="table-cell text-gray-500">
                    ${new Date(doc.created_at || doc.$createdAt).toLocaleDateString()}
                </td>
                <td class="table-cell text-right">
                    <a href="#users/view/${doc.auth_id}" class="text-primary hover:text-secondary text-sm font-medium">
                        View Profile
                    </a>
                </td>
            </tr>
        `}).join('');
    },

    async renderDetails(container, authId) {
        container.innerHTML = `<div class="p-8 text-center text-gray-500">Loading user profile...</div>`;
        try {
            // Find user doc
            const uRes = await databases.listDocuments(CONFIG.databaseId, CONFIG.usersCol, [Query.equal('auth_id', authId)]);
            if (uRes.documents.length === 0) throw new Error("User not found");
            const user = uRes.documents[0];

            // Load some associated data (Premium Requests)
            const [reqs, feedback, coupons] = await Promise.all([
                databases.listDocuments(CONFIG.databaseId, CONFIG.premiumRequestsCol, [Query.equal('user_id', authId), Query.limit(5), Query.orderDesc('$createdAt')]).catch(()=>({documents:[]})),
                databases.listDocuments(CONFIG.databaseId, CONFIG.feedbackCol, [Query.equal('user_id', authId), Query.limit(5), Query.orderDesc('$createdAt')]).catch(()=>({documents:[]})),
                databases.listDocuments(CONFIG.databaseId, CONFIG.couponUsagesCol, [Query.equal('user_id', authId), Query.limit(5), Query.orderDesc('$createdAt')]).catch(()=>({documents:[]}))
            ]);

            const avatarUrl = user.profile_photo 
                ? `${CONFIG.endpoint}/storage/buckets/${CONFIG.profileImagesBucket}/files/${user.profile_photo}/view?project=${CONFIG.projectId}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=2563eb&color=fff`;

            container.innerHTML = `
                <div class="mb-6 flex items-center">
                    <a href="#users" class="text-gray-500 hover:text-gray-700 mr-4">
                        <i data-lucide="arrow-left" class="w-5 h-5"></i>
                    </a>
                    <h2 class="text-2xl font-bold text-gray-900">User Profile</h2>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-1 space-y-6">
                        <!-- Profile Card -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                            <img class="h-24 w-24 rounded-full mx-auto object-cover mb-4 border-2 border-gray-100" src="${avatarUrl}" alt="">
                            <h3 class="text-xl font-bold text-gray-900">${user.full_name}</h3>
                            <p class="text-sm text-gray-500 mb-4">${user.email}</p>
                            <div class="flex justify-center gap-2 mb-6">
                                <span class="badge badge-gray">${user.role}</span>
                                <span class="badge ${user.is_premium ? 'badge-warning' : 'badge-gray'}">${user.is_premium ? 'Premium' : 'Free'}</span>
                            </div>
                            <div class="text-left border-t border-gray-100 pt-4 space-y-3 text-sm">
                                <div class="flex justify-between"><span class="text-gray-500">Phone:</span> <span class="font-medium text-gray-900">${user.phone || 'N/A'}</span></div>
                                <div class="flex justify-between"><span class="text-gray-500">University:</span> <span class="font-medium text-gray-900">${user.targeted_university || 'N/A'}</span></div>
                                <div class="flex justify-between"><span class="text-gray-500">Test:</span> <span class="font-medium text-gray-900">${user.targeted_test || 'N/A'}</span></div>
                                <div class="flex justify-between"><span class="text-gray-500">Batch:</span> <span class="font-medium text-gray-900">${user.applying_batch || 'N/A'}</span></div>
                                <div class="flex justify-between"><span class="text-gray-500">Joined:</span> <span class="font-medium text-gray-900">${new Date(user.created_at).toLocaleDateString()}</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="lg:col-span-2 space-y-6">
                        <!-- Premium Requests -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-100"><h3 class="text-base font-semibold">Premium Requests</h3></div>
                            ${reqs.documents.length > 0 ? `
                                <ul class="divide-y divide-gray-100">
                                    ${reqs.documents.map(r => `
                                        <li class="p-4 flex justify-between items-center hover:bg-gray-50">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900">${r.plan} (PKR ${r.amount})</p>
                                                <p class="text-xs text-gray-500">${new Date(r.$createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div class="flex items-center gap-4">
                                                <span class="badge ${r.status === 'pending' ? 'badge-warning' : (r.status === 'approved' ? 'badge-success' : 'badge-error')}">${r.status}</span>
                                                <a href="#premium-requests/view/${r.$id}" class="text-primary hover:underline text-sm">View</a>
                                            </div>
                                        </li>
                                    `).join('')}
                                </ul>
                            ` : `<div class="p-6 text-sm text-gray-500 text-center">No premium requests found.</div>`}
                        </div>

                        <!-- Feedback -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-100"><h3 class="text-base font-semibold">Recent Feedback</h3></div>
                            ${feedback.documents.length > 0 ? `
                                <ul class="divide-y divide-gray-100">
                                    ${feedback.documents.map(f => `
                                        <li class="p-4 flex justify-between items-center hover:bg-gray-50">
                                            <div>
                                                <p class="text-sm font-medium text-gray-900">${f.subject}</p>
                                                <p class="text-xs text-gray-500">${new Date(f.$createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <span class="badge ${f.status === 'open' ? 'badge-error' : 'badge-success'}">${f.status}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            ` : `<div class="p-6 text-sm text-gray-500 text-center">No feedback found.</div>`}
                        </div>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();

        } catch (error) {
            console.error(error);
            showToast("Failed to load user details", "error");
            window.location.hash = '#users';
        }
    }
};
