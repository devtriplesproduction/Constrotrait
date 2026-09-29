"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BranchFormModal } from "./BranchFormModal";

export function AddBranchButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg transition-all hover:scale-105"
      >
        <Plus className="w-5 h-5" />
        Add Branch
      </Button>

      {showModal && <BranchFormModal onClose={() => setShowModal(false)} />}
    </>
  );
}
