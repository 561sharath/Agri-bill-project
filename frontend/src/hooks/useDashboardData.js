import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useDashboardData = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await dashboardAPI.getSummary();
            setData(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError(err.message || 'Failed to fetch dashboard data');
            toast.error('Failed to load dashboard metrics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return { data, loading, error, refetch: fetchData };
};

export default useDashboardData;
