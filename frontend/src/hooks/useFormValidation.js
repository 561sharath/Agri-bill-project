import { useState, useCallback } from 'react';

/**
 * Custom hook for form validation with character limits and required checks.
 */
export const useFormValidation = (initialValues = {}, requiredFields = []) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const MAX_CHARS = 300;

    const validate = useCallback((name, value) => {
        let error = '';
        if (typeof value === 'string') {
            if (value.length > MAX_CHARS) {
                error = `Maximum ${MAX_CHARS} characters allowed`;
            } else if (requiredFields.includes(name) && !value.trim()) {
                error = 'This field is required';
            }
        } else if (requiredFields.includes(name) && (value === null || value === undefined || value === '')) {
            error = 'This field is required';
        }
        
        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    }, [requiredFields]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues(prev => ({ ...prev, [name]: value }));
        validate(name, value);
    };

    const setFieldValue = (name, value) => {
        setValues(prev => ({ ...prev, [name]: value }));
        validate(name, value);
    };

    const isValid = Object.values(errors).every(error => !error) && 
                    requiredFields.every(field => {
                        const val = values[field];
                        return val !== undefined && val !== null && (typeof val === 'string' ? val.trim() !== '' : true);
                    });

    const resetForm = () => {
        setValues(initialValues);
        setErrors({});
    };

    return {
        values,
        errors,
        isValid,
        handleChange,
        setFieldValue,
        resetForm,
        MAX_CHARS
    };
};
