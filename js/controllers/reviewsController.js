import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const reviewsController = {
    async render(container, args) {
        this.renderList(container);
    },

    async renderList(container) {
        container.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900">Reviews & Ratings</h2>
                <p class="text-sm text-gray-500">Manage user reviews.</p>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="table-container">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 table-header">
                            <tr>
                                <th>User</th>
                                <th>Rating</th>
                                <th>Review</th>
                                <th>Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="reviews-tbody" class="bg-white divide-y divide-gray-200">
                            <tr><td colspan="5" class="text-center py-8 text-gray-500">Loading reviews...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        try {
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.reviewsCol, [
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]);
            
            const tbody = document.getElementById('reviews-tbody');
            if (res.documents.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">No reviews found.</td></tr>`;
            } else {
                tbody.innerHTML = res.documents.map(doc => `
                    <tr class="table-row">
                        <td class="table-cell">
                            <p class="font-medium text-gray-900">${doc.full_name}</p>
                            <p class="text-xs text-gray-500">${doc.email}</p>
                        </td>
                        <td class="table-cell text-yellow-500 flex mt-2">
                            ${Array(doc.rating).fill('<i data-lucide="star" class="w-4 h-4 fill-current"></i>').join('')}
                        </td>
                        <td class="table-cell max-w-xs truncate" title="${doc.review}">
                            ${doc.review}
                        </td>
                        <td class="table-cell">
                            <select class="form-input text-xs py-1 px-2 pr-6 status-select" data-id="${doc.$id}">
                                <option value="pending" ${doc.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="approved" ${doc.status === 'approved' ? 'selected' : ''}>Approved</option>
                                <option value="rejected" ${doc.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                            </select>
                        </td>
                        <td class="table-cell text-right">
                            <label class="inline-flex items-center cursor-pointer">
                                <span class="mr-2 text-xs text-gray-500">Featured</span>
                                <input type="checkbox" class="featured-toggle h-4 w-4 text-primary" data-id="${doc.$id}" ${doc.is_featured ? 'checked' : ''}>
                            </label>
                        </td>
                    </tr>
                `).join('');
                
                if (window.lucide) window.lucide.createIcons();

                // Bind events
                document.querySelectorAll('.status-select').forEach(sel => {
                    sel.addEventListener('change', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        const status = e.target.value;
                        try {
                            await databases.updateDocument(CONFIG.databaseId, CONFIG.reviewsCol, id, { status });
                            showToast("Status updated", "success");
                        } catch(err) {
                            showToast("Failed to update status", "error");
                        }
                    });
                });

                document.querySelectorAll('.featured-toggle').forEach(chk => {
                    chk.addEventListener('change', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        const is_featured = e.target.checked;
                        try {
                            await databases.updateDocument(CONFIG.databaseId, CONFIG.reviewsCol, id, { is_featured });
                            showToast("Featured status updated", "success");
                        } catch(err) {
                            showToast("Failed to update featured status", "error");
                            e.target.checked = !is_featured;
                        }
                    });
                });
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to load reviews", "error");
        }
    }
};
