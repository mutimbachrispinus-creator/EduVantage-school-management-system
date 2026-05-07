import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#fff', fontFamily: 'Helvetica' },
  header: { borderBottom: '2px solid #1e293b', paddingBottom: 15, marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  schoolName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  infoSection: { marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, fontWeight: 'bold' },
  value: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  details: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 8, marginBottom: 30 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 },
  amountSection: { marginTop: 20, padding: 20, backgroundColor: '#1e293b', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between' },
  amountLabel: { fontSize: 14, color: '#94a3b8', fontWeight: 'bold' },
  amountValue: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  footer: { marginTop: 100, borderTop: '1px solid #e2e8f0', paddingTop: 20 },
  sigBox: { width: 150, borderBottom: '1px solid #333', marginTop: 30 },
  sigLabel: { fontSize: 10, color: '#64748b', marginTop: 5 }
});

export const ExpensePDF = ({ data }) => {
  const currency = data.currency || 'KES';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.schoolName}>{data.schoolName}</Text>
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{data.schoolAddress || 'Official Institution Document'}</Text>
            <Text style={{ fontSize: 9, color: '#64748b' }}>{data.schoolPhone ? `Tel: ${data.schoolPhone}` : ''}</Text>
            <Text style={{ fontSize: 10, color: '#64748b', marginTop: 8, fontWeight: 'bold' }}>Institutional Expenditure Voucher</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={styles.title}>VOUCHER</Text>
            {data.logo && <Text style={{ fontSize: 8, color: '#94a3b8' }}>[LOGO PLACEHOLDER]</Text>}
          </View>
        </View>

        <View style={styles.infoSection}>
          <View>
            <Text style={styles.label}>Payee / Supplier</Text>
            <Text style={styles.value}>{data.supplierName || 'General Expense'}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={styles.label}>Voucher No.</Text>
            <Text style={styles.value}>{data.reference}</Text>
            <Text style={[styles.label, { marginTop: 10 }]}>Date</Text>
            <Text style={styles.value}>{new Date().toLocaleDateString('en-KE')}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Votehead Category</Text>
              <Text style={styles.value}>{data.voteheadName}</Text>
            </View>
            <View style={{ textAlign: 'right' }}>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.value}>{data.method?.toUpperCase() || 'CASH'}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.label}>Purpose / Description</Text>
            <Text style={[styles.value, { fontWeight: 'normal', lineHeight: 1.5 }]}>{data.description}</Text>
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>NET AMOUNT PAID</Text>
          <Text style={styles.amountValue}>{currency} {Number(data.amount).toLocaleString()}</Text>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <View style={styles.sigBox} />
              <Text style={styles.sigLabel}>Prepared By (Bursar)</Text>
            </View>
            <View>
              <View style={styles.sigBox} />
              <Text style={styles.sigLabel}>Authorized By (Principal)</Text>
            </View>
            <View>
              <View style={styles.sigBox} />
              <Text style={styles.sigLabel}>Received By (Payee)</Text>
            </View>
          </View>
          <Text style={{ textAlign: 'center', fontSize: 8, color: '#94a3b8', marginTop: 40 }}>
            Generated via EduVantage Platform • {new Date().toUTCString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
