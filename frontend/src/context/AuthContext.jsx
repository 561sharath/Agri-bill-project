import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('agribill_user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    // Verify token and fetch current user on app load
    useEffect(() => {
        const token = localStorage.getItem('agribill_token');
        if (token) {
            if (token === 'demo_token_xyz123') {
                const stored = localStorage.getItem('agribill_user');
                setUser(stored ? JSON.parse(stored) : { name: 'Demo User', role: 'admin' });
                setLoading(false);
                return;
            }
            authAPI.me()
                .then(res => setUser(res.data.user))
                .catch(() => {
                    localStorage.removeItem('agribill_token');
                    localStorage.removeItem('agribill_user');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await authAPI.login({ email, password });
        const { token, user } = res.data;
        localStorage.setItem('agribill_token', token);
        localStorage.setItem('agribill_user', JSON.stringify(user));
        setUser(user);
        return user;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('agribill_token');
        localStorage.removeItem('agribill_user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
