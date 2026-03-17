import Tooltip from './Tooltip';

/**
 * Automatically truncates text and shows a tooltip if it overflows.
 */
const TruncatedText = ({ text, className = '', maxLen = 0, tooltipPosition = 'top' }) => {
    // If maxLen is provided, we truncate by characters.
    // Recommended to use CSS truncation for fluid layouts.
    
    if (!text) return null;

    if (maxLen > 0 && text.length > maxLen) {
        const truncated = text.slice(0, maxLen) + '...';
        return (
            <Tooltip text={text} position={tooltipPosition}>
                <span className={className}>{truncated}</span>
            </Tooltip>
        );
    }

    // CSS based truncation (default)
    return (
        <Tooltip text={text} position={tooltipPosition}>
            <div className={`truncate max-w-full ${className}`}>
                {text}
            </div>
        </Tooltip>
    );
};

export default TruncatedText;
