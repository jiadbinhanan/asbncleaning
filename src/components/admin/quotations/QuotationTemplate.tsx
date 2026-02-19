"use client";
import React, { forwardRef } from "react";

export interface QuotationData {
  quoteNo: string;
  date: string;
  customerName: string;
  introText: string;
  termsText: string;
  amenities: {
    name: string;
    studio: string;
    oneBed: string;
    twoBed: string;
    threeBed: string;
  }[];
  pricingCategories: {
    title: string;
    items: {
      type: string;
      price: string;
    }[];
  }[];
}

interface Props {
  data: QuotationData;
}

// forwardRef ব্যবহার করা হয়েছে যাতে মেইন পেজ থেকে এই কম্পোনেন্টটিকে html2pdf এ পাঠানো যায়
const QuotationTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  return (
    <div className="hidden">
      {/* এই রিফ (ref) এর ভেতরের অংশটুকুই পিডিএফে কনভার্ট হবে */}
      <div ref={ref} id="pdf-content" style={{ backgroundColor: "#e2e8f0", padding: "0" }}>

        {/* CSS Stylesheet (পিডিএফ জেনারেটরের জন্য ইনলাইন স্টাইল) */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
              --navy-blue: #0A192F;
              --luxury-gold: #D4AF37;
              --gold-light: #F3E5AB;
              --text-dark: #2C3E50;
              --text-gray: #596A7A;
              --bg-white: #FFFFFF;
          }
          * { box-sizing: border-box; }
          .pdf-page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 10mm;
              background-color: var(--bg-white);
              position: relative;
              overflow: hidden;
              background-image:
                  radial-gradient(circle at 100% 0%, rgba(212, 175, 55, 0.08) 0%, transparent 40%),
                  radial-gradient(circle at 0% 100%, rgba(10, 25, 47, 0.05) 0%, transparent 40%);
              page-break-after: always;
          }
          .pdf-page::before {
              content: ""; position: absolute; top: -50px; right: -50px; width: 250px; height: 250px;
              background: linear-gradient(135deg, var(--luxury-gold), transparent);
              opacity: 0.1; border-radius: 50%; z-index: 0;
          }
          .pdf-page::after {
              content: ""; position: absolute; bottom: -100px; left: -100px; width: 400px; height: 400px;
              background: linear-gradient(135deg, var(--navy-blue), transparent);
              opacity: 0.05; border-radius: 50%; z-index: 0;
          }
          .content-wrapper { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; font-family: 'Helvetica', sans-serif;}
          .watermark-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1; opacity: 0.05; pointer-events: none; }
          .watermark-circle { width: 400px; height: 400px; border: 8px solid var(--navy-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; transform: rotate(-35deg); }
          .watermark-text { font-size: 55px; font-weight: 800; color: var(--navy-blue); line-height: 1.1; text-transform: uppercase; letter-spacing: 4px; }
          header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--luxury-gold); padding-bottom: 15px; margin-bottom: 25px; }
          .logo-box img { height: 75px; margin-bottom: 10px; }
          .quote-badge { background: linear-gradient(135deg, var(--navy-blue), #1a365d); color: var(--luxury-gold); padding: 6px 20px; border-radius: 4px; font-weight: 700; font-size: 14px; letter-spacing: 3px; text-transform: uppercase; display: inline-block;}
          .company-info { text-align: right; font-size: 11px; color: var(--text-gray); line-height: 1.6; }
          .company-info strong { font-size: 16px; color: var(--navy-blue); font-weight: 800; letter-spacing: 1px; display: block; margin-bottom: 3px; }
          .company-info span { color: var(--luxury-gold); font-weight: 600; }
          h2, h3 { color: var(--navy-blue); font-weight: 700; font-size: 15px; margin: 20px 0 12px 0; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; }
          h3::before { content: ""; display: inline-block; width: 6px; height: 18px; background: var(--luxury-gold); margin-right: 10px; border-radius: 2px; }
          p { font-size: 12px; line-height: 1.7; color: var(--text-dark); text-align: justify; margin-bottom: 8px; white-space: pre-wrap;}
          .client-greeting { font-size: 14px; font-weight: 700; color: var(--navy-blue); margin: 15px 0; padding: 10px; background: rgba(212, 175, 55, 0.1); border-left: 4px solid var(--luxury-gold); border-radius: 0 4px 4px 0; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.04); border: 1px solid #f0f0f0; }
          th { background: var(--navy-blue); color: var(--luxury-gold); padding: 12px 15px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          td { padding: 10px 15px; font-size: 11px; color: var(--text-dark); border-bottom: 1px solid #f0f0f0; font-weight: 500; }
          tr:nth-child(even) { background-color: rgba(243, 229, 171, 0.15); }
          .terms-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid var(--navy-blue); padding: 15px 20px; border-radius: 4px; margin-top: 10px; }
          .terms-box ul { margin: 0; padding-left: 15px; font-size: 11px; color: var(--text-gray); line-height: 1.8; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-block { text-align: center; width: 220px; }
          .sig-line { border-top: 1px dashed var(--navy-blue); margin-bottom: 8px; }
          .sig-text { font-size: 12px; font-weight: 700; color: var(--navy-blue); }
          .stamp-area { height: 70px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 2px; }
          .thank-you { text-align: center; margin-top: 30px; }
          .thank-you h4 { color: var(--luxury-gold); margin-bottom: 5px; font-size: 16px; letter-spacing: 2px; }
          .thank-you p { color: var(--text-gray); font-size: 11px; }
        `}} />

        {/* --- PAGE 1: Intro & Amenities --- */}
        <div className="pdf-page">
          <div className="watermark-container"><div className="watermark-circle"><span className="watermark-text">ASBN<br/>Cleaning</span></div></div>

          <div className="content-wrapper">
            <header>
                <div className="logo-box">
                    <img src="/Logo_asbn.jpg" alt="ASBN Cleaning Logo" />
                    <div className="quote-badge">Quotation</div>
                </div>
                <div className="company-info">
                    <strong>ASBN CLEANING SERVICE EST.</strong>
                    Quote No: <span>{data.quoteNo}</span><br/>
                    Date: <span>{data.date}</span><br/>
                    Phone: +971-544-374231<br/>
                    Email: sales@asbncleaning.com<br/>
                    Web: www.asbncleaning.com
                </div>
            </header>

            <div className="client-greeting">
                To: {data.customerName}
            </div>

            <p>{data.introText}</p>

            <h3>LIST OF AMENITIES WE PROVIDE</h3>
            <table>
                <thead>
                    <tr>
                        <th>Amenities</th>
                        <th>Studio</th>
                        <th>01 Bedroom</th>
                        <th>02 Bedroom</th>
                        <th>03 Bedroom</th>
                    </tr>
                </thead>
                <tbody>
                    {data.amenities.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.studio}</td>
                        <td>{item.oneBed}</td>
                        <td>{item.twoBed}</td>
                        <td>{item.threeBed}</td>
                      </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>

        {/* --- PAGE 2: Pricing Categories & Signatures --- */}
        <div className="pdf-page">
          <div className="watermark-container"><div className="watermark-circle"><span className="watermark-text">ASBN<br/>Cleaning</span></div></div>

          <div className="content-wrapper">
            {data.pricingCategories.map((category, catIndex) => (
              <div key={catIndex}>
                <h3>{category.title}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Item Description / Type</th>
                            <th style={{ textAlign: "right" }}>Price (AED)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {category.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.type}</td>
                            <td style={{ textAlign: "right", fontWeight: "bold" }}>{item.price}</td>
                          </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            ))}

            <h3>TERMS & CONDITIONS</h3>
            <div className="terms-box">
               <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--text-gray)" }}>{data.termsText}</p>
            </div>

            <div className="signature-section">
                <div className="sig-block">
                    <div className="stamp-area"></div>
                    <div className="sig-line"></div>
                    <div className="sig-text">CUSTOMER SIGNATURE</div>
                </div>
                <div className="sig-block">
                    <div className="stamp-area">[ Authority Stamp ]</div>
                    <div className="sig-line"></div>
                    <div className="sig-text">AUTHORIZED SIGNATORY</div>
                    <div style={{ fontSize: "10px", color: "var(--text-gray)", marginTop: "5px" }}>ASBN Cleaning Service Est.</div>
                </div>
            </div>

            <div className="thank-you">
                <h4>THANK YOU FOR YOUR BUSINESS</h4>
                <p>We appreciate the opportunity to work with you and look forward to a long-term partnership.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

QuotationTemplate.displayName = "QuotationTemplate";
export default QuotationTemplate;