import React from 'react';
import { Document, Page, View, Text, StyleSheet, Font, Image } from '@react-pdf/renderer';

// ── Font Registration ─────────────────────────────────────────────────────────
// We use local TTF files downloaded to /public/fonts/ because react-pdf requires TTF.
Font.register({
    family: 'NotoSans',
    fonts: [
        { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 400 },
        { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 700 },
    ],
});

Font.register({
    family: 'NotoSansKannada',
    fonts: [
        { src: '/fonts/NotoSansKannada-Regular.ttf', fontWeight: 400 },
        { src: '/fonts/NotoSansKannada-Bold.ttf', fontWeight: 700 },
    ],
});

// Detect if a string contains Kannada Unicode characters (range: 0C80–0CFF)
function hasKannada(str) {
    if (!str) return false;
    return /[\u0C80-\u0CFF]/.test(str);
}

function SmartText({ children, style, bold }) {
    const text = typeof children === 'string' ? children : String(children || '');
    const isKannada = hasKannada(text);
    return (
        <Text style={[
            { fontFamily: isKannada ? 'NotoSansKannada' : 'NotoSans' },
            bold && { fontWeight: 700 },
            style
        ]}>
            {text}
        </Text>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const BRAND = '#1a7a2e';
const BRAND_LIGHT = '#e8f5e9';
const TEXT_DARK = '#1a1a2e';
const TEXT_MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const ROW_ALT = '#f9fafb';

const styles = StyleSheet.create({
    page: {
        paddingTop: 36,
        paddingBottom: 48,
        paddingHorizontal: 40,
        fontFamily: 'NotoSans',
        fontSize: 9,
        color: TEXT_DARK,
        backgroundColor: '#ffffff',
    },

    // ── Header ──────────────────────────────────────────────────────────────
    headerBar: {
        backgroundColor: BRAND,
        borderRadius: 6,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    shopName: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 700,
        fontFamily: 'NotoSans',
    },
    shopTagline: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 8,
        marginTop: 3,
        fontFamily: 'NotoSans',
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    invoiceLabel: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 10,
        letterSpacing: 1.5,
        fontFamily: 'NotoSans',
    },
    invoiceNumber: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: 'NotoSans',
        marginTop: 2,
    },

    // ── Info Row (Farmer | Invoice Details) ─────────────────────────────────
    infoRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    infoBox: {
        flex: 1,
        backgroundColor: ROW_ALT,
        borderRadius: 6,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: BRAND,
    },
    infoBoxRight: {
        flex: 1,
        backgroundColor: ROW_ALT,
        borderRadius: 6,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#6366f1',
    },
    sectionLabel: {
        fontSize: 7,
        fontWeight: 700,
        color: TEXT_MUTED,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 6,
        fontFamily: 'NotoSans',
    },
    infoValue: {
        fontSize: 11,
        fontWeight: 700,
        color: TEXT_DARK,
        marginBottom: 2,
    },
    infoSub: {
        fontSize: 8,
        color: TEXT_MUTED,
        marginTop: 1,
    },

    // ── Table ────────────────────────────────────────────────────────────────
    table: {
        width: '100%',
        marginBottom: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    tHead: {
        flexDirection: 'row',
        backgroundColor: BRAND,
        paddingVertical: 7,
        paddingHorizontal: 0,
    },
    tRow: {
        flexDirection: 'row',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    tRowAlt: {
        flexDirection: 'row',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        backgroundColor: ROW_ALT,
    },
    thCell: {
        fontFamily: 'NotoSans',
        fontWeight: 700,
        fontSize: 8,
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    tdCell: {
        fontFamily: 'NotoSans',
        fontSize: 9,
        color: TEXT_DARK,
    },

    // Column widths
    colSN:      { width: '6%',  paddingHorizontal: 8, textAlign: 'center' },
    colProduct: { width: '44%', paddingHorizontal: 8 },
    colQty:     { width: '10%', paddingHorizontal: 8, textAlign: 'center' },
    colHSN:     { width: '12%', paddingHorizontal: 8, textAlign: 'center' },
    colRate:    { width: '14%', paddingHorizontal: 8, textAlign: 'right' },
    colAmount:  { width: '14%', paddingHorizontal: 8, textAlign: 'right' },

    // ── Totals Block ─────────────────────────────────────────────────────────
    totalsWrapper: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 16,
    },
    totalsBox: {
        width: '45%',
        backgroundColor: ROW_ALT,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: BORDER,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    totalLabel: {
        fontFamily: 'NotoSans',
        fontSize: 9,
        color: TEXT_MUTED,
    },
    totalValue: {
        fontFamily: 'NotoSans',
        fontSize: 9,
        color: TEXT_DARK,
        fontWeight: 700,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: BRAND,
    },
    grandTotalLabel: {
        fontFamily: 'NotoSans',
        fontWeight: 700,
        fontSize: 10,
        color: '#ffffff',
    },
    grandTotalValue: {
        fontFamily: 'NotoSans',
        fontWeight: 700,
        fontSize: 10,
        color: '#ffffff',
    },

    // ── Interest Notice ───────────────────────────────────────────────────────
    interestBox: {
        backgroundColor: '#fff7ed',
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#f59e0b',
        padding: 10,
        marginBottom: 12,
    },
    interestTitle: {
        fontFamily: 'NotoSans',
        fontWeight: 700,
        fontSize: 8,
        color: '#92400e',
        marginBottom: 3,
    },
    interestText: {
        fontFamily: 'NotoSans',
        fontSize: 8,
        color: '#b45309',
    },

    // ── GST Summary ───────────────────────────────────────────────────────────
    gstBox: {
        backgroundColor: '#f0f9ff',
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#0ea5e9',
        padding: 10,
        marginBottom: 12,
    },
    gstTitle: {
        fontFamily: 'NotoSans',
        fontWeight: 700,
        fontSize: 8,
        color: '#0c4a6e',
        marginBottom: 4,
    },
    gstRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    gstLabel: {
        fontFamily: 'NotoSans',
        fontSize: 8,
        color: '#0369a1',
    },
    gstValue: {
        fontFamily: 'NotoSans',
        fontSize: 8,
        fontWeight: 700,
        color: '#0369a1',
    },

    // ── Payment Badge ─────────────────────────────────────────────────────────
    paymentBadge: {
        borderRadius: 4,
        paddingVertical: 2,
        paddingHorizontal: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    paymentBadgeText: {
        fontFamily: 'NotoSans',
        fontSize: 7,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ── Footer ────────────────────────────────────────────────────────────────
    footerDivider: {
        height: 1,
        backgroundColor: BORDER,
        marginTop: 12,
        marginBottom: 10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    footerLeft: {
        fontSize: 8,
        color: TEXT_MUTED,
        fontFamily: 'NotoSans',
    },
    footerRight: {
        fontSize: 8,
        color: TEXT_MUTED,
        fontFamily: 'NotoSans',
        textAlign: 'right',
    },
    signBox: {
        borderTopWidth: 1,
        borderTopColor: BORDER,
        paddingTop: 4,
        marginTop: 24,
        width: 100,
        alignItems: 'center',
    },
    signText: {
        fontFamily: 'NotoSans',
        fontSize: 7,
        color: TEXT_MUTED,
    },
});

// ── Helper formatters ─────────────────────────────────────────────────────────
const fmt = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const paymentColors = {
    cash: { bg: '#dcfce7', text: '#166534' },
    credit: { bg: '#fee2e2', text: '#991b1b' },
    upi: { bg: '#ede9fe', text: '#5b21b6' },
    bank: { bg: '#dbeafe', text: '#1e40af' },
};

/**
 * BillPDFDocument - Premium invoice PDF with:
 * - Kannada text support via NotoSansKannada font
 * - GST breakdown (CGST + SGST split)
 * - Optional interest notice for credit bills
 * - Auto bill number
 *
 * bill shape:
 *   { _id, billNumber, farmerId: { name, mobile, village }, items: [{ productId: { name, hsn? }, quantity, price, total }],
 *     subtotal, totalAmount, paymentType, gstEnabled, gstPercent, gstAmount, shopGSTIN,
 *     interestRate, interestAmount, dueDate, createdAt }
 * shopDetails: { shopName, address, mobile, gstin }
 */
export function BillPDFDocument({ bill, shopDetails }) {
    const farmer = bill?.farmerId || {};
    const items = bill?.items || [];
    const shop = shopDetails || {};
    const shopName = shop.shopName || 'Green Harvest Fertilisers';
    const shopAddress = shop.address || 'Guntur, Andhra Pradesh';
    const shopPhone = shop.mobile || '';
    const shopGSTIN = bill?.shopGSTIN || shop.gstin || '';
    const dateStr = bill?.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const billNo = bill?.billNumber || (bill?._id?.toString?.()?.slice(-8) || '-');

    const subtotal = Number(bill?.subtotal || 0);
    const gstEnabled = !!bill?.gstEnabled;
    const gstPercent = Number(bill?.gstPercent || 0);
    const gstAmount = Number(bill?.gstAmount || 0);
    const cgst = gstEnabled ? parseFloat((gstAmount / 2).toFixed(2)) : 0;
    const sgst = gstEnabled ? parseFloat((gstAmount / 2).toFixed(2)) : 0;
    const grandTotal = Number(bill?.totalAmount || 0);

    const interestRate = Number(bill?.interestRate || 0);
    const interestAmount = Number(bill?.interestAmount || 0);
    const dueDate = bill?.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : null;

    const paymentType = (bill?.paymentType || 'cash').toLowerCase();
    const payBadge = paymentColors[paymentType] || paymentColors.cash;

    return (
        <Document producer="AgriBill v2" creator={shopName} title={`Invoice ${billNo}`}>
            <Page size="A4" style={styles.page}>

                {/* ── Header Bar ───────────────────────────────────────── */}
                <View style={styles.headerBar}>
                    <View>
                        <SmartText bold style={styles.shopName}>{shopName}</SmartText>
                        <Text style={styles.shopTagline}>{shopAddress}{shopPhone ? `  |  ${shopPhone}` : ''}</Text>
                        {shopGSTIN ? <Text style={[styles.shopTagline, { marginTop: 2 }]}>GSTIN: {shopGSTIN}</Text> : null}
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.invoiceLabel}>TAX INVOICE</Text>
                        <Text style={styles.invoiceNumber}>{billNo}</Text>
                        <Text style={[styles.shopTagline, { marginTop: 4 }]}>{dateStr}</Text>
                    </View>
                </View>

                {/* ── Bill To | Invoice Details ────────────────────────── */}
                <View style={styles.infoRow}>
                    <View style={styles.infoBox}>
                        <Text style={styles.sectionLabel}>Bill To</Text>
                        <SmartText bold style={styles.infoValue}>{farmer.name || '-'}</SmartText>
                        <Text style={styles.infoSub}>Mobile: {farmer.mobile || '-'}</Text>
                        <SmartText style={styles.infoSub}>Village: {farmer.village || '-'}</SmartText>
                    </View>
                    <View style={styles.infoBoxRight}>
                        <Text style={styles.sectionLabel}>Invoice Details</Text>
                        <Text style={[styles.infoSub, { marginBottom: 2 }]}>Invoice No: <Text style={{ fontWeight: 700, color: TEXT_DARK }}>{billNo}</Text></Text>
                        <Text style={styles.infoSub}>Date: {dateStr}</Text>
                        <View style={[styles.paymentBadge, { backgroundColor: payBadge.bg, marginTop: 6 }]}>
                            <Text style={[styles.paymentBadgeText, { color: payBadge.text }]}>
                                {paymentType === 'upi' ? 'UPI' : paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Payment
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Items Table ──────────────────────────────────────── */}
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tHead}>
                        <Text style={[styles.thCell, styles.colSN]}>#</Text>
                        <Text style={[styles.thCell, styles.colProduct]}>Product / Description</Text>
                        {gstEnabled && <Text style={[styles.thCell, styles.colHSN]}>HSN</Text>}
                        <Text style={[styles.thCell, styles.colQty]}>Qty</Text>
                        <Text style={[styles.thCell, styles.colRate]}>Rate (Rs)</Text>
                        <Text style={[styles.thCell, styles.colAmount]}>Amount (Rs)</Text>
                    </View>

                    {/* Table Rows */}
                    {items.map((item, index) => {
                        const productName = item.productId?.name || 'Product';
                        const hsn = item.hsn || item.productId?.hsn || '-';
                        return (
                            <View key={index} style={index % 2 === 0 ? styles.tRow : styles.tRowAlt}>
                                <Text style={[styles.tdCell, styles.colSN]}>{index + 1}</Text>
                                <SmartText style={[styles.tdCell, styles.colProduct]}>{productName}</SmartText>
                                {gstEnabled && <Text style={[styles.tdCell, styles.colHSN]}>{hsn}</Text>}
                                <Text style={[styles.tdCell, styles.colQty]}>{item.quantity}</Text>
                                <Text style={[styles.tdCell, styles.colRate]}>{fmt(item.price)}</Text>
                                <Text style={[styles.tdCell, styles.colAmount]}>{fmt(item.total)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* ── GST Summary Box ──────────────────────────────────── */}
                {gstEnabled && gstAmount > 0 && (
                    <View style={styles.gstBox}>
                        <Text style={styles.gstTitle}>GST SUMMARY — {gstPercent}% (CGST {gstPercent / 2}% + SGST {gstPercent / 2}%)</Text>
                        <View style={styles.gstRow}>
                            <Text style={styles.gstLabel}>Taxable Value</Text>
                            <Text style={styles.gstValue}>Rs. {fmt(subtotal)}</Text>
                        </View>
                        <View style={styles.gstRow}>
                            <Text style={styles.gstLabel}>CGST @ {gstPercent / 2}%</Text>
                            <Text style={styles.gstValue}>Rs. {fmt(cgst)}</Text>
                        </View>
                        <View style={styles.gstRow}>
                            <Text style={styles.gstLabel}>SGST @ {gstPercent / 2}%</Text>
                            <Text style={styles.gstValue}>Rs. {fmt(sgst)}</Text>
                        </View>
                    </View>
                )}

                {/* ── Interest Notice ──────────────────────────────────── */}
                {interestRate > 0 && interestAmount > 0 && (
                    <View style={styles.interestBox}>
                        <Text style={styles.interestTitle}>CREDIT INTEREST NOTICE</Text>
                        <Text style={styles.interestText}>
                            Interest @ {interestRate}% per month on credit amount of Rs. {fmt(subtotal)}.
                            {dueDate ? `  Due Date: ${dueDate}.` : ''}
                            {' '}Interest accrued: Rs. {fmt(interestAmount)} (informational — payable on recovery).
                        </Text>
                    </View>
                )}

                {/* ── Totals Box ──────────────────────────────────────── */}
                <View style={styles.totalsWrapper}>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalValue}>Rs. {fmt(subtotal)}</Text>
                        </View>
                        {gstEnabled && gstAmount > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>GST ({gstPercent}%)</Text>
                                <Text style={styles.totalValue}>Rs. {fmt(gstAmount)}</Text>
                            </View>
                        )}
                        {!gstEnabled && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Tax</Text>
                                <Text style={[styles.totalValue, { color: '#059669' }]}>Exempt</Text>
                            </View>
                        )}
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
                            <Text style={styles.grandTotalValue}>Rs. {fmt(grandTotal)}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Footer ──────────────────────────────────────────── */}
                <View style={styles.footerDivider} />
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerLeft}>{shopName}</Text>
                        <Text style={styles.footerLeft}>{shopAddress}</Text>
                        {shopGSTIN ? <Text style={styles.footerLeft}>GSTIN: {shopGSTIN}</Text> : null}
                    </View>
                    <View style={styles.signBox}>
                        <Text style={styles.signText}>Authorised Signatory</Text>
                    </View>
                </View>
                <View style={{ marginTop: 10 }}>
                    <Text style={[styles.footerLeft, { textAlign: 'center', marginTop: 6, fontSize: 7 }]}>
                        This is a computer-generated invoice. No physical signature required.
                    </Text>
                </View>

            </Page>
        </Document>
    );
}

export default BillPDFDocument;
