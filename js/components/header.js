export function renderHeader(adminDoc) {
    const avatarUrl = adminDoc?.profile_photo 
        ? `https://sgp.cloud.appwrite.io/v1/storage/buckets/profile-images/files/${adminDoc.profile_photo}/view?project=6a11e2ba00082db8f17a` 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(adminDoc?.full_name || 'Admin')}&background=2563eb&color=fff`;

    const html = `
        <div class="flex items-center md:hidden">
            <button id="mobile-menu-btn" class="text-gray-500 hover:text-gray-700 focus:outline-none">
                <i data-lucide="menu" class="h-6 w-6"></i>
            </button>
            <span class="ml-4 text-xl font-bold text-primary">FUNGEP Admin</span>
        </div>
        <div class="hidden md:flex items-center">
            <h1 id="header-title" class="text-xl font-semibold text-gray-800">Dashboard</h1>
        </div>
        
        <div class="flex items-center space-x-4">
            <div class="relative">
                <button id="profile-dropdown-btn" class="flex items-center focus:outline-none">
                    <img class="h-8 w-8 rounded-full object-cover border border-gray-200" src="${avatarUrl}" alt="Admin profile">
                    <span class="ml-2 text-sm font-medium text-gray-700 hidden sm:block">${adminDoc?.full_name || 'Admin'}</span>
                    <i data-lucide="chevron-down" class="ml-1 h-4 w-4 text-gray-500 hidden sm:block"></i>
                </button>
                
                <!-- Dropdown -->
                <div id="profile-dropdown" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-100 hidden">
                    <div class="px-4 py-2 border-b border-gray-100">
                        <p class="text-sm font-medium text-gray-900 truncate">${adminDoc?.full_name || 'Admin'}</p>
                        <p class="text-xs text-gray-500 truncate">${adminDoc?.email || ''}</p>
                    </div>
                    <button id="logout-btn" class="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('header-container').innerHTML = html;
}
