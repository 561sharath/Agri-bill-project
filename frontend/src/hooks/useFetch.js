import { useState, useEffect, useCallback } from 'react';

/**
 * Generic data-fetching hook with loading/error state.
 * @param {Function} fetchFn - async function that returns axios response
 * @param {Array} deps - dependencies that trigger re-fetch
 */
const useFetch = (fetchFn, deps = []) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchFn();
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        execute();
    }, [execute]);

    return { data, loading, error, refetch: execute };
};

export default useFetch;
