export function renderSidebar(adminDoc) {
    const sidebarHtml = `
        <!-- Sidebar Brand Header -->
        <div class="h-20 flex items-center px-6 border-b border-slate-100 bg-white/50">
            <a href="#dashboard" class="flex items-center gap-3 group">
                <div class="w-11 h-11 rounded-xl bg-white shadow-sm border border-slate-200/80 p-1 flex items-center justify-center group-hover:shadow transition">
                    <img src="assets/funglogo.png" alt="FUNGEP Logo" class="w-full h-full object-contain">
                </div>
                <div class="flex flex-col">
                    <div class="flex items-center gap-1.5">
                        <span class="font-extrabold text-slate-900 tracking-tight text-base leading-tight">FUNGEP</span>
                        <span class="px-1.5 py-0.2 text-[10px] font-bold rounded bg-sky-100 text-sky-700">v2.0</span>
                    </div>
                    <span class="text-xs font-semibold text-slate-600 tracking-wider uppercase">Admin Console</span>
                </div>
            </a>
        </div>

        <!-- Navigation Menu -->
        <div class="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            <!-- Group 1: Analytics -->
            <div>
                <p class="px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Analytics & Command</p>
                <nav class="space-y-1">
                    <a href="#dashboard" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="dashboard">
                        <i data-lucide="layout-dashboard" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>KPI Dashboard</span>
                    </a>
                    <a href="#attempts" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="attempts">
                        <i data-lucide="activity" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>Live Exam Telemetry</span>
                    </a>
                    <a href="#sessions" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="sessions">
                        <i data-lucide="shield-check" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>User Sessions & Logins</span>
                    </a>
                </nav>
            </div>

            <!-- Group 2: Examination & Academics -->
            <div>
                <p class="px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Academics & Tests</p>
                <nav class="space-y-1">
                    <a href="#mock-tests" class="nav-link group flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="mock-tests">
                        <div class="flex items-center gap-3">
                            <i data-lucide="layers" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                            <span>Mock Test Manager</span>
                        </div>
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">3-File</span>
                    </a>
                    <a href="#past-papers" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="past-papers">
                        <i data-lucide="file-text" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>Past Papers & Drive</span>
                    </a>
                    <a href="#universities" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="universities">
                        <i data-lucide="school" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>Universities & Pattern</span>
                    </a>
                </nav>
            </div>

            <!-- Group 3: Students & Monetization -->
            <div>
                <p class="px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Students & Revenue</p>
                <nav class="space-y-1">
                    <a href="#users" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="users">
                        <i data-lucide="users" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>Student Directory</span>
                    </a>
                    <a href="#premium-requests" class="nav-link group flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="premium-requests">
                        <div class="flex items-center gap-3">
                            <i data-lucide="credit-card" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                            <span>Premium Orders</span>
                        </div>
                        <span id="sidebar-pending-badge" class="hidden text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">0</span>
                    </a>
                    <a href="#subscriptions" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="subscriptions">
                        <i data-lucide="shield-check" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>Subscriptions</span>
                    </a>
                    <a href="#coupons" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="coupons">
                        <i data-lucide="ticket" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>Coupons & Promos</span>
                    </a>
                </nav>
            </div>

            <!-- Group 4: Operations & Support -->
            <div>
                <p class="px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Operations & Support</p>
                <nav class="space-y-1">
                    <a href="#feedback" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="feedback">
                        <i data-lucide="life-buoy" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>Helpdesk & Tickets</span>
                    </a>
                    <a href="#validator" class="nav-link group flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition-colors" data-target="validator">
                        <i data-lucide="check-check" class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0"></i>
                        <span>JSON Schema Validator</span>
                    </a>
                </nav>
            </div>
        </div>

        <!-- Sidebar Footer Admin Card -->
        <div class="p-3 border-t border-slate-100 bg-slate-50/60">
            <div class="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/70 shadow-sm">
                <div class="w-9 h-9 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                    ${(adminDoc?.full_name || 'Admin').charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-slate-800 truncate">${adminDoc?.full_name || 'Administrator'}</p>
                    <p class="text-[11px] text-slate-600 font-medium truncate">${adminDoc?.role || 'Root Admin'}</p>
                </div>
                <button id="sidebar-logout-btn" title="Sign Out" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;

    const desktopContainer = document.getElementById('sidebar-container');
    const mobileContainer = document.getElementById('mobile-sidebar-container');
    if (desktopContainer) desktopContainer.innerHTML = sidebarHtml;
    if (mobileContainer) mobileContainer.innerHTML = sidebarHtml;
}
