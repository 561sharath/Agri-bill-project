import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { user } = useAuth();
    const [shopName, setShopName] = useState('Green Harvest Fertilisers');
    const [mobile, setMobile] = useState('9876543210');
    const [address, setAddress] = useState('123 Main Bazaar, Guntur, AP');

    const handleSave = (e) => {
        e.preventDefault();
        toast.success('Settings saved successfully');
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in max-w-3xl">
            <div>
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage your shop details and preferences</p>
            </div>

            {/* Profile Section */}
            <div className="card p-6 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center text-primary text-2xl font-bold">
                        {user?.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">{user?.name || 'Admin User'}</h2>
                        <p className="text-sm text-slate-500">{user?.email || 'admin@agribill.com'}</p>
                    </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                <form onSubmit={handleSave} className="flex flex-col gap-5">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Shop Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Shop Name</label>
                            <input value={shopName} onChange={(e) => setShopName(e.target.value)} className="input" />
                        </div>
                        <div>
                            <label className="label">Contact Mobile</label>
                            <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="input" />
                        </div>
                    </div>

                    <div>
                        <label className="label">Shop Address (For Bills)</label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="input resize-none py-3"
                            rows="3"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" className="btn-primary">
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
