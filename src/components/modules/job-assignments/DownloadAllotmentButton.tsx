"use client";

import React, { useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer";
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
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <Button variant="outline" size="sm" disabled className="w-6 h-6 p-0 text-orange-600 border-orange-200 bg-orange-50/50">
        <Loader2 className="w-3 h-3 animate-spin" />
      </Button>
    );
  }

  const data = {
    testGroup,
    uid,
    assignments,
    currentUser: currentUserProfile,
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await pdf(<AllotmentCardPDF data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Allotment_${uid}_${testGroup.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      disabled={isGenerating} 
      onClick={handleDownload}
      className="w-6 h-6 p-0 text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:text-orange-700"
    >
      {isGenerating ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Download className="w-3 h-3" />
      )}
    </Button>
  );
}
