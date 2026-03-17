import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { farmersAPI } from '../services/api';
import TruncatedText from './TruncatedText';

const AddFarmerModal = ({ onClose, onSave }) => {
    const { register, handleSubmit, watch, formState: { errors, isSubmitting, isValid } } = useForm({
        mode: 'onChange'
    });

    const nameValue = watch('name', '');
    const villageValue = watch('village', '');

    const onSubmit = async (data) => {
        try {
            const res = await farmersAPI.create(data);
            toast.success('Farmer added successfully!');
            onSave(res.data);
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
                        <label className="label">
                            <TruncatedText text="Full Name *" />
                        </label>
                        <input
                            {...register('name', { 
                                required: 'Name is required', 
                                maxLength: { value: 300, message: 'Maximum 300 characters allowed' } 
                            })}
                            className={`input w-full ${errors.name ? 'input-invalid' : ''}`}
                            placeholder="e.g. Ramesh Kumar"
                        />
                        <div className="flex justify-between items-start">
                            {errors.name ? <p className="field-error">{errors.name.message}</p> : <div />}
                            <span className={`char-count ${nameValue.length > 300 ? 'text-red-500' : ''}`}>
                                {nameValue.length}/300
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="label">Mobile Number *</label>
                        <input
                            {...register('mobile', { 
                                required: 'Mobile is required', 
                                pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit mobile' } 
                            })}
                            className={`input w-full ${errors.mobile ? 'input-invalid' : ''}`}
                            placeholder="9876543210"
                            maxLength={10}
                        />
                        {errors.mobile && <p className="field-error">{errors.mobile.message}</p>}
                    </div>

                    <div>
                        <label className="label">Village *</label>
                        <input
                            {...register('village', { 
                                required: 'Village is required',
                                maxLength: { value: 300, message: 'Maximum 300 characters allowed' }
                            })}
                            className={`input w-full ${errors.village ? 'input-invalid' : ''}`}
                            placeholder="e.g. Mylavaram"
                        />
                        <div className="flex justify-between items-start">
                            {errors.village ? <p className="field-error">{errors.village.message}</p> : <div />}
                            <span className={`char-count ${villageValue.length > 300 ? 'text-red-500' : ''}`}>
                                {villageValue.length}/300
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-outline flex-1">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !isValid} 
                            className="btn-primary flex-1 flex justify-center items-center gap-2"
                        >
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

