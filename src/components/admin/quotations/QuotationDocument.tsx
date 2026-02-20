import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Svg, Defs, LinearGradient, Stop, Circle } from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// 1. DATA DEFINITIONS (FIXED ROWS)
// ---------------------------------------------------------------------------

export const defaultPricingCategories = [
  {
    id: "t1", title: "CHECK OUT CLEANING WITH LINEN + LAUNDRY + AMENITIES",
    items: [
      { type: "Studio", price: "155.00" },
      { type: "One Bedroom", price: "180.00" },
      { type: "Two Bedroom (2 bed)", price: "270.00" },
      { type: "Two Bedroom (2 bed + maid room)", price: "290.00" },
      { type: "Two Bedroom (3 bed)", price: "300.00" },
      { type: "Two Bedroom (3 bed + maid room)", price: "325.00" },
      { type: "Three Bedroom (3 bed)", price: "360.00" },
      { type: "Three Bedroom (3 bed + maid room)", price: "390.00" },
      { type: "Three Bedroom (5 bed)", price: "450.00" },
      { type: "Three Bedroom (5 bed + maid room)", price: "470.00" }
    ]
  },
  {
    id: "t2", title: "CHECK OUT CLEANING WITH LINEN + LAUNDRY ONLY",
    items: [
      { type: "Studio", price: "135.00" },
      { type: "One Bedroom", price: "160.00" },
      { type: "Two Bedroom (2 bed)", price: "245.00" },
      { type: "Two Bedroom (2 bed + maid room)", price: "275.00" },
      { type: "Two Bedroom (3 bed)", price: "270.00" },
      { type: "Two Bedroom (3 bed + maid room)", price: "290.00" },
      { type: "Three Bedroom (3 bed)", price: "330.00" },
      { type: "Three Bedroom (3 bed + maid room)", price: "360.00" },
      { type: "Three Bedroom (5 bed)", price: "410.00" },
      { type: "Three Bedroom (5 bed + maid room)", price: "430.00" }
    ]
  },
  {
    id: "t3", title: "CHECK OUT CLEANING WITH AMENITIES ONLY",
    items: [
      { type: "Studio", price: "120.00" },
      { type: "One Bedroom", price: "150.00" },
      { type: "Two Bedroom(2 bed)", price: "210.00" },
      { type: "Two Bedroom (2 bed + maid room)", price: "235.00" },
      { type: "Two Bedroom (3 bed)", price: "225.00" },
      { type: "Two Bedroom (3 bed + maid room)", price: "240.00" },
      { type: "Three Bedroom (3 bed)", price: "270.00" },
      { type: "Three Bedroom (3 bed + maid room)", price: "285.00" },
      { type: "Three Bedroom(5 bed)", price: "300.00" },
      { type: "Three Bedroom(5 bed + maid room)", price: "315.00" }
    ]
  },
  {
    id: "t4", title: "DEEP CLEANING WITH LINEN + LAUNDRY + AMENITIES",
    items: [
      { type: "Studio", price: "300.00" },
      { type: "One Bedroom", price: "395.00" },
      { type: "Two Bedroom(2 bed)", price: "520.00" },
      { type: "Two Bedroom (2 bed + maid room)", price: "560.00" },
      { type: "Two Bedroom (3 bed)", price: "585.00" },
      { type: "Two Bedroom (3 bed + maid room)", price: "600.00" },
      { type: "Three Bedroom (3 bed)", price: "650.00" },
      { type: "Three Bedroom (3 bed + maid room)", price: "695.00" },
      { type: "Three Bedroom(5 bed)", price: "750.00" },
      { type: "Three Bedroom (5 bed + maid room)", price: "790.00" }
    ]
  },
  {
    id: "t5", title: "DEEP CLEANING (WITHOUT LINEN/AMENITIES)",
    items: [
      { type: "Studio", price: "200.00" },
      { type: "One Bedroom", price: "270.00" },
      { type: "Two Bedroom", price: "390.00" },
      { type: "Three Bedroom", price: "450.00" }
    ]
  },
  {
    id: "t6", title: "TOUCH UP CLEANING",
    items: [
      { type: "Studio", price: "70.00" },
      { type: "One Bedroom", price: "115.00" },
      { type: "Two Bedroom", price: "170.00" },
      { type: "Three Bedroom", price: "210.00" }
    ]
  }
];

// Page 1 Amenities (1 to 10)
const amenitiesList1 = [
  { no: "1", name: "Bed sheet", studio: "1", b1: "1", b2: "2", b3: "3" },
  { no: "2", name: "Duvet Cover", studio: "1", b1: "1", b2: "2", b3: "3" },
  { no: "3", name: "Pillowcases", studio: "2", b1: "4", b2: "8", b3: "12" },
  { no: "4", name: "Bath Towel", studio: "2", b1: "3", b2: "5", b3: "7" },
  { no: "5", name: "Hand Towel", studio: "2", b1: "3", b2: "5", b3: "7" },
  { no: "6", name: "Face Towel", studio: "2", b1: "2", b2: "4", b3: "6" },
  { no: "7", name: "Bathmat", studio: "1", b1: "1", b2: "2", b3: "3" },
  { no: "8", name: "Slippers", studio: "2", b1: "2", b2: "4", b3: "6" },
  { no: "9", name: "Shampoo", studio: "1", b1: "2", b2: "2", b3: "3" },
  { no: "10", name: "Conditioner", studio: "1", b1: "2", b2: "2", b3: "3" }
];

// Page 2 Amenities (11 to 29)
const amenitiesList2 = [
  { no: "11", name: "Shower Gel", studio: "1", b1: "2", b2: "2", b3: "3" },
  { no: "12", name: "Body Lotion", studio: "1", b1: "2", b2: "2", b3: "3" },
  { no: "13", name: "Dental Kit", studio: "2", b1: "2", b2: "4", b3: "6" },
  { no: "14", name: "Shower Cap", studio: "1", b1: "1", b2: "2", b3: "3" },
  { no: "15", name: "Shaving Kit", studio: "1", b1: "1", b2: "2", b3: "3" },
  { no: "16", name: "Sanitary Bag", studio: "1", b1: "1", b2: "2", b3: "3" },
  { no: "17", name: "Vanity Kit", studio: "1", b1: "1", b2: "2", b3: "3" },
  { no: "18", name: "Comb", studio: "1", b1: "1", b2: "2", b3: "3" },
  { no: "19", name: "Toilet Rolls", studio: "1", b1: "2", b2: "3", b3: "4" },
  { no: "20", name: "Face Tissue Box", studio: "1", b1: "1", b2: "1", b3: "2" },
  { no: "21", name: "Green Teabag", studio: "4", b1: "4", b2: "6", b3: "8" },
  { no: "22", name: "Black Teabag", studio: "4", b1: "4", b2: "6", b3: "8" },
  { no: "23", name: "Coffee Capsules", studio: "4", b1: "4", b2: "6", b3: "8" },
  { no: "24", name: "Brown Sugar Sticks", studio: "4", b1: "4", b2: "6", b3: "8" },
  { no: "25", name: "White Sugar Sticks", studio: "4", b1: "4", b2: "6", b3: "8" },
  { no: "26", name: "Water Bottles (500ml)", studio: "2", b1: "2", b2: "4", b3: "6" },
  { no: "27", name: "Laundry Powder", studio: "1", b1: "1", b2: "1", b3: "1" },
  { no: "28", name: "Scrub Sponge", studio: "1", b1: "1", b2: "1", b3: "1" },
  { no: "29", name: "Paper Towel Roll", studio: "1", b1: "1", b2: "1", b3: "1" }
];

// ---------------------------------------------------------------------------
// 2. STYLES (5mm padding + Reduced Table Gaps)
// ---------------------------------------------------------------------------

const colors = {
  navyBlue: '#0A192F',
  luxuryGold: '#D4AF37',
  textDark: '#2C3E50',
  textGray: '#596A7A',
  bgWhite: '#FFFFFF',
  tableStripe: '#FDFBF4',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.bgWhite,
    padding: '5mm', // Strictly 5mm margin around the page
    fontFamily: 'Helvetica',
    position: 'relative',
  },
  innerContainer: {
    flex: 1,
    padding: 10, // Inner safe area so text doesn't touch the absolute edge
  },
  // --- BACKGROUND GRAPHICS ---
  bgGraphics: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: -1,
  },
  watermarkContainer: {
    position: 'absolute',
    top: 250, left: 80,
    opacity: 0.04,
    transform: 'rotate(-35deg)',
    zIndex: -1,
  },
  watermarkCircle: {
    width: 420, height: 420,
    border: `10pt solid ${colors.navyBlue}`,
    borderRadius: 210,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  watermarkText: {
    fontSize: 60, fontWeight: 'extrabold',
    color: colors.navyBlue, textTransform: 'uppercase',
    letterSpacing: 5, textAlign: 'center',
  },
  
  // --- HEADER (PAGE 1 ONLY) ---
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderBottom: `2pt solid ${colors.luxuryGold}`,
    paddingBottom: 15, marginBottom: 15,
  },
  logoBox: { alignItems: 'flex-start' },
  logo: { height: 60, marginBottom: 8 },
  quoteBadge: {
    backgroundColor: colors.navyBlue, color: colors.luxuryGold,
    padding: '4px 15px', borderRadius: 4, fontSize: 12,
    fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase',
  },
  companyInfo: { textAlign: 'right', fontSize: 9, color: colors.textGray, lineHeight: 1.5 },
  companyName: { fontSize: 14, color: colors.navyBlue, fontWeight: 'heavy', letterSpacing: 1, marginBottom: 4 },
  goldText: { color: colors.luxuryGold, fontWeight: 'bold' },
  
  // --- TYPOGRAPHY ---
  clientGreeting: {
    fontSize: 11, fontWeight: 'bold', color: colors.navyBlue,
    marginVertical: 10, padding: 8,
    backgroundColor: '#F9F6ED', borderLeft: `4pt solid ${colors.luxuryGold}`,
  },
  paragraph: {
    fontSize: 10, lineHeight: 1.5, color: colors.textDark,
    marginBottom: 6, textAlign: 'justify',
  },
  sectionTitleBox: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 8 },
  sectionTitleLine: { width: 4, height: 12, backgroundColor: colors.luxuryGold, marginRight: 8, borderRadius: 2 },
  sectionTitle: { color: colors.navyBlue, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // --- TABLES ---
  table: { width: '100%', border: '1pt solid #E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: colors.navyBlue },
  tableHeaderCell: { color: colors.luxuryGold, fontSize: 9, fontWeight: 'bold', padding: '6px', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottom: '1pt solid #E5E7EB' },
  tableRowEven: { backgroundColor: colors.tableStripe },
  tableCell: { padding: '6px', fontSize: 9, color: colors.textDark },
  
  // Column Widths
  colSNo: { width: '8%', textAlign: 'center' },
  colAmenity: { width: '36%' },
  colQty: { width: '14%', textAlign: 'center' },
  colItemDesc: { width: '75%' },
  colPrice: { width: '25%', textAlign: 'right', fontWeight: 'bold' },
  
  // --- TERMS & SIGNATURE ---
  termsBox: {
    backgroundColor: '#F8FAFC', border: '1pt solid #E2E8F0',
    borderLeft: `4pt solid ${colors.navyBlue}`, padding: 12, marginTop: 8,
  },
  termItem: { fontSize: 9.5, color: colors.textGray, lineHeight: 1.5, marginBottom: 4 },
  
  signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  sigBlock: { width: 180, alignItems: 'center' },
  stampArea: { height: 60, justifyContent: 'center', alignItems: 'center' },
  stampImg: { height: 55, opacity: 0.8 },
  sigLine: { width: '100%', borderTop: `1pt dashed ${colors.navyBlue}`, marginBottom: 6 },
  sigText: { fontSize: 10, fontWeight: 'bold', color: colors.navyBlue },
  sigSubText: { fontSize: 8.5, color: colors.textGray, marginTop: 3 },
  
  thankYou: { marginTop: 25, alignItems: 'center' },
  thankYouTitle: { color: colors.luxuryGold, fontSize: 14, fontWeight: 'bold', letterSpacing: 2, marginBottom: 4 },
  thankYouSub: { color: colors.textGray, fontSize: 9.5 },
  
  pageNumber: {
    position: 'absolute', bottom: 15, right: 25,
    fontSize: 8.5, fontWeight: 'bold', color: colors.navyBlue,
  },
});

// ---------------------------------------------------------------------------
// 3. COMPONENTS
// ---------------------------------------------------------------------------

const BackgroundGraphics = () => (
  <View style={styles.bgGraphics} fixed>
    <Svg height="100%" width="100%">
      <Defs>
        <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#D4AF37" stopOpacity={0.12} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#0A192F" stopOpacity={0.06} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Circle cx="85%" cy="0%" r="280" fill="url('#goldGrad')" />
      <Circle cx="0%" cy="100%" r="380" fill="url('#blueGrad')" />
    </Svg>
    <View style={styles.watermarkContainer}>
      <View style={styles.watermarkCircle}>
        <Text style={styles.watermarkText}>ASBN{"\n"}Cleaning</Text>
      </View>
    </View>
  </View>
);

const SectionTitle = ({ title }: { title: string }) => (
  <View style={styles.sectionTitleBox}>
    <View style={styles.sectionTitleLine}></View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

export interface QuotationProps {
  quoteNo: string;
  date: string;
  customerName: string;
  pricingData: typeof defaultPricingCategories;
}

export const QuotationDocument = ({ quoteNo, date, customerName, pricingData }: QuotationProps) => {
  
  const renderPricingTable = (id: string) => {
    const data = pricingData.find(p => p.id === id);
    if (!data) return null;
    return (
      <View style={{ marginBottom: 10 }}>
        <SectionTitle title={data.title} />
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colItemDesc]}>Item Description / Type</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price (AED)</Text>
          </View>
          {data.items.map((item, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 !== 0 ? styles.tableRowEven : {}]}>
              <Text style={[styles.tableCell, styles.colItemDesc]}>{item.type}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{item.price}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Document>
      {/* ================= PAGE 1 ================= */}
      <Page size="A4" style={styles.page}>
        <BackgroundGraphics />
        <View style={styles.innerContainer}>
          
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Image src="/Logo_asbn.jpg" style={styles.logo} /> 
              <Text style={styles.quoteBadge}>Quotation</Text>
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>ASBN CLEANING SERVICE EST.</Text>
              <Text>Quote No: <Text style={styles.goldText}>{quoteNo}</Text></Text>
              <Text>Date: <Text style={styles.goldText}>{date}</Text></Text>
              <Text>Phone: +971-544-374231</Text>
              <Text>Email: sales@asbncleaning.com</Text>
              <Text>Web: www.asbncleaning.com</Text>
            </View>
          </View>

          <Text style={styles.clientGreeting}>To: {customerName}</Text>

          <Text style={styles.paragraph}>
            ASBN Cleaning Service Est. is committed to providing high-quality cleaning services delivered by trained and professional staff. Our primary goal is to achieve complete customer satisfaction by consistently maintaining the highest standards of cleanliness and service.
          </Text>
          <Text style={styles.paragraph}>
            Guests typically expect a clean, comfortable, and well-equipped space with essential amenities and reliable service. To meet and exceed these expectations, we focus on understanding our clients\' needs and delivering consistent, dependable results.
          </Text>
          <Text style={styles.paragraph}>
            We are pleased to share our service pricing with you. For your reference, please find below the rates for our check-out cleaning, in-stay cleaning, touch-up cleaning, and deep cleaning services. We look forward to the opportunity to serve you and build a long-term professional relationship.
          </Text>

          <SectionTitle title="LIST OF AMENITIES WE PROVIDE" />
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colSNo]}>S.NO</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmenity]}>AMENITIES</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>STUDIO (QTY)</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>01 BEDROOM</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>02 BEDROOM</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>03 BEDROOM</Text>
            </View>
            {amenitiesList1.map((item, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 !== 0 ? styles.tableRowEven : {}]}>
                <Text style={[styles.tableCell, styles.colSNo]}>{item.no}</Text>
                <Text style={[styles.tableCell, styles.colAmenity]}>{item.name}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.studio}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.b1}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.b2}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.b3}</Text>
              </View>
            ))}
          </View>

        </View>
        <Text style={styles.pageNumber}>PAGE 1 OF 5</Text>
      </Page>

      {/* ================= PAGE 2 ================= */}
      <Page size="A4" style={styles.page}>
        <BackgroundGraphics />
        <View style={styles.innerContainer}>
          
          <SectionTitle title="LIST OF AMENITIES WE PROVIDE (Continued)" />
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colSNo]}>S.NO</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmenity]}>AMENITIES</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>STUDIO (QTY)</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>01 BEDROOM</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>02 BEDROOM</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>03 BEDROOM</Text>
            </View>
            {amenitiesList2.map((item, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 !== 0 ? styles.tableRowEven : {}]}>
                <Text style={[styles.tableCell, styles.colSNo]}>{item.no}</Text>
                <Text style={[styles.tableCell, styles.colAmenity]}>{item.name}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.studio}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.b1}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.b2}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.b3}</Text>
              </View>
            ))}
          </View>

        </View>
        <Text style={styles.pageNumber}>PAGE 2 OF 5</Text>
      </Page>

      {/* ================= PAGE 3 ================= */}
      <Page size="A4" style={styles.page}>
        <BackgroundGraphics />
        <View style={styles.innerContainer}>
          
          {renderPricingTable("t1")}
          {renderPricingTable("t2")}

        </View>
        <Text style={styles.pageNumber}>PAGE 3 OF 5</Text>
      </Page>

      {/* ================= PAGE 4 ================= */}
      <Page size="A4" style={styles.page}>
        <BackgroundGraphics />
        <View style={styles.innerContainer}>
          
          {renderPricingTable("t3")}
          {renderPricingTable("t4")}

        </View>
        <Text style={styles.pageNumber}>PAGE 4 OF 5</Text>
      </Page>

      {/* ================= PAGE 5 ================= */}
      <Page size="A4" style={styles.page}>
        <BackgroundGraphics />
        <View style={styles.innerContainer}>
          
          {renderPricingTable("t5")}
          {renderPricingTable("t6")}

          <SectionTitle title="TERMS & CONDITIONS" />
          <View style={styles.termsBox}>
            <Text style={styles.termItem}>• Prices quoted are valid for 30 days from the issue date.</Text>
            <Text style={styles.termItem}>• Payment terms: 50% advance, 50% upon delivery.</Text>
            <Text style={styles.termItem}>• Delivery timeline: Within 10 working days after confirmation.</Text>
            <Text style={styles.termItem}>• All products include standard manufacturer warranty.</Text>
            <Text style={styles.termItem}>• Transportation and installation fees are excluded unless specified.</Text>
          </View>

          <View style={styles.signatureSection}>
            <View style={styles.sigBlock}>
               <View style={styles.stampArea}></View>
               <View style={styles.sigLine}></View>
               <Text style={styles.sigText}>CUSTOMER SIGNATURE</Text>
            </View>
            <View style={styles.sigBlock}>
               <View style={styles.stampArea}>
                  <Image src="/asbn_stamp.png" style={styles.stampImg} />
               </View>
               <View style={styles.sigLine}></View>
               <Text style={styles.sigText}>AUTHORIZED SIGNATORY</Text>
               <Text style={styles.sigSubText}>ASBN Cleaning Service Est.</Text>
            </View>
          </View>

          <View style={styles.thankYou}>
            <Text style={styles.thankYouTitle}>THANK YOU FOR YOUR BUSINESS</Text>
            <Text style={styles.thankYouSub}>We appreciate the opportunity to work with you and look forward to a long-term partnership.</Text>
          </View>

        </View>
        <Text style={styles.pageNumber}>PAGE 5 OF 5</Text>
      </Page>

    </Document>
  );
};