"use client";

import React, { forwardRef } from "react";
import { DeliveryChallan, DeliveryChallanItem } from "@/types/delivery-challan";
import { format } from "date-fns";

interface PrintableDeliveryChallanProps {
  challan: Partial<DeliveryChallan> & {
    items: DeliveryChallanItem[];
  };
}

export const PrintableDeliveryChallan = forwardRef<HTMLDivElement, PrintableDeliveryChallanProps>(
  ({ challan }, ref) => {
    const formattedDate = challan.challan_date
      ? format(new Date(challan.challan_date), "dd / MM / yyyy")
      : "__ / __ / ____";

    const receiverDate = challan.receiver_signature_date
      ? format(new Date(challan.receiver_signature_date), "dd / MM / yyyy")
      : formattedDate;

    const issuedDate = challan.issued_by_signature_date
      ? format(new Date(challan.issued_by_signature_date), "dd / MM / yyyy")
      : formattedDate;

    // Ensure at least 4 rows are rendered for exact paper template layout
    const items = challan.items || [];
    const minRows = 4;
    const totalRows = Math.max(minRows, items.length);
    const displayRows: (DeliveryChallanItem | null)[] = [];
    for (let i = 0; i < totalRows; i++) {
      displayRows.push(items[i] || null);
    }

    const purpose = challan.purpose_of_handover || "";
    const isCustomerHandover = purpose === "Customer Material Handover";
    const isTesting = purpose === "Material Taken for Testing";
    const isCollectedFromLab = purpose === "Material Collected from Lab";
    const isOther = purpose === "Other" || (!isCustomerHandover && !isTesting && !isCollectedFromLab && !!purpose);

    return (
      <div
        ref={ref}
        className="w-full max-w-[800px] mx-auto bg-white text-black p-6 sm:p-8 font-sans text-[13px] leading-relaxed print:p-0 print:max-w-none print:text-[12px]"
        style={{ color: "#000000" }}
      >
        {/* Top Logo Box */}
        <div className="flex justify-center mb-3">
          <div className="border border-black px-6 py-2 flex items-center justify-center max-w-[420px] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/CMTS LOGO.png"
              alt="CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>

        {/* Header Headings */}
        <div className="text-center mb-5">
          <h1 className="text-[17px] font-black uppercase tracking-wide text-black mb-0.5">
            CONSTROTRAIT MATERIAL TESTING & SERVICES LLP
          </h1>
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-black">
            DELIVERY CHALLAN
          </h2>
        </div>

        {/* Challan No & Date */}
        <div className="mb-4 space-y-1">
          <div className="flex items-center">
            <span className="font-bold w-24">Challan No.:</span>
            <span className="border-b border-black flex-1 max-w-[240px] pl-2 font-medium">
              {challan.challan_no || "_____________________"}
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-bold w-24">Date:</span>
            <span className="border-b border-black flex-1 max-w-[240px] pl-2 font-medium">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* 1. Material Details */}
        <div className="mb-5">
          <h3 className="font-bold text-[14px] text-black mb-2">1. Material Details</h3>
          <div className="space-y-1.5 pl-1">
            <div className="flex items-baseline">
              <span className="w-56 font-normal shrink-0">Customer Name:</span>
              <span className="border-b border-black flex-1 pb-0.5 font-medium pl-1 min-h-[22px]">
                {challan.customer_name || ""}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-56 font-normal shrink-0">Project / Site Name:</span>
              <span className="border-b border-black flex-1 pb-0.5 font-medium pl-1 min-h-[22px]">
                {challan.project_site_name || ""}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-56 font-normal shrink-0">Material Taken By (Person&apos;s Name):</span>
              <span className="border-b border-black flex-1 pb-0.5 font-medium pl-1 min-h-[22px]">
                {challan.material_taken_by || ""}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-56 font-normal shrink-0">Company / Agency Name:</span>
              <span className="border-b border-black flex-1 pb-0.5 font-medium pl-1 min-h-[22px]">
                {challan.company_agency_name || ""}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-56 font-normal shrink-0">Mobile No.:</span>
              <span className="border-b border-black flex-1 pb-0.5 font-medium pl-1 min-h-[22px]">
                {challan.mobile_no || ""}
              </span>
            </div>
          </div>
        </div>

        {/* Materials Table */}
        <div className="mb-5 overflow-hidden">
          <table className="w-full border-collapse border border-black text-left text-[12px]">
            <thead>
              <tr className="border-b border-black bg-gray-50/50">
                <th className="border-r border-black py-1.5 px-2 text-center font-bold w-14">
                  Sr. No.
                </th>
                <th className="border-r border-black py-1.5 px-3 font-bold">
                  Material Description
                </th>
                <th className="border-r border-black py-1.5 px-3 text-center font-bold w-24">
                  Quantity
                </th>
                <th className="py-1.5 px-3 font-bold w-48">
                  Identification / Remarks
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((item, idx) => (
                <tr key={idx} className="border-b border-black last:border-b-0 min-h-[28px]">
                  <td className="border-r border-black py-1.5 px-2 text-center font-medium">
                    {idx + 1}
                  </td>
                  <td className="border-r border-black py-1.5 px-3 font-medium">
                    {item ? item.material_description : "\u00A0"}
                  </td>
                  <td className="border-r border-black py-1.5 px-3 text-center font-medium">
                    {item ? item.quantity : "\u00A0"}
                  </td>
                  <td className="py-1.5 px-3 font-medium">
                    {item ? item.remarks : "\u00A0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. Purpose of Handover */}
        <div className="mb-5">
          <h3 className="font-bold text-[14px] text-black mb-2">2. Purpose of Handover</h3>
          <div className="space-y-1.5 pl-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border border-black text-center leading-3 font-bold text-[11px]">
                {isCustomerHandover ? "✓" : ""}
              </span>
              <span>Customer Material Handover</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border border-black text-center leading-3 font-bold text-[11px]">
                {isTesting ? "✓" : ""}
              </span>
              <span>Material Taken for Testing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border border-black text-center leading-3 font-bold text-[11px]">
                {isCollectedFromLab ? "✓" : ""}
              </span>
              <span>Material Collected from Lab</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border border-black text-center leading-3 font-bold text-[11px]">
                {isOther ? "✓" : ""}
              </span>
              <span className="shrink-0">Other:</span>
              <span className="border-b border-black flex-1 pl-2 font-medium">
                {isOther ? (challan.purpose_other || challan.purpose_of_handover) : ""}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Declaration by Receiver */}
        <div className="mb-5">
          <h3 className="font-bold text-[14px] text-black mb-2">3. Declaration by Receiver</h3>
          <p className="text-[12.5px] leading-relaxed mb-3 text-justify">
            I hereby acknowledge that I have received the above-mentioned material from Constrotrait Material Testing &amp; Services LLP in the stated quantity and condition.
          </p>
          <div className="space-y-2 pl-1">
            <div className="flex items-baseline">
              <span className="w-32 font-normal shrink-0">Receiver&apos;s Name:</span>
              <span className="border-b border-black flex-1 pb-0.5 font-medium pl-1">
                {challan.receiver_name || ""}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline flex-1">
                <span className="w-24 font-normal shrink-0">Signature:</span>
                <span className="border-b border-black w-48 inline-block"></span>
              </div>
              <div className="flex items-baseline">
                <span className="w-14 font-normal shrink-0">Date:</span>
                <span className="border-b border-black w-36 inline-block pl-1 font-medium">
                  {receiverDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Authorized by Lab */}
        <div className="mb-5">
          <h3 className="font-bold text-[14px] text-black mb-2">4. Authorized by Lab</h3>
          <div className="space-y-2 pl-1">
            <div className="flex items-baseline">
              <span className="w-36 font-normal shrink-0">Issued By (Name):</span>
              <span className="border-b border-black flex-1 pb-0.5 font-medium pl-1">
                {challan.issued_by_name || ""}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline flex-1">
                <span className="w-24 font-normal shrink-0">Signature:</span>
                <span className="border-b border-black w-48 inline-block"></span>
              </div>
              <div className="flex items-baseline">
                <span className="w-14 font-normal shrink-0">Date:</span>
                <span className="border-b border-black w-36 inline-block pl-1 font-medium">
                  {issuedDate}
                </span>
              </div>
            </div>

            <div className="flex items-baseline pt-1">
              <span className="w-36 font-normal shrink-0">Verified By:</span>
              <span className="border-b border-black flex-1 pb-0.5 font-medium pl-1">
                {challan.verified_by_name || ""}
              </span>
            </div>
            <div className="flex items-baseline pt-1">
              <span className="w-24 font-normal shrink-0">Signature:</span>
              <span className="border-b border-black w-48 inline-block"></span>
            </div>
          </div>
        </div>

        {/* Note & Bottom Footer */}
        <div className="mt-6 pt-2 border-t border-dashed border-gray-300">
          <p className="text-[11.5px] font-normal leading-relaxed mb-3">
            <strong className="font-bold">Note:</strong> This challan is proof of material handover and must be maintained in the lab records.
          </p>
          <p className="text-center font-bold text-[12px] uppercase tracking-wider text-gray-800">
            Office Copy / Record Copy
          </p>
        </div>
      </div>
    );
  }
);

PrintableDeliveryChallan.displayName = "PrintableDeliveryChallan";
