import * as z from "zod";
import { APP_ROLE_KEYS } from "@/config/roles";

export const updateEmployeeProfileSchema = z.object({
  first_name: z.string().min(2, "First name is too short").optional(),
  last_name: z.string().min(1, "Last name is required").optional(),
  phone_number: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").or(z.literal("")).optional(),
  dob: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  employment_type: z.string().nullable().optional(),
  salary: z.coerce.number().min(0, "Salary must be non-negative").optional(),
  experience: z.coerce.number().min(0, "Experience must be non-negative").optional(),
  joining_date: z.string().nullable().optional(),
  status: z.string().optional(),
  profile_photo: z.string().nullable().optional().refine(val => !val || !val.startsWith("data:"), {
    message: "Profile photo must be a valid storage path, not base64"
  }),
  documents: z.array(z.object({
    id: z.string(),
    name: z.string(),
    size: z.number(),
    path: z.string(),
    uploaded_at: z.string(),
    type: z.string()
  })).optional(),
  personal_email: z.string().email("Invalid personal email").or(z.literal("")).nullable().optional(),
  residential_address: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_relation: z.string().nullable().optional(),
  emergency_contact_number: z.string().regex(/^\d{10}$/, "Emergency phone must be exactly 10 digits").or(z.literal("")).nullable().optional(),
  reporting_manager_id: z.string().nullable().optional(),
  branch_id: z.string().uuid().optional(),
  roles: z.array(z.enum(APP_ROLE_KEYS)).optional(),
}).strip();
