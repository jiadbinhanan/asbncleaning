"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { InstantInvoiceDocument } from '@/app/admin/invoices/InstantInvoiceDocument';

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false }
);

export default function TestInstantInvoice1() {
  const mockData = {
    invoiceNo: "BTM-INST-140426-1001",
    date: "2026-04-14T15:30:00Z",
    customerName: "Walk-in Customer",
    unitGroups: [
      {
        unitLabel: "Secund Building | Unit- 600",
        items: [
          { description: "Deep Cleaning Service", quantity: 1, unit_price: 150.00, total_price: 150.00 },
          { description: "Cleaning Materials", quantity: 1, unit_price: 30.00, total_price: 30.00 }
        ]
      },
      {
        unitLabel: "Marina Towers | Unit- 8B",
        items: [
          { description: "General Cleaning", quantity: 1, unit_price: 90.00, total_price: 90.00 },
          { description: "Extra Towels (x3)", quantity: 3, unit_price: 10.00, total_price: 30.00 }
        ]
      },
      {
        items: [
          { description: "Walk-in Ironing Service", quantity: 2, unit_price: 15.00, total_price: 30.00 }
        ]
      }
    ],
    items: [
      { description: "Deep Cleaning Service", quantity: 1, unit_price: 150.00, total_price: 150.00 },
      { description: "Cleaning Materials", quantity: 1, unit_price: 30.00, total_price: 30.00 }
    ],
    subtotal: 330.00,
    discountPercent: 5,
    discountValue: 16.50,
    finalTotal: 313.50,
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
