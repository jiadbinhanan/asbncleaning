'use client';
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardList, Plus, Trash2, Save, 
  GripVertical, Loader2, X, LayoutTemplate 
} from "lucide-react";

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

    if (!error) {
      fetchTemplates();
      setIsEditorOpen(false);
    } else {
      alert("Failed to save: " + error.message);
    }
  };

  // 5. Delete Template
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("checklist_templates").delete().eq("id", id);
    if (!error) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  return (
    <div className="min-h-screen pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ClipboardList className="text-blue-600" /> Checklist Templates</h1>
          <p className="text-gray-500 text-sm">Create standard checklists (e.g. 1BR, Villa Deep Clean)</p>
        </div>
        <button onClick={() => handleOpenEditor()} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg">
          <Plus size={20} /> New Template
        </button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
          <LayoutTemplate size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-500 font-bold">No templates created</h3>
          <p className="text-gray-400 text-sm">Create a master checklist to reuse in bookings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <motion.div 
              key={template.id}
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all relative group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <ClipboardList size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleOpenEditor(template)} className="p-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg"><LayoutTemplate size={16}/></button>
                   <button onClick={() => handleDelete(template.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg"><Trash2 size={16}/></button>
                </div>
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-1">{template.title}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {template.content?.length || 0} Sections • {template.content?.reduce((acc, s) => acc + s.tasks.length, 0)} Tasks
              </p>
              
              {/* Preview Chips */}
              <div className="flex flex-wrap gap-2">
                {template.content?.slice(0, 3).map((s, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 bg-gray-100 rounded-md text-gray-600 font-medium">{s.title}</span>
                ))}
                {(template.content?.length || 0) > 3 && (
                   <span className="text-[10px] px-2 py-1 bg-gray-100 rounded-md text-gray-500">+More</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* --- TEMPLATE EDITOR MODAL (Full Screen) --- */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full h-full md:h-[90vh] md:w-[900px] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                  <div className="flex-1">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Template Title (e.g. Standard 1BR Cleaning)" className="text-xl font-bold text-gray-900 w-full outline-none placeholder:text-gray-300" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setIsEditorOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl font-medium">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2"><Save size={18} /> Save Template</button>
                  </div>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                  <div className="space-y-6 max-w-3xl mx-auto">
                    {sections.map((section, sIndex) => (
                      <div key={section.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm group">
                        <div className="flex items-center gap-3 mb-4">
                          <GripVertical className="text-gray-300 cursor-move" size={20} />
                          <input value={section.title} onChange={(e) => updateSectionTitle(section.id, e.target.value)} className="flex-1 font-bold text-gray-800 text-lg outline-none border-b border-transparent focus:border-blue-500 transition-colors" placeholder="Section Name (e.g. Kitchen)" />
                          <button onClick={() => removeSection(section.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                        <div className="space-y-2 pl-8">
                          {section.tasks.map((task, tIndex) => (
                            <div key={task.id} className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                              <input value={task.text} onChange={(e) => updateTaskText(section.id, task.id, e.target.value)} placeholder="Enter task description..." className="flex-1 p-2 bg-gray-50 rounded-lg text-sm text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 border border-transparent" autoFocus={!task.text} />
                              <button onClick={() => removeTask(section.id, task.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
                            </div>
                          ))}
                          <button onClick={() => addTask(section.id)} className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 mt-2 px-2 py-1 rounded hover:bg-blue-50 transition-colors"><Plus size={16} /> Add Task</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={addSection} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"><Plus size={20} /> Add New Section</button>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
