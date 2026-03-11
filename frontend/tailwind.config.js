/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2f7f33',
                    50: '#f0faf0',
                    100: '#dcf5dc',
                    200: '#b8eab9',
                    300: '#86d688',
                    400: '#53bc57',
                    500: '#2f7f33',
                    600: '#276e2b',
                    700: '#205823',
                    800: '#1a471d',
                    900: '#153a18',
                },
                background: {
                    light: '#f6f8f6',
                    dark: '#141e15',
                }
            },
            fontFamily: {
                display: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0.5rem',
                lg: '1rem',
                xl: '1.5rem',
            },
            boxShadow: {
                card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
            }
        },
    },
    plugins: [],
}
