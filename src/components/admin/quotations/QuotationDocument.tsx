import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Image,
  Svg, Defs, LinearGradient, Stop, Circle,
} from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// 1. TYPES
// ---------------------------------------------------------------------------

export type TemplateColumn = {
  label: string;
  width: number;   // percentage, all columns in a section must sum to 100
  align: 'left' | 'center' | 'right';
};

export type TemplateSection = {
  id: string;
  title: string;
  columns: TemplateColumn[];
  rows: string[][];  // each row is an array of cell values matching columns order
};

export interface QuotationProps {
  quoteNo: string;
  date: string;
  customerName: string;
  sections: TemplateSection[];  // comes from quotation_templates.sections (DB)
}

// ---------------------------------------------------------------------------
// 2. STYLES  (identical to original design)
// ---------------------------------------------------------------------------

const colors = {
  navyBlue:   '#0A192F',
  luxuryGold: '#D4AF37',
  textDark:   '#2C3E50',
  textGray:   '#596A7A',
  bgWhite:    '#FFFFFF',
  tableStripe:'#FDFBF4',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.bgWhite,
    paddingTop: '5mm',
    paddingLeft: '5mm',
    paddingRight: '5mm',
    paddingBottom: '14mm',  // reserves space for page number at bottom
    fontFamily: 'Helvetica',
    position: 'relative',
  },
  innerContainer: {
    flex: 1,
    padding: 10,
  },

  // --- BACKGROUND ---
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
    fontSize: 60,
    fontFamily: 'Helvetica-Bold',
    color: colors.navyBlue,
    textTransform: 'uppercase',
    letterSpacing: 5,
    textAlign: 'center',
  },

  // --- HEADER (page 1 only) ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: `2pt solid ${colors.luxuryGold}`,
    paddingBottom: 15,
    marginBottom: 15,
  },
  logoBox: { alignItems: 'flex-start' },
  logo: { height: 60, marginBottom: 8 },
  quoteBadge: {
    backgroundColor: colors.navyBlue,
    color: colors.luxuryGold,
    padding: '4px 15px',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 9,
    color: colors.textGray,
    lineHeight: 1.5,
  },
  companyName: {
    fontSize: 14,
    color: colors.navyBlue,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  goldText: { color: colors.luxuryGold, fontFamily: 'Helvetica-Bold' },

  // --- TYPOGRAPHY ---
  clientGreeting: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.navyBlue,
    marginVertical: 10,
    padding: 8,
    backgroundColor: '#F9F6ED',
    borderLeft: `4pt solid ${colors.luxuryGold}`,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: colors.textDark,
    marginBottom: 6,
    textAlign: 'justify',
  },
  sectionTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitleLine: {
    width: 4, height: 12,
    backgroundColor: colors.luxuryGold,
    marginRight: 8,
    borderRadius: 2,
  },
  sectionTitle: {
    color: colors.navyBlue,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // --- TABLE ---
  table: {
    width: '100%',
    border: '1pt solid #E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.navyBlue,
  },
  tableHeaderCell: {
    color: colors.luxuryGold,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    padding: '6px',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #E5E7EB',
  },
  tableRowEven: {
    backgroundColor: colors.tableStripe,
  },
  tableCell: {
    padding: '6px',
    fontSize: 9,
    color: colors.textDark,
  },

  // --- TERMS ---
  termsBox: {
    backgroundColor: '#F8FAFC',
    border: '1pt solid #E2E8F0',
    borderLeft: `4pt solid ${colors.navyBlue}`,
    padding: 12,
    marginTop: 8,
  },
  termItem: {
    fontSize: 9.5,
    color: colors.textGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },

  // --- SIGNATURE ---
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  sigBlock: { width: 180, alignItems: 'center' },
  stampArea: { height: 60, justifyContent: 'center', alignItems: 'center' },
  stampImg: { height: 55, opacity: 0.8 },
  sigLine: {
    width: '100%',
    borderTop: `1pt dashed ${colors.navyBlue}`,
    marginBottom: 6,
  },
  sigText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.navyBlue,
  },
  sigSubText: { fontSize: 8.5, color: colors.textGray, marginTop: 3 },

  thankYou: { marginTop: 25, alignItems: 'center' },
  thankYouTitle: {
    color: colors.luxuryGold,
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  thankYouSub: { color: colors.textGray, fontSize: 9.5 },

  pageNumber: {
    position: 'absolute',
    bottom: '5mm',
    right: '7mm',
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.navyBlue,
  },
});

// ---------------------------------------------------------------------------
// 3. SHARED SUB-COMPONENTS
// ---------------------------------------------------------------------------

const BackgroundGraphics = () => (
  <View style={styles.bgGraphics} fixed>
    <Svg height="100%" width="100%">
      <Defs>
        <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#D4AF37" stopOpacity={0.12} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0}    />
        </LinearGradient>
        <LinearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%"   stopColor="#0A192F" stopOpacity={0.06} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0}    />
        </LinearGradient>
      </Defs>
      <Circle cx="85%" cy="0%"   r="280" fill="url('#goldGrad')" />
      <Circle cx="0%"  cy="100%" r="380" fill="url('#blueGrad')" />
    </Svg>
    <View style={styles.watermarkContainer}>
      <View style={styles.watermarkCircle}>
        <Text style={styles.watermarkText}>BTM{'\n'}Cleaning</Text>
      </View>
    </View>
  </View>
);

const SectionTitle = ({ title }: { title: string }) => (
  <View style={styles.sectionTitleBox}>
    <View style={styles.sectionTitleLine} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// 4. DYNAMIC TABLE RENDERER
//    - columns: width in % so they always sum to 100 across the row
//    - rows: string[][] — index matches columns order
// ---------------------------------------------------------------------------

const DynamicTable = ({ section }: { section: TemplateSection }) => (
  <View style={{ marginBottom: 10 }}>
    <SectionTitle title={section.title} />
    <View style={styles.table}>

      {/* Header row */}
      <View style={styles.tableHeaderRow}>
        {section.columns.map((col, ci) => (
          <Text
            key={ci}
            style={[
              styles.tableHeaderCell,
              {
                width: `${col.width}%`,
                textAlign: col.align,
              },
            ]}
          >
            {col.label}
          </Text>
        ))}
      </View>

      {/* Data rows */}
      {section.rows.map((row, ri) => (
        <View
          key={ri}
          style={[
            styles.tableRow,
            ri % 2 !== 0 ? styles.tableRowEven : {},
          ]}
        >
          {section.columns.map((col, ci) => (
            <Text
              key={ci}
              style={[
                styles.tableCell,
                {
                  width: `${col.width}%`,
                  textAlign: col.align,
                },
              ]}
            >
              {row[ci] ?? ''}
            </Text>
          ))}
        </View>
      ))}

    </View>
  </View>
);

// ---------------------------------------------------------------------------
// 5. INTRO TEXT (fixed — not part of template sections)
// ---------------------------------------------------------------------------

const IntroText = ({ customerName }: { customerName: string }) => (
  <>
    <Text style={styles.clientGreeting}>To: {customerName}</Text>
    <Text style={styles.paragraph}>
      BTM Cleaning and Technical Service Co. is committed to providing
      high-quality cleaning services delivered by trained and professional
      staff. Our primary goal is to achieve complete customer satisfaction
      by consistently maintaining the highest standards of cleanliness and
      service.
    </Text>
    <Text style={styles.paragraph}>
      Guests typically expect a clean, comfortable, and well-equipped space
      with essential amenities and reliable service. To meet and exceed these
      expectations, we focus on understanding our clients' needs and
      delivering consistent, dependable results.
    </Text>
    <Text style={styles.paragraph}>
      We are pleased to share our service pricing with you. For your
      reference, please find below the rates for our check-out cleaning,
      in-stay cleaning, touch-up cleaning, and deep cleaning services. We
      look forward to the opportunity to serve you and build a long-term
      professional relationship.
    </Text>
  </>
);

// ---------------------------------------------------------------------------
// 6. LAST PAGE FIXED CONTENT — Terms & Signature
// ---------------------------------------------------------------------------

const TermsAndSignature = () => (
  <>
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
        <View style={styles.stampArea} />
        <View style={styles.sigLine} />
        <Text style={styles.sigText}>CUSTOMER SIGNATURE</Text>
      </View>
      <View style={styles.sigBlock}>
        <View style={styles.stampArea}>
          <Image src="/stamp_btm_invoice.png" style={styles.stampImg} />
        </View>
        <View style={styles.sigLine} />
        <Text style={styles.sigText}>AUTHORIZED SIGNATORY</Text>
        <Text style={styles.sigSubText}>BTM Cleaning and Technical Service Co.</Text>
      </View>
    </View>

    <View style={styles.thankYou}>
      <Text style={styles.thankYouTitle}>THANK YOU FOR YOUR BUSINESS</Text>
      <Text style={styles.thankYouSub}>
        We appreciate the opportunity to work with you and look forward to a
        long-term partnership.
      </Text>
    </View>
  </>
);

// ---------------------------------------------------------------------------
// 7. PAGE NUMBER HELPER
// ---------------------------------------------------------------------------

// react-pdf doesn't support dynamic total-page-count natively without
// the <Text render> pattern, so we use a fixed approach.
// When the template changes, total pages may vary. We intentionally leave
// the label as just the current page number so it always stays correct.
const PageNum = () => (
  <Text
    style={styles.pageNumber}
    render={({ pageNumber, totalPages }) =>
      `PAGE ${pageNumber} OF ${totalPages}`
    }
    fixed
  />
);

// ---------------------------------------------------------------------------
// 8. MAIN DOCUMENT COMPONENT
// ---------------------------------------------------------------------------

export const QuotationDocument = ({
  quoteNo,
  date,
  customerName,
  sections,
}: QuotationProps) => {

  return (
    <Document>

      {/* ── PAGE 1: Header + Intro text + first section ── */}
      <Page size="A4" style={styles.page}>
        <BackgroundGraphics />
        <View style={styles.innerContainer}>

          {/* Company header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Image src="/logo_btm_invoice.png" style={styles.logo} />
              <Text style={styles.quoteBadge}>Quotation</Text>
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>
                BTM CLEANING AND TECHNICAL SERVICE CO.
              </Text>
              <Text>
                Quote No:{' '}
                <Text style={styles.goldText}>{quoteNo}</Text>
              </Text>
              <Text>
                Date:{' '}
                <Text style={styles.goldText}>{date}</Text>
              </Text>
              <Text>Phone: +971-544-374231</Text>
              <Text>Email: btm.cleanings@gmail.com</Text>
              <Text>Web: www.btmcleaning.com</Text>
            </View>
          </View>

          {/* Intro paragraphs */}
          <IntroText customerName={customerName} />

          {/* All dynamic sections rendered sequentially.
              react-pdf automatically breaks pages when content overflows.
              The first section starts right after the intro text on page 1;
              subsequent sections (and page breaks) happen automatically. */}
          {sections.map((section) => (
            <DynamicTable key={section.id} section={section} />
          ))}

          {/* Terms & signature always at the end, after all sections */}
          <TermsAndSignature />

        </View>

        {/* Auto page number on every page */}
        <PageNum />
      </Page>

    </Document>
  );
};