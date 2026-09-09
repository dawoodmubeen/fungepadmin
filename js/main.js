import { authService } from './services/authService.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { showToast } from './components/toast.js';
import { databases, CONFIG, Query } from './appwrite/config.js';

// Import View Controllers
import { dashboardController } from './controllers/dashboardController.js';
import { pastPapersController } from './controllers/pastPapersController.js';
import { universitiesController } from './controllers/universitiesController.js';
import { usersController } from './controllers/usersController.js';
import { premiumRequestsController } from './controllers/premiumRequestsController.js';
import { feedbackController } from './controllers/feedbackController.js';
import { couponsController } from './controllers/couponsController.js';
import { subscriptionsController } from './controllers/subscriptionsController.js';
import { mockTestsController } from './controllers/mockTestsController.js';
import { attemptsController } from './controllers/attemptsController.js';
import { validatorController } from './controllers/validatorController.js';
import { sessionsController } from './controllers/sessionsController.js';

class App {
    constructor() {
        this.adminDoc = null;
        this.currentRoute = 'dashboard';
        this.controllers = {
            'dashboard': dashboardController,
            'attempts': attemptsController,
            'sessions': sessionsController,
            'user-sessions': sessionsController,
            'mock-tests': mockTestsController,
            'past-papers': pastPapersController,
            'universities': universitiesController,
            'users': usersController,
            'premium-requests': premiumRequestsController,
            'subscriptions': subscriptionsController,
            'coupons': couponsController,
            'feedback': feedbackController,
            'reviews': feedbackController, // Reviews are managed in feedback with category filter
            'validator': validatorController
        };
    }

    async init() {
        try {
            // Check for OAuth callback parameters if any
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            const secret = urlParams.get('secret');

            if (userId && secret) {
                window.history.replaceState({}, document.title, window.location.pathname);
                await authService.finalizeSession(userId, secret);
            }

            // Check current Appwrite session
            const user = await authService.getCurrentUser();

            if (!user) {
                document.getElementById('login-view').classList.remove('hidden');
                this.setupLoginEvents();
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            // User is authenticated, check if they are admin
            this.adminDoc = await authService.getAdminDocument(user.$id);
            
            if (!this.adminDoc) {
                document.getElementById('unauthorized-view').classList.remove('hidden');
                document.getElementById('logout-btn-unauth').addEventListener('click', () => authService.logout());
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            // User is authenticated and authorized as admin
            document.getElementById('app').classList.remove('hidden');
            
            this.renderLayout();
            this.setupAppEvents();
            this.updatePendingBadges();
            
            // Handle initial routing and listen for changes
            this.handleHashChange();
            window.addEventListener('hashchange', () => this.handleHashChange());
            
        } catch (error) {
            console.error("App init error:", error);
            showToast("Failed to initialize application.", "error");
        }
    }

    setupLoginEvents() {
        const form = document.getElementById('email-login-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('login-submit-btn');
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;

                btn.disabled = true;
                btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Signing In...</span>`;

                try {
                    await authService.loginWithEmail(email, password);
                    window.location.reload();
                } catch (error) {
                    showToast(error.message || "Login failed. Please verify credentials.", "error");
                    btn.disabled = false;
                    btn.innerHTML = `<span>Authenticate & Access</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
                    if (window.lucide) window.lucide.createIcons();
                }
            });
        }
    }

    renderLayout() {
        renderSidebar(this.adminDoc);
        renderHeader(this.adminDoc);
        if (window.lucide) window.lucide.createIcons();
    }

    async updatePendingBadges() {
        try {
            const reqs = await databases.listDocuments(CONFIG.databaseId, CONFIG.premiumRequestsCol, [
                Query.equal('status', 'pending'),
                Query.limit(1)
            ]);
            const badge = document.getElementById('sidebar-pending-badge');
            if (badge) {
                if (reqs.total > 0) {
                    badge.textContent = reqs.total > 99 ? '99+' : reqs.total;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch (e) {
            // Non-critical badge count
        }
    }

    setupAppEvents() {
        // Mobile Sidebar Drawer Toggle
        const overlay = document.getElementById('sidebar-overlay');
        const mobileSidebar = document.getElementById('mobile-sidebar-container');
        const menuBtn = document.getElementById('mobile-menu-btn');

        const toggleSidebar = () => {
            if (!overlay || !mobileSidebar) return;
            const isClosed = mobileSidebar.classList.contains('-translate-x-full');
            if (isClosed) {
                overlay.classList.remove('hidden');
                mobileSidebar.classList.remove('-translate-x-full');
            } else {
                overlay.classList.add('hidden');
                mobileSidebar.classList.add('-translate-x-full');
            }
        };

        if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
        if (overlay) overlay.addEventListener('click', toggleSidebar);

        // Profile Dropdown
        const profileBtn = document.getElementById('profile-dropdown-btn');
        const profileDropdown = document.getElementById('profile-dropdown');
        if (profileBtn && profileDropdown) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', (e) => {
                if (!profileDropdown.contains(e.target)) {
                    profileDropdown.classList.add('hidden');
                }
            });
        }

        // Logout buttons
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => authService.logout());

        const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
        if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', () => authService.logout());

        // Close mobile drawer upon navigating
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (mobileSidebar && !mobileSidebar.classList.contains('-translate-x-full')) {
                    toggleSidebar();
                }
            });
        });
    }

    async handleHashChange() {
        let hash = window.location.hash.replace('#', '') || 'dashboard';
        const parts = hash.split('/');
        const route = parts[0];
        
        const activeRoute = this.controllers[route] ? route : 'dashboard';

        // Update active nav link styling
        document.querySelectorAll('.nav-link').forEach(link => {
            const target = link.getAttribute('data-target');
            if (target === activeRoute) {
                link.classList.add('bg-sky-50', 'text-sky-700', 'font-bold', 'shadow-xs');
                link.classList.remove('text-slate-600', 'hover:bg-sky-50/70');
                const icon = link.querySelector('i');
                if (icon) icon.classList.add('text-sky-600');
            } else {
                link.classList.remove('bg-sky-50', 'text-sky-700', 'font-bold', 'shadow-xs');
                link.classList.add('text-slate-600', 'hover:bg-sky-50/70');
                const icon = link.querySelector('i');
                if (icon) icon.classList.remove('text-sky-600');
            }
        });

        // Update header breadcrumb title
        const titleEl = document.getElementById('header-title');
        if (titleEl) {
            const titleMap = {
                'dashboard': 'Executive KPI Dashboard',
                'attempts': 'Live Exam Telemetry & Sessions',
                'sessions': 'User Sessions & Logins Telemetry',
                'user-sessions': 'User Sessions & Logins Telemetry',
                'mock-tests': 'Mock Test Builder & 3-File Manager',
                'past-papers': 'Past Papers & Digital Drive',
                'universities': 'Universities & Pattern Blueprint Editor',
                'users': 'Student & User Directory',
                'premium-requests': 'Premium Request Approval Terminal',
                'subscriptions': 'Subscription Manager',
                'coupons': 'Coupons & Promotional Engine',
                'feedback': 'Helpdesk & Ticket Center',
                'validator': 'JSON Schema Integrity Validator'
            };
            titleEl.textContent = titleMap[activeRoute] || 'Enterprise Admin Console';
        }

        const mainView = document.getElementById('main-view');
        mainView.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <div class="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="mt-4 text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading Workbench...</p>
            </div>
        `;
        
        try {
            const controller = this.controllers[activeRoute];
            if (controller && typeof controller.render === 'function') {
                await controller.render(mainView, parts.slice(1));
            } else {
                mainView.innerHTML = `<div class="p-8 text-center text-slate-500">Workbench for ${activeRoute} is currently unavailable.</div>`;
            }
        } catch (error) {
            console.error(`Error rendering route ${activeRoute}:`, error);
            mainView.innerHTML = `
                <div class="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center">
                    <p class="text-rose-700 font-bold">Error loading workbench</p>
                    <p class="text-xs text-rose-500 mt-1">${error.message || 'Please check console for details.'}</p>
                </div>
            `;
        }

        if (window.lucide) window.lucide.createIcons();
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
