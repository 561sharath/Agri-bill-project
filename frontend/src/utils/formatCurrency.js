/**
 * Format a number as Indian currency (₹)
 * @param {number} amount
 * @param {boolean} compact - Use compact notation (e.g. ₹12.5K)
 */
export const formatCurrency = (amount, compact = false) => {
    if (amount == null || isNaN(amount)) return '₹0';
    const num = Number(amount);
    if (compact) {
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num);
};

/**
 * Format a date to display string
 * @param {string|Date} date
 */
export const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

/**
 * Get initials from a name string
 */
export const getInitials = (name = '') => {
    return name
        .split(' ')
        .slice(0, 2)
        .map(n => n[0]?.toUpperCase() ?? '')
        .join('');
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text = '', maxLen = 30) => {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
};

/**
 * Generate a random color for avatars based on name
 */
export const avatarColor = (name = '') => {
    const colors = [
        'bg-primary/20 text-primary',
        'bg-blue-100 text-blue-700',
        'bg-purple-100 text-purple-700',
        'bg-amber-100 text-amber-700',
        'bg-rose-100 text-rose-700',
        'bg-teal-100 text-teal-700',
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
};
