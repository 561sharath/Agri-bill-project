import { useState, useEffect } from 'react';

/**
 * Debounce a value by a given delay.
 * Usage: const debouncedSearch = useDebounce(searchTerm, 500);
 */
const useDebounce = (value, delay = 500) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
};

export default useDebounce;
