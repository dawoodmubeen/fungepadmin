import { databases, Query } from '../appwrite/config.js';

/**
 * Fetch all documents from an Appwrite collection by automatically batching up to maxLimit.
 * Handles Appwrite's 100-item page limit and provides resilient fallback if an order/filter query fails.
 */
export async function fetchAllDocuments(databaseId, collectionId, baseQueries = [], maxLimit = 3000) {
    const batchSize = 100;
    let allDocuments = [];
    let offset = 0;
    let total = Infinity;

    // Clone base queries
    const sanitizedQueries = [...baseQueries];

    while (offset < total && allDocuments.length < maxLimit) {
        const pageQueries = [
            ...sanitizedQueries.filter(q => !q.includes?.('limit') && !q.includes?.('offset')),
            Query.limit(batchSize),
            Query.offset(offset)
        ];

        try {
            const res = await databases.listDocuments(databaseId, collectionId, pageQueries);
            const docs = res.documents || [];
            allDocuments = allDocuments.concat(docs);
            total = typeof res.total === 'number' ? res.total : allDocuments.length;

            if (docs.length < batchSize) {
                break; // Last page reached
            }
            offset += batchSize;
        } catch (err) {
            console.warn(`Query batch failed on ${collectionId} at offset ${offset}, attempting resilient fallback:`, err);
            // If complex queries failed, try without custom sorting/filtering
            if (sanitizedQueries.length > 0) {
                try {
                    const fallbackRes = await databases.listDocuments(databaseId, collectionId, [
                        Query.limit(batchSize),
                        Query.offset(offset)
                    ]);
                    const fallbackDocs = fallbackRes.documents || [];
                    allDocuments = allDocuments.concat(fallbackDocs);
                    total = typeof fallbackRes.total === 'number' ? fallbackRes.total : allDocuments.length;
                    if (fallbackDocs.length < batchSize) break;
                    offset += batchSize;
                } catch (fallbackErr) {
                    console.error(`Fallback failed on ${collectionId}:`, fallbackErr);
                    break;
                }
            } else {
                break;
            }
        }
    }

    return allDocuments;
}

/**
 * Performs multi-field, full-database search and in-memory pagination.
 */
export function filterAndPaginate(dataset, {
    searchQuery = '',
    searchFields = [],
    filterFn = null,
    sortFn = null,
    page = 1,
    limit = 20
} = {}) {
    const q = (searchQuery || '').trim().toLowerCase();

    let filtered = dataset || [];

    // Apply active dropdown / tab filter
    if (typeof filterFn === 'function') {
        filtered = filtered.filter(filterFn);
    }

    // Apply full-dataset search across specified attributes
    if (q.length > 0) {
        filtered = filtered.filter(item => {
            if (!item) return false;

            // Always check document ID
            if (item.$id && item.$id.toLowerCase().includes(q)) return true;

            // Check each designated search field
            for (const field of searchFields) {
                if (typeof field === 'function') {
                    const val = field(item);
                    if (val && String(val).toLowerCase().includes(q)) return true;
                } else if (typeof field === 'string') {
                    const val = item[field];
                    if (val !== null && val !== undefined && String(val).toLowerCase().includes(q)) {
                        return true;
                    }
                }
            }
            return false;
        });
    }

    // Apply custom sort if provided
    if (typeof sortFn === 'function') {
        filtered = [...filtered].sort(sortFn);
    }

    const totalMatches = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalMatches / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);

    const startIdx = (safePage - 1) * limit;
    const paginatedItems = filtered.slice(startIdx, startIdx + limit);

    return {
        items: paginatedItems,
        total: totalMatches,
        totalPages,
        currentPage: safePage,
        hasPrev: safePage > 1,
        hasNext: safePage < totalPages,
        startIndex: totalMatches > 0 ? startIdx + 1 : 0,
        endIndex: Math.min(startIdx + limit, totalMatches)
    };
}

/**
 * Debounce helper to prevent excessive rendering while typing.
 */
export function debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format duration in seconds to a human-readable string.
 */
export function formatDuration(seconds) {
    const s = parseInt(seconds, 10);
    if (isNaN(s) || s <= 0) return '0s';
    
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
}

/**
 * Format timestamps nicely with relative or localized representation.
 */
export function formatDateTime(isoString) {
    if (!isoString) return '—';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return String(isoString);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    } catch (e) {
        return String(isoString);
    }
}
