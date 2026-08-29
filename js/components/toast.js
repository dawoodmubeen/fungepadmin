export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: '<i data-lucide="check-circle" class="w-5 h-5 text-green-500"></i>',
        error: '<i data-lucide="alert-circle" class="w-5 h-5 text-red-500"></i>',
        warning: '<i data-lucide="alert-triangle" class="w-5 h-5 text-yellow-500"></i>',
        info: '<i data-lucide="info" class="w-5 h-5 text-blue-500"></i>'
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const toast = document.createElement('div');
    toast.className = `toast-item flex items-center p-4 rounded-lg border shadow-sm ${bgColors[type]}`;
    
    toast.innerHTML = `
        <div class="mr-3 flex-shrink-0">${icons[type]}</div>
        <div class="text-sm font-medium flex-1">${message}</div>
        <button class="toast-close ml-4 text-gray-500 hover:text-gray-700 focus:outline-none">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;

    container.appendChild(toast);
    
    // Initialize Lucide icons for the new toast
    if (window.lucide) {
        window.lucide.createIcons({ root: toast });
    }

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });
    });

    const removeToast = () => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', removeToast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) removeToast();
    }, 4000);
}
