"use server";

import { submitLeave, approveLeave, rejectLeave, cancelApprovedLeave, verifyMedicalCertificate, deleteMedicalCertificate, rejectMedicalCertificate, getMedicalCertificateUrl, uploadMedicalCertificateForLeave, CreateLeaveInput } from "@/services/leave.service";
import { revalidatePath } from "next/cache";

export async function submitLeaveAction(input: CreateLeaveInput, medicalCertificate?: File) {
    const res = await submitLeave(input, medicalCertificate);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}

export async function approveLeaveAction(leaveId: string) {
    const res = await approveLeave(leaveId);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}

export async function rejectLeaveAction(leaveId: string, reason: string) {
    const res = await rejectLeave(leaveId, reason);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}

export async function cancelApprovedLeaveAction(leaveId: string) {
    const res = await cancelApprovedLeave(leaveId);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}

export async function uploadMedicalCertificateAction(leaveId: string, formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File)) return { success: false, error: "No file provided" };
    return uploadMedicalCertificateForLeave(leaveId, file);
}

export async function getMedicalCertificateUrlAction(leaveId: string) {
    const res = await getMedicalCertificateUrl(leaveId);
    return res;
}

export async function verifyMedicalCertificateAction(leaveId: string, certificateUrl?: string) {
    const res = await verifyMedicalCertificate(leaveId, certificateUrl);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}

export async function deleteMedicalCertificateAction(leaveId: string) {
    const res = await deleteMedicalCertificate(leaveId);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}

export async function rejectMedicalCertificateAction(leaveId: string) {
    const res = await rejectMedicalCertificate(leaveId);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}
