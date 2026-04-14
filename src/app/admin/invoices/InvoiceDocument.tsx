import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';

// ─── FONT REGISTRATION ─────────────────────────────────────────────────────────
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: '/fonts/Montserrat-Regular.ttf', fontWeight: 400, fontStyle: 'normal' },
    { src: '/fonts/Montserrat-SemiBold.ttf', fontWeight: 600, fontStyle: 'normal' },
    { src: '/fonts/Montserrat-Bold.ttf', fontWeight: 700, fontStyle: 'normal' },
  ],
});
Font.registerHyphenationCallback(word => [word]);

// ─── BRAND COLOR PALETTE (ORANGE + SKY BLUE THEME) ─────────────────────────────
const C = {
  orange:     '#F57C00', // Main brand color (from the bucket)
  orangeLight:'#FFF3E0', // Very soft orange for backgrounds
  orangeSoft: '#FFE0B2', // Soft border/accent
  navy:       '#0A1D42', // Secondary color (from text)
  navyLight:  '#1E3A8A',
  sky:        '#75D5FF', // Logo Sky Blue color
  skyLight:   '#EAF7FE', // Very soft sky blue for backgrounds
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
    paddingTop: 15, // Reduced top margin as requested
    paddingBottom: 210, 
    paddingHorizontal: 0 
  },

  // --- TOP HEADER (Left: Logo+Info, Right: Title+Meta) ---
  headerTopWrap: { 
    paddingHorizontal: 40, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 25 // Increased gap to prevent overlap with Bill To box
  },

  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  logoImg: { width: 65, height: 65, objectFit: 'contain', marginRight: 15 },
  companyInfo: { justifyContent: 'center' },
  companyName: { fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4, textTransform: 'uppercase' },
  companyMeta: { fontSize: 8.5, color: C.textMuted, lineHeight: 1.4 },

  headerRight: { width: 220, alignItems: 'flex-end' },
  invoiceTitle: { fontSize: 26, fontWeight: 700, color: C.orange, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },

  // Condensed Meta Box
  metaBlock: { width: '100%', backgroundColor: C.orangeLight, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4, borderLeft: `3pt solid ${C.orange}` },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  metaLabel: { fontSize: 8, color: C.textMuted, fontWeight: 600 },
  metaValue: { fontSize: 8, fontWeight: 700, color: C.navy, textAlign: 'right' },
  metaHL: { fontSize: 8.5, fontWeight: 700, color: C.orange, textAlign: 'right' },

  // --- BILLED TO ---
  // Replaced Slate with Sky Blue Theme, reduced bottom margin
  billToWrap: { marginHorizontal: 40, padding: 12, backgroundColor: C.skyLight, borderRadius: 6, border: `1pt solid ${C.sky}`, marginBottom: 5 },
  billToLabel: { fontSize: 8, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  billToName: { fontSize: 13, fontWeight: 700, color: C.navy },

  // --- CONTINUED BAND (For Next Pages) ---
  continuedBand: { backgroundColor: C.orangeLight, paddingHorizontal: 40, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', borderBottom: `1pt solid ${C.orangeSoft}` },
  continuedText: { fontSize: 8, color: C.navy, fontWeight: 700, textTransform: 'uppercase' },
  continuedInvNo: { fontSize: 8, fontWeight: 700, color: C.orange },

  // --- TABLE STYLES ---
  tableWrap: { paddingHorizontal: 40, paddingBottom: 5 },

  unitBar: { backgroundColor: C.orange, paddingVertical: 8, paddingHorizontal: 12, marginTop: 10, borderRadius: 4, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  unitBarText: { fontSize: 9, fontWeight: 700, color: C.white, letterSpacing: 0.5 },

  instantBar: { backgroundColor: C.navy, paddingVertical: 8, paddingHorizontal: 12, marginTop: 10, borderRadius: 4 },

  colHdrRow: { flexDirection: 'row', backgroundColor: C.orangeLight, paddingVertical: 8, paddingHorizontal: 12, borderBottom: `1pt solid ${C.orangeSoft}` },
  colHdrCell: { fontSize: 8, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: 0.5 },

  dataRow: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, borderBottom: `1pt dashed ${C.border}`, alignItems: 'center' },
  dataRowAlt: { backgroundColor: C.white }, 

  // Extra Provide now uses Sky Blue Light instead of Slate/bgAlt
  dataRowExtra: { backgroundColor: C.skyLight },
  dataRowCharge: { backgroundColor: C.dangerBg, borderLeft: `2pt solid ${C.danger}` },

  tdProduct: { fontSize: 9.5, color: C.navy, fontWeight: 700 }, 
  td: { fontSize: 8.5, color: C.textMain, fontWeight: 400 },
  tdBold: { fontSize: 9, color: C.navy, fontWeight: 700 },
  tdMuted: { fontSize: 8.5, color: C.textMuted, fontWeight: 400 },
  tdCharge: { fontSize: 8.5, color: C.danger, fontWeight: 600 },

  cDate: { width: '18%' },
  cDesc: { width: '44%' },
  cQty:  { width: '10%', textAlign: 'center' },
  cRate: { width: '14%', textAlign: 'right' },
  cAmt:  { width: '14%', textAlign: 'right' },

  subtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 6, paddingBottom: 10, paddingHorizontal: 12 },
  subtotalLabel: { fontSize: 9, fontWeight: 600, color: C.textMuted, marginRight: 15 },
  subtotalValue: { fontSize: 10, fontWeight: 700, color: C.orange, minWidth: 70, textAlign: 'right' },

  // --- GRAND TOTAL AREA ---
  grandAreaWrap: { paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5 }, 
  grandBox: { width: 260, backgroundColor: C.white, borderRadius: 6, border: `1pt solid ${C.orangeSoft}`, overflow: 'hidden' },
  grandLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 15, borderBottom: `1pt solid ${C.orangeLight}` },
  grandFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 15, backgroundColor: C.orange },
  gtLabel: { fontSize: 9, color: C.textMuted, fontWeight: 600 },
  gtValue: { fontSize: 9, fontWeight: 700, color: C.navy },
  gtFinalLabel: { fontSize: 11, fontWeight: 700, color: C.white, textTransform: 'uppercase' },
  gtFinalValue: { fontSize: 13, fontWeight: 700, color: C.white }, 

  // --- FIXED BOTTOM SECTION ---
  fixedBottomWrap: { position: 'absolute', bottom: 30, left: 40, right: 40 },

  bottomGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },

  paymentCard: { flex: 1, marginRight: 20, backgroundColor: C.white, borderRadius: 6, border: `1pt solid ${C.border}`, overflow: 'hidden' },
  paymentCardHeader: { backgroundColor: C.navy, paddingVertical: 6, paddingHorizontal: 12 },
  paymentCardTitle: { color: C.white, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  paymentCardBody: { padding: 12 },
  bankRow: { flexDirection: 'row', marginBottom: 5 },
  bankLabel: { width: 85, fontSize: 8, color: C.textMuted, fontWeight: 600 },
  bankValue: { flex: 1, fontSize: 8.5, color: C.navy, fontWeight: 700 },

  sigBlock: { width: 140, alignItems: 'center' },
  stampImg: { width: 75, height: 75, objectFit: 'contain', marginBottom: 5 },
  sigLine: { width: '100%', borderTop: `1pt dashed ${C.navyLight}`, marginBottom: 6, marginTop: 4 },
  sigText: { fontSize: 8, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' },

  // Full Width Note (Bottom) - Replaced Slate with Sky Blue Light background
  noteBoxFull: { width: '100%', backgroundColor: C.skyLight, borderLeft: `3pt solid ${C.orange}`, padding: 10, borderRadius: 4 },
  noteLabel: { fontSize: 7.5, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  noteText: { fontSize: 8, color: C.textMain, lineHeight: 1.5 },

  // --- PAGE NUMBERS ---
  pageBand: { position: 'absolute', bottom: 10, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  pageBandText: { fontSize: 7, color: C.textMuted, fontWeight: 600 },
});

export const InvoiceDocument = ({ data }: any) => {
  const { invoiceNo, date, companyName, bookings, instantBills, subtotal,
          discountPercent, discountValue, finalTotal, bankDetails, invoiceMode } = data || {};

  const issueDate = date ? format(parseISO(date), 'dd-MMM-yyyy') : '';
  const invoiceDuration = data?.duration || "01-Oct-2023 to 31-Oct-2023";

  const grouped: Record<string, any[]> = bookings?.reduce((acc: any, b: any) => {
    const key = `${b.units?.building_name || 'Unknown'} | Unit- ${b.units?.unit_number || 'N/A'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {}) || {};

  const calcUnitSub = (ubs: any[]) => ubs.reduce((sum: number, b: any) => {
    let t = invoiceMode !== 'inventory_only' ? Number(b.price) : 0;
    if (invoiceMode !== 'cleaning_only') {
      t += (b.extras || []).reduce((s: number, e: any) => s + Number(e.total_price), 0);
      t += (b.extraCharges || []).reduce((s: number, c: any) => s + Number(c.total_price), 0);
    }
    return sum + t;
  }, 0);

  return (
    <Document>
      <Page size="A4" style={S.page} wrap>

        {/* --- PAGE 1: HEADER & BILLED TO --- */}
        <View render={({ pageNumber }: any) => pageNumber === 1 ? (
          <View>
            <View style={S.headerTopWrap}>
              {/* Left Side: Logo & Details side-by-side */}
              <View style={S.headerLeft}>
                <Image src="/logo_btm_invoice.png" style={S.logoImg} />
                <View style={S.companyInfo}>
                  <Text style={S.companyName}>BTM Cleaning Services Co.</Text>
                  <Text style={S.companyMeta}>Phone: +971-544-374231</Text>
                  <Text style={S.companyMeta}>Email: sales@btmcleaning.com</Text>
                  <Text style={S.companyMeta}>Website: www.btm-cleaning.com</Text>
                </View>
              </View>

              {/* Right Side: INVOICE title & Condensed Meta Box */}
              <View style={S.headerRight}>
                <Text style={S.invoiceTitle}>Invoice</Text>
                <View style={S.metaBlock}>
                  <View style={S.metaRow}><Text style={S.metaLabel}>Invoice No</Text><Text style={S.metaHL}>{invoiceNo}</Text></View>
                  <View style={S.metaRow}><Text style={S.metaLabel}>Date Issued</Text><Text style={S.metaValue}>{issueDate}</Text></View>
                  <View style={S.metaRow}><Text style={S.metaLabel}>Duration</Text><Text style={S.metaValue}>{invoiceDuration}</Text></View>
                  <View style={S.metaRow}><Text style={S.metaLabel}>Due Date</Text><Text style={S.metaValue}>Upon Receipt</Text></View>
                </View>
              </View>
            </View>

            <View style={S.billToWrap}>
              <Text style={S.billToLabel}>Billed To</Text>
              <Text style={S.billToName}>{companyName}</Text>
            </View>
          </View>
        ) : null} fixed={false} />

        {/* --- PAGE 2+: CONTINUED BAND --- */}
        <View fixed render={({ pageNumber }: any) => pageNumber > 1 ? (
          <View style={S.continuedBand}>
            <Text style={S.continuedText}>Service Details (Continued)</Text>
            <Text style={S.continuedInvNo}>INV: {invoiceNo}</Text>
          </View>
        ) : null} />

        {/* --- MAIN ITEMS TABLE --- */}
        <View style={S.tableWrap}>
          {Object.entries(grouped).map(([unitName, ubs]: any) => {
            let ri = 0;
            return (
              <React.Fragment key={unitName}>
                <View style={S.unitBar} wrap={false}><Text style={S.unitBarText}>{unitName}</Text></View>

                <View style={S.colHdrRow} wrap={false}>
                  <Text style={[S.colHdrCell, S.cDate]}>Date</Text>
                  <Text style={[S.colHdrCell, S.cDesc]}>Description</Text>
                  <Text style={[S.colHdrCell, S.cQty]}>Qty</Text>
                  <Text style={[S.colHdrCell, S.cRate]}>Rate</Text>
                  <Text style={[S.colHdrCell, S.cAmt]}>Amount</Text>
                </View>

                {ubs.map((b: any) => {
                  const alt = ri++ % 2 !== 0;
                  return (
                    <React.Fragment key={b.id}>
                      {invoiceMode !== 'inventory_only' && (
                        <View style={[S.dataRow, alt ? S.dataRowAlt : {}]} wrap={false}>
                          <Text style={[S.td, S.cDate]}>{format(parseISO(b.cleaning_date), 'dd-MMM-yyyy')}</Text>
                          <Text style={[S.tdProduct, S.cDesc]}>{b.service_type}</Text>
                          <Text style={[S.td, S.cQty]}>1</Text>
                          <Text style={[S.td, S.cRate]}>{fmt(b.price)}</Text>
                          <Text style={[S.tdBold, S.cAmt]}>{fmt(b.price)}</Text>
                        </View>
                      )}

                      {invoiceMode !== 'cleaning_only' && b.extras?.map((ex: any, ei: number) => (
                        <View style={[S.dataRow, S.dataRowExtra]} key={`ex${ei}`} wrap={false}>
                          <Text style={[S.tdMuted, S.cDate]}>{invoiceMode === 'inventory_only' ? format(parseISO(b.cleaning_date), 'dd-MMM-yyyy') : ''}</Text>
                          <Text style={[S.tdMuted, S.cDesc]}>{invoiceMode === 'combined' ? `+ Extra Provide: ${ex.item_name}` : ex.item_name}</Text>
                          <Text style={[S.tdMuted, S.cQty]}>{ex.quantity}</Text>
                          <Text style={[S.tdMuted, S.cRate]}>{ex.quantity > 0 ? fmt(Number(ex.total_price) / ex.quantity) : '0.00'}</Text>
                          <Text style={[S.tdBold, S.cAmt]}>{fmt(ex.total_price)}</Text>
                        </View>
                      ))}

                      {invoiceMode !== 'cleaning_only' && b.extraCharges?.map((ch: any, ci: number) => (
                        <View style={[S.dataRow, S.dataRowCharge]} key={`ch${ci}`} wrap={false}>
                          <Text style={[S.tdCharge, S.cDate]}>{invoiceMode === 'inventory_only' ? format(parseISO(b.cleaning_date), 'dd-MMM-yyyy') : ''}</Text>
                          <Text style={[S.tdCharge, S.cDesc]}>{ch.charge_type === 'damage' ? `! Damage: ${ch.item_name}` : `+ Additional: ${ch.item_name}`}</Text>
                          <Text style={[S.tdCharge, S.cQty]}>1</Text>
                          <Text style={[S.tdCharge, S.cRate]}>{fmt(ch.total_price)}</Text>
                          <Text style={[S.tdCharge, S.cAmt]}>{fmt(ch.total_price)}</Text>
                        </View>
                      ))}
                    </React.Fragment>
                  );
                })}
                <View style={S.subtotalRow} wrap={false}>
                  <Text style={S.subtotalLabel}>Unit Sub Total</Text>
                  <Text style={S.subtotalValue}>{fmt(calcUnitSub(ubs))}</Text>
                </View>
              </React.Fragment>
            );
          })}

          {instantBills?.length > 0 && (
            <React.Fragment>
              <View style={S.instantBar} wrap={false}><Text style={S.unitBarText}>Outstanding Instant Bills</Text></View>
              <View style={S.colHdrRow} wrap={false}>
                <Text style={[S.colHdrCell, { width: '18%' }]}>Date</Text>
                <Text style={[S.colHdrCell, { width: '54%' }]}>Description</Text>
                <Text style={[S.colHdrCell, { width: '14%', textAlign: 'center' }]}>Qty</Text>
                <Text style={[S.colHdrCell, { width: '14%', textAlign: 'right' }]}>Amount</Text>
              </View>
              {instantBills.map((ib: any, ii: number) => (
                <View style={[S.dataRow, ii % 2 !== 0 ? S.dataRowAlt : {}]} key={`ib${ii}`} wrap={false}>
                  <Text style={[S.td, { width: '18%' }]}>{format(parseISO(ib.created_at), 'dd-MMM-yyyy')}</Text>
                  <Text style={[S.tdProduct, { width: '54%' }]}>Instant POS Bill - {ib.invoice_no}</Text>
                  <Text style={[S.td, { width: '14%', textAlign: 'center' }]}>1</Text>
                  <Text style={[S.tdBold, { width: '14%', textAlign: 'right' }]}>{fmt(ib.total_amount)}</Text>
                </View>
              ))}
              <View style={S.subtotalRow} wrap={false}>
                <Text style={S.subtotalLabel}>Bills Sub Total</Text>
                <Text style={S.subtotalValue}>{fmt(instantBills.reduce((s: number, b: any) => s + Number(b.total_amount), 0))}</Text>
              </View>
            </React.Fragment>
          )}
        </View>

        {/* --- GRAND TOTAL CALCULATION --- */}
        <View style={S.grandAreaWrap} wrap={false}>
          <View style={S.grandBox}>
            <View style={S.grandLine}><Text style={S.gtLabel}>Total Amount</Text><Text style={S.gtValue}>{fmt(subtotal)}</Text></View>
            {Number(discountPercent) > 0 && (
              <View style={S.grandLine}><Text style={S.gtLabel}>Discount ({discountPercent}%)</Text><Text style={[S.gtValue, { color: C.danger }]}>- {fmt(discountValue)}</Text></View>
            )}
            <View style={S.grandLine}><Text style={S.gtLabel}>Tax</Text><Text style={S.gtValue}>0.00</Text></View>
            <View style={S.grandFinal}><Text style={S.gtFinalLabel}>Grand Total</Text><Text style={S.gtFinalValue}>AED {fmt(finalTotal ?? subtotal)}</Text></View>
          </View>
        </View>


        {/* --- FIXED BOTTOM SECTION : STAMP & PAYMENT (Only on last page) --- */}
        <View style={S.fixedBottomWrap} fixed render={({ pageNumber, totalPages }: any) => {
          if (pageNumber !== totalPages) return null;
          return (
            <View>
              <View style={S.bottomGrid}>

                {/* Premium Payment Details Card */}
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

                {/* Stamp Section */}
                <View style={S.sigBlock}>
                  <Image src="/stamp_btm_invoice.png" style={S.stampImg} />
                  <View style={S.sigLine} />
                  <Text style={S.sigText}>AUTHORIZED STAMP</Text>
                </View>

              </View>

              {/* Full Width Important Note */}
              <View style={S.noteBoxFull}>
                <Text style={S.noteLabel}>Important Note</Text>
                <Text style={S.noteText}>This is an official invoice for services rendered. Please make the payment by the due date. Thank you for your business.</Text>
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