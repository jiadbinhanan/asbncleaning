"use client";
import React from 'react';
import dynamic from 'next/dynamic';
// আপনার মূল ইনভয়েস কম্পোনেন্ট ইম্পোর্ট করা হলো। পাথ ঠিক আছে কিনা নিশ্চিত করুন।
import { InvoiceDocument } from '@/app//admin/invoices/InvoiceDocument';

// SSR অফ করে PDFViewer ডায়নামিকালি লোড করা হচ্ছে
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false }
);

export default function TestInvoice1() {
  // ২-৩ পেজের ইনভয়েস তৈরি করার জন্য বিস্তারিত ডামি ডেটা
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
      },
      {
        id: 3,
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
        units: { building_name: "Downtown Views", unit_number: "4502" },
        cleaning_date: "2026-04-22T10:00:00Z",
        service_type: "Weekly Maintenance",
        price: 90.00,
        extras: [],
        extraCharges: []
      },
      {
         id: 7,
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
         units: { building_name: "Silicon Oasis Residences", unit_number: "A-102" },
         cleaning_date: "2026-04-28T10:00:00Z",
         service_type: "General Cleaning",
         price: 120.00,
         extras: [
             {item_name: "Ironing", quantity: 1, total_price: 30.00}
         ],
         extraCharges: []
      }
    ],
    instantBills: [
      {
        created_at: "2026-04-05T10:00:00Z",
        invoice_no: "BTM-INST-050426-2356",
        total_amount: 18.00
      },
      {
        created_at: "2026-04-10T14:30:00Z",
        invoice_no: "BTM-INST-100426-8842",
        total_amount: 45.00
      },
      {
        created_at: "2026-04-21T09:15:00Z",
        invoice_no: "BTM-INST-210426-1122",
        total_amount: 120.00
      }
    ],
    subtotal: 2667.00,
    discountPercent: 5.0,
    discountValue: 133.35,
    finalTotal: 2533.65,
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