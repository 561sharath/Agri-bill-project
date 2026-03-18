import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import TruncatedText from './TruncatedText';
import { productsAPI } from '../services/api';
import useDebounce from '../hooks/useDebounce';

/**
 * Dropdown that fetches products infinitely from the API.
 * value: productId (optional, for tracking selection)
 * onChange: (productObj) => void
 * initialProduct: { _id, name, stock } (optional, to display Name before fetching)
 */
export default function SearchableSelect({ value, onChange, initialProduct, className = '', placeholder = 'Select product...', disabled = false }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [options, setOptions] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(initialProduct || null);
    
    const wrapperRef = useRef(null);
    const [dropdownRect, setDropdownRect] = useState(null);
    const debouncedSearch = useDebounce(search, 400);

    const fetchProducts = useCallback(async (query, pageNum, append) => {
        setLoading(true);
        try {
            const res = await productsAPI.getAll({ search: query, page: pageNum, limit: 15 });
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            const total = res.data?.totalPages || 1;
            
            setOptions(prev => append ? [...prev, ...data] : data);
            setHasMore(pageNum < total);
        } catch (err) {
            console.error('Failed to fetch products for select', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch when search changes or dropdown opens
    useEffect(() => {
        if (!open) return;
        setPage(1);
        fetchProducts(debouncedSearch, 1, false);
    }, [debouncedSearch, open, fetchProducts]);

    // Handle scroll for infinite loading
    const handleScroll = (e) => {
        const bottom = e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 20;
        if (bottom && hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchProducts(debouncedSearch, nextPage, true);
        }
    };

    // Click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && wrapperRef.current.contains(e.target)) return;
            if (e.target.closest('[data-searchable-select-dropdown]')) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Positioning
    useEffect(() => {
        if (open && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
        } else {
            setDropdownRect(null);
        }
    }, [open]);

    const handleSelect = (product) => {
        if (Number(product.stock) <= 0) return;
        setSelectedProduct(product);
        onChange(product); // Pass full product up!
        setSearch('');
        setOpen(false);
    };

    const triggerClass = className ? `${className} cursor-pointer flex items-center justify-between overflow-hidden gap-2` : 'input text-xs py-1.5 w-full cursor-pointer flex items-center justify-between overflow-hidden gap-2';

    // Figure out what to show when closed
    let displayProduct = selectedProduct;
    if (!displayProduct && value) {
        displayProduct = options.find(o => String(o._id) === String(value)) || null;
    }
    const displayText = displayProduct ? `${displayProduct.name} (Stock: ${displayProduct.stock})` : placeholder;

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={`${triggerClass} text-left ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                    <ul 
                        className="max-h-52 overflow-y-auto overflow-x-hidden py-0.5 overscroll-contain touch-none min-h-0 relative"
                        onScroll={handleScroll}
                    >
                        {options.length === 0 && !loading ? (
                            <li className="px-3 py-2 text-xs text-slate-500">No product found</li>
                        ) : (
                            options.map((p) => {
                                const outOfStock = Number(p.stock) <= 0;
                                return (
                                    <li
                                        key={p._id}
                                        onClick={() => handleSelect(p)}
                                        className={`px-3 py-2 text-xs flex items-center ${outOfStock ? 'opacity-50 cursor-not-allowed bg-red-50/50 dark:bg-red-900/10' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        title={outOfStock ? 'Out of stock' : ''}
                                    >
                                        <TruncatedText text={`${p.name} (Stock: ${p.stock})`} />
                                    </li>
                                );
                            })
                        )}
                        {loading && (
                            <li className="px-3 py-2 text-xs text-slate-400 text-center animate-pulse">
                                Loading...
                            </li>
                        )}
                    </ul>
                </div>,
                document.body
            )}
        </div>
    );
}
