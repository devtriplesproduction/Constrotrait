'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Trash2, Copy, Star, Search, 
  ArrowUp, ArrowDown, LayoutGrid, Edit3, X, Save, HelpCircle, Eye, Loader2
} from 'lucide-react';
import { 
  getQuotationTemplatesAction, 
  saveQuotationTemplateAction, 
  deleteQuotationTemplateAction, 
  duplicateQuotationTemplateAction, 
  setDefaultQuotationTemplateAction 
} from '@/actions/accounting.actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export const TEMPLATE_CATEGORIES = [
  'Material Testing',
  'Soil Investigation',
  'Non-Destructive Testing',
  'Concrete Testing',
  'Road & Pavement',
  'Standard Commercial',
  'Custom'
];

interface ClauseItem {
  id: string;
  title: string;
  content: string;
  display_order: number;
}

interface TemplateData {
  id?: string;
  name: string;
  category: string;
  is_default: boolean;
  clauses: ClauseItem[];
}

export function TemplateManager({ initialTemplates }: { initialTemplates?: TemplateData[] }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateData[]>(initialTemplates || []);
  const [loading, setLoading] = useState(!initialTemplates);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  const notifySuccess = (title: string, description?: string) => 
    toast({ title, description, variant: 'success' });
  const notifyError = (title: string, description?: string) => 
    toast({ title, description, variant: 'destructive' });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await getQuotationTemplatesAction();
      if (res.success && "data" in res && res.data) {
        setTemplates((res.data as any) || []);
      } else if (!res.success && "error" in res) {
        notifyError('Failed to load templates', res.error);
      }
    } catch (err: any) {
      notifyError('Failed to load templates', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialTemplates) {
      fetchTemplates();
    }
  }, [initialTemplates]);

  const handleCreateNew = () => {
    setEditingTemplate({
      name: '',
      category: 'Material Testing',
      is_default: false,
      clauses: [
        {
          id: `cls-${Date.now()}-1`,
          title: 'Scope & Sample Evaluation',
          content: 'Test evaluations relate solely to samples received and evaluated in accordance with standard test procedures.',
          display_order: 1
        },
        {
          id: `cls-${Date.now()}-2`,
          title: 'Commercial Terms',
          content: '50% advance mobilization fee required. Remaining balance due prior to certified report dispatch.',
          display_order: 2
        }
      ]
    });
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to duplicate this T&C template?')) return;
    try {
      const res = await duplicateQuotationTemplateAction(id);
      if (res.success) {
        notifySuccess('Template duplicated successfully');
        fetchTemplates();
      } else {
        notifyError('Duplicate failed', res.error);
      }
    } catch (err: any) {
      notifyError('Duplicate failed', err.message);
    }
  };

  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await setDefaultQuotationTemplateAction(id);
      if (res.success) {
        notifySuccess('Default template updated');
        fetchTemplates();
      } else {
        notifyError('Failed to set default', res.error);
      }
    } catch (err: any) {
      notifyError('Failed to set default', err.message);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this T&C template?')) return;
    try {
      const res = await deleteQuotationTemplateAction(id);
      if (res.success) {
        notifySuccess('Template deleted');
        if (editingTemplate?.id === id) setEditingTemplate(null);
        fetchTemplates();
      } else {
        notifyError('Delete failed', res.error);
      }
    } catch (err: any) {
      notifyError('Delete failed', err.message);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) {
      notifyError('Template title is required');
      return;
    }
    if (!editingTemplate.clauses || editingTemplate.clauses.length === 0) {
      notifyError('At least one clause is required');
      return;
    }
    if (editingTemplate.clauses.some((c) => !c.title.trim() || !c.content.trim())) {
      notifyError('All clauses must have both a title and content description');
      return;
    }

    setSaving(true);
    try {
      const res = await saveQuotationTemplateAction(editingTemplate);
      if (res.success) {
        notifySuccess(editingTemplate.id ? 'Template updated successfully' : 'Template created successfully');
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        notifyError('Failed to save template', res.error);
      }
    } catch (err: any) {
      notifyError('Failed to save template', err.message);
    } finally {
      setSaving(false);
    }
  };

  const addClause = () => {
    if (!editingTemplate) return;
    const nextOrder = (editingTemplate.clauses?.length || 0) + 1;
    setEditingTemplate((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clauses: [
          ...(prev.clauses || []),
          {
            id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            title: '',
            content: '',
            display_order: nextOrder
          }
        ]
      };
    });
  };

  const removeClause = (index: number) => {
    setEditingTemplate((prev) => {
      if (!prev) return null;
      const updatedClauses = prev.clauses.filter((_, i) => i !== index);
      return {
        ...prev,
        clauses: updatedClauses.map((c, i) => ({ ...c, display_order: i + 1 }))
      };
    });
  };

  const updateClause = (index: number, field: keyof ClauseItem, value: any) => {
    setEditingTemplate((prev) => {
      if (!prev) return null;
      const clauses = [...prev.clauses];
      clauses[index] = { ...clauses[index], [field]: value };
      return { ...prev, clauses };
    });
  };

  const moveClause = (index: number, direction: 'up' | 'down') => {
    if (!editingTemplate) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === editingTemplate.clauses.length - 1) return;

    setEditingTemplate((prev) => {
      if (!prev) return null;
      const clauses = [...prev.clauses];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = clauses[index];
      clauses[index] = clauses[targetIndex];
      clauses[targetIndex] = temp;

      return {
        ...prev,
        clauses: clauses.map((c, i) => ({ ...c, display_order: i + 1 }))
      };
    });
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.clauses || []).some(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTab = activeTab === 'all' || t.category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Terms & Conditions Template Manager</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Standardize, manage and authorize legal terms, payment clauses and testing conditions for quotations and proforma invoices.
            </p>
          </div>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Template
        </button>
      </div>

      {/* Main Grid: Left List (Col 5) & Right Editor (Col 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Templates list - Col 5 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            {/* Search Input */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search templates or clauses..."
                className="w-full bg-transparent border-none outline-none text-xs text-slate-900 placeholder:text-slate-400 font-medium"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
              <button 
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  activeTab === 'all' 
                    ? "bg-blue-50 text-blue-700 border border-blue-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                All ({templates.length})
              </button>
              {TEMPLATE_CATEGORIES.map((c) => {
                const count = templates.filter(t => t.category === c).length;
                return (
                  <button 
                    key={c}
                    onClick={() => setActiveTab(c)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                      activeTab === c 
                        ? "bg-blue-50 text-blue-700 font-bold border border-blue-200" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    {c.replace(' Testing', '').replace(' Investigation', '')} {count > 0 ? `(${count})` : ''}
                  </button>
                );
              })}
            </div>

            {/* Templates List */}
            {loading ? (
              <div className="py-16 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-xs font-semibold">Loading templates...</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">No templates found.</p>
                <button 
                  onClick={handleCreateNew}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredTemplates.map((t) => {
                  const isSelected = editingTemplate?.id === t.id;
                  return (
                    <div 
                      key={t.id}
                      onClick={() => setEditingTemplate(JSON.parse(JSON.stringify(t)))}
                      className={cn(
                        "p-4 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-start group",
                        isSelected 
                          ? "bg-blue-50/60 border-blue-300 shadow-xs" 
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      )}
                    >
                      <div className="space-y-1.5 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{t.name}</h4>
                          {t.is_default && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" /> Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-600">{t.category || 'General'}</span>
                          <span>•</span>
                          <span>{t.clauses?.length || 0} clauses</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          type="button"
                          onClick={(e) => handleSetDefault(t.id!, e)}
                          title={t.is_default ? "Default Template" : "Set as Default"}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all cursor-pointer",
                            t.is_default 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                              : "bg-white border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-300"
                          )}
                        >
                          <Star className={cn("w-3.5 h-3.5", t.is_default && "fill-emerald-600")} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTemplate(JSON.parse(JSON.stringify(t)));
                          }}
                          title="View / Edit Specification"
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleDuplicate(t.id!, e)}
                          title="Duplicate Template"
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleDelete(t.id!, e)}
                          title="Delete Template"
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Template editor - Col 7 */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {editingTemplate ? (
              <motion.div 
                key={editingTemplate.id || 'new'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs relative"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {editingTemplate.id ? 'Edit T&C Specification' : 'Build Custom T&C Template'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Define contractual legal clauses, warranty limitations and payment conditions.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingTemplate(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Template Title *</label>
                    <input 
                      type="text" 
                      value={editingTemplate.name}
                      onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      placeholder="e.g. Standard Material Testing T&C 2026"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Service Category</label>
                    <select 
                      value={editingTemplate.category}
                      onChange={e => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      {TEMPLATE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Default checkbox */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <input 
                    type="checkbox"
                    id="is_default"
                    checked={editingTemplate.is_default || false}
                    onChange={e => setEditingTemplate({ ...editingTemplate, is_default: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="is_default" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Set as system default template for quotations and proforma invoices
                  </label>
                </div>

                {/* Clauses list */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-blue-600" />
                      <span>Legal Clauses & Conditions ({editingTemplate.clauses?.length || 0})</span>
                    </h4>
                    <button 
                      type="button"
                      onClick={addClause}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Clause
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {(!editingTemplate.clauses || editingTemplate.clauses.length === 0) ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 space-y-2">
                        <p className="text-xs font-medium">No clauses defined in this template.</p>
                        <button onClick={addClause} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                          + Add First Clause
                        </button>
                      </div>
                    ) : (
                      editingTemplate.clauses.map((clause, index) => (
                        <div 
                          key={clause.id || index}
                          className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3 relative group transition-all hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                              Clause #{index + 1}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              <button 
                                type="button"
                                onClick={() => moveClause(index, 'up')}
                                disabled={index === 0}
                                title="Move Clause Up"
                                className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => moveClause(index, 'down')}
                                disabled={index === editingTemplate.clauses.length - 1}
                                title="Move Clause Down"
                                className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => removeClause(index)}
                                title="Delete Clause"
                                className="p-1 rounded hover:bg-rose-100 hover:text-rose-600 text-slate-400 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <input 
                              type="text" 
                              value={clause.title}
                              onChange={e => updateClause(index, 'title', e.target.value)}
                              placeholder="Clause Title (e.g. Turnaround Time & Reporting)"
                              className="w-full h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
                            />
                            <div className="relative">
                              <textarea 
                                value={clause.content}
                                onChange={e => updateClause(index, 'content', e.target.value)}
                                placeholder="Detailed clause description or legal terms statement..."
                                rows={3}
                                maxLength={500}
                                className="w-full p-2.5 pb-6 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 outline-none resize-none focus:border-blue-500 leading-relaxed"
                              />
                              <div className="absolute bottom-2 right-2.5 text-[10px] text-slate-400 font-medium pointer-events-none">
                                {clause.content?.length || 0}/500
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Save controls */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Template</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-[480px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/40">
                <HelpCircle className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">No Template Selected</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-5">
                  Select a T&C template from the registry on the left to review or refine its clauses, or initialize a new specification.
                </p>
                <button 
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Initialize Standard Template
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
