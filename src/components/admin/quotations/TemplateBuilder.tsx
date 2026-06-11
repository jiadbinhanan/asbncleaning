"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Save, Copy, Star, StarOff, Edit3, Check,
  X, ChevronDown, ChevronUp, GripVertical, AlertCircle,
  Loader2, LayoutTemplate, TableProperties, RowsIcon,
  Columns3, ArrowUpDown, Sparkles, RefreshCw, Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateColumn = {
  label: string;
  width: number;   // percentage, all columns in a section must sum to 100
  align: "left" | "center" | "right";
};

export type TemplateSection = {
  id: string;
  title: string;
  columns: TemplateColumn[];
  rows: string[][];
};

type Template = {
  id: string;
  name: string;
  is_default: boolean;
  sections: TemplateSection[];
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uid = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const cloneSections = (sections: TemplateSection[]): TemplateSection[] =>
  sections.map((s) => ({
    ...s,
    id: uid(),
    columns: s.columns.map((c) => ({ ...c })),
    rows: s.rows.map((r) => [...r]),
  }));

const newSection = (colCount = 2, rowCount = 3): TemplateSection => ({
  id: uid(),
  title: "",
  columns: Array.from({ length: colCount }, (_, i) => ({
    label: "",
    width: Math.floor(100 / colCount),
    align: i === colCount - 1 ? "right" : i === 0 ? "center" : "left",
  })),
  rows: Array.from({ length: rowCount }, (_, ri) =>
    Array.from({ length: colCount }, (_, ci) => (ci === 0 ? String(ri + 1) : ""))
  ),
});

const totalWidth = (cols: TemplateColumn[]) =>
  cols.reduce((s, c) => s + (Number(c.width) || 0), 0);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Pill = ({
  children, color = "blue",
}: {
  children: React.ReactNode;
  color?: "blue" | "gold" | "green" | "red" | "gray";
}) => {
  const map = {
    blue:  "bg-blue-50 text-blue-700 border-blue-200",
    gold:  "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red:   "bg-red-50 text-red-600 border-red-200",
    gray:  "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${map[color]}`}>
      {children}
    </span>
  );
};

// Width warning
const WidthBar = ({ sections, sectionIdx }: { sections: TemplateSection[]; sectionIdx: number }) => {
  const total = totalWidth(sections[sectionIdx].columns);
  const ok = total === 100;
  return (
    <div className={`flex items-center gap-2 mt-2 text-xs font-bold ${ok ? "text-emerald-600" : "text-amber-600"}`}>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${ok ? "bg-emerald-500" : total > 100 ? "bg-red-500" : "bg-amber-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(total, 100)}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <span>{total}% {ok ? "✓" : total > 100 ? "(exceeds 100)" : "(must equal 100)"}</span>
    </div>
  );
};

// Empty state
const EmptyState = ({ onNew }: { onNew: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-24 text-gray-400"
  >
    <motion.div
      animate={{ rotate: [0, -10, 10, -10, 0] }}
      transition={{ delay: 0.5, duration: 0.6 }}
    >
      <LayoutTemplate size={64} strokeWidth={1} className="text-gray-300 mb-4" />
    </motion.div>
    <p className="font-bold text-lg text-gray-500 mb-1">No templates yet</p>
    <p className="text-sm mb-6">Create your first quotation template to get started.</p>
    <button onClick={onNew} className="flex items-center gap-2 px-5 py-3 bg-[#0A192F] text-white rounded-xl font-bold hover:bg-[#0d2244] transition-all shadow-md">
      <Plus size={18} /> Create Template
    </button>
  </motion.div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TemplateBuilder() {
  const supabase = createClient();

  // List state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Editor state
  const [editing, setEditing] = useState<Template | null>(null); // null = list view
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Section accordion open state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // New section form state
  const [addingSectionTo, setAddingSectionTo] = useState<string | null>(null); // section id being added
  const [newSectionCols, setNewSectionCols] = useState(2);
  const [newSectionRows, setNewSectionRows] = useState(3);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch templates ────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("quotation_templates")
      .select("*")
      .order("created_at", { ascending: true });
    if (error || !data) {
      setError("Could not load templates. Check your connection.");
    } else {
      setTemplates(data as Template[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // Focus name input when editor opens
  useEffect(() => {
    if (editing) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
      // Open all sections by default when editing
      setOpenSections(new Set(editing.sections.map((s) => s.id)));
    }
  }, [editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validate before save ───────────────────────────────────────────────────
  const validate = (t: Template): string => {
    if (!t.name.trim()) return "Template name is required.";
    for (let i = 0; i < t.sections.length; i++) {
      const sec = t.sections[i];
      if (!sec.title.trim()) return `Section ${i + 1}: title is required.`;
      const tot = totalWidth(sec.columns);
      if (tot !== 100) return `Section "${sec.title}": column widths must sum to 100 (currently ${tot}).`;
      for (const col of sec.columns) {
        if (!col.label.trim()) return `Section "${sec.title}": all column headers must be filled.`;
      }
    }
    return "";
  };

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editing) return;
    const err = validate(editing);
    if (err) { setSaveError(err); return; }
    setSaveError("");
    setSaving(true);

    const payload = {
      name: editing.name.trim(),
      is_default: editing.is_default,
      sections: editing.sections,
    };

    let dbError: any = null;

    if (editing.id.startsWith("NEW_")) {
      // Insert
      const { error } = await supabase.from("quotation_templates").insert([payload]);
      dbError = error;
    } else {
      // Update
      const { error } = await supabase
        .from("quotation_templates")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      dbError = error;
    }

    setSaving(false);

    if (dbError) {
      setSaveError(dbError.message || "Save failed. Please try again.");
      return;
    }

    await fetchTemplates();
    setEditing(null);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeletingId(id);
    await supabase.from("quotation_templates").delete().eq("id", id);
    setDeletingId(null);
    await fetchTemplates();
  };

  // ── Set default ────────────────────────────────────────────────────────────
  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    // Remove default from all, then set on target
    await supabase.from("quotation_templates").update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("quotation_templates").update({ is_default: true }).eq("id", id);
    setSettingDefaultId(null);
    await fetchTemplates();
  };

  // ── Clone ──────────────────────────────────────────────────────────────────
  const handleClone = (tpl: Template) => {
    const cloned: Template = {
      id: "NEW_" + uid(),
      name: `${tpl.name} (Copy)`,
      is_default: false,
      sections: cloneSections(tpl.sections),
      created_at: "",
      updated_at: "",
    };
    setEditing(cloned);
    setSaveError("");
  };

  // ── New template ───────────────────────────────────────────────────────────
  const handleNew = () => {
    const blank: Template = {
      id: "NEW_" + uid(),
      name: "",
      is_default: false,
      sections: [],
      created_at: "",
      updated_at: "",
    };
    setEditing(blank);
    setSaveError("");
  };

  // ── Edit existing ──────────────────────────────────────────────────────────
  const handleEdit = (tpl: Template) => {
    setEditing({
      ...tpl,
      sections: cloneSections(tpl.sections),
    });
    setSaveError("");
  };

  // ── Section: toggle accordion ──────────────────────────────────────────────
  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Section: add ──────────────────────────────────────────────────────────
  const commitAddSection = () => {
    if (!editing) return;
    const sec = newSection(newSectionCols, newSectionRows);
    sec.title = newSectionTitle.trim();
    setEditing((prev) => prev ? { ...prev, sections: [...prev.sections, sec] } : prev);
    setOpenSections((prev) => new Set([...prev, sec.id]));
    setAddingSectionTo(null);
    setNewSectionTitle("");
    setNewSectionCols(2);
    setNewSectionRows(3);
  };

  // ── Section: delete ────────────────────────────────────────────────────────
  const deleteSection = (sectionId: string) =>
    setEditing((prev) =>
      prev ? { ...prev, sections: prev.sections.filter((s) => s.id !== sectionId) } : prev
    );

  // ── Section title ──────────────────────────────────────────────────────────
  const updateSectionTitle = (sectionId: string, title: string) =>
    setEditing((prev) =>
      prev ? {
        ...prev,
        sections: prev.sections.map((s) => s.id === sectionId ? { ...s, title } : s),
      } : prev
    );

  // ── Column: update label / width / align ──────────────────────────────────
  const updateColumn = (sectionId: string, colIdx: number, patch: Partial<TemplateColumn>) =>
    setEditing((prev) =>
      prev ? {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const cols = s.columns.map((c, i) => i === colIdx ? { ...c, ...patch } : c);
          return { ...s, columns: cols };
        }),
      } : prev
    );

  // ── Column: add ───────────────────────────────────────────────────────────
  const addColumn = (sectionId: string) =>
    setEditing((prev) =>
      prev ? {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const newCol: TemplateColumn = { label: "", width: 10, align: "left" };
          const newRows = s.rows.map((r) => [...r, ""]);
          return { ...s, columns: [...s.columns, newCol], rows: newRows };
        }),
      } : prev
    );

  // ── Column: delete ────────────────────────────────────────────────────────
  const deleteColumn = (sectionId: string, colIdx: number) =>
    setEditing((prev) =>
      prev ? {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          if (s.columns.length <= 1) return s; // min 1 col
          const cols = s.columns.filter((_, i) => i !== colIdx);
          const rows = s.rows.map((r) => r.filter((_, i) => i !== colIdx));
          return { ...s, columns: cols, rows: rows };
        }),
      } : prev
    );

  // ── Row: add ──────────────────────────────────────────────────────────────
  const addRow = (sectionId: string) =>
    setEditing((prev) =>
      prev ? {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const newRow = s.columns.map((_, ci) =>
            ci === 0 ? String(s.rows.length + 1) : ""
          );
          return { ...s, rows: [...s.rows, newRow] };
        }),
      } : prev
    );

  // ── Row: delete ───────────────────────────────────────────────────────────
  const deleteRow = (sectionId: string, rowIdx: number) =>
    setEditing((prev) =>
      prev ? {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const rows = s.rows.filter((_, i) => i !== rowIdx)
            .map((r, i) => {
              // re-number first col if it looks like serial numbers
              const updated = [...r];
              if (/^\d+$/.test(updated[0])) updated[0] = String(i + 1);
              return updated;
            });
          return { ...s, rows };
        }),
      } : prev
    );

  // ── Cell: update ──────────────────────────────────────────────────────────
  const updateCell = (sectionId: string, rowIdx: number, colIdx: number, value: string) =>
    setEditing((prev) =>
      prev ? {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const rows = s.rows.map((r, ri) => {
            if (ri !== rowIdx) return r;
            const nr = [...r];
            nr[colIdx] = value;
            return nr;
          });
          return { ...s, rows };
        }),
      } : prev
    );

  // ---------------------------------------------------------------------------
  // RENDER: Template List
  // ---------------------------------------------------------------------------

  if (!editing) {
    return (
      <div className="space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <LayoutTemplate size={22} className="text-blue-600" /> All Templates
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">Manage quotation templates used to generate PDFs.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNew}
            className="flex items-center gap-2 px-5 py-3 bg-[#0A192F] text-white rounded-xl font-black shadow-lg hover:bg-[#0d2244] transition-all"
          >
            <Plus size={18} /> New Template
          </motion.button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-bold">
            <AlertCircle size={18} /> {error}
            <button onClick={fetchTemplates} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
            <p className="font-medium animate-pulse">Loading templates…</p>
          </div>
        ) : templates.length === 0 ? (
          <EmptyState onNew={handleNew} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {templates.map((tpl, idx) => (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.06, duration: 0.3 }}
                  className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Top accent bar */}
                  <div className={`h-1 w-full ${tpl.is_default ? "bg-gradient-to-r from-amber-400 to-yellow-300" : "bg-gradient-to-r from-blue-500 to-blue-400"}`} />

                  <div className="p-5">
                    {/* Name + badges */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-black text-gray-900 text-base leading-tight">{tpl.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {tpl.sections.length} section{tpl.sections.length !== 1 ? "s" : ""} •{" "}
                          {tpl.sections.reduce((s, sec) => s + sec.rows.length, 0)} total rows
                        </p>
                      </div>
                      {tpl.is_default && (
                        <Pill color="gold"><Star size={11} /> Default</Pill>
                      )}
                    </div>

                    {/* Section pills */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tpl.sections.slice(0, 4).map((sec) => (
                        <span key={sec.id} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-md truncate max-w-[140px]">
                          {sec.title || "Untitled"}
                        </span>
                      ))}
                      {tpl.sections.length > 4 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-md">
                          +{tpl.sections.length - 4} more
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      {/* Edit */}
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleEdit(tpl)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#0A192F] text-white rounded-xl text-xs font-bold hover:bg-[#0d2244] transition-all"
                      >
                        <Edit3 size={13} /> Edit
                      </motion.button>

                      {/* Clone */}
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleClone(tpl)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-all"
                        title="Clone"
                      >
                        <Copy size={13} /> Clone
                      </motion.button>

                      {/* Set default */}
                      {!tpl.is_default && (
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleSetDefault(tpl.id)}
                          disabled={settingDefaultId === tpl.id}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-all disabled:opacity-60"
                          title="Set as default"
                        >
                          {settingDefaultId === tpl.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Star size={13} />}
                        </motion.button>
                      )}

                      {/* Delete */}
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(tpl.id)}
                        disabled={deletingId === tpl.id}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 hover:bg-red-100 transition-all disabled:opacity-60"
                        title="Delete"
                      >
                        {deletingId === tpl.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Editor
  // ---------------------------------------------------------------------------

  const isNew = editing.id.startsWith("NEW_");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >

      {/* ── Editor top bar ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">

          {/* Back + title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <motion.button
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
              onClick={() => setEditing(null)}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all shrink-0"
              title="Back to list"
            >
              <X size={18} />
            </motion.button>

            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Template Name
              </label>
              <input
                ref={nameInputRef}
                value={editing.name}
                onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : p)}
                placeholder="e.g. BTM Standard Quotation 2025"
                className="w-full text-lg font-black text-gray-900 bg-transparent outline-none border-b-2 border-gray-200 focus:border-blue-600 pb-1 transition-colors placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Default toggle + Save */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Default toggle */}
            <button
              onClick={() => setEditing((p) => p ? { ...p, is_default: !p.is_default } : p)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                editing.is_default
                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {editing.is_default ? <Star size={15} className="fill-amber-500 text-amber-500" /> : <StarOff size={15} />}
              {editing.is_default ? "Default" : "Set as Default"}
            </button>

            {/* Save */}
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black shadow-md shadow-blue-200 transition-all disabled:opacity-70"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving…" : isNew ? "Create Template" : "Save Changes"}
            </motion.button>
          </div>
        </div>

        {/* Save error */}
        <AnimatePresence>
          {saveError && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold overflow-hidden"
            >
              <AlertCircle size={15} /> {saveError}
              <button onClick={() => setSaveError("")} className="ml-auto"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Sections ── */}
      <AnimatePresence>
        {editing.sections.map((section, sIdx) => {
          const isOpen = openSections.has(section.id);
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Section header bar */}
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                onClick={() => toggleSection(section.id)}
              >
                <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                  <TableProperties size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Section {sIdx + 1}
                  </span>
                  <p className="font-black text-gray-900 text-sm truncate">
                    {section.title || <span className="text-gray-400 font-normal italic">Untitled section</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Pill color="gray">
                    <RowsIcon size={10} /> {section.rows.length} rows
                  </Pill>
                  <Pill color="blue">
                    <Columns3 size={10} /> {section.columns.length} cols
                  </Pill>

                  {/* Delete section */}
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete section"
                  >
                    <Trash2 size={15} />
                  </motion.button>

                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={18} className="text-gray-400" />
                  </motion.div>
                </div>
              </div>

              {/* Section body */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-6 pt-1 space-y-5 border-t border-gray-100">

                      {/* Section title input */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                          Section Title
                        </label>
                        <input
                          value={section.title}
                          onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                          placeholder="e.g. CHECK OUT CLEANING WITH LINEN + LAUNDRY"
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                        />
                      </div>

                      {/* Column editor */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Columns3 size={13} /> Columns
                          </label>
                          <button
                            onClick={() => addColumn(section.id)}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Plus size={13} /> Add Column
                          </button>
                        </div>

                        <div className="space-y-2">
                          {section.columns.map((col, ci) => (
                            <motion.div
                              key={ci}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100"
                            >
                              {/* Col number */}
                              <span className="text-xs font-black text-gray-400 w-5 shrink-0 text-center">{ci + 1}</span>

                              {/* Label */}
                              <input
                                value={col.label}
                                onChange={(e) => updateColumn(section.id, ci, { label: e.target.value })}
                                placeholder="Column header"
                                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs font-bold outline-none border transition-all bg-white border-gray-200 focus:ring-2 focus:ring-blue-600 text-gray-800"
                              />

                              {/* Width */}
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={col.width}
                                  onChange={(e) => updateColumn(section.id, ci, { width: Number(e.target.value) })}
                                  className="w-14 px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs font-extrabold text-gray-700 outline-none focus:ring-2 focus:ring-blue-600 text-right"
                                />
                                <span className="text-xs text-gray-400 font-bold">%</span>
                              </div>

                              {/* Align */}
                              <select
                                value={col.align}
                                onChange={(e) => updateColumn(section.id, ci, { align: e.target.value as any })}
                                className="w-20 px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                              >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>

                              {/* Delete col */}
                              {section.columns.length > 1 && (
                                <motion.button
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => deleteColumn(section.id, ci)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <X size={13} />
                                </motion.button>
                              )}
                            </motion.div>
                          ))}
                        </div>

                        {/* Width progress bar */}
                        <WidthBar sections={editing.sections} sectionIdx={sIdx} />
                      </div>

                      {/* Row editor */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <RowsIcon size={13} /> Rows
                          </label>
                          <button
                            onClick={() => addRow(section.id)}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Plus size={13} /> Add Row
                          </button>
                        </div>

                        {/* Column header title row — colored, bold, always visible */}
                        <div className="flex items-center gap-1 mb-2 bg-[#0A192F] rounded-xl overflow-hidden px-1 py-0">
                          {section.columns.map((col, ci) => (
                            <div
                              key={ci}
                              className="text-xs font-black text-[#D4AF37] uppercase tracking-wide truncate px-2.5 py-2.5"
                              style={{
                                width: `${col.width}%`,
                                flexShrink: 0,
                                textAlign: col.align,
                              }}
                            >
                              {col.label || `Col ${ci + 1}`}
                            </div>
                          ))}
                          <div className="w-7 shrink-0" />
                        </div>

                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                          <AnimatePresence>
                            {section.rows.map((row, ri) => (
                              <motion.div
                                key={ri}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center gap-1 group/row"
                              >
                                {section.columns.map((col, ci) => (
                                  <input
                                    key={ci}
                                    type="text"
                                    value={row[ci] ?? ""}
                                    onChange={(e) => updateCell(section.id, ri, ci, e.target.value)}
                                    className="py-2 px-2.5 rounded-lg text-xs font-bold outline-none border transition-all bg-white border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-600 min-w-0"
                                    style={{
                                      width: `${col.width}%`,
                                      flexShrink: 0,
                                      textAlign: col.align,
                                    }}
                                  />
                                ))}

                                {/* Delete row */}
                                <motion.button
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => deleteRow(section.id, ri)}
                                  className="w-7 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/row:opacity-100 shrink-0"
                                >
                                  <X size={12} />
                                </motion.button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* ── Add Section panel ── */}
      <AnimatePresence mode="wait">
        {addingSectionTo === null ? (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddingSectionTo("pending")}
            className="w-full flex items-center justify-center gap-2 py-4 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 text-gray-400 hover:text-blue-600 rounded-2xl font-bold transition-all group"
          >
            <motion.div
              animate={{ rotate: [0, 90, 0] }}
              transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 3 }}
            >
              <Plus size={20} className="group-hover:text-blue-600 transition-colors" />
            </motion.div>
            Add New Section
          </motion.button>
        ) : (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={18} className="text-blue-600" />
              <h3 className="font-black text-blue-900">Configure New Section</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {/* Title */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">Section Title</label>
                <input
                  autoFocus
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. DEEP CLEANING WITH AMENITIES"
                  className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Cols */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Columns3 size={12} /> Number of Columns
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setNewSectionCols((c) => Math.max(1, c - 1))} className="p-2 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 font-bold transition-all">−</button>
                  <span className="text-2xl font-black text-blue-800 w-8 text-center">{newSectionCols}</span>
                  <button onClick={() => setNewSectionCols((c) => Math.min(10, c + 1))} className="p-2 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 font-bold transition-all">+</button>
                </div>
              </div>

              {/* Rows */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <RowsIcon size={12} /> Number of Rows
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setNewSectionRows((r) => Math.max(1, r - 1))} className="p-2 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 font-bold transition-all">−</button>
                  <span className="text-2xl font-black text-blue-800 w-8 text-center">{newSectionRows}</span>
                  <button onClick={() => setNewSectionRows((r) => Math.min(50, r + 1))} className="p-2 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 font-bold transition-all">+</button>
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-100/60 rounded-xl p-3">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>First column is auto-numbered (serial). You can add or remove rows &amp; columns after creation.</span>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={commitAddSection}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black shadow hover:bg-blue-500 transition-all"
              >
                <Check size={16} /> Generate Section
              </motion.button>
              <button
                onClick={() => { setAddingSectionTo(null); setNewSectionTitle(""); }}
                className="px-5 py-3 bg-white border border-blue-200 text-blue-700 rounded-xl font-bold hover:bg-blue-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating save reminder (shows when sections > 0) */}
      <AnimatePresence>
        {editing.sections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky bottom-6 flex justify-center pointer-events-none"
          >
            <div className="flex items-center gap-3 px-5 py-3 bg-[#0A192F]/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/10 pointer-events-auto">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm font-bold">{editing.sections.length} section{editing.sections.length !== 1 ? "s" : ""} ready</span>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all disabled:opacity-70"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving…" : "Save"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}