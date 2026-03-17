import { useState, useEffect } from 'react';
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

    const fetchStatement = async (p = page) => {
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
    };

    useEffect(() => {
        fetchStatement(page);
    }, [page, selectedFarmer?._id, filters.startDate, filters.endDate]);

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

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(f => ({ ...f, [name]: value }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setSelectedFarmer(null);
        setFarmerSearch('');
        setFilters({ startDate: '', endDate: '' });
        setPage(1);
    };

    const exportParams = () => {
        const p = {};
        if (selectedFarmer?._id) p.farmerId = selectedFarmer._id;
        if (filters.startDate) p.startDate = filters.startDate;
        if (filters.endDate) p.endDate = filters.endDate;
        return p;
    };

    const handleExportCSV = async () => {
        setExportingCsv(true);
        try {
            const res = await reportsAPI.getCreditStatementExport(exportParams());
            const rows = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
            const header = 'Date,Farmer Name,Transaction Type,Description,Debit (₹),Credit (₹),Balance (₹)\n';
            const escape = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
            const rowToCsv = (r) => [
                formatDate(r.date),
                r.farmerName ?? '',
                r.type ?? '',
                r.description ?? '',
                r.debit ?? 0,
                r.credit ?? 0,
                r.balance ?? '',
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
            console.error('CSV export error', err);
            toast.error(err.response?.data?.message || 'Export failed');
        } finally {
            setExportingCsv(false);
        }
    };

    const handleExportPDF = async () => {
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
            console.error('PDF export error', err);
            toast.error(err.response?.data?.message || 'Export failed');
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Credit & Payments</h1>
                <p className="page-subtitle">Full credit statement (bills + payments) like a bank statement. Search by farmer or filter by date.</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={handleExportCSV} disabled={exportingCsv} className="btn-outline text-sm">
                        {exportingCsv ? '...' : 'Download CSV'}
                    </button>
                    <button type="button" onClick={handleExportPDF} disabled={exportingPdf} className="btn-outline text-sm">
                        {exportingPdf ? '...' : 'Download PDF'}
                    </button>
                </div>
            </div>

            <div className="card p-4 flex flex-col sm:flex-row gap-4 flex-wrap items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="label">Search / Select Farmer</label>
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
                        <ul className="mt-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-lg max-h-48 overflow-y-auto">
                            {farmerResults.map((f) => (
                                    <li
                                        key={f._id}
                                        onClick={() => {
                                            setSelectedFarmer(f);
                                            setFarmerSearch('');
                                            setFarmerResults([]);
                                            setPage(1);
                                        }}
                                        className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm flex gap-3 min-w-0"
                                    >
                                        <TruncatedText text={f?.name || 'Unknown'} />
                                        <span className="text-slate-500 shrink-0">{f?.mobile || '-'}</span>
                                        <TruncatedText text={f?.village || '-'} className="text-slate-400" />
                                    </li>
                            ))}
                        </ul>
                    )}
                    {selectedFarmer && (
                        <p className="mt-1 text-xs text-slate-500">
                            Showing statement for <strong>{selectedFarmer.name}</strong>. Clear filters to see all.
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
                <button type="button" onClick={handleClearFilters} className="btn-outline text-sm">
                    Clear filters
                </button>
            </div>

            <div className="card overflow-hidden flex flex-col min-h-0">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <h3 className="font-bold">Credit Statement (Bills + Payments)</h3>
                    <span className="text-xs text-slate-400">{totalRecords} transactions</span>
                </div>
                <div className="min-h-0 max-h-[50vh] overflow-auto">
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
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <span className="material-symbols-outlined block text-4xl mb-3 text-slate-300">account_balance</span>
                                        <p className="text-slate-400 text-sm">No transactions in this period</p>
                                        <p className="text-slate-300 text-xs mt-1">Select a farmer or adjust date range</p>
                                    </td>
                                </tr>
                            ) : (
                                statement.map((row, idx) => (
                                    <tr key={`${row.type}-${row.ref}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatDate(row.date)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${row.type === 'bill' ? 'badge-warning' : 'badge-success'}`}>
                                                {row.type === 'bill' ? 'Bill' : 'Payment'}
                                            </span>
                                        </td>
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
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
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
    );
};

export default CreditPaymentHistory;
