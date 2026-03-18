import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { reportsAPI, farmersAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import Pagination from '../components/Pagination';
import TruncatedText from '../components/TruncatedText';

const CreditPaymentHistory = () => {
    const [statement, setStatement] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exportingCsv, setExportingCsv] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [farmerSearch, setFarmerSearch] = useState('');
    const [farmerResults, setFarmerResults] = useState([]);
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });

    // FIX: race condition guard for farmer search (same pattern as CreateBill)
    const searchReqId = useRef(0);

    // ── Build query params (shared between fetch and export) ─────────────────
    // REFACTOR: was duplicated between fetchStatement and exportParams
    const buildParams = useCallback((extras = {}) => {
        const p = { ...extras };
        if (selectedFarmer?._id) p.farmerId = selectedFarmer._id;
        if (filters.startDate) p.startDate = filters.startDate;
        if (filters.endDate) p.endDate = filters.endDate;
        return p;
    }, [selectedFarmer, filters]);

    // ── Fetch statement ───────────────────────────────────────────────────────
    // FIX: original included `page` in useCallback deps AND passed `p` as an argument.
    // This caused a stale-closure loop — `fetchStatement` rebuilt every time `page`
    // changed, which re-triggered the useEffect, which called fetchStatement again.
    // Fix: remove `page` from deps; always pass the target page explicitly as argument.
    const fetchStatement = useCallback(async (targetPage) => {
        setLoading(true);
        try {
            const params = buildParams({ page: targetPage, limit: 30 });
            const res = await reportsAPI.getCreditStatement(params);
            setStatement(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setTotalRecords(res.data.totalRecords || 0);
        } catch {
            toast.error('Failed to load credit statement');
        } finally {
            setLoading(false);
        }
    }, [buildParams]); // `page` intentionally excluded — passed as arg instead

    // Re-fetch whenever filters/farmer change (reset to page 1) or page changes
    useEffect(() => {
        fetchStatement(page);
    }, [fetchStatement, page]);

    // ── Farmer search — FIX: stale response race condition ───────────────────
    useEffect(() => {
        if (farmerSearch.length < 2) {
            setFarmerResults([]);
            return;
        }
        const id = ++searchReqId.current;
        const t = setTimeout(async () => {
            try {
                const res = await farmersAPI.search(farmerSearch);
                if (id !== searchReqId.current) return; // discard stale response
                setFarmerResults(res.data || []);
            } catch {
                setFarmerResults([]);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [farmerSearch]);

    // ── Filter handlers ───────────────────────────────────────────────────────
    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(f => ({ ...f, [name]: value }));
        setPage(1); // reset pagination when filter changes
    }, []);

    const handleClearFilters = useCallback(() => {
        setSelectedFarmer(null);
        setFarmerSearch('');
        setFarmerResults([]);
        setFilters({ startDate: '', endDate: '' });
        setPage(1);
    }, []);

    // ── Shared download helper ────────────────────────────────────────────────
    // REFACTOR: CSV and PDF exports both create a download link — extracted to avoid duplication
    const triggerDownload = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        // FIX: original didn't append to DOM — silent fail in Firefox
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    // ── Shared export data fetch ──────────────────────────────────────────────
    // FIX: both CSV and PDF fetched export data separately — extracted to one place
    const fetchExportRows = useCallback(async () => {
        const res = await reportsAPI.getCreditStatementExport(buildParams());
        return Array.isArray(res?.data?.data)
            ? res.data.data
            : Array.isArray(res?.data) ? res.data : [];
    }, [buildParams]);

    // ── Export filename suffix ────────────────────────────────────────────────
    const exportSuffix = filters.startDate || filters.endDate
        ? `${filters.startDate || 'start'}-to-${filters.endDate || 'end'}`
        : 'all';

    // ── CSV Export ────────────────────────────────────────────────────────────
    const handleExportCSV = useCallback(async () => {
        setExportingCsv(true);
        try {
            const rows = await fetchExportRows();
            const escape = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
            const header = 'Date,Farmer Name,Transaction Type,Description,Debit (Rs),Credit (Rs),Balance (Rs)\n';
            const csv = header + rows.map(r => [
                formatDate(r.date), r.farmerName ?? '', r.type ?? '',
                r.description ?? '', r.debit ?? 0, r.credit ?? 0, r.balance ?? '',
            ].map(escape).join(',')).join('\n');

            triggerDownload(
                new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
                `credit-statement-${exportSuffix}.csv`
            );
            toast.success('CSV downloaded');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Export failed');
        } finally {
            setExportingCsv(false);
        }
    }, [fetchExportRows, exportSuffix]);

    // ── PDF Export ────────────────────────────────────────────────────────────
    const handleExportPDF = useCallback(async () => {
        setExportingPdf(true);
        try {
            const rows = await fetchExportRows();
            // Dynamic import keeps the react-pdf bundle out of the initial chunk
            const { pdf } = await import('@react-pdf/renderer');
            const { StatementPDFDocument } = await import('../components/StatementPDFDocument');
            const blob = await pdf(<StatementPDFDocument rows={rows} />).toBlob();
            triggerDownload(blob, `credit-statement-${exportSuffix}.pdf`);
            toast.success('PDF downloaded');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Export failed');
        } finally {
            setExportingPdf(false);
        }
    }, [fetchExportRows, exportSuffix]);

    // ── Type badge ────────────────────────────────────────────────────────────
    const typeBadge = (type) => {
        const map = {
            bill: <span className="badge badge-warning text-xs">Bill</span>,
            payment: <span className="badge badge-success text-xs">Payment</span>,
            interest: <span className="badge badge-danger text-xs">Interest</span>,
        };
        return map[type] ?? <span className="badge badge-info text-xs capitalize">{type}</span>;
    };

    // ── Derived: any filter is active ─────────────────────────────────────────
    const hasActiveFilters = !!(selectedFarmer || filters.startDate || filters.endDate);

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 sm:p-6 flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-title">Credit &amp; Payments</h1>
                        <p className="page-subtitle">
                            Full credit statement (bills + payments) like a bank ledger.
                            Filter by farmer or date range.
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            disabled={exportingCsv || loading}
                            className="btn-outline text-sm"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>table_view</span>
                            {exportingCsv ? 'Exporting…' : 'CSV'}
                        </button>
                        <button
                            type="button"
                            onClick={handleExportPDF}
                            disabled={exportingPdf || loading}
                            className="btn-outline text-sm"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>picture_as_pdf</span>
                            {exportingPdf ? 'Exporting…' : 'PDF'}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="card p-4 flex flex-col sm:flex-row gap-4 flex-wrap items-end">

                    {/* Farmer search */}
                    <div className="flex-1 min-w-[200px] relative">
                        <label className="label">Filter by Farmer</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={selectedFarmer ? selectedFarmer.name : farmerSearch}
                                onChange={(e) => {
                                    if (selectedFarmer) setSelectedFarmer(null);
                                    setFarmerSearch(e.target.value);
                                }}
                                placeholder="Name or mobile…"
                                className="input pr-8"
                            />
                            {/* QUICK WIN: clear button when a farmer is selected */}
                            {selectedFarmer && (
                                <button
                                    type="button"
                                    onClick={() => { setSelectedFarmer(null); setFarmerSearch(''); setPage(1); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                </button>
                            )}
                        </div>
                        {farmerResults.length > 0 && !selectedFarmer && (
                            <ul className="absolute top-full mt-1 left-0 right-0 z-20 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-lg max-h-48 overflow-y-auto">
                                {farmerResults.map((f) => (
                                    <li
                                        key={f._id}
                                        onClick={() => {
                                            setSelectedFarmer(f);
                                            setFarmerSearch('');
                                            setFarmerResults([]);
                                            setPage(1);
                                        }}
                                        className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm border-b border-slate-100 dark:border-slate-800 last:border-0"
                                    >
                                        <span className="font-medium">{f.name}</span>
                                        <span className="text-slate-500 ml-2 text-xs">{f.mobile}</span>
                                        <span className="text-slate-400 ml-2 text-xs">{f.village}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {selectedFarmer && (
                            <p className="mt-1 text-xs text-primary font-medium">
                                Showing: {selectedFarmer.name}
                            </p>
                        )}
                    </div>

                    {/* Date range */}
                    <div className="flex-1 min-w-[140px]">
                        <label className="label">Start Date</label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            max={filters.endDate || undefined}
                            className="input"
                        />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="label">End Date</label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            min={filters.startDate || undefined}
                            className="input"
                        />
                    </div>

                    {/* QUICK WIN: only show Clear when filters are actually active */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="btn-outline text-sm shrink-0"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_alt_off</span>
                            Clear
                        </button>
                    )}
                </div>

                {/* Table Card */}
                <div className="card overflow-hidden flex flex-col min-h-0">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <h3 className="font-bold">Credit Statement — Bills &amp; Payments</h3>
                        <span className="text-xs text-slate-400">
                            {loading ? '…' : `${totalRecords} transaction${totalRecords !== 1 ? 's' : ''}`}
                        </span>
                    </div>

                    <div className="overflow-x-auto min-h-0 max-h-[50vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                {/* QUICK WIN: sticky header so columns stay visible while scrolling */}
                                <tr className="bg-slate-50 dark:bg-slate-800/60">
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Farmer</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Description</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Debit (₹)</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Credit (₹)</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Balance (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            {/* QUICK WIN: per-cell skeletons look more realistic */}
                                            <td className="px-4 py-3"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                            <td className="px-4 py-3"><div className="h-5 w-14 bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                                            <td className="px-4 py-3"><div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                            <td className="px-4 py-3"><div className="h-3.5 w-36 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                            <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                                            <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                                            <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : statement.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center">
                                            <span className="material-symbols-outlined block text-5xl mb-3 text-slate-200">account_balance</span>
                                            <p className="text-slate-400 text-sm">No transactions in this period</p>
                                            <p className="text-slate-300 text-xs mt-1">
                                                {hasActiveFilters
                                                    ? 'Try adjusting or clearing your filters'
                                                    : 'Select a farmer or adjust date range'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    statement.map((row, idx) => (
                                        <tr
                                            key={`${row.type}-${row.ref}-${idx}`}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {formatDate(row.date)}
                                            </td>
                                            <td className="px-4 py-3">{typeBadge(row.type)}</td>
                                            <td className="px-4 py-3 text-sm font-medium">
                                                <TruncatedText text={row?.farmerName || '–'} />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                <TruncatedText text={row?.description || '–'} />
                                            </td>
                                            {/* FIX: show '–' for falsy zero too — use null/undefined check, not truthiness */}
                                            <td className="px-4 py-3 text-right font-medium text-red-600">
                                                {row.debit != null ? formatCurrency(row.debit) : '–'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                                {row.credit != null ? formatCurrency(row.credit) : '–'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-200">
                                                {/* QUICK WIN: colour the running balance — red if in debit */}
                                                <span className={row.balance < 0 ? 'text-red-600' : ''}>
                                                    {formatCurrency(row.balance)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalRecords={totalRecords}
                            onPageChange={setPage}
                            limit={30}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreditPaymentHistory;