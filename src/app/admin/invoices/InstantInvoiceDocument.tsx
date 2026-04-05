import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';

// 1. Register Local Fonts
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
  page: { padding: '5mm', backgroundColor: '#ffffff', fontFamily: 'Montserrat', position: 'relative' },
  
  // FIXED BORDER & WATERMARK
  fixedBackground: { position: 'absolute', top: '5mm', left: '5mm', right: '5mm', bottom: '5mm', border: `1pt solid ${colors.gold}`, zIndex: -1 },
  watermark: { position: 'absolute', top: '30%', left: '15%', width: '70%', opacity: 0.05, zIndex: 1 },
  
  content: { padding: '5mm 15mm 15mm 15mm', flex: 1 },
  
  // Header
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
  
  // Columns Width
  colDesc: { width: '55%' },
  colQty: { width: '15%', textAlign: 'center' },
  colRate: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },

  // Bottom Section
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

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 30 },
  footerNote: { width: '60%', fontSize: 9, color: colors.grayText, lineHeight: 1.5 },
  signatureBox: { width: '30%', alignItems: 'flex-end', position: 'relative' },
  stampImg: { height: 70, position: 'absolute', bottom: 15, right: 10, opacity: 0.9 },
  sigLine: { width: '100%', borderTop: `1pt solid ${colors.charcoal}`, marginBottom: 5, marginTop: 40 },
  sigText: { fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: colors.charcoal },
});

export const InstantInvoiceDocument = ({ data }: any) => {
  const { invoiceNo, date, customerName, items, subtotal, 
          discountPercent, discountValue, finalTotal, bankDetails } = data || {};

  const issueDate = date ? format(new Date(date), "dd-MMM-yyyy") : "";
  const issueTime = date ? format(new Date(date), "hh:mm a") : "";

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        
        {/* FIXED BORDER & WATERMARK */}
        <View style={styles.fixedBackground} fixed>
          <Image src="/watermark_btm.png" style={styles.watermark} />
        </View>

        <View style={styles.content}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandWrapper}>
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
              <Text style={styles.invDateRange}>DATE: {issueDate}</Text>
            </View>
          </View>

          {/* Info Grid */}
          <View style={styles.infoSection}>
            <View style={styles.billTo}>
              <Text style={styles.sectionLabel}>Billed To</Text>
              <Text style={styles.billToName}>{customerName}</Text>
            </View>
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date:</Text>
                <Text style={styles.metaValue}>{issueDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Time:</Text>
                <Text style={styles.metaValue}>{issueTime}</Text>
              </View>
            </View>
          </View>

          {/* Table */}
          <View style={styles.table}>
            
            {/* Table Header */}
            <View style={styles.thRow} fixed>
              <Text style={[styles.th, styles.colDesc]}>Item / Service Description</Text>
              <Text style={[styles.th, styles.colQty]}>Qty</Text>
              <Text style={[styles.th, styles.colRate]}>Rate (AED)</Text>
              <Text style={[styles.th, styles.colTotal]}>Total (AED)</Text>
            </View>

            {/* Table Body */}
            {items && items.map((item: any, idx: number) => (
              <View style={styles.tdRow} key={idx} wrap={false}>
                <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
                <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.td, styles.colRate]}>{(Number(item.unit_price) || 0).toFixed(2)}</Text>
                <Text style={[styles.td, styles.colTotal, {fontWeight: 600}]}>{(Number(item.total_price) || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Bottom Section & Footer */}
          <View wrap={false}>
            <View style={styles.bottomSection}>
              <View style={styles.bankInfo}>
                <Text style={styles.bankTitle}>Payment Information</Text>
                <View style={styles.bankRow}><Text style={styles.bankLabel}>Bank Name:</Text><Text style={styles.bankValue}>{bankDetails?.bankName}</Text></View>
                <View style={styles.bankRow}><Text style={styles.bankLabel}>Account Name:</Text><Text style={styles.bankValue}>{bankDetails?.accountName}</Text></View>
                <View style={styles.bankRow}><Text style={styles.bankLabel}>Account No:</Text><Text style={styles.bankValue}>{bankDetails?.accountNumber}</Text></View>
                <View style={styles.bankRow}><Text style={styles.bankLabel}>IBAN:</Text><Text style={styles.bankValue}>{bankDetails?.iban}</Text></View>
                <View style={styles.bankRow}><Text style={styles.bankLabel}>Routing No:</Text><Text style={styles.bankValue}>{bankDetails?.routingNo}</Text></View>
              </View>

              <View style={styles.totalsBox}>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{(subtotal || 0).toFixed(2)}</Text>
                </View>

                {discountPercent > 0 && (
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLabel}>Discount</Text>
                    <Text style={[styles.totalValue, { color: '#E07B39' }]}>
                      - {(discountValue || 0).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Tax (0%)</Text>
                  <Text style={styles.totalValue}>0.00</Text>
                </View>

                <View style={styles.grandTotalLine}>
                  <Text style={styles.grandLabel}>Total (AED)</Text>
                  <Text style={styles.grandValue}>{(finalTotal ?? subtotal ?? 0).toFixed(2)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerNote}>
                <Text style={{fontWeight: 700}}>Note:</Text> This is an official invoice for items and services rendered instantly.
                Please retain for your records. Thank you for choosing B T M Cleaning Service.
              </Text>
              <View style={styles.signatureBox}>
                <Image src="/stamp_btm.png" style={styles.stampImg} />
                <View style={styles.sigLine}></View>
                <Text style={styles.sigText}>Authorized Stamp</Text>
              </View>
            </View>
          </View>

        </View>
      </Page>
    </Document>
  );
};