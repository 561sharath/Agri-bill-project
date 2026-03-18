import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getShopDetails, saveShopDetails } from '../utils/shopStorage';
import TruncatedText from '../components/TruncatedText';

const LANG_KEY = 'agribill_lang';
const NAME_LIMIT = 300;
const ADDR_LIMIT = 300;

const Settings = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();

    const [shopName, setShopName] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');

    // Track original values to detect unsaved changes
    const [savedSnapshot, setSavedSnapshot] = useState({ shopName: '', mobile: '', address: '' });

    // ── Load shop details ─────────────────────────────────────────────────────
    // FIX: original had no error handling — malformed localStorage JSON would
    // throw silently, leaving all fields empty with no user feedback
    useEffect(() => {
        try {
            const shop = getShopDetails();
            const name = shop.shopName || '';
            const mob = shop.mobile || '';
            const addr = shop.address || '';
            setShopName(name);
            setMobile(mob);
            setAddress(addr);
            setSavedSnapshot({ shopName: name, mobile: mob, address: addr });
        } catch {
            toast.error('Failed to load saved shop details');
        }
    }, []);

    // ── Derived validation ────────────────────────────────────────────────────
    // REFACTOR: each flag was evaluated 2–3× inline in JSX
    const nameOver = shopName.length > NAME_LIMIT;
    const addrOver = address.length > ADDR_LIMIT;

    // FIX: validate mobile — original accepted any string including empty/garbage
    // that would appear on every generated bill
    const mobileError = useMemo(() => {
        if (!mobile) return null; // optional — blank is fine
        if (!/^\d+$/.test(mobile)) return 'Mobile must contain only digits';
        if (mobile.length < 10 || mobile.length > 15) return 'Mobile must be 10–15 digits';
        return null;
    }, [mobile]);

    // QUICK WIN: isDirty — prevents saving unchanged data and showing a false success toast
    const isDirty = useMemo(() =>
        shopName !== savedSnapshot.shopName ||
        mobile !== savedSnapshot.mobile ||
        address !== savedSnapshot.address,
        [shopName, mobile, address, savedSnapshot]);

    const canSave = isDirty && !nameOver && !addrOver && !mobileError;

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = useCallback((e) => {
        e.preventDefault();
        if (!canSave) return;
        saveShopDetails({ shopName, mobile, address });
        setSavedSnapshot({ shopName, mobile, address });
        toast.success('Shop details saved. They will appear on bills and in the app.');
    }, [shopName, mobile, address, canSave]);

    // ── Language ──────────────────────────────────────────────────────────────
    const handleLangChange = useCallback((lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem(LANG_KEY, lng);
    }, [i18n]);

    return (
        <div className="p-6 flex flex-col gap-6 animate-fade-in max-w-3xl">
            <div>
                <h1 className="page-title">{t('settings.title')}</h1>
                <p className="page-subtitle">{t('settings.subtitle')}</p>
            </div>

            {/* Profile */}
            <div className="card p-6 flex items-center gap-4">
                <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center text-primary text-2xl font-bold shrink-0">
                    {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                    <h2 className="text-lg font-bold">{user?.name || 'Admin User'}</h2>
                    <p className="text-sm text-slate-500">{user?.email || 'admin@agribill.com'}</p>
                </div>
            </div>

            {/* Shop details form */}
            <div className="card p-6 flex flex-col gap-5">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('settings.shopDetails')}</h3>

                {/* REFACTOR: language section moved OUT of the shop form — it is not
                    a shop detail and shouldn't be submitted alongside shop data.
                    Placed above the form so it's clearly a separate concern. */}
                <div className="flex flex-col gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <label className="label font-semibold text-slate-700 dark:text-slate-200">
                        Language / ಭಾಷೆ
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Choose app language</p>
                    <div className="flex gap-2 mt-1">
                        {[
                            { code: 'en', label: 'English' },
                            { code: 'kn', label: 'ಕನ್ನಡ' },
                        ].map(({ code, label }) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => handleLangChange(code)}
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${(i18n.language || '').startsWith(code)
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSave} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Shop name */}
                        <div>
                            <label className="label">
                                <TruncatedText text={t('settings.shopName')} />
                            </label>
                            <input
                                value={shopName}
                                onChange={e => setShopName(e.target.value)}
                                // FIX: was maxLength={320} — browser allowed 20 chars past
                                // the 300 limit before the invalid state triggered
                                maxLength={NAME_LIMIT}
                                className={`input ${nameOver ? 'input-invalid' : ''}`}
                            />
                            <div className="flex justify-between items-start mt-1">
                                {nameOver
                                    ? <p className="text-xs text-red-500">Maximum {NAME_LIMIT} characters</p>
                                    : <div />
                                }
                                <span className={`char-count ${nameOver ? 'text-red-500' : ''}`}>
                                    {shopName.length}/{NAME_LIMIT}
                                </span>
                            </div>
                        </div>

                        {/* Mobile */}
                        <div>
                            <label className="label">{t('settings.contactMobile')}</label>
                            <input
                                value={mobile}
                                onChange={e => setMobile(e.target.value)}
                                // QUICK WIN: shows numeric keypad on mobile devices
                                type="tel"
                                inputMode="numeric"
                                maxLength={15}
                                className={`input ${mobileError ? 'input-invalid' : ''}`}
                                placeholder="10–15 digits"
                            />
                            {mobileError && (
                                <p className="text-xs text-red-500 mt-1">{mobileError}</p>
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="label">{t('settings.shopAddress')}</label>
                        <textarea
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            // FIX: was maxLength={350} — same 50-char over-allowance as shopName
                            maxLength={ADDR_LIMIT}
                            className={`input resize-none py-3 ${addrOver ? 'input-invalid' : ''}`}
                            rows="3"
                        />
                        <div className="flex justify-between items-start mt-1">
                            {addrOver
                                ? <p className="text-xs text-red-500">Maximum {ADDR_LIMIT} characters</p>
                                : <div />
                            }
                            <span className={`char-count ${addrOver ? 'text-red-500' : ''}`}>
                                {address.length}/{ADDR_LIMIT}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        {/* QUICK WIN: tell the user why Save is disabled */}
                        <p className="text-xs text-slate-400">
                            {!isDirty
                                ? 'No unsaved changes'
                                : mobileError
                                    ? mobileError
                                    : nameOver || addrOver
                                        ? 'Fix errors above before saving'
                                        : 'You have unsaved changes'}
                        </p>
                        <button
                            type="submit"
                            disabled={!canSave}
                            className="btn-primary disabled:opacity-50"
                        >
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