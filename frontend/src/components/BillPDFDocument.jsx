import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
    header: { textAlign: 'center', marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#2f7f33', paddingBottom: 15 },
    title: { color: '#2f7f33', fontSize: 22, marginBottom: 4 },
    sub: { color: '#666', fontSize: 9, marginTop: 2 },
    details: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    detailsCol: { width: '48%' },
    detailsH3: { color: '#2f7f33', borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 4, marginBottom: 6, fontSize: 11 },
    table: { width: '100%', marginBottom: 20 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd' },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333', backgroundColor: '#f0f0f0', padding: 8 },
    cell: { padding: 8 },
    cell1: { width: '8%' },
    cell2: { width: '42%' },
    cell3: { width: '12%' },
    cell4: { width: '18%' },
    cell5: { width: '20%' },
    right: { textAlign: 'right' },
    totalRow: { flexDirection: 'row', padding: 10, backgroundColor: '#e8f5e9', fontWeight: 'bold' },
    footer: { textAlign: 'center', marginTop: 40, fontSize: 9, color: '#888' },
});

/**
 * Bill data shape: { _id, farmerId: { name, mobile, village }, items: [{ productId: { name }, quantity, price, total }], totalAmount, paymentType, createdAt }
 * shopDetails: { shopName, address, mobile } from Settings (optional)
 */
export function BillPDFDocument({ bill, shopDetails }) {
    const farmer = bill?.farmerId || {};
    const items = bill?.items || [];
    const dateStr = bill?.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN') : '';
    const shop = shopDetails || {};
    const shopName = shop.shopName || 'Green Harvest Fertilisers';
    const shopAddress = shop.address || '123 Main Bazaar, Guntur, AP - 522001';
    const shopPhone = shop.mobile || '98765 43210';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>{shopName}</Text>
                    <Text style={styles.sub}>{shopAddress}</Text>
                    <Text style={styles.sub}>Phone: {shopPhone}</Text>
                </View>

                <View style={styles.details}>
                    <View style={styles.detailsCol}>
                        <Text style={styles.detailsH3}>Bill To:</Text>
                        <Text>{farmer.name || '-'}</Text>
                        <Text style={styles.sub}>Mobile: {farmer.mobile || '-'}</Text>
                        <Text style={styles.sub}>Village: {farmer.village || '-'}</Text>
                    </View>
                    <View style={[styles.detailsCol, { textAlign: 'right' }]}>
                        <Text style={styles.detailsH3}>Invoice Details:</Text>
                        <Text>Invoice No: {bill?._id?.toString?.()?.slice(-8) || '-'}</Text>
                        <Text style={styles.sub}>Date: {dateStr}</Text>
                        <Text style={styles.sub}>Payment: {(bill?.paymentType || '').toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.cell, styles.cell1]}>SN</Text>
                        <Text style={[styles.cell, styles.cell2]}>Product</Text>
                        <Text style={[styles.cell, styles.cell3, styles.right]}>Qty</Text>
                        <Text style={[styles.cell, styles.cell4, styles.right]}>Rate (₹)</Text>
                        <Text style={[styles.cell, styles.cell5, styles.right]}>Amount (₹)</Text>
                    </View>
                    {items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.cell, styles.cell1]}>{index + 1}</Text>
                            <Text style={[styles.cell, styles.cell2]}>{item.productId?.name || 'Product'}</Text>
                            <Text style={[styles.cell, styles.cell3, styles.right]}>{item.quantity}</Text>
                            <Text style={[styles.cell, styles.cell4, styles.right]}>{Number(item.price || 0).toFixed(2)}</Text>
                            <Text style={[styles.cell, styles.cell5, styles.right]}>{Number(item.total || 0).toFixed(2)}</Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={[styles.cell, styles.cell1, styles.cell2, { width: '80%' }]}>Grand Total:</Text>
                        <Text style={[styles.cell, styles.cell5, styles.right]}>₹{Number(bill?.totalAmount || 0).toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text>Thank you for your business!</Text>
                    <Text>Computer generated invoice. No signature required.</Text>
                </View>
            </Page>
        </Document>
    );
}

export default BillPDFDocument;
