const SHOP_STORAGE_KEY = 'agribill_shop';

const defaultShop = {
    shopName: 'Green Harvest Fertilisers',
    mobile: '9876543210',
    address: '123 Main Bazaar, Guntur, AP - 522001',
};

export function getShopDetails() {
    try {
        const raw = localStorage.getItem(SHOP_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...defaultShop, ...parsed };
        }
    } catch (_) {}
    return defaultShop;
}

export function saveShopDetails(details) {
    localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify({
        shopName: details.shopName ?? defaultShop.shopName,
        mobile: details.mobile ?? defaultShop.mobile,
        address: details.address ?? defaultShop.address,
    }));
}
