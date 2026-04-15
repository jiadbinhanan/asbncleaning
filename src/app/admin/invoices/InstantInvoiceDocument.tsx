import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// ─── FONT REGISTRATION ─────────────────────────────────────────────────────────
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: '/fonts/Montserrat-Regular.ttf', fontWeight: 400, fontStyle: 'normal' },
    { src: '/fonts/Montserrat-SemiBold.ttf', fontWeight: 600, fontStyle: 'normal' },
    { src: '/fonts/Montserrat-Bold.ttf', fontWeight: 700, fontStyle: 'normal' },
  ],
});
// Registering Cinzel Font for INVOICE title
Font.register({
  family: 'Cinzel',
  fonts: [
    { src: '/fonts/Cinzel-Bold.ttf', fontWeight: 700, fontStyle: 'normal' },
  ],
});
Font.registerHyphenationCallback(word => [word]);

// ─── BRAND COLOR PALETTE ─────────────────────────────
const C = {
  orange:     '#F57C00',
  orangeLight:'#FFF3E0', 
  orangeSoft: '#FFE0B2', 
  navy:       '#0A1D42', 
  navyLight:  '#1E3A8A',
  sky:        '#75D5FF', 
  skyLight:   '#EAF7FE', 
  logoBlue:   '#5AC2FC', 
  gold:       '#BE9D74', 
  textMain:   '#1E293B',
  textMuted:  '#475569',
  border:     '#E2E8F0',
  bgAlt:      '#F8FAFC',
  white:      '#FFFFFF',
  danger:     '#DC2626',
  dangerBg:   '#FEF2F2',
};

const fmt = (v: any) => (Number(v) || 0).toFixed(2);

// ─── STYLESHEET ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { 
    fontFamily: 'Montserrat', 
    fontSize: 9, 
    color: C.textMain, 
    backgroundColor: C.white, 
    paddingTop: 25, 
    paddingBottom: 60, // Changed from 260 to 60 so table flows to the bottom
    paddingHorizontal: 0 
  },

  // --- PAGE BORDER & WATERMARK ---
  pageBorder: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 12,
    right: 12,
    border: `0.75pt solid ${C.orange}`,
    zIndex: -10,
    pointerEvents: 'none',
  },
  watermark: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    width: '70%',
    opacity: 0.08, 
    zIndex: -1,
  },

  // --- TOP HEADER ---
  headerTopWrap: { 
    paddingHorizontal: 40, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15 
  },

  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  logoImg: { width: 65, height: 65, objectFit: 'contain', marginRight: 15 },
  companyInfo: { justifyContent: 'center' },
  companyName: { fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  companyMeta: { fontSize: 8.5, color: C.textMuted, lineHeight: 1.4 },
  metaGold: { fontWeight: 700, color: C.gold },

  headerRight: { width: 220, alignItems: 'flex-end' },
  invoiceTitle: { fontFamily: 'Cinzel', fontSize: 30, fontWeight: 700, color: C.orange, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  invNoText: { fontSize: 10, fontWeight: 700, color: C.gold, marginBottom: 3 },
  durationText: { fontSize: 9, fontWeight: 700, color: C.textMuted },

  headerDivider: {
    borderBottom: `1.5pt solid ${C.navy}`,
    marginHorizontal: 40,
    marginBottom: 15,
  },

  // --- MID SECTION (BILLED TO & DATES) ---
  midSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch', 
    marginHorizontal: 40,
    marginBottom: 10, 
  },
  billToWrap: { 
    width: '65%', 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    backgroundColor: C.logoBlue, 
    borderRadius: 6, 
    justifyContent: 'flex-start',
  },
  billToLabel: { fontSize: 8, fontWeight: 700, color: C.white, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  billToName: { fontSize: 13, fontWeight: 700, color: C.navy },

  datesWrap: { 
    width: '32%', 
    backgroundColor: C.orangeLight, 
    borderLeft: `3pt solid ${C.orange}`, 
    paddingVertical: 10, 
    paddingHorizontal: 12,
    borderRadius: 4, 
    justifyContent: 'center' 
  },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  dateLabel: { fontSize: 9, color: C.textMuted, fontWeight: 600 },
  dateValue: { fontSize: 9, fontWeight: 700, color: C.navy, textAlign: 'right' },

  // --- TABLE STYLES ---
  tableWrap: { paddingHorizontal: 40, paddingBottom: 5 },

  colHdrRow: { flexDirection: 'row', backgroundColor: C.orangeLight, paddingVertical: 8, paddingHorizontal: 12, borderBottom: `1pt solid ${C.orangeSoft}`, borderRadius: 4, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  colHdrCell: { fontSize: 8, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: 0.5 },

  dataRow: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, borderBottom: `1pt dashed ${C.border}`, alignItems: 'center' },
  dataRowAlt: { backgroundColor: C.white }, 

  tdProduct: { fontSize: 9.5, color: C.navy, fontWeight: 700 }, 
  td: { fontSize: 8.5, color: C.textMain, fontWeight: 400 },
  tdBold: { fontSize: 9, color: C.navy, fontWeight: 700 },

  cDesc: { width: '56%' },
  cQty:  { width: '10%', textAlign: 'center' },
  cRate: { width: '17%', textAlign: 'right' },
  cAmt:  { width: '17%', textAlign: 'right' },

  // --- GRAND TOTAL AREA ---
  grandAreaWrap: { paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, marginBottom: 20 }, 
  grandBox: { width: 260, backgroundColor: C.white, borderRadius: 6, border: `1pt solid ${C.orangeSoft}`, overflow: 'hidden' },
  grandLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 15, borderBottom: `1pt solid ${C.orangeLight}` },
  grandFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 15, backgroundColor: C.orange },
  gtLabel: { fontSize: 9, color: C.textMuted, fontWeight: 600 },
  gtValue: { fontSize: 9, fontWeight: 700, color: C.navy },
  gtFinalLabel: { fontSize: 11, fontWeight: 700, color: C.white, textTransform: 'uppercase' },
  gtFinalValue: { fontSize: 13, fontWeight: 700, color: C.white }, 

  // --- FIXED BOTTOM SECTION ---
  fixedBottomWrap: { position: 'absolute', bottom: 40, left: 40, right: 40 }, 

  bottomGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },

  paymentCard: { flex: 1, marginRight: 20, borderRadius: 6, overflow: 'hidden' },
  paymentCardHeader: { backgroundColor: C.orangeLight, paddingVertical: 8, paddingHorizontal: 12 }, 
  paymentCardTitle: { color: C.navy, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  paymentCardBody: { padding: 12, backgroundColor: C.logoBlue }, 
  bankRow: { flexDirection: 'row', marginBottom: 5 },
  bankLabel: { width: 85, fontSize: 8, color: C.navy, fontWeight: 700 }, 
  bankValue: { flex: 1, fontSize: 8.5, color: C.navy, fontWeight: 700 },

  sigBlock: { width: 140, alignItems: 'center' },
  stampImg: { width: 75, height: 75, objectFit: 'contain', marginBottom: 5 },
  sigLine: { width: '100%', borderTop: `1pt dashed ${C.navyLight}`, marginBottom: 6, marginTop: 4 },
  sigText: { fontSize: 8, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' },

  noteBoxFull: { width: '100%', backgroundColor: C.skyLight, borderLeft: `3pt solid ${C.orange}`, padding: 10, borderRadius: 4 },
  noteLabel: { fontSize: 7.5, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  noteText: { fontSize: 8, color: C.textMain, lineHeight: 1.5 },

  // --- PAGE NUMBERS ---
  pageBand: { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' }, 
  pageBandText: { fontSize: 7, color: C.textMuted, fontWeight: 600 },
});

export const InstantInvoiceDocument = ({ data }: any) => {
  const { invoiceNo, date, customerName, items, subtotal, 
          discountPercent, discountValue, finalTotal, bankDetails } = data || {};

  const issueDate = date ? format(new Date(date), "dd-MMM-yyyy") : "";
  const issueTime = date ? format(new Date(date), "hh:mm a") : "";

  return (
    <Document>
      <Page size="A4" style={S.page} wrap>

        {/* Page Border & Watermark for every page */}
        <View style={S.pageBorder} fixed />
        <Image src="/watermark_btm_invoice.png" style={S.watermark} fixed />

        {/* --- PAGE 1: HEADER & BILLED TO --- */}
        <View render={({ pageNumber }: any) => pageNumber === 1 ? (
          <View>
            <View style={S.headerTopWrap}>
              <View style={S.headerLeft}>
                <Image src="/logo_btm_invoice.png" style={S.logoImg} />
                <View style={S.companyInfo}>
                  <Text style={S.companyName}>B T M Cleaning Service</Text>
                  <Text style={S.companyMeta}><Text style={S.metaGold}>Phone:</Text> +971-544-374231</Text>
                  <Text style={S.companyMeta}><Text style={S.metaGold}>Email:</Text> sales@btmcleaning.com</Text>
                  <Text style={S.companyMeta}><Text style={S.metaGold}>Web:</Text> btm-cleaning.com</Text>
                </View>
              </View>

              <View style={S.headerRight}>
                <Text style={S.invoiceTitle}>INVOICE</Text>
                <Text style={S.invNoText}>{invoiceNo || "N/A"}</Text>
                <Text style={S.durationText}>DATE: {issueDate}</Text>
              </View>
            </View>

            <View style={S.headerDivider} />

            <View style={S.midSection}>
              <View style={S.billToWrap}>
                <Text style={S.billToLabel}>Billed To</Text>
                <Text style={S.billToName}>{customerName || "Customer"}</Text>
              </View>

              <View style={S.datesWrap}>
                <View style={S.dateRow}>
                  <Text style={S.dateLabel}>Date Issued</Text>
                  <Text style={S.dateValue}>{issueDate}</Text>
                </View>
                <View style={S.dateRow}>
                  <Text style={S.dateLabel}>Time</Text>
                  <Text style={S.dateValue}>{issueTime}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null} fixed={false} />

        {/* --- MAIN ITEMS TABLE --- */}
        <View style={S.tableWrap}>
          <View style={S.colHdrRow} wrap={false}>
            <Text style={[S.colHdrCell, S.cDesc]}>Item / Service Description</Text>
            <Text style={[S.colHdrCell, S.cQty]}>Qty</Text>
            <Text style={[S.colHdrCell, S.cRate]}>Rate</Text>
            <Text style={[S.colHdrCell, S.cAmt]}>Amount</Text>
          </View>

          {items && items.map((item: any, idx: number) => {
            const alt = idx % 2 !== 0;
            return (
              <View style={[S.dataRow, alt ? S.dataRowAlt : {}]} key={idx} wrap={false}>
                <Text style={[S.tdProduct, S.cDesc]}>{item.description || "Service Item"}</Text>
                <Text style={[S.td, S.cQty]}>{item.quantity || 1}</Text>
                <Text style={[S.td, S.cRate]}>{fmt(item.unit_price)}</Text>
                <Text style={[S.tdBold, S.cAmt]}>{fmt(item.total_price)}</Text>
              </View>
            );
          })}
        </View>

        {/* --- GRAND TOTAL CALCULATION --- */}
        <View style={S.grandAreaWrap} wrap={false}>
          <View style={S.grandBox}>
            <View style={S.grandLine}><Text style={S.gtLabel}>Total Amount</Text><Text style={S.gtValue}>{fmt(subtotal)}</Text></View>
            {Number(discountPercent) > 0 && (
              <View style={S.grandLine}>
                <Text style={S.gtLabel}>Discount ({discountPercent}%)</Text>
                <Text style={[S.gtValue, { color: C.danger }]}>- {fmt(discountValue)}</Text>
              </View>
            )}
            <View style={S.grandLine}><Text style={S.gtLabel}>Tax</Text><Text style={S.gtValue}>0.00</Text></View>
            <View style={S.grandFinal}>
              <Text style={S.gtFinalLabel}>Grand Total</Text>
              <Text style={S.gtFinalValue}>AED {fmt(finalTotal ?? subtotal)}</Text>
            </View>
          </View>
        </View>

        {/* --- SPACER FOR FIXED FOOTER ON LAST PAGE --- */}
        <View style={{ height: 220 }} wrap={false} />

        {/* --- FIXED BOTTOM SECTION : STAMP & PAYMENT (Only on last page) --- */}
        <View style={S.fixedBottomWrap} fixed render={({ pageNumber, totalPages }: any) => {
          if (pageNumber !== totalPages) return null;
          return (
            <View>
              <View style={S.bottomGrid}>

                <View style={S.paymentCard}>
                  <View style={S.paymentCardHeader}>
                    <Text style={S.paymentCardTitle}>Payment Details / Bank Transfer</Text>
                  </View>
                  <View style={S.paymentCardBody}>
                    <View style={S.bankRow}><Text style={S.bankLabel}>Bank Name</Text><Text style={S.bankValue}>{bankDetails?.bankName}</Text></View>
                    <View style={S.bankRow}><Text style={S.bankLabel}>Account Name</Text><Text style={S.bankValue}>{bankDetails?.accountName}</Text></View>
                    <View style={S.bankRow}><Text style={S.bankLabel}>Account No.</Text><Text style={S.bankValue}>{bankDetails?.accountNumber}</Text></View>
                    <View style={S.bankRow}><Text style={S.bankLabel}>IBAN</Text><Text style={S.bankValue}>{bankDetails?.iban}</Text></View>
                    <View style={S.bankRow}><Text style={S.bankLabel}>Swift / Routing</Text><Text style={S.bankValue}>{bankDetails?.swift || bankDetails?.routingNo}</Text></View>
                  </View>
                </View>

                <View style={S.sigBlock}>
                  <Image src="/stamp_btm_invoice.png" style={S.stampImg} />
                  <View style={S.sigLine} />
                  <Text style={S.sigText}>AUTHORIZED STAMP</Text>
                </View>

              </View>

              <View style={S.noteBoxFull}>
                <Text style={S.noteLabel}>Important Note</Text>
                <Text style={S.noteText}>This is an official invoice for items and services rendered instantly. Please retain for your records. Thank you for choosing BTM Cleaning Service.</Text>
              </View>

            </View>
          );
        }} />

        {/* --- PAGE NUMBERS (Fixed at bottom of every page) --- */}
        <View style={S.pageBand} fixed render={({ pageNumber, totalPages }: any) => (
          <React.Fragment>
            <Text style={S.pageBandText}>BTM Cleaning Services Co.</Text>
            <Text style={S.pageBandText}>Page {pageNumber} of {totalPages}</Text>
          </React.Fragment>
        )} />

      </Page>
    </Document>
  );
};