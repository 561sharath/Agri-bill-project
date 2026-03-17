import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import TruncatedText from './TruncatedText';

/**
 * Dropdown that looks like the existing select (same UI) with search inside.
 * products: [{ _id, name, stock }], value: productId, onChange: (productId) => void
 */
export default function SearchableSelect({ products = [], value, onChange, className = '', placeholder = 'Select product...' }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);
    const [dropdownRect, setDropdownRect] = useState(null);

    const selected = products.find(p => (p._id && value) && String(p._id) === String(value));
    const displayText = selected ? `${selected.name} (Stock: ${selected.stock})` : placeholder;
    const filtered = !search.trim()
        ? products
        : products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && wrapperRef.current.contains(e.target)) return;
            if (e.target.closest('[data-searchable-select-dropdown]')) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (open && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
        } else {
            setDropdownRect(null);
        }
    }, [open]);

    const handleSelect = (product) => {
        onChange(product._id);
        setSearch('');
        setOpen(false);
    };

    const triggerClass = className ? `${className} cursor-pointer flex items-center justify-between overflow-hidden gap-2` : 'input text-xs py-1.5 w-full cursor-pointer flex items-center justify-between overflow-hidden gap-2';

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`${triggerClass} text-left`}
            >
                <div className="flex-1 min-w-0">
                    <TruncatedText text={displayText} className="font-medium" />
                </div>
                <span className="material-symbols-outlined text-slate-400 shrink-0" style={{ fontSize: '14px' }}>arrow_drop_down</span>
            </button>
            {open && dropdownRect && createPortal(
                <div
                    data-searchable-select-dropdown
                    className="fixed z-[9999] border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-xl min-w-[200px] flex flex-col"
                    style={{ top: dropdownRect.top + 4, left: dropdownRect.left, width: Math.max(dropdownRect.width, 200) }}
                >
                    <div className="p-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search product..."
                            className="input text-xs py-1.5 w-full"
                            autoFocus
                        />
                    </div>
                    <ul className="max-h-52 overflow-y-auto overflow-x-hidden py-0.5 overscroll-contain touch-none min-h-0">
                        {filtered.length === 0 ? (
                            <li className="px-3 py-2 text-xs text-slate-500">No product found</li>
                        ) : (
                            filtered.map((p) => (
                                <li
                                    key={p._id}
                                    onClick={() => handleSelect(p)}
                                    className="px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center"
                                >
                                    <TruncatedText text={`${p.name} (Stock: ${p.stock})`} />
                                </li>
                            ))
                        )}
                    </ul>
                </div>,
                document.body
            )}
        </div>
    );
}

