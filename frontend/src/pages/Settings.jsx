import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getShopDetails, saveShopDetails } from '../utils/shopStorage';

const LANG_KEY = 'agribill_lang';

const Settings = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [shopName, setShopName] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        const shop = getShopDetails();
        setShopName(shop.shopName);
        setMobile(shop.mobile);
        setAddress(shop.address);
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        saveShopDetails({ shopName, mobile, address });
        toast.success('Shop details saved. They will appear on bills and in the app.');
    };

    const handleLangChange = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem(LANG_KEY, lng);
    };

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in max-w-3xl">
            <div>
                <h1 className="page-title">{t('settings.title')}</h1>
                <p className="page-subtitle">{t('settings.subtitle')}</p>
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
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{t('settings.shopDetails')}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">{t('settings.shopName')}</label>
                            <input value={shopName} onChange={(e) => setShopName(e.target.value)} className="input" />
                        </div>
                        <div>
                            <label className="label">{t('settings.contactMobile')}</label>
                            <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="input" />
                        </div>
                    </div>

                    <div>
                        <label className="label">{t('settings.shopAddress')}</label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="input resize-none py-3"
                            rows="3"
                        />
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="label font-semibold text-slate-700 dark:text-slate-200">
                            Language / ಭಾಷೆ
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Choose app language</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleLangChange('en')}
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${(i18n.language || '').startsWith('en') ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLangChange('kn')}
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${(i18n.language || '').startsWith('kn') ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                ಕನ್ನಡ
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" className="btn-primary">
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                            {t('common.save')} Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
