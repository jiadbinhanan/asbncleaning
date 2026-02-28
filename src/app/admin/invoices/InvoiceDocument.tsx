import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';

// 1. Register Local Fonts for 100% accuracy and 0 errors
Font.register({
  family: 'Cinzel',
  fonts: [
    { src: '/fonts/Cinzel-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Cinzel-Bold.ttf', fontWeight: 700 }
  ]
});

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: '/fonts/Montserrat-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Montserrat-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/Montserrat-Bold.ttf', fontWeight: 700 }
  ]
});

const colors = {
  charcoal: '#1A1A1A',
  gold: '#C5A880',
  goldLight: '#F9F6F0',
  grayText: '#555555',
  lineColor: '#EAEAEC',
};

const styles = StyleSheet.create({
  // Page base with 5mm margin
  page: { padding: '5mm', backgroundColor: '#ffffff', fontFamily: 'Montserrat', position: 'relative' },
  
  // 🚨 FIXED BORDER & WATERMARK (Shows on EVERY page automatically)
  fixedBackground: { position: 'absolute', top: '5mm', left: '5mm', right: '5mm', bottom: '5mm', border: `1pt solid ${colors.gold}`, zIndex: -1 },
  watermark: { position: 'absolute', top: '30%', left: '15%', width: '70%', opacity: 0.05, zIndex: 1 },
  
  // Content Wrapper (Padding inside the border)
  content: { padding: '5mm 15mm 15mm 15mm', flex: 1 },
  
  // Header (Only renders once at the top)
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2pt solid ${colors.charcoal}`, paddingBottom: 10, marginBottom: 15 },
  brandWrapper: { flexDirection: 'row', gap: 10 },
  logoImg: { height: 60, width: 60, objectFit: 'contain' },
  companyDetails: { justifyContent: 'center' },
  compNameTitle: { fontFamily: 'Cinzel', fontSize: 16, fontWeight: 700, color: colors.charcoal, marginBottom: 2 },
  compInfoText: { fontSize: 10, color: colors.grayText, lineHeight: 1.4 },
  goldSpan: { color: colors.gold, fontWeight: 700 },
  
  invoiceTitleBox: { alignItems: 'flex-end' },
  invoiceTitle: { fontFamily: 'Cinzel', fontSize: 30, color: colors.charcoal, letterSpacing: 3, marginBottom: 4 },
  invNumber: { fontSize: 11, fontWeight: 700, color: colors.gold, letterSpacing: 1 },
  invDateRange: { fontSize: 9, fontWeight: 600, color: colors.grayText, marginTop: 4, textTransform: 'uppercase' },

  // Info Section
  infoSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  billTo: { backgroundColor: colors.goldLight, padding: 10, border: `1pt solid ${colors.gold}`, width: '65%' },
  sectionLabel: { fontSize: 10, color: colors.grayText, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5 },
  billToName: { fontSize: 15, fontFamily: 'Cinzel', fontWeight: 700, color: colors.charcoal },
  metaTable: { width: '30%', justifyContent: 'flex-end' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metaLabel: { fontSize: 11, color: colors.grayText },
  metaValue: { fontSize: 11, fontWeight: 600, color: colors.charcoal },

  // Table
  table: { width: '100%', marginBottom: 15 },
  thRow: { flexDirection: 'row', backgroundColor: colors.charcoal, padding: 8 },
  th: { color: colors.gold, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
  tdRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottom: `1pt solid ${colors.lineColor}` },
  td: { fontSize: 10, fontWeight: 500, color: colors.charcoal },
  unitRow: { backgroundColor: colors.goldLight, padding: 8, borderBottom: `1pt solid ${colors.gold}` },
  unitName: { fontFamily: 'Cinzel', fontSize: 11, fontWeight: 700, color: colors.charcoal },
  
  // Columns Width
  colDate: { width: '20%' },
  colType: { width: '50%' },
  colQty: { width: '10%', textAlign: 'center' },
  colRate: { width: '20%', textAlign: 'right' },

  // Bottom Section (wrap={false} so it stays together)
  bottomSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10 },
  bankInfo: { width: '53%', backgroundColor: colors.goldLight, padding: 12, borderLeft: `3pt solid ${colors.gold}` },
  bankTitle: { fontSize: 12, color: colors.charcoal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  bankRow: { flexDirection: 'row', marginBottom: 4 },
  bankLabel: { width: 80, fontSize: 10, color: colors.grayText },
  bankValue: { flex: 1, fontSize: 10, fontWeight: 700, color: colors.charcoal },
  
  totalsBox: { width: '42%', backgroundColor: colors.goldLight, padding: 10, border: `1pt solid ${colors.gold}` },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottom: `1pt solid ${colors.lineColor}` },
  totalLabel: { fontSize: 11, color: colors.grayText },
  totalValue: { fontSize: 11, fontWeight: 700, color: colors.charcoal },
  grandTotalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 5, borderTop: `2pt solid ${colors.gold}`, borderBottom: `2pt solid ${colors.gold}` },
  grandLabel: { fontFamily: 'Cinzel', fontSize: 14, fontWeight: 700, color: colors.charcoal },
  grandValue: { fontSize: 14, fontWeight: 700, color: colors.charcoal },

  // Footer (wrap={false})
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 },
  footerNote: { width: '60%', fontSize: 9, color: colors.grayText, lineHeight: 1.5 },
  signatureBox: { width: '30%', alignItems: 'flex-end', position: 'relative' },
  stampImg: { height: 70, position: 'absolute', bottom: 15, right: 10, opacity: 0.9 },
  sigLine: { width: '100%', borderTop: `1pt solid ${colors.charcoal}`, marginBottom: 5, marginTop: 40 },
  sigText: { fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: colors.charcoal }
});

export const InvoiceDocument = ({ 
  invoiceNo, dateRange, issueDate, companyName, groupedBookings, subtotal, bankDetails 
}: any) => (
  <Document>
    <Page size="A4" style={styles.page} wrap>
      
      {/* 🚨 This view is FIXED. It will automatically repeat on every new page */}
      <View style={styles.fixedBackground} fixed>
        <Image src="/watermark_btm.png" style={styles.watermark} />
      </View>

      {/* Main Content inside the border */}
      <View style={styles.content}>
        
        {/* Header - Only appears at the beginning of the document */}
        <View style={styles.header}>
          <View style={styles.brandWrapper}>
            {/* 🚨 Fetching Logo from public folder */}
            <Image src="/logo_btm.png" style={styles.logoImg} />
            <View style={styles.companyDetails}>
              <Text style={styles.compNameTitle}>B T M Cleaning Service</Text>
              <Text style={styles.compInfoText}><Text style={styles.goldSpan}>Phone:</Text> +971-544-374231</Text>
              <Text style={styles.compInfoText}><Text style={styles.goldSpan}>Email:</Text> sales@btmcleaning.com</Text>
              <Text style={styles.compInfoText}><Text style={styles.goldSpan}>Web:</Text> btm-cleaning.com</Text>
            </View>
          </View>
          <View style={styles.invoiceTitleBox}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invNumber}>{invoiceNo}</Text>
            <Text style={styles.invDateRange}>DATE RANGE: {dateRange}</Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoSection}>
          <View style={styles.billTo}>
            <Text style={styles.sectionLabel}>Billed To</Text>
            <Text style={styles.billToName}>{companyName}</Text>
          </View>
          <View style={styles.metaTable}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date of Issue:</Text>
              <Text style={styles.metaValue}>{issueDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date:</Text>
              <Text style={styles.metaValue}>Upon Receipt</Text>
            </View>
          </View>
        </View>

        {/* Table - Automatically wraps to next page if too long */}
        <View style={styles.table}>
          {/* Table Header (Repeats on new page if broken) */}
          <View style={styles.thRow} fixed>
            <Text style={[styles.th, styles.colDate]}>Date</Text>
            <Text style={[styles.th, styles.colType]}>Cleaning Type</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate (AED)</Text>
          </View>

          {/* Table Body */}
          {Object.entries(groupedBookings).map(([unitName, bookings]: any) => (
            <React.Fragment key={unitName}>
              <View style={styles.unitRow}>
                <Text style={styles.unitName}>{unitName.toUpperCase()}</Text>
              </View>
              {bookings.map((b: any) => (
                <View style={styles.tdRow} key={b.id} wrap={false}>
                  <Text style={[styles.td, styles.colDate]}>{format(parseISO(b.cleaning_date), "dd-MMM-yyyy")}</Text>
                  <Text style={[styles.td, styles.colType]}>{b.service_type}</Text>
                  <Text style={[styles.td, styles.colQty]}>1</Text>
                  <Text style={[styles.td, styles.colRate, {fontWeight: 600}]}>{b.price.toFixed(2)}</Text>
                </View>
              ))}
            </React.Fragment>
          ))}
        </View>

        {/* 🚨 Bottom Section & Footer (wrap={false} ensures they don't break in half) */}
        <View wrap={false}>
          <View style={styles.bottomSection}>
            <View style={styles.bankInfo}>
              <Text style={styles.bankTitle}>Payment Information</Text>
              <View style={styles.bankRow}><Text style={styles.bankLabel}>Bank Name:</Text><Text style={styles.bankValue}>{bankDetails.bankName}</Text></View>
              <View style={styles.bankRow}><Text style={styles.bankLabel}>Account Name:</Text><Text style={styles.bankValue}>{bankDetails.accountName}</Text></View>
              <View style={styles.bankRow}><Text style={styles.bankLabel}>Account No:</Text><Text style={styles.bankValue}>{bankDetails.accountNo}</Text></View>
              <View style={styles.bankRow}><Text style={styles.bankLabel}>IBAN:</Text><Text style={styles.bankValue}>{bankDetails.iban}</Text></View>
              <View style={styles.bankRow}><Text style={styles.bankLabel}>Swift Code:</Text><Text style={styles.bankValue}>{bankDetails.swiftCode}</Text></View>
              <View style={styles.bankRow}><Text style={styles.bankLabel}>Routing No:</Text><Text style={styles.bankValue}>{bankDetails.routingNo}</Text></View>
            </View>

            <View style={styles.totalsBox}>
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Tax (0%)</Text>
                <Text style={styles.totalValue}>0.00</Text>
              </View>
              <View style={styles.grandTotalLine}>
                <Text style={styles.grandLabel}>Total (AED)</Text>
                <Text style={styles.grandValue}>{subtotal.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              <Text style={{fontWeight: 700}}>Note:</Text> This is an official invoice for services rendered. Please retain for your records. Thank you for choosing B T M Cleaning Service.
            </Text>
            <View style={styles.signatureBox}>
              {/* 🚨 Fetching Stamp from public folder */}
              <Image src="/stamp_btm.png" style={styles.stampImg} />
              <View style={styles.sigLine}></View>
              <Text style={styles.sigText}>Authorized Signatory</Text>
            </View>
          </View>
        </View>

      </View>
    </Page>
  </Document>
);
