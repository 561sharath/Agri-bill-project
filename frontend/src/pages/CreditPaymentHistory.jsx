import { useState, useEffect, useCallback } from 'react';
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

    const fetchStatement = useCallback(async (p = page) => {
        setLoading(true);
        try {
            const params = { page: p, limit: 30 };
            if (selectedFarmer?._id) params.farmerId = selectedFarmer._id;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            const res = await reportsAPI.getCreditStatement(params);
            setStatement(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setTotalRecords(res.data.totalRecords || 0);
        } catch {
            toast.error('Failed to load credit statement');
        } finally {
            setLoading(false);
        }
    }, [page, selectedFarmer?._id, filters.startDate, filters.endDate]);

    useEffect(() => {
        fetchStatement(page);
    }, [fetchStatement]);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (farmerSearch.length >= 2) {
                try {
                    const res = await farmersAPI.search(farmerSearch);
                    setFarmerResults(res.data || []);
                } catch {
                    setFarmerResults([]);
                }
            } else {
                setFarmerResults([]);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [farmerSearch]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(f => ({ ...f, [name]: value }));
        setPage(1);
    }, []);

    const handleClearFilters = useCallback(() => {
        setSelectedFarmer(null);
        setFarmerSearch('');
        setFilters({ startDate: '', endDate: '' });
        setPage(1);
    }, []);

    const exportParams = useCallback(() => {
        const p = {};
        if (selectedFarmer?._id) p.farmerId = selectedFarmer._id;
        if (filters.startDate) p.startDate = filters.startDate;
        if (filters.endDate) p.endDate = filters.endDate;
        return p;
    }, [selectedFarmer, filters]);

    const handleExportCSV = useCallback(async () => {
        setExportingCsv(true);
        try {
            const res = await reportsAPI.getCreditStatementExport(exportParams());
            const rows = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
            const header = 'Date,Farmer Name,Transaction Type,Description,Debit (Rs),Credit (Rs),Balance (Rs)\n';
            const escape = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
            const rowToCsv = (r) => [
                formatDate(r.date), r.farmerName ?? '', r.type ?? '',
                r.description ?? '', r.debit ?? 0, r.credit ?? 0, r.balance ?? '',
            ].map(escape).join(',');
            const csv = header + rows.map(rowToCsv).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `credit-statement-${filters.startDate || 'all'}-to-${filters.endDate || 'all'}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('CSV downloaded');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Export failed');
        } finally {
            setExportingCsv(false);
        }
    }, [exportParams, filters]);

    const handleExportPDF = useCallback(async () => {
        setExportingPdf(true);
        try {
            const res = await reportsAPI.getCreditStatementExport(exportParams());
            const rows = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
            
            // Dynamic import to prevent multi-megabyte blocking LCP
            const { pdf } = await import('@react-pdf/renderer');
            const { StatementPDFDocument } = await import('../components/StatementPDFDocument');
            
            const blob = await pdf(<StatementPDFDocument rows={rows} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `credit-statement-${filters.startDate || 'all'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('PDF downloaded');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Export failed');
        } finally {
            setExportingPdf(false);
        }
    }, [exportParams, filters]);

    const typeBadge = (type) => {
        if (type === 'bill') return <span className="badge badge-warning text-xs">Bill</span>;
        if (type === 'payment') return <span className="badge badge-success text-xs">Payment</span>;
        if (type === 'interest') return <span className="badge badge-danger text-xs">Interest</span>;
        return <span className="badge badge-info text-xs capitalize">{type}</span>;
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 sm:p-6 flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-title">Credit &amp; Payments</h1>
                        <p className="page-subtitle">Full credit statement (bills + payments) like a bank ledger. Filter by farmer or date range.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={handleExportCSV} disabled={exportingCsv} className="btn-outline text-sm">
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>table_view</span>
                            {exportingCsv ? 'Exporting...' : 'CSV'}
                        </button>
                        <button type="button" onClick={handleExportPDF} disabled={exportingPdf} className="btn-outline text-sm">
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>picture_as_pdf</span>
                            {exportingPdf ? 'Exporting...' : 'PDF'}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="card p-4 flex flex-col sm:flex-row gap-4 flex-wrap items-end">
                    <div className="flex-1 min-w-[200px] relative">
                        <label className="label">Filter by Farmer</label>
                        <input
                            type="text"
                            value={selectedFarmer ? selectedFarmer.name : farmerSearch}
                            onChange={(e) => {
                                if (selectedFarmer) setSelectedFarmer(null);
                                setFarmerSearch(e.target.value);
                            }}
                            placeholder="Name or mobile..."
                            className="input"
                        />
                        {farmerResults.length > 0 && !selectedFarmer && (
                            <ul className="absolute top-full mt-1 left-0 right-0 z-20 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-lg max-h-48 overflow-y-auto">
                                {farmerResults.map((f) => (
                                    <li
                                        key={f._id}
                                        onClick={() => { setSelectedFarmer(f); setFarmerSearch(''); setFarmerResults([]); setPage(1); }}
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
                            <p className="mt-1 text-xs text-slate-500">
                                Filtered: <strong>{selectedFarmer.name}</strong>
                            </p>
                        )}
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="label">Start Date</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="input" />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="label">End Date</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="input" min={filters.startDate} />
                    </div>
                    <button type="button" onClick={handleClearFilters} className="btn-outline text-sm shrink-0">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_alt_off</span>
                        Clear
                    </button>
                </div>

                {/* Table Card */}
                <div className="card overflow-hidden flex flex-col min-h-0">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <h3 className="font-bold">Credit Statement — Bills &amp; Payments</h3>
                        <span className="text-xs text-slate-400">{totalRecords} transaction{totalRecords !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="overflow-x-auto min-h-0 max-h-[50vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
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
                                            <td colSpan={7} className="px-4 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                                        </tr>
                                    ))
                                ) : statement.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center">
                                            <span className="material-symbols-outlined block text-5xl mb-3 text-slate-200">account_balance</span>
                                            <p className="text-slate-400 text-sm">No transactions in this period</p>
                                            <p className="text-slate-300 text-xs mt-1">Select a farmer or adjust date range</p>
                                        </td>
                                    </tr>
                                ) : (
                                    statement.map((row, idx) => (
                                        <tr key={`${row.type}-${row.ref}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(row.date)}</td>
                                            <td className="px-4 py-3">{typeBadge(row.type)}</td>
                                            <td className="px-4 py-3 text-sm font-medium">
                                                <TruncatedText text={row?.farmerName || '-'} />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                <TruncatedText text={row?.description || '-'} />
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-red-600">{row.debit ? formatCurrency(row.debit) : '–'}</td>
                                            <td className="px-4 py-3 text-right font-medium text-emerald-600">{row.credit ? formatCurrency(row.credit) : '–'}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-200">{formatCurrency(row.balance)}</td>
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
