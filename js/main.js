import { authService } from './services/authService.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { showToast } from './components/toast.js';

// Import View Controllers
import { dashboardController } from './controllers/dashboardController.js';
import { pastPapersController } from './controllers/pastPapersController.js';
import { universitiesController } from './controllers/universitiesController.js';
import { usersController } from './controllers/usersController.js';
import { premiumRequestsController } from './controllers/premiumRequestsController.js';
import { feedbackController } from './controllers/feedbackController.js';
import { reviewsController } from './controllers/reviewsController.js';
import { couponsController } from './controllers/couponsController.js';
import { subscriptionsController } from './controllers/subscriptionsController.js';

class App {
    constructor() {
        this.adminDoc = null;
        this.currentRoute = 'dashboard';
        this.controllers = {
            'dashboard': dashboardController,
            'past-papers': pastPapersController,
            'universities': universitiesController,
            'users': usersController,
            'premium-requests': premiumRequestsController,
            'feedback': feedbackController,
            'reviews': reviewsController,
            'coupons': couponsController,
            'subscriptions': subscriptionsController
        };
    }

    async init() {
        try {
            // Check for OAuth callback parameters
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            const secret = urlParams.get('secret');

            if (userId && secret) {
                // Remove the sensitive params from the URL immediately
                window.history.replaceState({}, document.title, window.location.pathname);
                await authService.finalizeSession(userId, secret);
            }

            // Check current Appwrite session
            const user = await authService.getCurrentUser();

            if (!user) {
                document.getElementById('login-view').classList.remove('hidden');
                this.setupLoginEvents();
                return;
            }



            // User is authenticated, check if they are admin
            this.adminDoc = await authService.getAdminDocument(user.$id);
            
            if (!this.adminDoc) {
                document.getElementById('unauthorized-view').classList.remove('hidden');
                document.getElementById('logout-btn-unauth').addEventListener('click', () => authService.logout());
                return;
            }

            // User is admin, show app
            document.getElementById('app').classList.remove('hidden');
            
            this.renderLayout();
            this.setupAppEvents();
            
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
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;

                btn.disabled = true;
                btn.textContent = 'Signing in...';

                try {
                    await authService.loginWithEmail(email, password);
                    window.location.reload(); // Reload to initialize app with active session
                } catch (error) {
                    showToast(error.message || "Login failed. Please check your credentials.", "error");
                    btn.disabled = false;
                    btn.textContent = 'Sign In';
                }
            });
        }
    }

    renderLayout() {
        renderSidebar(this.adminDoc);
        renderHeader(this.adminDoc);
        if (window.lucide) window.lucide.createIcons();
    }

    setupAppEvents() {
        // Mobile Sidebar Toggle
        const overlay = document.getElementById('sidebar-overlay');
        const mobileSidebar = document.getElementById('mobile-sidebar-container');
        const menuBtn = document.getElementById('mobile-menu-btn');

        const toggleSidebar = () => {
            overlay.classList.toggle('hidden');
            if (mobileSidebar.classList.contains('-translate-x-full')) {
                mobileSidebar.classList.remove('-translate-x-full');
            } else {
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

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => authService.logout());
        }

        // Navigation clicks for mobile closing
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (!mobileSidebar.classList.contains('-translate-x-full')) {
                    toggleSidebar();
                }
            });
        });
    }

    async handleHashChange() {
        let hash = window.location.hash.replace('#', '') || 'dashboard';
        
        // Handle routes like #past-papers/edit/123
        const parts = hash.split('/');
        const route = parts[0];
        
        if (!this.controllers[route]) {
            hash = 'dashboard';
        }

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-target') === route) {
                link.classList.add('bg-blue-50', 'text-primary');
                link.classList.remove('text-gray-700', 'hover:bg-gray-50');
                
                // Update header title
                const titleEl = document.getElementById('header-title');
                if (titleEl) titleEl.textContent = link.textContent.trim();
            } else {
                link.classList.remove('bg-blue-50', 'text-primary');
                link.classList.add('text-gray-700', 'hover:bg-gray-50');
            }
        });

        const mainView = document.getElementById('main-view');
        mainView.innerHTML = '<div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>';
        
        try {
            const controller = this.controllers[route];
            if (controller && typeof controller.render === 'function') {
                await controller.render(mainView, parts.slice(1));
            } else {
                mainView.innerHTML = `<div class="p-8 text-center text-gray-500">View for ${route} is under construction.</div>`;
            }
        } catch (error) {
            console.error(`Error rendering route ${route}:`, error);
            mainView.innerHTML = `<div class="p-8 text-center text-red-500">Error loading view.</div>`;
        }

        if (window.lucide) window.lucide.createIcons();
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
