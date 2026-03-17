import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import FarmerTable from '../components/FarmerTable';
import Pagination from '../components/Pagination';
import AddFarmerModal from '../components/AddFarmerModal';
import { farmersAPI } from '../services/api';
import useDebounce from '../hooks/useDebounce';

const Farmers = () => {
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [creditFilter, setCreditFilter] = useState(''); // '' | 'credit' | 'clear'
    const [showModal, setShowModal] = useState(false);
    const [stats, setStats] = useState({ total: 0, pending: 0, clear: 0 });

    const fetchStats = async () => {
        try {
            const res = await farmersAPI.getStats();
            setStats(res.data);
        } catch {
            console.error('Failed to load farmer stats');
        }
    };

    const fetchFarmers = async () => {
        setLoading(true);
        try {
            const res = await farmersAPI.getAll({ page, limit: 10, search: debouncedSearchTerm, creditFilter });
            setFarmers(res.data.data);
            setTotalPages(res.data.totalPages);
            setTotalRecords(res.data.totalRecords);
        } catch (err) {
            toast.error('Failed to fetch farmers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchFarmers();
    }, [page, debouncedSearchTerm, creditFilter]);


    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Farmers Directory</h1>
                    <p className="page-subtitle">Manage farmer profiles and credit history</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                    Add New Farmer
                </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Total Farmers', value: totalRecords, icon: 'groups', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { label: 'Pending Credit', value: stats.pending, icon: 'history_edu', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                    { label: 'Clear Accounts', value: stats.clear, icon: 'verified', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                ].map((s, i) => (
                    <div key={i} className="card p-5 flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl ${s.bg} flex items-center justify-center`}>
                            <span className={`material-symbols-outlined ${s.color}`} style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-4">
                <FarmerTable
                    farmers={farmers}
                    loading={loading}
                    onSearch={term => { setSearchTerm(term); setPage(1); }}
                    onFilterChange={setCreditFilter}
                    currentFilter={creditFilter}
                    onRefresh={fetchFarmers}
                />

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    onPageChange={setPage}
                    limit={10}
                />
            </div>

            {showModal && (
                <AddFarmerModal
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); fetchFarmers(); }}
                />
            )}
        </div>
    );
};

export default Farmers;
