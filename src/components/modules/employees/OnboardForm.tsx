"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X, User, Loader2, Lock, Building2, Copy, ChevronRight, FileText, Trash2,
  IndianRupee, UserCheck, Camera, Eye, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

import { useToast } from "@/hooks/use-toast";
import { onboardSchema, type OnboardFormData } from "@/lib/validations/onboard";
import { DEPARTMENTS, getDesignationsForDepartment, getSystemRoleForDesignation } from "@/config/departments";
import Image from "next/image";
import { onboardEmployeeAction, getCurrentUserProfileAction, getAllEmployeesAction } from "@/actions/employee.actions";
import { getActiveBranchesAction } from "@/actions/branch.actions";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormMultiSelect } from "@/components/forms/FormMultiSelect";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { ONBOARDING_ROLES } from "@/config/roles";

interface OnboardFormProps {
  onSuccess?: () => void;
}


interface UploadedFile {
  id: string;
  name: string;
  label: string;
  size: number;
  uploaded_at: string;
  url: string;
  file?: File;
  blobUrl?: string;
}

export function OnboardForm({ onSuccess }: OnboardFormProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeBranches, setActiveBranches] = useState<{ id: string, name: string, code: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string, first_name: string, last_name: string }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);

    // Fetch profile & branches
    async function init() {
      try {
        const profileRes = await getCurrentUserProfileAction();
        if (profileRes && "data" in profileRes && profileRes.success && profileRes.data) {
          const roles = profileRes.data.roles || [];
          const hasSuperAdmin = roles.includes("SUPER_ADMIN");
          setIsSuperAdmin(hasSuperAdmin);

          if (hasSuperAdmin) {
            const branchRes = await getActiveBranchesAction();
            if (branchRes && "data" in branchRes && branchRes.success && branchRes.data) {
              setActiveBranches(branchRes.data as { id: string, name: string, code: string }[]);
            }
          }

          const empRes = await getAllEmployeesAction({ compact: true });
          if (empRes && "data" in empRes && empRes.success && empRes.data) {
              setEmployees(empRes.data as { id: string, first_name: string, last_name: string }[]);
          }
        }
      } catch (e) {
        console.error("Init err", e);
      }
    }
    init();

    return () => clearTimeout(timer);
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionedCreds, setProvisionedCreds] = useState<{ email: string; pass: string; id: string } | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [previewDoc, setPreviewDoc] = useState<UploadedFile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showStep4Errors, setShowStep4Errors] = useState(false);

  const { toast } = useToast();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 2MB",
          variant: "error"
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

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    control,
    formState: { errors, },
    reset
  } = useForm<OnboardFormData>({
    resolver: zodResolver(onboardSchema) as unknown as import("react-hook-form").Resolver<OnboardFormData>,
    defaultValues: {
      first_name: "",
      last_name: "",
      dob: "",
      phone_number: "",
      personal_email: "",
      address: "",
      emergency_contact: "",
      emergency_name: "",
      emergency_relationship: "",
      emergency_phone: "",
      department: "", designation: "", roles: ["HR"],
      gender: "male",
      employment_type: "full-time",
      salary: "" as unknown as number,
      experience: "" as unknown as number,
      location: "office",
      status: "Probation",
      joining_date: new Date().toISOString().split('T')[0],
      department_head: false,
      reporting_manager: "",
      email: "",
      employee_id: "",
      password: "",
      confirm_password: "",
    }
  });

  const firstName = useWatch({ control, name: "first_name" });
  const lastName = useWatch({ control, name: "last_name" });
  const phoneNumber = useWatch({ control, name: "phone_number" });
  const watchedDepartment = useWatch({ control, name: "department" });
  const watchedRoles = useWatch({ control, name: "roles" }) || [];
  const watchedAdditionalRoles = useWatch({ control, name: "additional_roles" }) || [];

  const isBranchManager = watchedRoles.includes("BRANCH_MANAGER_ADMINISTRATIVE") || watchedAdditionalRoles.includes("BRANCH_MANAGER_ADMINISTRATIVE");

  useEffect(() => {
    if (phoneNumber) {
      const digits = phoneNumber.replace(/\D/g, '');
      if (digits.length >= 5) {
        const last5 = digits.slice(-5);
        setValue("employee_id", `EMP-${last5}`);
      } else {
        setValue("employee_id", `EMP-${digits.padEnd(5, '0')}`);
      }
    } else {
      setValue("employee_id", `EMP-${Math.floor(10000 + Math.random() * 90000)}`); // Fallback if no phone
    }
  }, [phoneNumber, setValue]);

  // Auto-generate email based on name
  useEffect(() => {
    if (firstName && lastName) {
      const generatedEmail = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}@constrotrait.com`.replace(/\s+/g, '');
      setValue("email", generatedEmail, { shouldValidate: true });
    }
  }, [firstName, lastName, setValue]);

  // Manually register fields that don't have native inputs
  useEffect(() => {
    register("joining_date");
  }, [register]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof OnboardFormData)[] = [];
    if (step === 1) {
      fieldsToValidate = ["first_name", "last_name", "dob", "gender", "phone_number", "personal_email", "address", "emergency_contact"];
    } else if (step === 2) {
      fieldsToValidate = ["department", "designation", "employment_type", "salary", "experience", "joining_date"];
      if (isSuperAdmin) {
        fieldsToValidate.push("branch_id");
      }
    } else if (step === 3) {
      // Step 3 is document uploading, no sync validations required
      setStep(4);
      return;
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    } else {
      toast({
        title: "Validation Check Failed",
        description: "Please fill in all required fields correctly before moving forward.",
        variant: "error"
      });
    }
  };

  const prevStep = () => setStep(step - 1);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const reader = new FileReader();
      reader.onloadend = () => {
        const newFileObj = {
          id: fileId,
          name: file.name,
          label: "",
          size: file.size,
          uploaded_at: new Date().toISOString(),
          url: reader.result as string,
          file: file
        };
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        setUploadedFiles(prev => [...prev, newFileObj]);
        let progress = 0;
        const interval = setInterval(() => {
          progress += 20;
          setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
          if (progress >= 100) {
            clearInterval(interval);
            toast({ title: "Document Registered", description: `${file.name} staged successfully.`, variant: "success" });
          }
        }, 100);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter((f) => f.id !== id));
    toast({
      title: "Document Removed",
      description: "Staged document successfully deleted."
    });
  };

  const handleDocumentNameChange = (id: string, newName: string) => {
    setUploadedFiles(prev => prev.map((f) => f.id === id ? { ...f, label: newName } : f));
  };

  const onSubmit = async (data: OnboardFormData) => {
    setIsSubmitting(true);
    try {
      const emergencyContactParts = [];
      if (data.emergency_name) emergencyContactParts.push(data.emergency_name);
      if (data.emergency_relationship) emergencyContactParts.push(data.emergency_relationship);
      if (data.emergency_phone) emergencyContactParts.push(data.emergency_phone);

      const combinedRoles = Array.from(new Set([...(data.roles || []), ...(data.additional_roles || [])]));

      const onboardData = {
        ...data,
        roles: combinedRoles,
        emergency_contact: emergencyContactParts.length > 0 ? emergencyContactParts.join(" - ") : "",
        profile_photo: selectedAvatar,
        documents: uploadedFiles.map(f => ({
          id: f.id,
          name: f.label || f.name,
          size: f.size,
          url: f.url,
          uploaded_at: f.uploaded_at,
          type: "other"
        })),
        reporting_manager_id: data.reporting_manager || null,
        department_head_id: data.department_head ? data.reporting_manager || null : null,
        approval_authority: combinedRoles.includes("BRANCH_MANAGER_ADMINISTRATIVE"),
        branch_id: data.branch_id || undefined,
      };

      const result = await onboardEmployeeAction(onboardData as unknown as Parameters<typeof onboardEmployeeAction>[0]);
      if (result?.success) {
        toast({
          title: "Employee Provisioned Successfully",
          description: `Internal structures set up for ${data.first_name}.`,
          variant: "success"
        });
        setProvisionedCreds({
          email: data.email,
          pass: data.password,
          id: data.employee_id
        });
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: "Provisioning Action Denied",
          description: result?.error as string,
          variant: "error"
        });
      }
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: "Transaction Failure",
        description: "An unexpected network or file engine error occurred.",
        variant: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: Record<string, unknown>) => {
    console.error("Form validation errors:", errors);

    // Auto-navigate to the step with the error
    if (errors.first_name || errors.last_name || errors.dob || errors.gender || errors.phone_number || errors.personal_email || errors.address || errors.emergency_contact) {
      setStep(1);
    } else if (errors.department || errors.designation || errors.employment_type || errors.salary || errors.experience || errors.joining_date || errors.branch_id) {
      setStep(2);
    } else if (errors.email || errors.employee_id || errors.status || errors.password || errors.confirm_password) {
      setStep(4);
    }

    const errorMessages = Object.entries(errors)
      .map(([key, err]: [string, { message?: string } | undefined | unknown]) => `${key}: ${(err as { message?: string })?.message || 'Invalid value'}`)
      .join('\n');


    toast({
      title: "Validation Check Failed",
      description: errorMessages || "Please fill all required fields.",
      variant: "error"
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Sensitive credential copied safely to clipboard buffer.",
      variant: "success"
    });
  };

  const handleReset = () => {
    reset();
    setStep(1);
    setProvisionedCreds(null);
    setUploadedFiles([]);
    setShowStep4Errors(false);
    if (onSuccess) onSuccess();
  };

  if (!mounted) return null;

  return (
    <div className="w-full flex items-center justify-center overflow-y-auto">


      <div className="relative w-full bg-white rounded-2xl overflow-hidden animate-in fade-in duration-300">

        {provisionedCreds ? (
          <div className="p-8 md:p-12 space-y-8 text-center bg-gradient-to-b from-orange-50/50 to-white ">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
              <UserCheck className="w-10 h-10 text-emerald-500" />
            </div>

            <div className="space-y-3">
              <h3 className="text-3xl font-bold tracking-tight text-zinc-950 ">Account Provisioned</h3>
              <p className="text-zinc-500 font-semibold max-w-md mx-auto text-sm">
                Employee record for <span className="text-orange-600 ">{firstName} {lastName}</span> was successfully provisioned.
              </p>
            </div>

            <div className="grid gap-4 max-w-md mx-auto text-left">
              <div className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between group shadow-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Employee ID</p>
                  <p className="font-mono font-bold text-zinc-800 text-sm mt-0.5">{provisionedCreds.id}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between group shadow-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Username / Work Email</p>
                  <p className="font-bold text-zinc-800 text-sm mt-0.5">{provisionedCreds.email}</p>
                </div>
                <Button variant="ghost" onClick={() => copyToClipboard(provisionedCreds.email)}
                  className="p-2.5 hover:bg-zinc-100 rounded-xl transition-all"
                  title="Copy work email"
                >
                  <Copy className="w-4 h-4 text-orange-600 " />
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-center justify-between group shadow-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-600 ">Password</p>
                  <p className="font-mono font-bold text-orange-600 text-lg tracking-wider mt-0.5">
                    {provisionedCreds.pass}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => copyToClipboard(provisionedCreds.pass)}
                  className="p-2.5 bg-orange-500/10 hover:bg-orange-500/20 rounded-xl transition-all"
                  title="Copy password"
                >
                  <Copy className="w-4 h-4 text-orange-600 " />
                </Button>
              </div>
            </div>

            <Button
              onClick={handleReset}
              variant="primary"
              className="w-full max-w-md h-12 text-xs font-bold uppercase tracking-wider"
            >
              Complete & Close Wizard
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit as unknown as any, onError)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="flex flex-col h-[750px] max-h-[90vh]"
          >

            {/* Header */}
            <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/40 ">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-900 leading-tight">
                  Create Employee Profile
                </h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-1">
                  Enterprise Unified Provisioning - Step {step} of 4
                </p>
              </div>
              <Button variant="ghost" type="button" onClick={handleReset}
                className="p-2 hover:bg-zinc-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Step Progress Bar Tabs (Layout matching screenshots exactly) */}
            <div className="px-8 py-4 bg-zinc-100/30 border-b border-zinc-100 grid grid-cols-4 gap-4">
              {[
                { label: "PERSONAL INFO", step: 1 },
                { label: "PROFESSIONAL", step: 2 },
                { label: "DOCUMENTS", step: 3 },
                { label: "LOGIN DETAILS", step: 4 },
              ].map((s) => (
                <Button variant="ghost" key={s.step}
                  type="button"
                  onClick={async () => {
                    if (s.step < step) setStep(s.step);
                    else if (s.step === step + 1) await nextStep();
                  }}
                  className="flex flex-col text-left outline-none group w-full"
                >
                  <div className={cn(
                    "h-[3px] w-full rounded-full transition-all duration-500",
                    step >= s.step
                      ? "bg-orange-600 hover:bg-orange-700 "
                      : "bg-zinc-200 group-hover:bg-zinc-300 "
                  )} />
                  <span className={cn(
                    "text-xs font-bold tracking-wider mt-2.5 transition-colors ",
                    step >= s.step
                      ? "text-orange-600 "
                      : "text-zinc-400 "
                  )}>
                    {s.label}
                  </span>
                </Button>
              ))}
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-5 custom-scrollbar bg-white ">

              {/* STEP 1: PERSONAL INFO */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-zinc-50/20 p-5 rounded-2xl border border-zinc-100 backdrop-blur-md">
                    {/* Dotted Photo Upload/Placeholder Block */}
                    <div className="flex flex-col items-center shrink-0">
                      <Input
                        type="file"
                        id="profile-photo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      <div
                        onClick={() => document.getElementById("profile-photo-upload")?.click()}
                        className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center bg-zinc-500/[0.03] hover:border-orange-600 transition-all group overflow-hidden cursor-pointer shadow-sm"
                      >
                        {selectedAvatar ? (
                          <Image width={96} height={96}
                            src={selectedAvatar}
                            alt="Avatar Preview"
                            className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 group-hover:text-orange-600 transition-colors p-2 text-center">
                            <Camera className="w-6 h-6 mb-1 text-zinc-400 " />
                            <span className="text-xs font-bold uppercase tracking-wider">Upload Photo</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs font-bold">
                          <Camera className="w-4 h-4 mb-0.5" />
                          {selectedAvatar ? "CHANGE" : "UPLOAD"}
                        </div>
                      </div>
                      <span className="text-xs font-bold tracking-widest text-zinc-400 mt-2">PHOTO</span>
                    </div>

                    {/* Profile Photo Upload Header */}
                    <div className="flex-1 space-y-1 w-full sm:pt-1 text-left">
                      <div className="flex items-center gap-2 text-orange-600 ">
                        <User className="w-4 h-4" />
                        <h4 className="text-sm font-bold tracking-tight text-zinc-800 ">Profile Photo Upload</h4>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed font-semibold">
                        Upload a professional portrait (JPG, PNG. Max 2MB).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">First Name *</label>
                      <Input
                        {...register("first_name")}
                        placeholder="John"
                        className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                      {errors.first_name && <p className="text-xs text-rose-500 font-bold mt-1">{errors.first_name.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Last Name *</label>
                      <Input
                        {...register("last_name")}
                        placeholder="Doe"
                        className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                      {errors.last_name && <p className="text-xs text-rose-500 font-bold mt-1">{errors.last_name.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Date of Birth</label>
                      <Controller
                        control={control as any}
                        name="dob"
                        render={({ field }) => (
                          <PremiumDatePicker
                            value={field.value}
                            onChange={(date) => field.onChange(date)}
                            side="right"
                          />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Gender</label>
                      <div className="relative">
                        <FormSelect
                          name="gender"
                          control={control as any}
                          options={[
                            { value: "male", label: "Male" },
                            { value: "female", label: "Female" },
                            { value: "other", label: "Other" }
                          ]}
                          buttonClassName="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Phone Number</label>
                      <Input
                        {...register("phone_number")}
                        type="tel"
                        maxLength={10}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
                        }}
                        placeholder="10-digit number"
                        className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                      {errors.phone_number && <p className="text-xs text-rose-500 font-bold mt-1">{errors.phone_number.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Personal Email *</label>
                      <Input
                        {...register("personal_email")}
                        type="email"
                        placeholder="personal@email.com"
                        className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                      {errors.personal_email && <p className="text-xs text-rose-500 font-bold mt-1">{errors.personal_email.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 ">Home Address</label>
                    <textarea
                      {...register("address")}
                      placeholder="Full address"
                      rows={2}
                      className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-2 pb-2">
                    <label className="text-xs font-bold text-zinc-500 ">Emergency Contact Details</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        {...register("emergency_name")}
                        placeholder="Name"
                        className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                      <Input
                        {...register("emergency_relationship")}
                        placeholder="Relationship"
                        className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                      <div>
                        <Input
                          {...register("emergency_phone")}
                          type="tel"
                          maxLength={10}
                          onInput={(e) => {
                            e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
                          }}
                          placeholder="Phone"
                          className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                        {errors.emergency_phone && <p className="text-xs text-rose-500 font-bold mt-1">{errors.emergency_phone.message}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PROFESSIONAL INFO */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-1 text-orange-600 ">
                    <Building2 className="w-5 h-5" />
                    <div>
                      <h4 className="text-sm font-bold tracking-tight text-zinc-800 ">Professional Profile</h4>
                      <p className="text-sm text-zinc-400 mt-0.5 font-semibold">
                        Relational Corporate Context
                      </p>
                    </div>
                  </div>


                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Department *</label>
                      <FormSelect
                        name="department"
                        control={control as any}
                        options={DEPARTMENTS.map(d => ({ value: d.id, label: d.name }))}
                        placeholder="Select Department"
                        buttonClassName="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        onChange={() => {
                          setValue("designation", "");
                        }}
                      />
                      {errors?.department && <p className="text-xs text-rose-500 font-bold mt-1">{errors.department.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Designation / Role *</label>
                      <FormSelect
                        name="designation"
                        control={control as any}
                        options={getDesignationsForDepartment(watchedDepartment || "").map(r => ({ value: r.id, label: r.name }))}
                        placeholder="— Select Role —"
                        buttonClassName={cn("w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all", !watchedDepartment && "opacity-50 cursor-not-allowed pointer-events-none")}
                        onChange={(val) => {
                          const mappedRole = getSystemRoleForDesignation(watchedDepartment, val);
                          if (mappedRole !== "SUPER_ADMIN") {
                            setValue("roles", [mappedRole] as never);
                          }
                        }}
                      />
                      {errors?.designation && <p className="text-xs text-rose-500 font-bold mt-1">{errors.designation.message}</p>}
                    </div>

                    <div className={cn("space-y-2", !isSuperAdmin && "sm:col-span-2")}>
                      <label className="text-xs font-bold text-zinc-500 ">Additional System Roles (Optional)</label>
                      <FormMultiSelect
                        name="additional_roles"
                        control={control as any}
                        options={ONBOARDING_ROLES.map(r => ({ value: r.id, label: r.name }))}
                        placeholder="— Select Additional Roles —"
                        buttonClassName="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>

                    {isSuperAdmin && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 ">
                          Branch Assignment {isBranchManager ? "*" : ""}
                        </label>
                        <FormSelect name="branch_id" control={control as any} options={activeBranches.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }))} placeholder="— Select Branch —" buttonClassName="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all" />
                        {errors?.branch_id && <p className="text-xs text-rose-500 font-bold mt-1">{errors.branch_id.message}</p>}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Reporting Manager (Optional)</label>
                      <FormSelect 
                        name="reporting_manager" 
                        control={control as any} 
                        options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} 
                        placeholder="— Select Manager —" 
                        buttonClassName="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>


                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Employment Type *</label>
                      <div className="relative">
                        <FormSelect
                          name="employment_type"
                          control={control as any}
                          options={[
                            { value: "full-time", label: "Full Time" },
                            { value: "part-time", label: "Part Time" },
                            { value: "contract", label: "Contract" },
                            { value: "intern", label: "Intern" }
                          ]}
                          placeholder="— Select Type —"
                          buttonClassName="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      {errors.employment_type && <p className="text-xs text-rose-500 font-bold mt-1">{errors.employment_type.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Monthly Salary (Base, ₹)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                          type="number"
                          min="0"
                          {...register("salary")}
                          placeholder="0"
                          className="w-full pl-10 pr-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      {errors.salary && <p className="text-xs text-rose-500 font-bold mt-1">{errors.salary.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Experience (Years)</label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        {...register("experience")}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                      {errors.experience && <p className="text-xs text-rose-500 font-bold mt-1">{errors.experience.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Joining Date *</label>
                      <Controller
                        control={control as any}
                        name="joining_date"
                        render={({ field }) => (
                          <PremiumDatePicker
                            value={field.value}
                            side="right"
                            onChange={(date) => {
                              field.onChange(date);
                            }}
                          />
                        )}
                      />
                      {errors.joining_date && <p className="text-xs text-rose-500 font-bold mt-1">{errors.joining_date.message}</p>}
                    </div>
                  </div>





                </div>
              )}

              {/* STEP 3: DOCUMENT REPOSITORY */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-1 text-orange-600 ">
                    <FileText className="w-5 h-5" />
                    <div>
                      <h4 className="text-sm font-bold tracking-tight text-zinc-800 ">Document Repository</h4>
                      <p className="text-sm text-zinc-400 mt-0.5 font-semibold">
                        Securely upload identity proofs or contracts.
                      </p>
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-zinc-200 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 bg-zinc-500/[0.01] hover:bg-zinc-500/[0.03] transition-all cursor-pointer relative"
                    onClick={() => document.getElementById('wizard-file-input')?.click()}
                  >
                    <Input
                      id="wizard-file-input"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <div className="p-4 bg-zinc-200 rounded-full text-zinc-600 border border-zinc-300/50 ">
                      <span className="text-xl font-bold">+</span>
                    </div>
                    <p className="text-sm font-bold text-zinc-800 ">Click or drag to upload</p>
                    <p className="text-sm text-zinc-400 font-semibold">PDF, JPG, PNG up to 4MB</p>
                  </div>

                  {/* Empty staged list */}
                  {uploadedFiles.length === 0 && (
                    <div className="text-center py-6 text-zinc-400 text-xs font-semibold">
                      No documents in repository.
                    </div>
                  )}

                  {/* Upload List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <h5 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Staged Documents ({uploadedFiles.length})</h5>
                      <div className="space-y-2">
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="p-4 bg-white border border-zinc-200 rounded-xl flex items-center justify-between gap-4 shadow-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-600 shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <Input
                                  type="text"
                                  value={file.label || ""}
                                  onChange={(e) => handleDocumentNameChange(file.id, e.target.value)}
                                  placeholder={file.name}
                                  className="w-full text-xs font-bold text-zinc-900 bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-orange-400 outline-none transition-all pb-0.5"
                                />
                                <p className="text-xs text-zinc-400 font-bold uppercase mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {uploadProgress[file.id] < 100 ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                                  <span className="text-xs font-mono text-orange-600">{uploadProgress[file.id]}%</span>
                                </div>
                              ) : (
                                <>
                                  {file.url && (
                                    <Button variant="ghost" type="button" onClick={() => setPreviewDoc({ ...file, blobUrl: file.file ? URL.createObjectURL(file.file) : file.url })}
                                      className="p-2 hover:bg-orange-50 text-zinc-400 hover:text-orange-500 rounded-xl transition-all"
                                      title="Preview document"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" type="button" onClick={() => removeFile(file.id)}
                                    className="p-2 hover:bg-rose-50 text-zinc-400 hover:text-rose-500 rounded-xl transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: LOGIN & ACCESS */}
              {step === 4 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-1 text-orange-600 ">
                    <Lock className="w-5 h-5" />
                    <div>
                      <h4 className="text-sm font-bold tracking-tight text-zinc-800 ">System Credentials</h4>
                      <p className="text-sm text-zinc-400 mt-0.5 font-semibold">
                        Configure work identity and password.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Unique Employee ID (Auto-Generated) *</label>
                      <Input
                        {...register("employee_id")}
                        readOnly
                        placeholder="MH-EMP-XXXXX"
                        className="w-full px-4 py-3 bg-zinc-100/80 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-500 cursor-not-allowed opacity-75 outline-none transition-all "
                      />
                      {errors.employee_id && <p className="text-xs text-rose-500 font-bold mt-1">{errors.employee_id.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 ">Work Email Address * (Auto-Generated)</label>
                      <Input
                        {...register("email")}
                        type="email"
                        readOnly
                        placeholder="employee@agency.com"
                        className="w-full px-4 py-3 bg-zinc-100/80 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-500 cursor-not-allowed opacity-75 outline-none transition-all"
                      />
                      {showStep4Errors && errors.email && <p className="text-xs text-rose-500 font-bold mt-1">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2 text-left">
                      <label className="text-xs font-bold text-zinc-500 ">Password *</label>
                      <div className="relative">
                        <Input
                          {...register("password")}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full pl-4 pr-11 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                        <Button variant="ghost" type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      {showStep4Errors && errors.password && <p className="text-xs text-rose-500 font-bold mt-1">{errors.password.message}</p>}
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-xs font-bold text-zinc-500 ">Confirm Password *</label>
                      <div className="relative">
                        <Input
                          {...register("confirm_password")}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full pl-4 pr-11 py-3 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                        <Button variant="ghost" type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      {showStep4Errors && errors.confirm_password && <p className="text-xs text-rose-500 font-bold mt-1">{errors.confirm_password.message}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/40 flex items-center justify-between">
              <Button type="button" onClick={handleReset} variant="outline"
                className="h-10 text-xs font-bold uppercase tracking-wider text-zinc-500"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-3">
                {step > 1 && (
                  <Button
                    type="button"
                    onClick={prevStep}
                    variant="outline"
                    className="h-10 text-xs font-bold uppercase tracking-wider text-zinc-700 "
                  >
                    Back
                  </Button>
                )}

                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    variant="primary"
                    className="h-10 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    disabled={isSubmitting}
                    type="button"
                    onClick={() => {
                      setShowStep4Errors(true);
                      handleSubmit(onSubmit as any, onError)();
                    }}
                    variant="primary"
                    className="h-10 text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isSubmitting ? "Provisioning..." : "Provision Account"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Doc Preview Overlay */}
      {previewDoc && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 ">
              <p className="text-sm font-bold text-zinc-800 truncate">{previewDoc.label || previewDoc.name}</p>
              <Button variant="ghost" onClick={() => setPreviewDoc(null)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-all">
                <X className="w-4 h-4 text-zinc-500" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              {previewDoc.url?.startsWith('data:image') ? (

                <Image width={96} height={96} src={previewDoc.url} alt={previewDoc.label || previewDoc.name} className="w-full h-auto object-contain" />
              ) : previewDoc.url?.startsWith('data:application/pdf') ? (
                <object data={previewDoc.blobUrl || previewDoc.url} type="application/pdf" className="w-full h-[70vh]">
                  <p className="text-center p-4">Unable to display PDF file. <a href={previewDoc.blobUrl || previewDoc.url} target="_blank" rel="noreferrer" className="text-orange-500 underline">Download instead</a></p>
                </object>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <FileText className="w-12 h-12 mb-3" />
                  <p className="text-sm font-semibold">Preview not available for this file type.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


