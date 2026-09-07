export function renderHeader(adminDoc) {
    const avatarUrl = adminDoc?.profile_photo 
        ? `https://sgp.cloud.appwrite.io/v1/storage/buckets/profile-images/files/${adminDoc.profile_photo}/view?project=6a11e2ba00082db8f17a` 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(adminDoc?.full_name || 'Admin')}&background=0284c7&color=fff&bold=true`;

    const html = `
        <!-- Left: Mobile Menu Toggle & Brand / Title -->
        <div class="flex items-center gap-3">
            <button id="mobile-menu-btn" class="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none" aria-label="Toggle menu">
                <i data-lucide="menu" class="w-6 h-6"></i>
            </button>
            
            <div class="flex items-center gap-2.5 lg:hidden">
                <img src="assets/funglogo.png" alt="FUNGEP" class="w-8 h-8 object-contain">
                <span class="text-base font-extrabold text-slate-900">FUNGEP</span>
            </div>

            <div class="hidden lg:flex items-center gap-2">
                <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Enterprise v2.0</span>
                <span class="text-slate-300">/</span>
                <h1 id="header-title" class="text-base font-bold text-slate-800 tracking-tight">Executive Dashboard</h1>
            </div>
        </div>

        <!-- Right: Status, Telemetry Indicator & Profile Dropdown -->
        <div class="flex items-center gap-3 sm:gap-4">
            <!-- Cloud Connection Status Indicator -->
            <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Appwrite Singapore Online</span>
            </div>

            <!-- Profile Menu -->
            <div class="relative">
                <button id="profile-dropdown-btn" class="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100/80 transition focus:outline-none">
                    <img class="h-8 w-8 rounded-xl object-cover border border-slate-200 shadow-sm" src="${avatarUrl}" alt="Admin Avatar">
                    <div class="hidden md:flex flex-col text-left">
                        <span class="text-xs font-bold text-slate-800 leading-tight">${adminDoc?.full_name || 'Administrator'}</span>
                        <span class="text-[10px] text-slate-500 font-medium">System Admin</span>
                    </div>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
                </button>
                
                <!-- Dropdown Card -->
                <div id="profile-dropdown" class="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 py-1.5 hidden z-50 ring-1 ring-slate-900/5">
                    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <p class="text-xs font-bold text-slate-900 truncate">${adminDoc?.full_name || 'Administrator'}</p>
                        <p class="text-[11px] text-slate-500 truncate">${adminDoc?.email || ''}</p>
                    </div>
                    
                    <a href="#users/view/${adminDoc?.auth_id || ''}" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition">
                        <i data-lucide="user" class="w-4 h-4 text-slate-400"></i>
                        <span>Admin Profile</span>
                    </a>
                    <a href="#validator" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition">
                        <i data-lucide="check-check" class="w-4 h-4 text-slate-400"></i>
                        <span>JSON Validator Tool</span>
                    </a>

                    <div class="border-t border-slate-100 my-1"></div>

                    <button id="logout-btn" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition text-left">
                        <i data-lucide="log-out" class="w-4 h-4 text-rose-500"></i>
                        <span>Sign Out of Console</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('header-container');
    if (container) container.innerHTML = html;
}
