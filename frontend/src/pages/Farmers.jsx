import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import FarmerTable from '../components/FarmerTable';
import Pagination from '../components/Pagination';
import { farmersAPI } from '../services/api';

const AddFarmerModal = ({ onClose, onSave }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

    const onSubmit = async (data) => {
        try {
            await farmersAPI.create(data);
            toast.success('Farmer added successfully!');
            onSave();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add farmer');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 animate-slide-up shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold">Add New Farmer</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div>
                        <label className="label">Full Name * <span className="text-slate-400 font-normal">(max 50 chars)</span></label>
                        <input {...register('name', { required: 'Name is required', maxLength: { value: 50, message: 'Max 50 characters allowed' } })} maxLength={50} className="input" placeholder="e.g. Ramesh Kumar" />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="label">Mobile Number *</label>
                        <input {...register('mobile', { required: 'Mobile is required', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit mobile' } })} className="input" placeholder="9876543210" />
                        {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile.message}</p>}
                    </div>
                    <div>
                        <label className="label">Village</label>
                        <input {...register('village')} className="input" placeholder="e.g. Mylavaram" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                            {isSubmitting ? 'Adding...' : 'Add Farmer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Farmers = () => {
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [stats, setStats] = useState({ total: 0, pending: 0, clear: 0 });

    const fetchFarmers = async () => {
        setLoading(true);
        try {
            const res = await farmersAPI.getAll({ page, limit: 10, search: searchTerm });
            setFarmers(res.data.data);
            setTotalPages(res.data.totalPages);
            setTotalRecords(res.data.totalRecords);

            // Stats calculation (simplified, can be improved with a dedicated stats API)
            setStats({
                total: res.data.totalRecords,
                pending: res.data.data.filter(f => f.creditBalance > 0).length,
                clear: res.data.data.filter(f => f.creditBalance === 0).length
            });
        } catch (err) {
            toast.error('Failed to fetch farmers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFarmers();
    }, [page, searchTerm]);


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
