import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { farmersAPI } from '../services/api';

const AddFarmerModal = ({ onClose, onSave }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

    const onSubmit = async (data) => {
        try {
            const res = await farmersAPI.create(data);
            toast.success('Farmer added successfully!');
            onSave(res.data); // Return newly created farmer to caller
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add farmer');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md p-6 animate-slide-up shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Add New Farmer</h2>
                    <button onClick={onClose} type="button" className="p-1 text-slate-400 hover:text-red-500 cursor-pointer transition-colors focus:outline-none">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    <div>
                        <label className="label">Full Name * <span className="text-slate-400 font-normal">(max 50 chars)</span></label>
                        <input
                            {...register('name', { required: 'Name is required', maxLength: { value: 50, message: 'Max 50 chars' } })}
                            maxLength={50}
                            className="input w-full"
                            placeholder="e.g. Ramesh Kumar"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="label">Mobile Number *</label>
                        <input
                            {...register('mobile', { required: 'Mobile is required', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit mobile' } })}
                            className="input w-full"
                            placeholder="9876543210"
                        />
                        {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile.message}</p>}
                    </div>
                    <div>
                        <label className="label">Village</label>
                        <input
                            {...register('village', { required: 'Village is required' })}
                            className="input w-full"
                            placeholder="e.g. Mylavaram"
                        />
                        {errors.village && <p className="text-xs text-red-500 mt-1">{errors.village.message}</p>}
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-outline flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex justify-center items-center gap-2">
                            {isSubmitting ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                                    Saving...
                                </>
                            ) : (
                                'Add Farmer'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddFarmerModal;
