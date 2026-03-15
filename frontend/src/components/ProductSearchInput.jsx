import { useState, useRef, useEffect } from 'react';

/**
 * Searchable product dropdown for Create Bill.
 * products: [{ _id, name, price, stock }]
 * value: selected productId
 * onChange: (productId, product) => void
 */
export default function ProductSearchInput({ products, value, onChange, placeholder = 'Search product...', className = '' }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const wrapperRef = useRef(null);

    const selected = products.find(p => p._id === value);
    const displayValue = selected ? `${selected.name} (Stock: ${selected.stock})` : '';

    const filtered = query.trim()
        ? products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase())
        )
        : products;
    const showList = open && (query.length > 0 || filtered.length <= 10);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setHighlight(0);
    }, [query]);

    const handleSelect = (product) => {
        onChange(product._id, product);
        setQuery('');
        setOpen(false);
    };

    const handleKeyDown = (e) => {
        if (!showList) {
            if (e.key === 'ArrowDown' || e.key === 'Escape') setOpen(false);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight(h => (h + 1) % filtered.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight(h => (h - 1 + filtered.length) % filtered.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[highlight]) handleSelect(filtered[highlight]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={open ? query : displayValue}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    if (!e.target.value) onChange('', null);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={className || 'input text-xs py-1.5 w-full'}
                autoComplete="off"
            />
            {showList && (
                <ul className="absolute z-50 left-0 right-0 mt-0.5 max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-lg">
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-slate-500">No product found</li>
                    ) : (
                        filtered.map((p, i) => (
                            <li
                                key={p._id}
                                onClick={() => handleSelect(p)}
                                className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center ${i === highlight ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <span>{p.name}</span>
                                <span className="text-xs text-slate-500">Stock: {p.stock} · ₹{Number(p.price).toLocaleString()}</span>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
