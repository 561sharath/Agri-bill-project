import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip component that renders in a portal to avoid overflow/clipping.
 */
const Tooltip = ({ text, children, position = 'top' }) => {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const targetRef = useRef(null);

    const updateCoords = () => {
        if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            let x = rect.left + rect.width / 2;
            let y = rect.top;

            if (position === 'bottom') y = rect.bottom;
            if (position === 'left') { x = rect.left; y = rect.top + rect.height / 2; }
            if (position === 'right') { x = rect.right; y = rect.top + rect.height / 2; }

            setCoords({ x, y });
        }
    };

    useEffect(() => {
        if (show) {
            updateCoords();
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
    }, [show]);

    return (
        <div 
            ref={targetRef}
            className="inline-block max-w-full"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onFocus={() => setShow(true)}
            onBlur={() => setShow(false)}
        >
            {children}
            {show && text && createPortal(
                <div 
                    className={`fixed z-[9999] px-2 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 rounded shadow-lg pointer-events-none transition-opacity duration-200 animate-fade-in whitespace-normal max-w-xs text-center border border-slate-700`}
                    style={{
                        top: `${coords.y}px`,
                        left: `${coords.x}px`,
                        transform: position === 'top' ? 'translate(-50%, -120%)' : 
                                   position === 'bottom' ? 'translate(-50%, 20%)' :
                                   position === 'left' ? 'translate(-110%, -50%)' :
                                   'translate(10%, -50%)'
                    }}
                >
                    {text}
                    {/* Arrow */}
                    <div 
                        className={`absolute w-2 h-2 bg-slate-900 dark:bg-slate-800 border-inherit rotate-45`}
                        style={{
                            left: '50%',
                            bottom: position === 'top' ? '-4px' : 'auto',
                            top: position === 'bottom' ? '-4px' : 'auto',
                            transform: 'translateX(-50%) rotate(45deg)',
                            display: (position === 'top' || position === 'bottom') ? 'block' : 'none'
                        }}
                    />
                </div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
