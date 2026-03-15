/** In-memory cache for one-time PDF access (e.g. WhatsApp media URL). Token -> Buffer. */
const cache = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function setPdfToken(token, buffer) {
    cache.set(token, { buffer, at: Date.now() });
    setTimeout(() => cache.delete(token), TTL_MS);
}

export function getPdfByToken(token) {
    const entry = cache.get(token);
    if (!entry) return null;
    cache.delete(token); // one-time use
    if (Date.now() - entry.at > TTL_MS) return null;
    return entry.buffer;
}
