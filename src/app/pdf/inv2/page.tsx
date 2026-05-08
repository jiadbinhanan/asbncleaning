"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { InvoiceDocument } from '@/app/admin/invoices/InvoiceDocument';

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false }
);

export default function TestInvoice2() {
  const mockData = {
    invoiceNo: "BTM/2604-TEST-467",
    date: "2026-04-30T10:00:00Z",
    duration: "01-Apr-2026 to 30-Apr-2026",
    companyName: "Test Company (Multi-page)",
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
      },
      {
        id: 3,
        unit_id: 103,
        units: { building_name: "Burj Khalifa", unit_number: "1205" },
        cleaning_date: "2026-04-15T10:00:00Z",
        service_type: "Deep Cleaning",
        price: 350.00,
        extras: [
          { item_name: "Oven Cleaning", quantity: 1, total_price: 50.00 },
          { item_name: "Fridge Cleaning", quantity: 1, total_price: 40.00 }
        ],
        extraCharges: []
      },
      {
        id: 4,
        unit_id: 104,
        units: { building_name: "Marina Towers", unit_number: "8B" },
        cleaning_date: "2026-04-18T10:00:00Z",
        service_type: "Standard Cleaning",
        price: 150.00,
        extras: [],
        extraCharges: [
          { charge_type: "damage", item_name: "Broken Vase", total_price: 120.00 }
        ]
      },
      {
        id: 5,
        unit_id: 105,
        units: { building_name: "Palm Jumeirah Villa", unit_number: "V-12" },
        cleaning_date: "2026-04-20T10:00:00Z",
        service_type: "Move-in Cleaning",
        price: 450.00,
        extras: [
          { item_name: "Carpet Shampooing", quantity: 2, total_price: 100.00 },
          { item_name: "Window Cleaning (Exterior)", quantity: 1, total_price: 80.00 }
        ],
        extraCharges: []
      },
      {
        id: 6,
        unit_id: 106,
        units: { building_name: "Downtown Views", unit_number: "4502" },
        cleaning_date: "2026-04-22T10:00:00Z",
        service_type: "Weekly Maintenance",
        price: 90.00,
        extras: [],
        extraCharges: []
      },
      {
        id: 7,
        unit_id: 107,
        units: { building_name: "JLT Cluster X", unit_number: "X-204" },
        cleaning_date: "2026-04-25T10:00:00Z",
        service_type: "Post-Construction Cleaning",
        price: 600.00,
        extras: [
          { item_name: "Debris Removal", quantity: 1, total_price: 150.00 }
        ],
        extraCharges: []
      },
      {
        id: 8,
        unit_id: 108,
        units: { building_name: "Silicon Oasis Residences", unit_number: "A-102" },
        cleaning_date: "2026-04-28T10:00:00Z",
        service_type: "General Cleaning",
        price: 120.00,
        extras: [
          { item_name: "Ironing", quantity: 1, total_price: 30.00 }
        ],
        extraCharges: []
      }
    ],
    instantBills: [
      {
        created_at: "2026-04-05T10:00:00Z",
        invoice_no: "BTM-INST-050426-2356",
        total_amount: 45.00
      },
      {
        created_at: "2026-04-21T09:15:00Z",
        invoice_no: "BTM-INST-210426-1122",
        total_amount: 120.00
      },
      {
        created_at: "2026-04-27T14:00:00Z",
        invoice_no: "BTM-INST-270426-9900",
        total_amount: 60.00
      }
    ],
    instantBillsByUnit: {
      103: [
        {
          billNo: "BTM-INST-050426-2356",
          items: [
            { description: "Extra Cleaning Supplies", quantity: 3, unit_price: 15.00, total_price: 45.00 }
          ]
        }
      ],
      105: [
        {
          billNo: "BTM-INST-210426-1122",
          items: [
            { description: "Premium Air Freshener", quantity: 4, unit_price: 20.00, total_price: 80.00 },
            { description: "Laundry Service", quantity: 2, unit_price: 20.00, total_price: 40.00 }
          ]
        }
      ]
    },
    instantBillsNoUnit: [
      {
        billNo: "BTM-INST-270426-9900",
        items: [
          { description: "Walk-in Deep Clean", quantity: 1, unit_price: 60.00, total_price: 60.00 }
        ]
      }
    ],
    subtotal: 2909.00,
    discountPercent: 5.0,
    discountValue: 145.45,
    finalTotal: 2763.55,
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
