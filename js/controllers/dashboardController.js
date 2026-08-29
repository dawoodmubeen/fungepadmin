import { databases, CONFIG, Query } from '../appwrite/config.js';
import { showToast } from '../components/toast.js';

export const dashboardController = {
    async render(container) {
        container.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                <p class="text-sm text-gray-500">Welcome to FUNGEP Admin. Here's what's happening today.</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="stats-container">
                <!-- Skeletons -->
                ${Array(4).fill(0).map(() => `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                        <div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div class="h-8 bg-gray-200 rounded w-1/3"></div>
                    </div>
                `).join('')}
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Recent Premium Requests -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 class="text-base font-semibold text-gray-900">Recent Premium Requests</h3>
                        <a href="#premium-requests" class="text-sm text-primary hover:underline">View all</a>
                    </div>
                    <div class="p-0" id="recent-requests-container">
                        <div class="p-6 text-center text-sm text-gray-500">Loading...</div>
                    </div>
                </div>
                
                <!-- Recent Feedback -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 class="text-base font-semibold text-gray-900">Recent Feedback</h3>
                        <a href="#feedback" class="text-sm text-primary hover:underline">View all</a>
                    </div>
                    <div class="p-0" id="recent-feedback-container">
                        <div class="p-6 text-center text-sm text-gray-500">Loading...</div>
                    </div>
                </div>
            </div>
        `;

        try {
            await Promise.all([
                this.loadStats(),
                this.loadRecentRequests(),
                this.loadRecentFeedback()
            ]);
            if (window.lucide) window.lucide.createIcons();
        } catch (error) {
            console.error("Dashboard error:", error);
            showToast("Failed to load some dashboard data.", "error");
        }
    },

    async loadStats() {
        try {
            const [usersRes, papersRes, reqsRes, feedbackRes] = await Promise.all([
                databases.listDocuments(CONFIG.databaseId, CONFIG.usersCol, [Query.limit(1)]),
                databases.listDocuments(CONFIG.databaseId, CONFIG.pastPapersCol, [Query.limit(1)]),
                databases.listDocuments(CONFIG.databaseId, CONFIG.premiumRequestsCol, [Query.equal('status', 'pending'), Query.limit(1)]),
                databases.listDocuments(CONFIG.databaseId, CONFIG.feedbackCol, [Query.equal('status', 'open'), Query.limit(1)])
            ]);

            const statsContainer = document.getElementById('stats-container');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
                        <div class="p-3 rounded-full bg-blue-50 text-primary mr-4">
                            <i data-lucide="users" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-500">Total Users</p>
                            <p class="text-2xl font-bold text-gray-900">${usersRes.total.toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
                        <div class="p-3 rounded-full bg-green-50 text-green-600 mr-4">
                            <i data-lucide="file-text" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-500">Past Papers</p>
                            <p class="text-2xl font-bold text-gray-900">${papersRes.total.toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
                        <div class="p-3 rounded-full bg-yellow-50 text-yellow-600 mr-4">
                            <i data-lucide="clock" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-500">Pending Requests</p>
                            <p class="text-2xl font-bold text-gray-900">${reqsRes.total.toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
                        <div class="p-3 rounded-full bg-red-50 text-red-600 mr-4">
                            <i data-lucide="message-square" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-500">Open Feedback</p>
                            <p class="text-2xl font-bold text-gray-900">${feedbackRes.total.toLocaleString()}</p>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    },

    async loadRecentRequests() {
        try {
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.premiumRequestsCol, [
                Query.orderDesc('$createdAt'),
                Query.limit(5)
            ]);
            
            const container = document.getElementById('recent-requests-container');
            if (!container) return;

            if (res.documents.length === 0) {
                container.innerHTML = `<div class="p-6 text-center text-sm text-gray-500">No recent premium requests.</div>`;
                return;
            }

            container.innerHTML = `
                <ul class="divide-y divide-gray-100">
                    ${res.documents.map(doc => `
                        <li class="p-4 hover:bg-gray-50 transition-colors">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-900">${doc.user_name || 'Unknown User'}</p>
                                    <p class="text-xs text-gray-500">${doc.plan} • ${new Date(doc.$createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <span class="badge ${doc.status === 'pending' ? 'badge-warning' : (doc.status === 'approved' ? 'badge-success' : 'badge-error')} capitalize">
                                        ${doc.status}
                                    </span>
                                </div>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `;
        } catch (error) {
            console.error("Error loading recent requests:", error);
        }
    },

    async loadRecentFeedback() {
        try {
            const res = await databases.listDocuments(CONFIG.databaseId, CONFIG.feedbackCol, [
                Query.orderDesc('$createdAt'),
                Query.limit(5)
            ]);
            
            const container = document.getElementById('recent-feedback-container');
            if (!container) return;

            if (res.documents.length === 0) {
                container.innerHTML = `<div class="p-6 text-center text-sm text-gray-500">No recent feedback.</div>`;
                return;
            }

            container.innerHTML = `
                <ul class="divide-y divide-gray-100">
                    ${res.documents.map(doc => `
                        <li class="p-4 hover:bg-gray-50 transition-colors">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-900 line-clamp-1">${doc.subject}</p>
                                    <p class="text-xs text-gray-500">${doc.full_name} • ${new Date(doc.$createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <span class="badge ${doc.status === 'open' ? 'badge-error' : 'badge-success'} capitalize">
                                        ${doc.status}
                                    </span>
                                </div>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `;
        } catch (error) {
            console.error("Error loading recent feedback:", error);
        }
    }
};
