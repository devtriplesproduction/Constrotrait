"use client";

import React, { useState, useEffect } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { AllotmentCardPDF } from "@/components/pdf/AllotmentCardPDF";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface DownloadAllotmentButtonProps {
  testGroup: string;
  uid: string;
  assignments: any[];
  currentUserProfile?: any;
}

export function DownloadAllotmentButton({ testGroup, uid, assignments, currentUserProfile }: DownloadAllotmentButtonProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <Button variant="outline" size="sm" disabled className="text-orange-600 border-orange-200 bg-orange-50/50">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Preparing PDF...
      </Button>
    );
  }

  const data = {
    testGroup,
    uid,
    assignments,
    currentUser: currentUserProfile,
  };

  return (
    <PDFDownloadLink
      document={<AllotmentCardPDF data={data} />}
      fileName={`Allotment_${uid}_${testGroup.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading} className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:text-orange-700">
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download Allotment Form
        </Button>
      )}
    </PDFDownloadLink>
  );
}
