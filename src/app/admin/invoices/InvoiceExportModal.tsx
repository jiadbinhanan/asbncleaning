'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, FileSpreadsheet, FileText, Calendar,
  CheckCircle2, AlertCircle, Loader2, Filter, Building2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';

interface InvoiceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'monthly' | 'instant';
  companies: { id: number; name: string }[];
}

export default function InvoiceExportModal({
  isOpen,
  onClose,
  type,
  companies,
}: InvoiceExportModalProps) {
  const supabase = createClient();

  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [dateRangePreset, setDateRangePreset] = useState<'this_month' | 'prev_month' | 'all_time' | 'custom'>('this_month');
  
  // Date states initialized to current month
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));

  // Additional filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'merged'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  // Quick preset changer
  const handlePresetChange = (preset: 'this_month' | 'prev_month' | 'all_time' | 'custom') => {
    setDateRangePreset(preset);
    const currentDate = new Date();
    if (preset === 'this_month') {
      setStartDate(format(startOfMonth(currentDate), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(currentDate), 'yyyy-MM-dd'));
    } else if (preset === 'prev_month') {
      const prev = subMonths(currentDate, 1);
      setStartDate(format(startOfMonth(prev), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(prev), 'yyyy-MM-dd'));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let data: any[] = [];

      if (type === 'monthly') {
        let q = supabase
          .from('invoices')
          .select('*')
          .order('invoice_date', { ascending: false });

        if (dateRangePreset !== 'all_time') {
          if (startDate) q = q.gte('invoice_date', startDate);
          if (endDate) q = q.lte('invoice_date', endDate);
        }

        if (statusFilter === 'paid') q = q.eq('is_paid', true);
        if (statusFilter === 'unpaid') q = q.eq('is_paid', false);
        if (selectedCompanyId !== 'all') q = q.eq('company_id', parseInt(selectedCompanyId));

        const res = await q;
        if (res.error) throw res.error;
        data = res.data || [];
      } else {
        let q = supabase
          .from('instant_invoices')
          .select('*, companies(name)')
          .order('invoice_date', { ascending: false });

        if (dateRangePreset !== 'all_time') {
          if (startDate) q = q.gte('invoice_date', startDate);
          if (endDate) q = q.lte('invoice_date', endDate);
        }

        if (statusFilter === 'paid') q = q.eq('is_paid', true);
        if (statusFilter === 'unpaid') q = q.eq('is_paid', false).eq('merged_into_monthly', false);
        if (statusFilter === 'merged') q = q.eq('merged_into_monthly', true);
        if (selectedCompanyId !== 'all') {
          if (selectedCompanyId === 'walk_in') {
            q = q.eq('client_type', 'walk_in');
          } else {
            q = q.eq('company_id', parseInt(selectedCompanyId));
          }
        }

        const res = await q;
        if (res.error) throw res.error;
        data = res.data || [];
      }

      if (data.length === 0) {
        toast.error('No invoices found for the selected criteria.');
        setExporting(false);
        return;
      }

      const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
      const periodLabel = dateRangePreset === 'all_time' 
        ? 'All_Time' 
        : `${startDate}_to_${endDate}`;

      if (exportFormat === 'excel') {
        generateExcel(data, periodLabel, timestamp);
      } else {
        generatePDF(data, periodLabel, timestamp);
      }

      toast.success(`${data.length} invoices exported successfully!`);
      onClose();
    } catch (err: any) {
      toast.error('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Generate Excel (.xlsx)
  // ─────────────────────────────────────────────────────────────────────────
  const generateExcel = (records: any[], periodLabel: string, timestamp: string) => {
    let rows: any[] = [];
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    if (type === 'monthly') {
      rows = records.map((inv, idx) => {
        const amt = Number(inv.total_amount || 0);
        const sub = Number(inv.subtotal || amt);
        const disc = Number(inv.discount || 0);
        totalInvoiced += amt;
        if (inv.is_paid) totalPaid += amt;
        else totalUnpaid += amt;

        return {
          '#': idx + 1,
          'Invoice No': inv.invoice_no,
          'Invoice Date': inv.invoice_date || format(parseISO(inv.created_at), 'yyyy-MM-dd'),
          'Company': inv.company_name,
          'Billing Period': inv.start_date && inv.end_date ? `${inv.start_date} to ${inv.end_date}` : 'N/A',
          'Subtotal (AED)': sub,
          'Discount (AED)': disc,
          'Total Amount (AED)': amt,
          'Payment Status': inv.is_paid ? 'Paid' : 'Unpaid',
          'Payment Date': inv.payment_date ? format(parseISO(inv.payment_date), 'yyyy-MM-dd') : '-',
          'Instant Bills Included': inv.instant_invoice_ids?.length || 0,
          'Discount Remarks': inv.discount_remarks || '-',
          'PDF Link': inv.pdf_url || '-',
        };
      });

      // Add summary row
      rows.push({
        '#': '',
        'Invoice No': 'TOTALS',
        'Invoice Date': '',
        'Company': '',
        'Billing Period': '',
        'Subtotal (AED)': '',
        'Discount (AED)': '',
        'Total Amount (AED)': totalInvoiced,
        'Payment Status': `Paid: AED ${totalPaid.toFixed(2)} | Unpaid: AED ${totalUnpaid.toFixed(2)}`,
        'Payment Date': '',
        'Instant Bills Included': '',
        'Discount Remarks': '',
        'PDF Link': '',
      });
    } else {
      rows = records.map((inv, idx) => {
        const amt = Number(inv.total_amount || 0);
        const sub = Number(inv.subtotal || amt);
        const disc = Number(inv.discount || 0);
        totalInvoiced += amt;
        if (inv.is_paid) totalPaid += amt;
        else totalUnpaid += amt;

        const customerName = inv.client_type === 'registered' ? inv.companies?.name : inv.customer_name;
        const status = inv.merged_into_monthly ? 'Merged with Monthly' : inv.is_paid ? 'Paid' : 'Unpaid';

        return {
          '#': idx + 1,
          'Invoice No': inv.invoice_no,
          'Invoice Date': inv.invoice_date || format(parseISO(inv.created_at), 'yyyy-MM-dd'),
          'Client Type': inv.client_type === 'registered' ? 'Registered' : 'Walk-In',
          'Customer / Company': customerName || '-',
          'Items Count': Array.isArray(inv.items) ? inv.items.length : 0,
          'Subtotal (AED)': sub,
          'Discount (AED)': disc,
          'Total Amount (AED)': amt,
          'Status': status,
          'Payment Date': inv.payment_date ? format(parseISO(inv.payment_date), 'yyyy-MM-dd') : '-',
          'Discount Remarks': inv.discount_remarks || '-',
          'PDF Link': inv.pdf_url || '-',
        };
      });

      rows.push({
        '#': '',
        'Invoice No': 'TOTALS',
        'Invoice Date': '',
        'Client Type': '',
        'Customer / Company': '',
        'Items Count': '',
        'Subtotal (AED)': '',
        'Discount (AED)': '',
        'Total Amount (AED)': totalInvoiced,
        'Status': `Paid: AED ${totalPaid.toFixed(2)} | Unpaid: AED ${totalUnpaid.toFixed(2)}`,
        'Payment Date': '',
        'Discount Remarks': '',
        'PDF Link': '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = type === 'monthly' ? 'Monthly Invoices' : 'Instant POS Bills';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `BTM_${type === 'monthly' ? 'Monthly' : 'Instant'}_Invoices_${periodLabel}_${timestamp}.xlsx`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Generate PDF Report (.pdf)
  // ─────────────────────────────────────────────────────────────────────────
  const generatePDF = (records: any[], periodLabel: string, timestamp: string) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── Header Banner ──
    doc.setFillColor(10, 25, 47); // Navy #0A192F
    doc.rect(0, 0, pageWidth, 36, 'F');

    // Accent line
    doc.setFillColor(37, 99, 235); // Blue #2563EB
    doc.rect(0, 36, pageWidth, 2, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('BTM CLEANING & TECHNICAL SERVICES CO.', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(191, 219, 254);
    const subTitle = type === 'monthly'
      ? 'OFFICIAL MONTHLY BILLING & INVOICE AUDIT REPORT'
      : 'OFFICIAL INSTANT POS SALES & BILLING AUDIT REPORT';
    doc.text(subTitle, 14, 21);

    // Header Metadata Right
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    const displayPeriod = dateRangePreset === 'all_time'
      ? 'All Time Records'
      : `${format(parseISO(startDate), 'dd MMM yyyy')} – ${format(parseISO(endDate), 'dd MMM yyyy')}`;
    doc.text(`Period: ${displayPeriod}`, pageWidth - 14, 13, { align: 'right' });
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth - 14, 19, { align: 'right' });
    doc.text(`Total Records: ${records.length} | Currency: AED`, pageWidth - 14, 25, { align: 'right' });

    // ── Calculate KPI Totals ──
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    records.forEach(r => {
      const amt = Number(r.total_amount || 0);
      totalInvoiced += amt;
      if (r.is_paid) totalPaid += amt;
      else totalUnpaid += amt;
    });

    // ── KPI Summary Cards ──
    const cardY = 42;
    const cardH = 16;
    const cardW = (pageWidth - 28 - 9) / 4; // 4 cards with 3mm gap

    const cards = [
      { label: 'TOTAL INVOICED', val: `AED ${totalInvoiced.toFixed(2)}`, bg: [238, 242, 255], border: [199, 210, 254], text: [67, 56, 202] },
      { label: 'TOTAL COLLECTED / PAID', val: `AED ${totalPaid.toFixed(2)}`, bg: [236, 253, 245], border: [167, 243, 208], text: [5, 150, 105] },
      { label: 'OUTSTANDING / UNPAID', val: `AED ${totalUnpaid.toFixed(2)}`, bg: [254, 242, 242], border: [254, 202, 202], text: [220, 38, 38] },
      { label: 'TOTAL INVOICES', val: `${records.length} Bills`, bg: [248, 250, 252], border: [226, 232, 240], text: [51, 65, 85] },
    ];

    cards.forEach((c, idx) => {
      const x = 14 + idx * (cardW + 3);
      doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
      doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
      doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.label, x + 4, cardY + 5.5);

      doc.setFontSize(10.5);
      doc.setTextColor(c.text[0], c.text[1], c.text[2]);
      doc.text(c.val, x + 4, cardY + 12);
    });

    // ── Table Columns & Rows ──
    let head: string[][] = [];
    let body: any[][] = [];

    if (type === 'monthly') {
      head = [['#', 'Invoice No', 'Invoice Date', 'Company Name', 'Service Period', 'Subtotal', 'Discount', 'Total (AED)', 'Status']];
      body = records.map((inv, idx) => [
        idx + 1,
        inv.invoice_no,
        inv.invoice_date || format(parseISO(inv.created_at), 'dd-MMM-yyyy'),
        inv.company_name,
        inv.start_date && inv.end_date ? `${format(parseISO(inv.start_date), 'dd/MM')} - ${format(parseISO(inv.end_date), 'dd/MM/yy')}` : '-',
        Number(inv.subtotal || inv.total_amount).toFixed(2),
        Number(inv.discount || 0) > 0 ? `-${Number(inv.discount).toFixed(2)}` : '-',
        Number(inv.total_amount).toFixed(2),
        inv.is_paid ? 'PAID' : 'UNPAID',
      ]);
    } else {
      head = [['#', 'Invoice No', 'Invoice Date', 'Customer / Company', 'Type', 'Subtotal', 'Discount', 'Total (AED)', 'Status']];
      body = records.map((inv, idx) => {
        const name = inv.client_type === 'registered' ? inv.companies?.name : inv.customer_name;
        const status = inv.merged_into_monthly ? 'MERGED' : inv.is_paid ? 'PAID' : 'UNPAID';
        return [
          idx + 1,
          inv.invoice_no,
          inv.invoice_date || format(parseISO(inv.created_at), 'dd-MMM-yyyy'),
          name || '-',
          inv.client_type === 'registered' ? 'Registered' : 'Walk-In',
          Number(inv.subtotal || inv.total_amount).toFixed(2),
          Number(inv.discount || 0) > 0 ? `-${Number(inv.discount).toFixed(2)}` : '-',
          Number(inv.total_amount).toFixed(2),
          status,
        ];
      });
    }

    autoTable(doc, {
      head,
      body,
      startY: 62,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        font: 'helvetica',
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [10, 25, 47],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 26 },
        3: { cellWidth: 50 },
        4: { cellWidth: 32 },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          const val = data.cell.raw;
          if (val === 'PAID') {
            data.cell.styles.textColor = [5, 150, 105]; // Green
          } else if (val === 'UNPAID') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
          } else if (val === 'MERGED') {
            data.cell.styles.textColor = [14, 116, 144]; // Cyan
          }
        }
      },
      didDrawPage: (data) => {
        // Page footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `BTM Cleaning & Technical Services Co. · Official Audit Document · Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
      },
      foot: [[
        '',
        'TOTALS',
        '',
        '',
        '',
        '',
        '',
        `AED ${totalInvoiced.toFixed(2)}`,
        `Paid: ${records.filter(r => r.is_paid).length}`,
      ]],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
      },
    });

    doc.save(`BTM_${type === 'monthly' ? 'Monthly' : 'Instant'}_Invoices_${periodLabel}_${timestamp}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden z-10 border border-gray-100"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-gray-900 to-[#0A192F] text-white p-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2">
              <Download size={20} className="text-blue-400" />
              Export {type === 'monthly' ? 'Monthly Invoices' : 'Instant POS Bills'}
            </h3>
            <p className="text-xs text-blue-200 mt-1">Download filtered billing data as Excel spreadsheet or PDF audit report.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">

          {/* 1. Format Selection */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all font-black text-xs ${
                  exportFormat === 'excel'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <div className={`p-2 rounded-xl ${exportFormat === 'excel' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <FileSpreadsheet size={18} />
                </div>
                <div className="text-left">
                  <p className="font-black text-sm">Excel Spreadsheet</p>
                  <p className="text-[10px] font-bold text-gray-400">.XLSX File</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all font-black text-xs ${
                  exportFormat === 'pdf'
                    ? 'border-blue-500 bg-blue-50/50 text-blue-800 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <div className={`p-2 rounded-xl ${exportFormat === 'pdf' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <FileText size={18} />
                </div>
                <div className="text-left">
                  <p className="font-black text-sm">PDF Audit Report</p>
                  <p className="text-[10px] font-bold text-gray-400">Executive Table & KPIs</p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Date Range Presets */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Time Period</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { id: 'this_month', label: 'This Month' },
                { id: 'prev_month', label: 'Previous Month' },
                { id: 'all_time', label: 'All Time' },
                { id: 'custom', label: 'Custom Range' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id as any)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-black transition-all border ${
                    dateRangePreset === p.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {dateRangePreset !== 'all_time' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateRangePreset('custom');
                    }}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateRangePreset('custom');
                    }}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Additional Filters (Status & Company) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Payment Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Invoices</option>
                <option value="paid">Paid Only</option>
                <option value="unpaid">Unpaid Only</option>
                {type === 'instant' && <option value="merged">Merged with Monthly Only</option>}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Customer / Company</label>
              <select
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Clients</option>
                {type === 'instant' && <option value="walk_in">Walk-in Customers Only</option>}
                {companies.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Download Action Button */}
          <div className="pt-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`w-full py-4 rounded-2xl text-white font-black text-sm transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                exportFormat === 'excel'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
              } disabled:opacity-50`}
            >
              {exporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Fetching & Generating {exportFormat.toUpperCase()}...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Download {exportFormat === 'excel' ? 'Excel Spreadsheet (.xlsx)' : 'PDF Audit Report (.pdf)'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
