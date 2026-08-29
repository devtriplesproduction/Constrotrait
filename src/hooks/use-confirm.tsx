import React, { useState, useCallback } from "react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{ title: string; description?: string; resolve: (value: boolean) => void } | null>(null);

  const confirm = useCallback((title: string, description?: string) => {
    return new Promise<boolean>((resolve) => {
      setConfig({ title, description, resolve });
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    if (config) {
      config.resolve(true);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    if (config) {
      config.resolve(false);
      setIsOpen(false);
    }
  };

  const ConfirmComponent = () => (
    <Modal isOpen={isOpen} onClose={handleCancel} className="max-w-md">
      <div className="text-left">
        <h3 className="text-lg font-semibold mb-2 text-slate-800">{config?.title}</h3>
        {config?.description && (
          <p className="text-sm text-slate-600 mb-6">{config.description}</p>
        )}
        {!config?.description && <div className="mb-6" />}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} className="rounded-xl">Cancel</Button>
          <Button onClick={handleConfirm} className="bg-orange-600 hover:bg-orange-700 rounded-xl text-white">Confirm</Button>
        </div>
      </div>
    </Modal>
  );

  return { confirm, ConfirmComponent };
}
