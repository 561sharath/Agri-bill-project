import { useMemo } from 'react';

const Pagination = ({ currentPage, totalPages, totalRecords, onPageChange, limit = 10 }) => {
    const range = useMemo(() => {
        const delta = 2;
        const left = currentPage - delta;
        const right = currentPage + delta + 1;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= left && i < right)) {
                range.push(i);
            }
        }

        for (const i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    }, [currentPage, totalPages]);

    if (totalPages <= 1) return null;

    const start = (currentPage - 1) * limit + 1;
    const end = Math.min(currentPage * limit, totalRecords);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
            <div className="text-xs text-slate-500">
                Showing <span className="font-bold text-slate-800 dark:text-slate-200">{start}</span> to <span className="font-bold text-slate-800 dark:text-slate-200">{end}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{totalRecords}</span> records
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                    <span className="material-symbols-outlined text-sm" style={{ fontSize: '18px' }}>chevron_left</span>
                </button>

                {range.map((p, i) => (
                    p === '...' ? (
                        <span key={`dots-${i}`} className="px-2 text-slate-400">...</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`
                                min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all cursor-pointer
                                ${currentPage === p
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                                }
                            `}
                        >
                            {p}
                        </button>
                    )
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                    <span className="material-symbols-outlined text-sm" style={{ fontSize: '18px' }}>chevron_right</span>
                </button>
            </div>
        </div>
    );
};

export default Pagination;
