import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import FarmerTable from '../components/FarmerTable';
import { farmersAPI } from '../services/api';
import useFetch from '../hooks/useFetch';

// Mock data
const MOCK_FARMERS = [
    { _id: 'f1', name: 'Ramesh Kumar', village: 'Mylavaram', mobile: '9876543210', creditBalance: 12450 },
    { _id: 'f2', name: 'Suresh Reddy', village: 'Vijayawada Rural', mobile: '9123456789', creditBalance: 8900 },
    { _id: 'f3', name: 'Venkatesh Rao', village: 'Guntur East', mobile: '8887766554', creditBalance: 15200 },
    { _id: 'f4', name: 'M. Satish', village: 'Tenali', mobile: '9900112233', creditBalance: 0 },
    { _id: 'f5', name: 'Raju Naidu', village: 'Bapatla', mobile: '9988776655', creditBalance: 3200 },
];

const AddFarmerModal = ({ onClose, onSave }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

    const onSubmit = async (data) => {
        try {
            await farmersAPI.create(data);
            toast.success('Farmer added successfully!');
            onSave();
        } catch {
            // Demo fallback
            toast.success('Farmer added! (Demo mode)');
            onSave();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold">Add New Farmer</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div>
                        <label className="label">Full Name *</label>
                        <input {...register('name', { required: 'Name is required' })} className="input" placeholder="e.g. Ramesh Kumar" />
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
    const [farmers, setFarmers] = useState(MOCK_FARMERS);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const handleDelete = async (id) => {
        if (!confirm('Delete this farmer?')) return;
        try {
            await farmersAPI.delete(id);
            setFarmers(f => f.filter(x => x._id !== id));
            toast.success('Farmer deleted');
        } catch {
            setFarmers(f => f.filter(x => x._id !== id));
            toast.success('Farmer deleted (Demo)');
        }
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Farmers</h1>
                    <p className="page-subtitle">{farmers.length} registered farmers</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                    Add Farmer
                </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Farmers', value: farmers.length, icon: 'groups', color: 'text-blue-500' },
                    { label: 'With Pending Credit', value: farmers.filter(f => f.creditBalance > 0).length, icon: 'hourglass_empty', color: 'text-red-500' },
                    { label: 'Credit Cleared', value: farmers.filter(f => f.creditBalance === 0).length, icon: 'check_circle', color: 'text-emerald-500' },
                ].map((s, i) => (
                    <div key={i} className="card p-4 flex items-center gap-3">
                        <span className={`material-symbols-outlined ${s.color}`} style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                        <div>
                            <p className="text-xs text-slate-500">{s.label}</p>
                            <p className="text-xl font-bold">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <FarmerTable farmers={farmers} onDelete={handleDelete} />

            {showModal && (
                <AddFarmerModal
                    onClose={() => setShowModal(false)}
                    onSave={() => setShowModal(false)}
                />
            )}
        </div>
    );
};

export default Farmers;
