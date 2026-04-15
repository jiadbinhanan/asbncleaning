"use client";
import React from 'react';
import dynamic from 'next/dynamic';
// আপনার ইনস্ট্যান্ট ইনভয়েস কম্পোনেন্ট ইম্পোর্ট করা হলো
import { InstantInvoiceDocument } from '@/app/admin/invoices/InstantInvoiceDocument';

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false }
);

export default function TestInvoice2() {
  // ইনস্ট্যান্ট ইনভয়েসের ডামি ডাটা
  const mockData = {
    invoiceNo: "BTM-INST-140426-1001",
    date: "2026-04-14T15:30:00Z",
    customerName: "Walk-in Customer",
    items: [
      { description: "Deep Cleaning Service", quantity: 1, unit_price: 150.00, total_price: 150.00 },
      { description: "Cleaning Materials", quantity: 1, unit_price: 30.00, total_price: 30.00 }
    ],
    subtotal: 180.00,
    discountPercent: 5,
    discountValue: 9.00,
    finalTotal: 171.00,
    bankDetails: {
      bankName: "EMIRATES NBD",
      accountName: "BISHNU BAHADUR THAPA",
      accountNumber: "125937795501",
      iban: "AE83 0260 0001 2593 7795 501",
      swift: "EBILAEAD"
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
        <InstantInvoiceDocument data={mockData} />
      </PDFViewer>
    </div>
  );
}
