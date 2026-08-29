
"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  X,
  AlertCircle,
  UserX,
  Calendar,
  Loader2,
  Save,
  TrendingUp,
  Lock,
  Shield,
  IndianRupee,
  Camera,
  Upload,
  FileText,
  Eye,
  Download,
  Trash2,
  EyeOff,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  offboardEmployeeAction,
  onboardEmployeeAction,
  deleteEmployeeAction,
  updateEmployeeProfileAction,
  addSalaryHikeAction,
  getSalaryHikesAction,
  resetEmployeePasswordAction,
} from "@/actions/admin.actions";
import { getAllEmployeesAction } from "@/actions/employee.actions";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Avatar } from "@/components/common/Avatar";
import { cn } from "@/lib/utils/cn";
import { Select, SelectItem } from "@/components/ui/select";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Dropdown } from "@/components/ui/Dropdown";
import { APP_ROLES, ONBOARDING_ROLES } from "@/config/roles";
import { DEPARTMENTS, getDesignationsForDepartment } from "@/config/departments";
import { usePrompt } from "@/hooks/use-prompt";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Json } from "@/types/database";
export interface EmployeeFormData {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  dob?: string | null;
  gender?: string | null;
  department?: string | null;
  employment_type?: string | null;
  salary?: number | null;
  experience?: number | null;
  joining_date?: string | null;
  status?: string | null;
  roles?: string[];
  is_active?: boolean | null;
  updated_at?: string | null;
  profile_photo?: string | null;
  documents?: Json;
  personal_email?: string | null;
  residential_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_number?: string | null;
  reporting_manager_id?: string | null;
  [key: string]: unknown;
}

export function EmployeeProfileModal({
  employee,
  onClose,
}: {
  employee: EmployeeFormData;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { prompt, PromptComponent } = usePrompt();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<
    "personal" | "professional" | "documents" | "salary" | "security"
  >("personal");

  interface DocumentItem {
    id: string;
    name: string;
    url: string;
    size?: number;
    type?: string;
    uploaded_at?: string;
    [key: string]: unknown;
  }

  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    employee.profile_photo || "",
  );
  const [documentsList, setDocumentsList] = useState<DocumentItem[]>(
    (employee.documents as unknown as DocumentItem[]) || [],
  );
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );

  const [formData, setFormData] = useState<EmployeeFormData>({ ...employee });
  const [initialFormData, setInitialFormData] = useState<EmployeeFormData>({
    ...employee,
  });

  const [employees, setEmployees] = useState<{ id: string, first_name: string, last_name: string }[]>([]);

  useEffect(() => {
    let active = true;
    async function loadEmployees() {
      const res = await getAllEmployeesAction({ compact: true });
      if (active && res && 'data' in res && res.success && res.data) {
        setEmployees(res.data as any);
      }
    }
    loadEmployees();
    return () => { active = false; };
  }, []);

  const isEditing = true; // Always editable for now

  // Salary Hike State
  const [showInlineHikeForm, setShowInlineHikeForm] = useState(false);
  const [incrementInput, setIncrementInput] = useState("");
  const [incrementEffectiveDate, setIncrementEffectiveDate] = useState("");

  interface SalaryHike {
    id?: string;
    previous_salary: number;
    new_salary: number;
    effective_date: string;
  }

  const [pendingHike, setPendingHike] = useState<{
    previousSalary: number;
    newSalary: number;
    effectiveDate: string;
  } | null>(null);
  const [salaryHikes, setSalaryHikes] = useState<SalaryHike[]>([]);
  const [loadingHikes, setLoadingHikes] = useState(false);

  // Fetch salary hikes on mount for salary tab
  useEffect(() => {
    let active = true;
    const fetchHikes = async () => {
      if (!employee.id) return;
      try {
        setLoadingHikes(true);
        const res = await getSalaryHikesAction(employee.id);
        if (active && 'data' in res && res.data) {
          setSalaryHikes(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingHikes(false);
      }
    };
    if (activeTab === "salary") {
      fetchHikes();
    }
    return () => { active = false; };
  }, [activeTab, employee.id]);

  // Reset Password State
  const [resetPasswordState, setResetPasswordState] = useState({
    newPassword: "",
    confirmPassword: "",
    showPassword: false,
  });

  // Confirmation state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Please upload an image smaller than 2MB",
          variant: "error",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setSelectedAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const f = file;
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newFileObj = {
          id: fileId,
          name: f.name,
          size: f.size,
          type: "other",
          uploaded_at: new Date().toISOString(),
          url: reader.result as string,
        };

        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));
        setDocumentsList((prev) => {
          const newList = [...prev, newFileObj];
          let progress = 0;
          const interval = setInterval(() => {
            progress += 25;
            setUploadProgress((p) => ({ ...p, [fileId]: progress }));
            if (progress >= 100) {
              clearInterval(interval);
              toast({
                title: `${f.name} successfully encrypted and staged.`,
                variant: "success",
              });
            }
          }, 80);
          return newList;
        });
      };
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (id: string) => {
    setDocumentsList((prev) =>
      prev.filter((f) => f.id !== id),
    );
    toast({ title: "Document deleted.", variant: "success" });
  };

  const handleDocumentNameChange = (id: string, newName: string) => {
    setDocumentsList((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, name: newName } : f,
      ),
    );
  };




  // Handle Dirty Checking
  const handleClose = () => {
    let hasChanges = false;

    // Normalize function for dirty checking
    const normalize = (obj: Record<string, unknown>) => {
      const allowedKeys = [
        "first_name",
        "last_name",
        "dob",
        "gender",
        "phone_number",
        "department",
        "employment_type",
        "salary",
        "experience",
        "joining_date",
        "status",
        "roles",
        "reporting_manager_id",
      ];
      return JSON.stringify(
        Object.keys(obj)
          .filter((k) => allowedKeys.includes(k))
          .sort()
          .reduce((acc: Record<string, unknown>, key: string) => {
            acc[key] = obj[key] === null ? "" : obj[key];
            return acc;
          }, {}),
      );
    };

    if (normalize(formData) !== normalize(initialFormData)) {
      hasChanges = true;
    }

    if (selectedAvatar !== (employee.profile_photo || "")) hasChanges = true;
    if (
      JSON.stringify(documentsList) !== JSON.stringify(employee.documents || [])
    )
      hasChanges = true;
    if (pendingHike !== null) hasChanges = true;
    if (showInlineHikeForm && incrementInput.trim() !== "") hasChanges = true;

    if (resetPasswordState.newPassword !== "") hasChanges = true;

    if (hasChanges) {
      setShowCloseConfirm(true);
      return;
    }

    onClose();
  };

  const handleSave = async () => {
    if (resetPasswordState.newPassword) {
      const p = resetPasswordState.newPassword;
      if (p.length < 8 || !/[A-Z]/.test(p) || !/[0-9]/.test(p) || !/[^a-zA-Z0-9]/.test(p)) {
        toast({
          title: "Password must be at least 8 chars, 1 uppercase, 1 number, 1 special character",
          variant: "error",
        });
        return;
      }
      if (
        resetPasswordState.newPassword !== resetPasswordState.confirmPassword
      ) {
        toast({ title: "Passwords do not match", variant: "error" });
        return;
      }
    }

    startTransition(async () => {
      // 1. Commit any pending hike
      if (pendingHike) {
        const result = await addSalaryHikeAction(
          employee.id!,
          pendingHike.previousSalary,
          pendingHike.newSalary,
          pendingHike.effectiveDate,
        );
        if (!result.success) {
          toast({
            title: (result.error as string) || "Failed to add salary hike",
            variant: "error",
          });
          return;
        }
      }

      // 2. Reset Password if provided
      if (resetPasswordState.newPassword) {
        const pwdResult = await resetEmployeePasswordAction(
          employee.id!,
          resetPasswordState.newPassword,
        );
        if (!pwdResult.success) {
          toast({
            title:
              (pwdResult as { error?: string }).error ||
              "Failed to reset password",
            variant: "error",
          });
          return;
        }
      }

      // 3. Save Profile
      const payload = {
        ...formData,
        profile_photo: selectedAvatar,
        documents: documentsList,
      };
      const result = await updateEmployeeProfileAction(employee.id!, payload);
      if (result.success) {
        toast({
          title:
            (result as { message?: string }).message ||
            "Profile updated successfully",
          variant: "success",
        });
        setInitialFormData({ ...formData });
        setPendingHike(null);
        setShowInlineHikeForm(false);
        setResetPasswordState({
          newPassword: "",
          confirmPassword: "",
          showPassword: false,
        });
        onClose();
      } else {
        toast({
          title:
            (result as { error?: string }).error || "Failed to update profile",
          variant: "error",
        });
      }
    });
  };

  // Salary Action Helpers
  const handleApplyHike = () => {
    const newSalaryNum = parseFloat(incrementInput);
    if (!newSalaryNum || newSalaryNum <= 0) return;
    if (!incrementEffectiveDate) return;

    setPendingHike({
      previousSalary: formData.salary || 0,
      newSalary: newSalaryNum,
      effectiveDate: incrementEffectiveDate,
    });

    // Optimistically update formData salary for display
    setFormData((prev) => ({ ...prev, salary: newSalaryNum }));
    setShowInlineHikeForm(false);
  };

  // Danger Zone Helpers

  const handleOffboard = async () => {
    if (!confirm(`Are you sure you want to offboard ${employee.first_name}?`))
      return;
    const res = await offboardEmployeeAction(employee.id!);
    if (res.success) onClose();
    else alert(res.error);
  };

  const handleOnboard = async () => {
    if (!confirm(`Are you sure you want to onboard ${employee.first_name}?`))
      return;
    const res = await onboardEmployeeAction(employee.id!);
    if (res.success) onClose();
    else alert(res.error);
  };

  const handleDelete = async () => {
    const confirmStr = await prompt(
      `Type "DELETE" to permanently archive ${employee.first_name}'s account.`,
    );
    if (confirmStr !== "DELETE") return;
    const res = await deleteEmployeeAction(employee.id!);
    if (res.success) onClose();
    else alert(res.error);
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="shrink-0 p-8 pb-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex gap-5 items-center">
            <div className="relative group">
              <Input
                type="file"
                id="profile-avatar-edit-uploader"
                accept="image/*"
                className="hidden"
                disabled={!isEditing}
                onChange={handlePhotoUpload}
              />
              <div
                onClick={() => {
                  if (isEditing)
                    document
                      .getElementById("profile-avatar-edit-uploader")
                      ?.click();
                }}
                className={cn(
                  "relative rounded-full overflow-hidden shadow-sm border-2 border-orange-500/30 transition-all",
                  isEditing
                    ? "cursor-pointer hover:border-orange-500 hover:scale-105"
                    : "",
                )}
              >
                {selectedAvatar ? (
                  <Avatar
                    initials={`${formData.first_name?.[0] || ""}${formData.last_name?.[0] || ""}`}
                    imageUrl={selectedAvatar}
                    className="w-16 h-16 bg-orange-50 text-xl font-bold text-orange-600"
                  />
                ) : (
                  <Avatar
                    initials={`${formData.first_name?.[0] || ""}${formData.last_name?.[0] || ""}`}
                    className="w-16 h-16 bg-orange-50 text-xl font-bold text-orange-600"
                  />
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[8px] font-semibold">
                    <Camera className="w-3.5 h-3.5 mb-0.5" />
                    EDIT
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">
                  {formData.first_name} {formData.last_name}
                </h2>
                <StatusBadge
                  status={formData.status ?? null}
                  isActive={employee.is_active || null}
                />
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {DEPARTMENTS.find((d) => d.id === formData.department)?.name ||
                  formData.department ||
                  "No Department"}{" "}
                •{" "}
                {(formData.roles || [])
                  .map((r) => APP_ROLES[r as keyof typeof APP_ROLES] || r)
                  .join(", ") || "No Roles"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tab Controls */}
        <div className="px-8 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-6 shrink-0 overflow-x-auto">
          {[
            { id: "personal", label: "Personal" },
            { id: "professional", label: "Professional" },
            { id: "documents", label: "Documents" },
            { id: "salary", label: "Salary & Hike" },
            { id: "security", label: "Access & Security" },
          ].map((tab) => (
            <Button variant="ghost" key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id as
                  | "personal"
                  | "professional"
                  | "documents"
                  | "salary"
                  | "security",
                )
              }
              className={cn(
                "relative py-3.5 px-1 text-sm font-semibold outline-none transition-all",
                activeTab === tab.id
                  ? "text-orange-600"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-t-full shadow-[0_-2px_10px_rgba(79,70,229,0.3)]" />
              )}
            </Button>
          ))}
        </div>

        {/* Tab Content Box */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === "personal" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    First Name *
                  </label>
                  <Input
                    value={formData.first_name || ""}
                    onChange={(e) => {
                      const newFirstName = e.target.value;
                      setFormData({ 
                        ...formData, 
                        first_name: newFirstName,
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Last Name *
                  </label>
                  <Input
                    value={formData.last_name || ""}
                    onChange={(e) => {
                      const newLastName = e.target.value;
                      setFormData({ 
                        ...formData, 
                        last_name: newLastName,
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Date of Birth
                  </label>
                  <PremiumDatePicker
                    value={formData.dob || undefined}
                    onChange={(val) => setFormData({ ...formData, dob: val })}
                    triggerClassName="w-full h-12 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Gender
                  </label>
                  <Dropdown
                    value={formData.gender || ""}
                    onChange={(val) =>
                      setFormData({ ...formData, gender: val })
                    }
                    buttonClassName="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                    options={[
                      { label: "Male", value: "male" },
                      { label: "Female", value: "female" },
                      { label: "Other", value: "other" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Phone Number
                  </label>
                  <Input
                    value={formData.phone_number || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Personal Email (Alternative)
                  </label>
                  <Input
                    value={formData.personal_email || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personal_email: e.target.value,
                      })
                    }
                    placeholder="E.g. personal@gmail.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4">
                  Address Details
                </h4>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Residential Address *
                  </label>
                  <textarea
                    value={formData.residential_address || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        residential_address: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Full residential address"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4">
                  Emergency Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">
                      Contact Name *
                    </label>
                    <Input
                      value={formData.emergency_contact_name || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergency_contact_name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">
                      Relationship *
                    </label>
                    <Input
                      value={formData.emergency_contact_relation || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergency_contact_relation: e.target.value,
                        })
                      }
                      placeholder="e.g. Spouse, Parent"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500">
                      Contact Number *
                    </label>
                    <Input
                      value={formData.emergency_contact_number || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergency_contact_number: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFESSIONAL DETAILS */}
          {activeTab === "professional" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Department
                  </label>
                  <Dropdown
                    value={formData.department || ""}
                    onChange={(val) =>
                      setFormData({ ...formData, department: val })
                    }
                    buttonClassName="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                    options={DEPARTMENTS.map(dept => ({ label: dept.name, value: dept.id }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    System Roles
                  </label>
                  <MultiSelect
                    options={(formData.department
                      ? getDesignationsForDepartment(formData.department)
                      : ONBOARDING_ROLES
                    ).map((r) => ({
                      value: r.id,
                      label: r.name,
                    }))}
                    value={formData.roles || []}
                    onChange={(val: string[]) => {
                      setFormData((prev) => ({ ...prev, roles: val }));
                    }}
                    placeholder="Select Roles"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Employment Type
                  </label>
                  <Select
                    value={formData.employment_type || ""}
                    onValueChange={(val) =>
                      setFormData({ ...formData, employment_type: val })
                    }
                    buttonClassName="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                  >
                    <SelectItem value="full-time">Full Time</SelectItem>
                    <SelectItem value="part-time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Total Experience (Years)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.experience || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experience: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500">
                    Reporting Manager
                  </label>
                  <Select
                    value={formData.reporting_manager_id || ""}
                    onValueChange={(val) =>
                      setFormData({ ...formData, reporting_manager_id: val === "none" ? null : val })
                    }
                    buttonClassName="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
                  >
                    <SelectItem value="none">None</SelectItem>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Base Salary (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      min="0"
                      value={formData.salary || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salary: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    Joining Date
                  </label>
                  <PremiumDatePicker
                    value={formData.joining_date || undefined}
                    onChange={(val) =>
                      setFormData({ ...formData, joining_date: val })
                    }
                    triggerClassName="w-full h-12 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENTS REPOSITORY */}
          {activeTab === "documents" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Documents</h3>
                <Button
                  onClick={() =>
                    document.getElementById("profile-file-input")?.click()
                  }
                  variant="secondary" className="flex items-center gap-2 text-orange-600"
                >
                  <Upload className="w-4 h-4" /> Upload Document
                </Button>
              </div>
              <Input
                id="profile-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              {documentsList.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {documentsList.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-3 bg-orange-100 rounded-xl text-orange-600 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Input
                            type="text"
                            value={doc.name || ""}
                            onChange={(e) =>
                              handleDocumentNameChange(doc.id, e.target.value)
                            }
                            placeholder="Document name..."
                            className="w-full text-sm font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-orange-400 outline-none transition-all pb-0.5"
                          />
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-500 font-medium">
                              {((doc.size || 0) / 1024).toFixed(1)} KB
                            </p>
                            {uploadProgress[doc.id] !== undefined &&
                              uploadProgress[doc.id] < 100 && (
                                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-orange-500 transition-all"
                                    style={{
                                      width: `${uploadProgress[doc.id]}%`,
                                    }}
                                  />
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {doc.url && (
                          <>
                            <a
                              href={doc.url}
                              download={doc.name || "document"}
                              className="p-2.5 bg-white hover:bg-orange-50 rounded-xl transition-all border border-slate-200 text-slate-500"
                              title="Download document"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <Button
                              onClick={() => removeFile(doc.id)}
                              variant="outline" size="sm" className="text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">
                    No documents uploaded
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Upload IDs, contracts, or certifications here. They will be
                    securely stored.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SALARY & HIKE */}
          {activeTab === "salary" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {pendingHike && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <p className="text-xs font-semibold text-amber-700 flex-1">
                    Hike of ₹{pendingHike.newSalary.toLocaleString("en-IN")} is
                    staged but <strong>not saved yet</strong>. Click{" "}
                    <strong>Save Changes</strong> below to commit.
                  </p>
                  <Button
                    onClick={() => {
                      setPendingHike(null);
                      setFormData((prev) => ({
                        ...prev,
                        salary: pendingHike.previousSalary,
                      }));
                    }}
                    variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 px-2 py-1"
                  >
                    Undo
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Salary & Hike Management
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Current compensation and timeline of salary increments
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (!showInlineHikeForm) {
                      setIncrementInput("");
                      setIncrementEffectiveDate("");
                    }
                    setShowInlineHikeForm(!showInlineHikeForm);
                  }}
                  className={cn(
                    "h-11 px-4 rounded-xl text-xs font-bold tracking-wider flex items-center gap-2 transition-all shadow-md",
                    showInlineHikeForm
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-none"
                      : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20",
                  )}
                >
                  {showInlineHikeForm ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                  {showInlineHikeForm ? "Cancel Hike" : "Give Hike"}
                </Button>
              </div>

              {showInlineHikeForm && (
                <div className="p-6 bg-slate-50 border border-orange-100 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-bold text-slate-800 mb-6">
                    Apply Salary Increment
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">
                        Previous Salary (₹)
                      </label>
                      <Input
                        type="text"
                        value={(formData.salary || 0).toLocaleString("en-IN")}
                        disabled
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">
                        New Proposed Salary (₹) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={incrementInput}
                        onChange={(e) => setIncrementInput(e.target.value)}
                        placeholder="Enter new fixed salary"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-orange-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500">
                        Effective Date *
                      </label>
                      <PremiumDatePicker
                        value={incrementEffectiveDate}
                        onChange={(val) => setIncrementEffectiveDate(val)}
                        triggerClassName="w-full h-12 bg-white border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={() => setShowInlineHikeForm(false)}
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleApplyHike}
                      disabled={!incrementInput || !incrementEffectiveDate}
                      variant="primary"
                    >
                      Stage Hike
                    </Button>
                  </div>
                </div>
              )}

              {!showInlineHikeForm && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Current Salary */}
                    <div className="p-6 bg-white border border-orange-50 rounded-[24px] shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-[64px] -z-10" />
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                        <IndianRupee className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-black tracking-widest text-orange-600 uppercase mb-1">
                        Current Salary
                      </p>
                      <h3 className="text-2xl font-black text-slate-800">
                        ₹{(formData.salary || 0).toLocaleString("en-IN")}
                      </h3>
                    </div>

                    {/* Next Hike */}
                    <div className="p-6 bg-white border border-emerald-50 rounded-[24px] shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[64px] -z-10" />
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-black tracking-widest text-emerald-600 uppercase mb-1">
                        Next Hike
                      </p>
                      <h3 className="text-lg font-bold text-slate-500">
                        Not set
                      </h3>
                    </div>

                    {/* Last Hike */}
                    <div className="p-6 bg-white border border-purple-50 rounded-[24px] shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[64px] -z-10" />
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-black tracking-widest text-purple-600 uppercase mb-1">
                        Last Hike
                      </p>
                      <h3 className="text-lg font-bold text-slate-500">
                        {salaryHikes.length > 0
                          ? `₹${salaryHikes[0].new_salary?.toLocaleString("en-IN")}`
                          : "No history yet"}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-10">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6">
                      Salary Increment History
                    </h4>

                    {loadingHikes ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      </div>
                    ) : salaryHikes.length === 0 ? (
                      <div className="p-10 border border-slate-100 rounded-[24px] bg-slate-50 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-200/50 text-slate-400 flex items-center justify-center mb-4">
                          <Clock className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">
                          No increment history recorded yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {salaryHikes.map((hike: SalaryHike, i: number) => (
                          <div
                            key={hike.id || i}
                            className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                ₹{hike.new_salary?.toLocaleString("en-IN")}
                                <span className="text-xs font-medium text-slate-500 ml-2">
                                  from ₹
                                  {hike.previous_salary?.toLocaleString(
                                    "en-IN",
                                  )}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Effective:{" "}
                                {new Date(
                                  hike.effective_date,
                                ).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              {hike.previous_salary > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                  +
                                  {(
                                    ((hike.new_salary - hike.previous_salary) /
                                      hike.previous_salary) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 5: ACCESS & SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      System Permissions
                    </h3>
                    <p className="text-xs text-slate-500">
                      Manage ERP roles and account status.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500">
                      Work Email (System Access) *
                    </label>
                    <Input
                      value={formData.email ?? ""}
                      disabled
                      className="w-full h-11 px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500">
                      Account Status Override *
                    </label>
                    <Select
                      value={formData.status || "Probation"}
                      onValueChange={(val) =>
                        setFormData({ ...formData, status: val })
                      }
                      buttonClassName="w-full h-11 px-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700"
                    >
                      <SelectItem value="Probation">Probation</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Notice Period">Notice Period</SelectItem>
                      <SelectItem value="Resigned">Resigned</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Reset Password
                    </h3>
                    <p className="text-xs text-slate-500">
                      Set a new login password for this employee.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={
                          resetPasswordState.showPassword ? "text" : "password"
                        }
                        placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                        value={resetPasswordState.newPassword}
                        onChange={(e) =>
                          setResetPasswordState((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        className="w-full h-11 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-rose-400 outline-none transition-all"
                      />
                      <Button
                        onClick={() =>
                          setResetPasswordState((prev) => ({
                            ...prev,
                            showPassword: !prev.showPassword,
                          }))
                        }
                        variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        {resetPasswordState.showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        type={
                          resetPasswordState.showPassword ? "text" : "password"
                        }
                        placeholder="Re-enter new password"
                        value={resetPasswordState.confirmPassword}
                        onChange={(e) =>
                          setResetPasswordState((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        className="w-full h-11 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-rose-400 outline-none transition-all"
                      />
                      <Button
                        onClick={() =>
                          setResetPasswordState((prev) => ({
                            ...prev,
                            showPassword: !prev.showPassword,
                          }))
                        }
                        variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        {resetPasswordState.showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-6 border-t border-slate-100 bg-white flex items-center justify-center gap-4">
          {employee.status === "Resigned" || employee.status === "Terminated" || !employee.is_active ? (
            <Button
              onClick={handleOnboard}
              disabled={isPending}
              variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
            >
              <UserX className="w-4 h-4" /> Onboard Employee
            </Button>
          ) : (
            <Button
              onClick={handleOffboard}
              disabled={isPending}
              variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2"
            >
              <UserX className="w-4 h-4" /> Offboard Employee
            </Button>
          )}
          <Button
            onClick={handleDelete}
            disabled={isPending || employee.status === "Terminated"}
            variant="outline" className="border-rose-500 text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Terminate Employee
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            variant="primary" className="flex items-center gap-2"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Confirm Close Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowCloseConfirm(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Unsaved Changes
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              You have unsaved changes to this profile. Are you sure you want to
              close without saving?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCloseConfirm(false)}
                variant="outline" className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (initialFormData) setFormData({ ...initialFormData });
                  setPendingHike(null);
                  setShowInlineHikeForm(false);
                  setShowCloseConfirm(false);
                  onClose();
                }}
                variant="accent" className="flex-1"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}
      <PromptComponent />
    </div>
  );

  return createPortal(modalContent, document.body);
}
