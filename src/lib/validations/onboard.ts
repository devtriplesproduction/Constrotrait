import * as z from "zod";
import { ONBOARDING_ROLE_KEYS } from "@/config/roles";

export const onboardSchema = z.object({
  // Personal Info (Step 1)
  first_name: z.string().min(2, "First name is too short"),
  last_name: z.string().min(1, "Last name is required"),
  dob: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).default("male"),
  phone_number: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").or(z.literal("")),
  personal_email: z.string().email("Invalid personal email").min(1, "Personal email is required"),
  address: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_name: z.string().optional(),
  emergency_relationship: z.string().optional(),
  emergency_phone: z.string().regex(/^\d{10}$/, "Emergency phone must be exactly 10 digits").or(z.literal("")).optional(),
  profile_photo: z.string().optional(),
  documents: z.array(z.unknown()).optional(),

  // Professional Info (Step 2)
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Role/Designation is required"),
  roles: z.array(z.enum(ONBOARDING_ROLE_KEYS)).min(1, "At least one role is required").default(["HR"]),
  additional_roles: z.array(z.enum(ONBOARDING_ROLE_KEYS)).optional(),
  employment_type: z.enum(["full-time", "part-time", "contract", "intern"]).default("full-time"),
  salary: z.coerce.number().min(0, "Salary must be non-negative").default(0),
  experience: z.coerce.number().min(0, "Experience must be non-negative").default(0),
  joining_date: z.string(),
  location: z.enum(["office", "remote", "hybrid"]).default("office"),

  // Login & Access (Step 4)
  email: z.string().email("Invalid work email"),
  employee_id: z.string().min(4, "Employee ID is required"),
  status: z.enum(["Probation", "Confirmed", "Resigned", "Terminated", "Notice Period", "Inactive"]).default("Probation"),
  reporting_manager: z.string().optional(),
  branch_id: z.string().optional(),
  department_head: z.boolean().default(false),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  confirm_password: z.string().min(8, "Password must be at least 8 characters"),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirm_password) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords do not match",
      path: ["confirm_password"],
    });
  }
  
  // If branch_id is provided, it's valid. If not, the backend will strictly enforce it 
  // for BRANCH_MANAGER_ADMINISTRATIVE if the targetBranchId resolves to null.
});

export type OnboardFormData = z.infer<typeof onboardSchema>;
