export function renderSidebar(adminDoc) {
    const sidebarHtml = `
        <div class="h-16 flex items-center px-6 border-b border-gray-200">
            <span class="text-xl font-bold text-primary">FUNGEP Admin</span>
        </div>
        <div class="flex-1 overflow-y-auto py-4">
            <nav class="space-y-1 px-3">
                <a href="#dashboard" class="nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-50" data-target="dashboard">
                    <i data-lucide="layout-dashboard" class="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-5 w-5"></i>
                    Dashboard
                </a>
                
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <p class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Content</p>
                    <a href="#past-papers" class="nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-50" data-target="past-papers">
                        <i data-lucide="file-text" class="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-5 w-5"></i>
                        Past Papers
                    </a>
                    <a href="#universities" class="nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-50" data-target="universities">
                        <i data-lucide="school" class="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-5 w-5"></i>
                        Universities
                    </a>
                </div>

                <div class="mt-4 pt-4 border-t border-gray-200">
                    <p class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Users & Premium</p>
                    <a href="#users" class="nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-50" data-target="users">
                        <i data-lucide="users" class="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-5 w-5"></i>
                        Users
                    </a>
                    <a href="#premium-requests" class="nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-50" data-target="premium-requests">
                        <i data-lucide="credit-card" class="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-5 w-5"></i>
                        Premium Requests
                    </a>
                    <a href="#subscriptions" class="nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-50" data-target="subscriptions">
                        <i data-lucide="calendar-days" class="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-5 w-5"></i>
                        Subscriptions
                    </a>
                </div>

                <div class="mt-4 pt-4 border-t border-gray-200">
                    <p class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Engagement</p>
                    <a href="#feedback" class="nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-50" data-target="feedback">
                        <i data-lucide="message-square" class="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-5 w-5"></i>
                        Feedback
                    </a>
                    <a href="#reviews" class="nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-50" data-target="reviews">
                        <i data-lucide="star" class="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-5 w-5"></i>
                        Reviews
                    </a>
                    <a href="#coupons" class="nav-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-primary hover:bg-gray-50" data-target="coupons">
                        <i data-lucide="tag" class="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-5 w-5"></i>
                        Coupons
                    </a>
                </div>
            </nav>
        </div>
    `;

    document.getElementById('sidebar-container').innerHTML = sidebarHtml;
    document.getElementById('mobile-sidebar-container').innerHTML = sidebarHtml;
}
