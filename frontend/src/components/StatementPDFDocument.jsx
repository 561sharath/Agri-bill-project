import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9 },
    title: { fontSize: 14, marginBottom: 12, color: '#2f7f33' },
    table: { width: '100%' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 4 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333', backgroundColor: '#f0f0f0', paddingVertical: 6, paddingHorizontal: 4 },
    cell: { paddingHorizontal: 4 },
    col1: { width: '14%' },
    col2: { width: '18%' },
    col3: { width: '12%' },
    col4: { width: '28%' },
    col5: { width: '9%' },
    col6: { width: '9%' },
    col7: { width: '10%' },
    right: { textAlign: 'right' },
});

const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function StatementPDFDocument({ rows }) {
    const list = Array.isArray(rows) ? rows : [];

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                <Text style={styles.title}>Credit Statement (Bills + Payments)</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.cell, styles.col1]}>Date</Text>
                        <Text style={[styles.cell, styles.col2]}>Farmer</Text>
                        <Text style={[styles.cell, styles.col3]}>Type</Text>
                        <Text style={[styles.cell, styles.col4]}>Description</Text>
                        <Text style={[styles.cell, styles.col5, styles.right]}>Debit</Text>
                        <Text style={[styles.cell, styles.col6, styles.right]}>Credit</Text>
                        <Text style={[styles.cell, styles.col7, styles.right]}>Balance</Text>
                    </View>
                    {list.map((r, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.cell, styles.col1]}>{formatDate(r.date)}</Text>
                            <Text style={[styles.cell, styles.col2]}>{r.farmerName || '-'}</Text>
                            <Text style={[styles.cell, styles.col3]}>{r.type || '-'}</Text>
                            <Text style={[styles.cell, styles.col4]}>{(r.description || '-').toString().slice(0, 30)}</Text>
                            <Text style={[styles.cell, styles.col5, styles.right]}>{r.debit ? String(r.debit) : '–'}</Text>
                            <Text style={[styles.cell, styles.col6, styles.right]}>{r.credit ? String(r.credit) : '–'}</Text>
                            <Text style={[styles.cell, styles.col7, styles.right]}>{r.balance != null ? String(r.balance) : '–'}</Text>
                        </View>
                    ))}
                </View>
            </Page>
        </Document>
    );
}

export default StatementPDFDocument;
