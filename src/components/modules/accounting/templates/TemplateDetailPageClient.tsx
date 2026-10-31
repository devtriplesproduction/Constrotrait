"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TemplateDetailPage } from "./TemplateDetailPage";
import { TemplateFormPage } from "./TemplateFormPage";
import {
  saveQuotationTemplateAction,
  duplicateQuotationTemplateAction,
  setDefaultQuotationTemplateAction,
  deleteQuotationTemplateAction,
} from "@/actions/accounting.actions";
import { useToast } from "@/hooks/use-toast";
import {
  TemplateData,
  DEFAULT_SERVICE_CATEGORIES,
  COLOR_CONFIG,
  ServiceCategory,
  CategoryColor,
} from "./TemplateManager";

interface TemplateDetailPageClientProps {
  template: TemplateData;
  allTemplates?: TemplateData[];
}

export function TemplateDetailPageClient({
  template: initialTemplate,
}: TemplateDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [template, setTemplate] = useState<TemplateData>(initialTemplate);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_SERVICE_CATEGORIES);

  const notifySuccess = (title: string, description?: string) =>
    toast({ title, description, variant: "success" });
  const notifyError = (title: string, description?: string) =>
    toast({ title, description, variant: "destructive" });

  const getCategoryConfig = (categoryName: string) => {
    const cat = categories.find(
      (c) => c.name.toLowerCase() === (categoryName || "").toLowerCase()
    );
    const color = cat?.color || "blue";
    return COLOR_CONFIG[color] || COLOR_CONFIG.blue;
  };

  const handleDuplicate = async (id: string) => {
    if (!confirm("Are you sure you want to duplicate this T&C template?")) return;
    try {
      const res = await duplicateQuotationTemplateAction(id);
      if (res.success) {
        notifySuccess("Template duplicated successfully");
        router.push("/accounting/templates");
        router.refresh();
      } else {
        notifyError("Duplicate failed", res.error);
      }
    } catch (err: any) {
      notifyError("Duplicate failed", err.message);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await setDefaultQuotationTemplateAction(id);
      if (res.success) {
        notifySuccess("Default template updated");
        setTemplate((prev) => ({ ...prev, is_default: true }));
        router.refresh();
      } else {
        notifyError("Failed to set default", res.error);
      }
    } catch (err: any) {
      notifyError("Failed to set default", err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this T&C template?")) return;
    try {
      const res = await deleteQuotationTemplateAction(id);
      if (res.success) {
        notifySuccess("Template deleted");
        router.push("/accounting/templates");
        router.refresh();
      } else {
        notifyError("Delete failed", res.error);
      }
    } catch (err: any) {
      notifyError("Delete failed", err.message);
    }
  };

  const handleSave = async (updated: TemplateData) => {
    setSaving(true);
    try {
      const res = await saveQuotationTemplateAction(updated);
      if (res.success) {
        notifySuccess("Template updated successfully");
        setTemplate(updated);
        setIsEditing(false);
        router.refresh();
      } else {
        notifyError("Failed to save template", res.error);
      }
    } catch (err: any) {
      notifyError("Failed to save template", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = (name: string, color: CategoryColor) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => [
      ...prev,
      {
        id: `cat-custom-${Date.now()}`,
        name: trimmed,
        color,
        isCustom: true,
      },
    ]);
  };

  if (isEditing) {
    return (
      <TemplateFormPage
        template={template}
        onBack={() => setIsEditing(false)}
        onSave={handleSave}
        saving={saving}
        categories={categories}
        onAddCategory={handleAddCategory}
        onRenameCategory={() => {}}
        onDeleteCategory={() => {}}
        getCategoryConfig={getCategoryConfig}
      />
    );
  }

  return (
    <TemplateDetailPage
      template={template}
      onBack={() => router.push("/accounting/templates")}
      onEdit={() => setIsEditing(true)}
      onDuplicate={handleDuplicate}
      onSetDefault={handleSetDefault}
      onDelete={handleDelete}
      getCategoryConfig={getCategoryConfig}
    />
  );
}
