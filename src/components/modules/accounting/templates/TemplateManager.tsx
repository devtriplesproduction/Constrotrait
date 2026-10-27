'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Copy, Star, Search, 
  ArrowUp, ArrowDown, LayoutGrid, Edit3, X, Save, 
  Loader2, Tag, Layers, Check, ChevronDown, Compass, ShieldCheck
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

// Backwards-compatible export
export const TEMPLATE_CATEGORIES = [
  'Material Testing',
  'Soil Investigation',
  'Non-Destructive Testing',
  'Concrete Testing',
  'Road & Pavement',
  'Standard Commercial',
  'Custom'
];

export type CategoryColor = 
  | 'blue' 
  | 'emerald' 
  | 'amber' 
  | 'purple' 
  | 'cyan' 
  | 'rose' 
  | 'indigo' 
  | 'orange' 
  | 'teal' 
  | 'slate';

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  color: CategoryColor;
  isCustom?: boolean;
}

export const DEFAULT_SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'cat-mat', name: 'Material Testing', color: 'blue' },
  { id: 'cat-soil', name: 'Soil Investigation', color: 'emerald' },
  { id: 'cat-ndt', name: 'Non-Destructive Testing', color: 'purple' },
  { id: 'cat-conc', name: 'Concrete Testing', color: 'amber' },
  { id: 'cat-road', name: 'Road & Pavement', color: 'orange' },
  { id: 'cat-std', name: 'Standard Commercial', color: 'indigo' },
  { id: 'cat-custom', name: 'Custom', color: 'slate' }
];

export const COLOR_CONFIG: Record<CategoryColor, {
  label: string;
  badge: string;
  dot: string;
  activePill: string;
  cardBorder: string;
  swatch: string;
}> = {
  blue: {
    label: 'Ocean Blue',
    badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dot: 'bg-blue-500',
    activePill: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25',
    cardBorder: 'border-l-blue-500',
    swatch: 'bg-blue-500'
  },
  emerald: {
    label: 'Emerald Green',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500',
    activePill: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25',
    cardBorder: 'border-l-emerald-500',
    swatch: 'bg-emerald-500'
  },
  amber: {
    label: 'Amber Gold',
    badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    activePill: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25',
    cardBorder: 'border-l-amber-500',
    swatch: 'bg-amber-500'
  },
  purple: {
    label: 'Royal Purple',
    badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
    dot: 'bg-purple-500',
    activePill: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25',
    cardBorder: 'border-l-purple-500',
    swatch: 'bg-purple-500'
  },
  cyan: {
    label: 'Sky Cyan',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    dot: 'bg-cyan-500',
    activePill: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25',
    cardBorder: 'border-l-cyan-500',
    swatch: 'bg-cyan-500'
  },
  rose: {
    label: 'Crimson Rose',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
    activePill: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/25',
    cardBorder: 'border-l-rose-500',
    swatch: 'bg-rose-500'
  },
  indigo: {
    label: 'Deep Indigo',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    dot: 'bg-indigo-500',
    activePill: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25',
    cardBorder: 'border-l-indigo-500',
    swatch: 'bg-indigo-500'
  },
  orange: {
    label: 'Sunset Orange',
    badge: 'bg-orange-50 text-orange-700 border-orange-200/80',
    dot: 'bg-orange-500',
    activePill: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25',
    cardBorder: 'border-l-orange-500',
    swatch: 'bg-orange-500'
  },
  teal: {
    label: 'Mint Teal',
    badge: 'bg-teal-50 text-teal-700 border-teal-200/80',
    dot: 'bg-teal-500',
    activePill: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/25',
    cardBorder: 'border-l-teal-500',
    swatch: 'bg-teal-500'
  },
  slate: {
    label: 'Slate Neutral',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    activePill: 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-md shadow-slate-500/25',
    cardBorder: 'border-l-slate-400',
    swatch: 'bg-slate-500'
  }
};

const SWATCH_OPTIONS: CategoryColor[] = ['blue', 'teal', 'emerald', 'orange', 'purple', 'rose', 'amber'];

const LOCAL_STORAGE_KEY = 'constrotrait_service_categories_v1';

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

  // Categories State
  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_SERVICE_CATEGORIES);

  // Dropdown interactive state (no separate popup modal!)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [inlineAddName, setInlineAddName] = useState('');
  const [inlineAddColor, setInlineAddColor] = useState<CategoryColor>('teal');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const notifySuccess = (title: string, description?: string) => 
    toast({ title, description, variant: 'success' });
  const notifyError = (title: string, description?: string) => 
    toast({ title, description, variant: 'destructive' });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsAddingInline(false);
        setEditingCategoryId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load custom categories from localStorage and merge with templates
  useEffect(() => {
    let customCats: ServiceCategory[] = [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        customCats = JSON.parse(stored);
      }
    } catch {
      // ignore
    }

    const mergedMap = new Map<string, ServiceCategory>();
    DEFAULT_SERVICE_CATEGORIES.forEach(c => mergedMap.set(c.name.toLowerCase(), c));
    customCats.forEach(c => mergedMap.set(c.name.toLowerCase(), { ...c, isCustom: true }));

    if (initialTemplates) {
      initialTemplates.forEach(t => {
        if (t.category && !mergedMap.has(t.category.toLowerCase())) {
          mergedMap.set(t.category.toLowerCase(), {
            id: `cat-dyn-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            name: t.category,
            color: 'teal',
            isCustom: true
          });
        }
      });
    }

    setCategories(Array.from(mergedMap.values()));
  }, [initialTemplates]);

  const saveCustomCategoriesToStorage = (updatedCats: ServiceCategory[]) => {
    try {
      const customOnly = updatedCats.filter(c => c.isCustom);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customOnly));
    } catch {
      // ignore
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await getQuotationTemplatesAction();
      if (res.success && "data" in res && res.data) {
        const loaded = (res.data as any) || [];
        setTemplates(loaded);

        setCategories(prev => {
          const map = new Map<string, ServiceCategory>();
          prev.forEach(c => map.set(c.name.toLowerCase(), c));
          loaded.forEach((t: any) => {
            if (t.category && !map.has(t.category.toLowerCase())) {
              map.set(t.category.toLowerCase(), {
                id: `cat-dyn-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                name: t.category,
                color: 'teal',
                isCustom: true
              });
            }
          });
          return Array.from(map.values());
        });
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

  const getCategoryConfig = (categoryName: string) => {
    const cat = categories.find(c => c.name.toLowerCase() === (categoryName || '').toLowerCase());
    const color = cat?.color || 'blue';
    return COLOR_CONFIG[color] || COLOR_CONFIG.blue;
  };

  const handleCreateNew = () => {
    const defaultCat = categories[0]?.name || 'Material Testing';
    setEditingTemplate({
      name: '',
      category: defaultCat,
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

  // ==========================================
  // INLINE SERVICE CATEGORY HANDLERS (NO POPUP)
  // ==========================================

  // Add category directly from dropdown
  const handleInlineAddCategory = () => {
    const trimmed = (inlineAddName || dropdownSearch).trim();
    if (!trimmed) return;

    const exists = categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      notifyError('Already Exists', `Category "${trimmed}" already exists.`);
      return;
    }

    const newCat: ServiceCategory = {
      id: `cat-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      color: inlineAddColor,
      isCustom: true
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    saveCustomCategoriesToStorage(updated);

    // Auto-select for the template currently being edited
    if (editingTemplate) {
      setEditingTemplate(prev => prev ? { ...prev, category: trimmed } : null);
    }

    setInlineAddName('');
    setDropdownSearch('');
    setIsAddingInline(false);
    setIsDropdownOpen(false);
    notifySuccess('Category Created', `"${trimmed}" is selected.`);
  };

  // Start editing a category row
  const handleStartEditCategory = (cat: ServiceCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  // Save renamed category
  const handleSaveRenameCategory = (catId: string, e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = editingCategoryName.trim();
    if (!trimmed) return;

    const oldCat = categories.find(c => c.id === catId);
    if (!oldCat) return;
    const oldName = oldCat.name;

    if (oldName.toLowerCase() === trimmed.toLowerCase()) {
      setEditingCategoryId(null);
      return;
    }

    if (categories.some(c => c.id !== catId && c.name.toLowerCase() === trimmed.toLowerCase())) {
      notifyError('Name Taken', `Category "${trimmed}" already exists.`);
      return;
    }

    const updatedCategories = categories.map(c => 
      c.id === catId ? { ...c, name: trimmed } : c
    );
    setCategories(updatedCategories);
    saveCustomCategoriesToStorage(updatedCategories);

    // Update in templates
    setTemplates(prev => prev.map(t => 
      (t.category || '').toLowerCase() === oldName.toLowerCase() 
        ? { ...t, category: trimmed } 
        : t
    ));

    // Update in current editor if matching
    if (editingTemplate && (editingTemplate.category || '').toLowerCase() === oldName.toLowerCase()) {
      setEditingTemplate(prev => prev ? { ...prev, category: trimmed } : null);
    }

    // Update in activeTab if selected
    if (activeTab.toLowerCase() === oldName.toLowerCase()) {
      setActiveTab(trimmed);
    }

    setEditingCategoryId(null);
    notifySuccess('Renamed', `Category updated to "${trimmed}".`);
  };

  // Delete category from dropdown
  const handleDeleteCategoryFromDropdown = (cat: ServiceCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    const usedCount = templates.filter(t => (t.category || '').toLowerCase() === cat.name.toLowerCase()).length;
    
    if (usedCount > 0) {
      const confirmReassign = confirm(
        `"${cat.name}" is used by ${usedCount} template(s).\nDeleting it will reassign those templates to "Material Testing". Continue?`
      );
      if (!confirmReassign) return;

      const fallbackCat = categories.find(c => c.id !== cat.id)?.name || 'Material Testing';
      setTemplates(prev => prev.map(t => 
        (t.category || '').toLowerCase() === cat.name.toLowerCase() 
          ? { ...t, category: fallbackCat } 
          : t
      ));

      if (editingTemplate && (editingTemplate.category || '').toLowerCase() === cat.name.toLowerCase()) {
        setEditingTemplate(prev => prev ? { ...prev, category: fallbackCat } : null);
      }
    } else {
      if (!confirm(`Delete service category "${cat.name}"?`)) return;
    }

    const updatedCategories = categories.filter(c => c.id !== cat.id);
    setCategories(updatedCategories);
    saveCustomCategoriesToStorage(updatedCategories);

    if (activeTab.toLowerCase() === cat.name.toLowerCase()) {
      setActiveTab('all');
    }

    notifySuccess('Category Deleted', `"${cat.name}" removed.`);
  };

  // Filter templates list
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.clauses || []).some(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTab = activeTab === 'all' || (t.category || '').toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  // Filter categories inside dropdown
  const filteredCategoriesForDropdown = categories.filter(c => 
    c.name.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  const exactMatchExists = categories.some(
    c => c.name.toLowerCase() === dropdownSearch.trim().toLowerCase()
  );

  // Statistics
  const stats = useMemo(() => {
    const totalTemplates = templates.length;
    const defaultTemplate = templates.find(t => t.is_default);
    const totalCategories = categories.length;
    const totalClauses = templates.reduce((acc, t) => acc + (t.clauses?.length || 0), 0);
    return { totalTemplates, defaultTemplate, totalCategories, totalClauses };
  }, [templates, categories]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Banner */}
      <div className="relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25 text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Terms & Conditions Template Manager
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                  {stats.totalTemplates} Templates
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Standardize legal clauses, warranty limitations, and payment conditions for quotations and proforma invoices.
              </p>
            </div>
          </div>

          <button 
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-98 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Template</span>
          </button>
        </div>

        {/* Quick Stats Pill Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Service Disciplines:</span>
            <span className="font-bold text-slate-800">{stats.totalCategories} Categories</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Default Template:</span>
            <span className="font-bold text-slate-800">{stats.defaultTemplate ? stats.defaultTemplate.name : 'None Set'}</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-2 text-slate-500">
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
            <span>Total Clauses:</span>
            <span className="font-bold text-slate-800">{stats.totalClauses} Clauses</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left List (Col 5) & Right Editor (Col 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Templates list - Col 5 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
            {/* Search Input */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search templates or clauses..."
                className="w-full bg-transparent border-none outline-none text-xs text-slate-900 placeholder:text-slate-400 font-medium"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills Strip */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Filter by Category</span>
              </span>

              <div className="flex flex-wrap gap-1.5 pb-1 max-h-[140px] overflow-y-auto pr-1">
                {/* All tab */}
                <button 
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    activeTab === 'all' 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-slate-600 bg-slate-100/80 hover:bg-slate-200/70 border border-transparent"
                  )}
                >
                  <span>All</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    activeTab === 'all' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  )}>
                    {templates.length}
                  </span>
                </button>

                {/* Categories */}
                {categories.map((c) => {
                  const count = templates.filter(t => (t.category || '').toLowerCase() === c.name.toLowerCase()).length;
                  const isSelected = activeTab.toLowerCase() === c.name.toLowerCase();
                  const style = COLOR_CONFIG[c.color] || COLOR_CONFIG.blue;

                  return (
                    <button 
                      key={c.id || c.name}
                      onClick={() => setActiveTab(c.name)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 border",
                        isSelected 
                          ? style.activePill + " border-transparent"
                          : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200/80"
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full shrink-0", isSelected ? "bg-white" : style.dot)} />
                      <span>{c.name.replace(' Testing', '').replace(' Investigation', '')}</span>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                        isSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Templates List */}
            {loading ? (
              <div className="py-16 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-xs font-semibold">Loading templates...</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-14 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">No templates found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeTab !== 'all' ? `No templates tagged under "${activeTab}".` : 'Create one to get started.'}
                  </p>
                </div>
                <button 
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Template
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredTemplates.map((t) => {
                  const isSelected = editingTemplate?.id === t.id;
                  const catStyle = getCategoryConfig(t.category);

                  return (
                    <div 
                      key={t.id}
                      onClick={() => setEditingTemplate(JSON.parse(JSON.stringify(t)))}
                      className={cn(
                        "p-4 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-start group relative border-l-4",
                        isSelected 
                          ? cn("bg-blue-50/40 border-blue-400 shadow-xs", catStyle.cardBorder)
                          : cn("bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50", catStyle.cardBorder)
                      )}
                    >
                      <div className="space-y-2 flex-1 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {t.name}
                          </h4>
                          {t.is_default && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" /> Default
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1",
                            catStyle.badge
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", catStyle.dot)} />
                            <span>{t.category || 'General'}</span>
                          </span>
                          <span>•</span>
                          <span>{t.clauses?.length || 0} clauses</span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <Edit3 className="w-5 h-5" />
                    </div>
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
                  {/* Template Title */}
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

                  {/* ========================================================= */}
                  {/* SERVICE CATEGORY INTERACTIVE DROPDOWN (WITH ADD, EDIT, DELETE) */}
                  {/* ========================================================= */}
                  <div className="space-y-1.5 relative" ref={dropdownRef}>
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      <span>Service Category *</span>
                    </label>

                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(!isDropdownOpen);
                        setDropdownSearch('');
                        setIsAddingInline(false);
                        setEditingCategoryId(null);
                      }}
                      className={cn(
                        "w-full h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer",
                        isDropdownOpen 
                          ? "bg-white border-blue-500 ring-2 ring-blue-500/10 shadow-xs" 
                          : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-hidden pr-2">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", getCategoryConfig(editingTemplate.category).dot)} />
                        <span className="text-slate-900 truncate font-semibold">
                          {editingTemplate.category || 'Select Service Category'}
                        </span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200", isDropdownOpen && "rotate-180 text-blue-600")} />
                    </button>

                    {/* Dropdown Menu Popover */}
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden divide-y divide-slate-100"
                        >
                          {/* Search bar inside dropdown */}
                          <div className="p-2.5 bg-slate-50/70">
                            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus-within:border-blue-500 transition-all">
                              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={dropdownSearch}
                                onChange={e => setDropdownSearch(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (dropdownSearch.trim() && !exactMatchExists) {
                                      handleInlineAddCategory();
                                    }
                                  }
                                }}
                                placeholder="Search or type new category..."
                                className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
                              />
                              {dropdownSearch && (
                                <button 
                                  onClick={() => setDropdownSearch('')}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Category Options List */}
                          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                            {filteredCategoriesForDropdown.map((c) => {
                              const isSelected = (editingTemplate.category || '').toLowerCase() === c.name.toLowerCase();
                              const isEditingThis = editingCategoryId === c.id;
                              const style = COLOR_CONFIG[c.color] || COLOR_CONFIG.blue;

                              if (isEditingThis) {
                                return (
                                  <div 
                                    key={c.id} 
                                    className="p-1.5 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center gap-1.5"
                                  >
                                    <input
                                      ref={editInputRef}
                                      type="text"
                                      value={editingCategoryName}
                                      onChange={e => setEditingCategoryName(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveRenameCategory(c.id, e);
                                        if (e.key === 'Escape') setEditingCategoryId(null);
                                      }}
                                      className="flex-1 h-7 px-2 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => handleSaveRenameCategory(c.id, e)}
                                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                                      title="Save name"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCategoryId(null);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={c.id || c.name}
                                  onClick={() => {
                                    setEditingTemplate({ ...editingTemplate, category: c.name });
                                    setIsDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all group",
                                    isSelected 
                                      ? "bg-blue-50/80 text-blue-900 font-semibold" 
                                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                  )}
                                >
                                  <div className="flex items-center gap-2 overflow-hidden flex-1 pr-2">
                                    <span className={cn("w-2 h-2 rounded-full shrink-0", style.dot)} />
                                    <span className="truncate">{c.name}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                  </div>

                                  {/* Action Buttons: Edit & Delete right in dropdown row */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => handleStartEditCategory(c, e)}
                                      title="Rename category"
                                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-100/70 transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteCategoryFromDropdown(c, e)}
                                      title="Delete category"
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {filteredCategoriesForDropdown.length === 0 && !isAddingInline && (
                              <div className="py-4 text-center text-slate-400 text-xs">
                                No matching categories found.
                              </div>
                            )}

                            {/* If user typed a query that doesn't exist, show quick create prompt */}
                            {dropdownSearch.trim() && !exactMatchExists && !isAddingInline && (
                              <button
                                type="button"
                                onClick={handleInlineAddCategory}
                                className="w-full text-left px-3 py-2 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create &quot;{dropdownSearch.trim()}&quot;</span>
                              </button>
                            )}
                          </div>

                          {/* ========================================================= */}
                          {/* INLINE ADD NEW CATEGORY ACCORDION (INSIDE DROPDOWN) */}
                          {/* ========================================================= */}
                          <div className="p-2.5 bg-slate-50/60 border-t border-slate-100">
                            {isAddingInline ? (
                              <div className="space-y-2.5 p-2 rounded-xl bg-white border border-blue-200 shadow-2xs">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                  <span>Add New Service Category</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAddingInline(false);
                                      setInlineAddName('');
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>

                                <input
                                  ref={inlineInputRef}
                                  type="text"
                                  value={inlineAddName}
                                  onChange={e => setInlineAddName(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleInlineAddCategory();
                                    }
                                  }}
                                  placeholder="e.g. Geotechnical Engineering"
                                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                                />

                                {/* Color Swatches */}
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-semibold text-slate-500">Color Dot:</span>
                                  <div className="flex items-center gap-1.5">
                                    {SWATCH_OPTIONS.map((col) => (
                                      <button
                                        key={col}
                                        type="button"
                                        onClick={() => setInlineAddColor(col)}
                                        className={cn(
                                          "w-4 h-4 rounded-full transition-transform cursor-pointer",
                                          COLOR_CONFIG[col].swatch,
                                          inlineAddColor === col ? "ring-2 ring-blue-500 ring-offset-1 scale-110" : "opacity-70 hover:opacity-100"
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAddingInline(false);
                                      setInlineAddName('');
                                    }}
                                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleInlineAddCategory}
                                    disabled={!inlineAddName.trim()}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                                  >
                                    Add Category
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingInline(true);
                                  setInlineAddName(dropdownSearch);
                                  setTimeout(() => inlineInputRef.current?.focus(), 50);
                                }}
                                className="w-full py-2 px-3 rounded-xl border border-dashed border-blue-300 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Add New Category</span>
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Default checkbox card */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                  <input 
                    type="checkbox"
                    id="is_default"
                    checked={editingTemplate.is_default || false}
                    onChange={e => setEditingTemplate({ ...editingTemplate, is_default: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <label htmlFor="is_default" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Set as system default template for quotations and proforma invoices in this branch
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Clause
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {(!editingTemplate.clauses || editingTemplate.clauses.length === 0) ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 space-y-2 bg-slate-50/50">
                        <p className="text-xs font-medium">No clauses defined in this template.</p>
                        <button onClick={addClause} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                          + Add First Clause
                        </button>
                      </div>
                    ) : (
                      editingTemplate.clauses.map((clause, index) => (
                        <div 
                          key={clause.id || index}
                          className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3 relative group transition-all hover:bg-slate-50 hover:border-slate-300"
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
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Template</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-[480px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/40">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-500 mb-4 shadow-sm">
                  <Compass className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">No Template Selected</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6">
                  Select a T&C template from the registry on the left to review or refine its clauses, or initialize a new specification.
                </p>
                <button 
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer hover:opacity-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Initialize Standard Template</span>
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
