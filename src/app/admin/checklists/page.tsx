'use client';
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardList, Plus, Trash2, Save, 
  GripVertical, X, LayoutTemplate, RotateCw 
} from "lucide-react";
import DotsLoader from "@/components/common/DotsLoader";
import { CardGridSkeleton } from "@/components/common/Skeleton";
import Kbd from "@/components/common/Kbd";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// --- Types ---
type Task = {
  id: string;
  text: string;
};

type Section = {
  id: string;
  title: string;
  tasks: Task[];
};

type ChecklistTemplate = {
  id: number;
  title: string;
  description: string;
  content: Section[];
};

export default function ChecklistManagement() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal & Form States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Editor State
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<Section[]>([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("checklist_templates").select("*").order("id", { ascending: false });
    if (data) setTemplates(data as any);
    setLoading(false);
  }, [supabase]);

  // 1. Fetch Templates
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 2. Editor Actions
  const handleOpenEditor = (template?: ChecklistTemplate) => {
    if (template) {
      setEditingId(template.id);
      setTitle(template.title);
      setSections(template.content || []); // Load JSON content
    } else {
      setEditingId(null);
      setTitle("");
      setSections([
        { id: crypto.randomUUID(), title: "Bedroom", tasks: [{ id: crypto.randomUUID(), text: "Dust all surfaces" }] },
        { id: crypto.randomUUID(), title: "Bathroom", tasks: [{ id: crypto.randomUUID(), text: "Clean & disinfect toilet" }] },
        { id: crypto.randomUUID(), title: "Kitchen", tasks: [{ id: crypto.randomUUID(), text: "Clean countertops" }] }
      ]);
    }
    setIsEditorOpen(true);
  };

  // 3. Section & Task Management
  const addSection = () => {
    setSections([...sections, { id: crypto.randomUUID(), title: "New Section", tasks: [] }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSectionTitle = (id: string, newTitle: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  const addTask = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
      ? { ...s, tasks: [...s.tasks, { id: crypto.randomUUID(), text: "" }] } 
      : s
    ));
  };

  const removeTask = (sectionId: string, taskId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
      ? { ...s, tasks: s.tasks.filter(t => t.id !== taskId) } 
      : s
    ));
  };

  const updateTaskText = (sectionId: string, taskId: string, text: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
      ? { ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, text } : t) } 
      : s
    ));
  };

  // 4. Save Template
  const handleSave = async () => {
    if (!title) return alert("Please enter a template title");
    setIsSaving(true);

    const payload = {
      title,
      content: sections // Saves as JSONB automatically
    };

    let error;
    if (editingId) {
      const { error: err } = await supabase.from("checklist_templates").update(payload).eq("id", editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from("checklist_templates").insert([payload]);
      error = err;
    }
    setIsSaving(false);

    if (!error) {
      fetchTemplates();
      setIsEditorOpen(false);
    } else {
      alert("Failed to save: " + error.message);
    }
  };

  useKeyboardShortcuts([
    {
      combo: 'Alt+N',
      description: 'Create new checklist template',
      category: 'Actions',
      handler: () => handleOpenEditor(),
    },
    {
      combo: 'Alt+R',
      description: 'Refresh checklist templates',
      category: 'Actions',
      handler: fetchTemplates,
    },
    {
      combo: 'Escape',
      description: 'Close template editor',
      category: 'Modals',
      handler: () => setIsEditorOpen(false),
    },
  ]);

  // 5. Delete Template
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("checklist_templates").delete().eq("id", id);
    if (!error) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#070b14] pb-10 font-sans w-full max-w-full overflow-x-clip">

      {/* 1. MOBILE DEDICATED STICKY HEADER (Under TopNav h-16) */}
      <div className="md:hidden sticky top-16 z-30 bg-gradient-to-r from-[#050716] via-[#0e1a38] to-[#04101e] text-white border-b border-emerald-500/30 shadow-[0_4px_24px_rgba(16,185,129,0.18)] transition-all mb-3 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <ClipboardList size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-300/80 leading-none">Operations</p>
              <h1 className="text-sm font-black text-white truncate flex items-center gap-1.5">
                Checklists <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-normal">({templates.length})</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={fetchTemplates}
              disabled={loading}
              aria-label="Refresh templates"
              className="p-1.5 rounded-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all disabled:opacity-50"
            >
              {loading ? <DotsLoader size="xs" variant="primary" /> : <RotateCw size={15} />}
            </button>
            <button
              onClick={() => handleOpenEditor()}
              className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-black shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1 active:scale-95"
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>
      </div>

      {/* 2. PREMIUM HEADER (DESKTOP VIEW — 100% UNCHANGED) */}
      <div className="hidden md:block bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white px-6 md:px-10 py-6 shadow-2xl relative overflow-hidden dark:border-b dark:border-emerald-500/20 dark:shadow-[0_12px_40px_rgba(16,185,129,0.15)]">
        {/* Light mode gradient */}
        <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0A192F] to-black dark:hidden' />

        {/* Dark mode multi-color indigo emerald gradient */}
        <div className='absolute inset-0 hidden dark:block' style={{ background: 'linear-gradient(135deg, #050716 0%, #0d1238 20%, #151d4d 42%, #0a263d 68%, #031020 100%)' }} />

        {/* Dark mode glowing orbs */}
        <div className='absolute -top-12 -left-12 w-96 h-96 hidden dark:block bg-indigo-600/22 rounded-full blur-[100px] pointer-events-none' />
        <div className='absolute bottom-0 right-10 w-96 h-96 hidden dark:block bg-emerald-500/20 rounded-full blur-[90px] pointer-events-none' />

        {/* Dark mode SVG Waves */}
        <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block'>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 240" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="chk-grad-wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.32" />
                <stop offset="35%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="chk-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#34D399" stopOpacity="0.95" />
                <stop offset="85%" stopColor="#38BDF8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.4" />
              </linearGradient>
              <filter id="chk-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M0,80 C300,20 540,130 840,60 C1140,-10 1320,110 1440,50 L1440,240 L0,240 Z" fill="url(#chk-grad-wave1)" />
            <path d="M0,80 C300,20 540,130 840,60 C1140,-10 1320,110 1440,50" stroke="url(#chk-crest-1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#chk-glow-emerald)" />
            <path d="M0,140 C280,180 500,80 780,130 C1080,180 1280,90 1440,120 L1440,240 L0,240 Z" fill="url(#chk-grad-wave1)" fillOpacity="0.5" />
          </svg>
        </div>

        {/* Light mode decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <ClipboardList className="text-blue-500 dark:text-emerald-400" size={30} /> Checklist Templates
            </h1>
            <p className="text-blue-300 dark:text-emerald-200/80 font-bold mt-1 text-sm">Create standard checklists (e.g. 1BR, Villa Deep Clean)</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTemplates}
              disabled={loading}
              className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-bold transition-all flex items-center gap-1.5 backdrop-blur-md"
              title="Refresh templates (Alt+R)"
            >
              {loading ? <DotsLoader size="xs" variant="primary" /> : <RotateCw size={18}/>}
              <Kbd variant="glass" size="xs">Alt+R</Kbd>
            </button>
            <button 
              onClick={() => handleOpenEditor()} 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg whitespace-nowrap"
              title="New Template (Alt+N)"
            >
              <Plus size={20} /> New Template
              <Kbd variant="glass" size="xs">Alt+N</Kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 md:px-10 pt-3 md:pt-8 w-full max-w-full overflow-x-hidden">

      {/* Templates List */}
      {loading ? (
        <CardGridSkeleton count={6} />
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#0c1427] rounded-3xl border border-gray-100 dark:border-slate-800 border-dashed">
          <LayoutTemplate size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <h3 className="text-gray-500 dark:text-slate-300 font-bold">No templates created</h3>
          <p className="text-gray-400 dark:text-slate-500 text-sm">Create a master checklist to reuse in bookings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {templates.map((template) => (
            <motion.div 
              key={template.id}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-[#0c1427] p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all relative group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ClipboardList size={22} />
                </div>
                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleOpenEditor(template)} className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-gray-600 dark:text-slate-300 rounded-lg transition-colors"><LayoutTemplate size={16}/></button>
                   <button onClick={() => handleDelete(template.id)} className="p-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-1">{template.title}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                {template.content?.length || 0} Sections • {template.content?.reduce((acc, s) => acc + s.tasks.length, 0)} Tasks
              </p>
              
              {/* Preview Chips */}
              <div className="flex flex-wrap gap-2">
                {template.content?.slice(0, 3).map((s, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-md text-gray-600 dark:text-slate-300 font-medium">{s.title}</span>
                ))}
                {(template.content?.length || 0) > 3 && (
                   <span className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-md text-gray-500 dark:text-slate-400">+More</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      </div>{/* end content */}

      {/* --- TEMPLATE EDITOR MODAL (Full Screen) --- */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#0c1427] w-full h-full md:h-[90vh] md:w-[900px] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0c1427] sticky top-0 z-10">
                  <div className="flex-1">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Template Title (e.g. Standard 1BR Cleaning)" className="text-xl font-bold text-gray-900 dark:text-white w-full outline-none placeholder:text-gray-300 dark:placeholder:text-slate-600 bg-transparent" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setIsEditorOpen(false)} className="px-4 py-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors">Cancel</button>
                    <button 
                      onClick={handleSave} 
                      disabled={isSaving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {isSaving ? <DotsLoader size="xs" variant="white" /> : (
                        <>
                          <Save size={18} /> Save Template
                          <Kbd variant="glass" size="xs">Ctrl+S</Kbd>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#070b14]">
                  <div className="space-y-6 max-w-3xl mx-auto">
                    {sections.map((section, sIndex) => (
                      <div key={section.id} className="bg-white dark:bg-[#0c1427] p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm group">
                        <div className="flex items-center gap-3 mb-4">
                          <GripVertical className="text-gray-300 dark:text-slate-600 cursor-move" size={20} />
                          <input value={section.title} onChange={(e) => updateSectionTitle(section.id, e.target.value)} className="flex-1 font-bold text-gray-800 dark:text-white text-lg outline-none border-b border-transparent focus:border-blue-500 transition-colors bg-transparent placeholder:text-gray-400 dark:placeholder:text-slate-600" placeholder="Section Name (e.g. Kitchen)" />
                          <button onClick={() => removeSection(section.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                        </div>
                        <div className="space-y-2 pl-8">
                          {section.tasks.map((task, tIndex) => (
                            <div key={task.id} className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600"></div>
                              <input value={task.text} onChange={(e) => updateTaskText(section.id, task.id, e.target.value)} placeholder="Enter task description..." className="flex-1 p-2 bg-gray-50 dark:bg-[#090d1a] rounded-lg text-sm text-gray-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-[#0c1427] focus:ring-1 focus:ring-blue-500 border border-transparent dark:border-slate-800/60 placeholder:text-gray-400 dark:placeholder:text-slate-600" autoFocus={!task.text} />
                              <button onClick={() => removeTask(section.id, task.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
                            </div>
                          ))}
                          <button onClick={() => addTask(section.id)} className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 mt-2 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"><Plus size={16} /> Add Task</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={addSection} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-2xl text-gray-400 dark:text-slate-500 font-bold hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all flex items-center justify-center gap-2"><Plus size={20} /> Add New Section</button>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
