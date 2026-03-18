export const transliterateToKannada = async (text) => {
    if (!text || !text.trim()) return '';
    try {
        const response = await fetch(
            `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=kn-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`
        );
        const data = await response.json();
        if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
            return data[1][0][1][0] || '';
        }
    } catch (e) {
        console.warn('Transliteration failed:', e);
    }
    return '';
};
