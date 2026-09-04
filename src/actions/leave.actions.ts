"use server";

import { submitLeave, approveLeaveFirstLevel, approveLeaveHR, rejectLeave, cancelApprovedLeave, verifyMedicalCertificate, CreateLeaveInput } from "@/services/leave.service";
import { revalidatePath } from "next/cache";

export async function submitLeaveAction(input: CreateLeaveInput) {
    const res = await submitLeave(input);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}

export async function approveLeaveFirstLevelAction(leaveId: string) {
    const res = await approveLeaveFirstLevel(leaveId);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}

export async function approveLeaveHRAction(leaveId: string) {
    const res = await approveLeaveHR(leaveId);
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

export async function verifyMedicalCertificateAction(leaveId: string, certificateUrl?: string) {
    const res = await verifyMedicalCertificate(leaveId, certificateUrl);
    if (res.success) {
        revalidatePath("/leave");
    }
    return res;
}
