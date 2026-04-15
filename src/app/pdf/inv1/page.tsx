"use client";
import React from 'react';
import dynamic from 'next/dynamic';
// আপনার মূল ইনভয়েস কম্পোনেন্ট ইম্পোর্ট করা হলো
import { InvoiceDocument } from '@/app//admin/invoices/InvoiceDocument';

// SSR অফ করে PDFViewer ডায়নামিকালি লোড করা হচ্ছে
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false }
);

export default function TestInvoice1() {
  // আপনার স্ক্রিনশটের সাথে মিল রেখে ডামি ডাটা
  const mockData = {
    invoiceNo: "BTM/2604-TEST-466",
    date: "2026-04-14T10:00:00Z",
    duration: "01-Oct-2023 to 31-Oct-2023",
    companyName: "Test 1",
    invoiceMode: "combined",
    bookings: [
      {
        id: 1,
        units: { building_name: "Secund", unit_number: "600" },
        cleaning_date: "2026-04-03T10:00:00Z",
        service_type: "General Cleaning",
        price: 103.00,
        extras: [{ item_name: "Bath Towel", quantity: 1, total_price: 10.00 }]
      },
      {
        id: 2,
        units: { building_name: "Holo", unit_number: "500" },
        cleaning_date: "2026-04-12T10:00:00Z",
        service_type: "Check-out Cleaning",
        price: 111.00,
        extraCharges: [
          { charge_type: "additional", item_name: "Items broken", total_price: 11.00 },
          { charge_type: "additional", item_name: "Damaged bedsheets", total_price: 19.00 }
        ]
      }
    ],
    instantBills: [
      {
        created_at: "2026-04-05T10:00:00Z",
        invoice_no: "BTM-INST-050426-2356",
        total_amount: 18.00
      }
    ],
    subtotal: 272.00,
    discountPercent: 2.9,
    discountValue: 7.89,
    finalTotal: 264.11,
    bankDetails: {
      bankName: "EMIRATES NBD",
      accountName: "BISHNU BAHADUR THAPA",
      accountNumber: "125937795501",
      iban: "AE83 0260 0001 2593 7795 501",
      swift: "EBILAEAD",
      routingNo: ""
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
        <InvoiceDocument data={mockData} />
      </PDFViewer>
    </div>
  );
}