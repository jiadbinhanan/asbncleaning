"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { InvoiceDocument } from '@/app/admin/invoices/InvoiceDocument';

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false }
);

export default function TestInvoice1() {
  const mockData = {
    invoiceNo: "BTM/2604-TEST-466",
    date: "2026-04-14T10:00:00Z",
    duration: "01-Apr-2026 to 30-Apr-2026",
    companyName: "Test 1",
    invoiceMode: "combined",
    bookings: [
      {
        id: 1,
        unit_id: 101,
        units: { building_name: "Secund", unit_number: "600" },
        cleaning_date: "2026-04-03T10:00:00Z",
        service_type: "General Cleaning",
        price: 103.00,
        extras: [{ item_name: "Bath Towel", quantity: 2, total_price: 20.00 }],
        extraCharges: []
      },
      {
        id: 2,
        unit_id: 102,
        units: { building_name: "Holo", unit_number: "500" },
        cleaning_date: "2026-04-12T10:00:00Z",
        service_type: "Check-out Cleaning",
        price: 111.00,
        extras: [],
        extraCharges: [
          { charge_type: "additional", item_name: "Items broken", total_price: 11.00 },
          { charge_type: "damage", item_name: "Damaged bedsheets", total_price: 19.00 }
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
    instantBillsByUnit: {
      101: [
        {
          billNo: "BTM-INST-050426-2356",
          items: [
            { description: "Extra Bath Towels", quantity: 2, unit_price: 9.00, total_price: 18.00 }
          ]
        }
      ]
    },
    instantBillsNoUnit: [],
    subtotal: 282.00,
    discountPercent: 2.9,
    discountValue: 8.18,
    finalTotal: 273.82,
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
