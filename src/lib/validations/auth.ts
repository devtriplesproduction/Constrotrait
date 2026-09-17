import { z } from "zod";
import { ONBOARDING_ROLE_KEYS } from "@/config/roles";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const onboardSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(1, "Last name is required"),
  phone_number: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").or(z.literal("")),
  email: z.string().email("Invalid email address"),
  employee_id: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  joining_date: z.string().min(1, "Joining date is required"),
  roles: z.array(z.enum(ONBOARDING_ROLE_KEYS)).min(1, "At least one role is required"),
  status: z.enum(["active", "suspended"]),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

export type OnboardFormData = z.infer<typeof onboardSchema>;
