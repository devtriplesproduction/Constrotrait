import React, { useState, useCallback } from "react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function usePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{ title: string; resolve: (value: string | null) => void } | null>(null);
  const [value, setValue] = useState("");

  const prompt = useCallback((title: string) => {
    return new Promise<string | null>((resolve) => {
      setConfig({ title, resolve });
      setValue("");
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    if (config) {
      config.resolve(value);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    if (config) {
      config.resolve(null);
      setIsOpen(false);
    }
  };

  const PromptComponent = () => (
    <Modal isOpen={isOpen} onClose={handleCancel} className="max-w-md">
      <div className="text-left">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">{config?.title}</h3>
        <Input 
          value={value} 
          onChange={(e) => setValue(e.target.value)}
          className="mb-6 w-full"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} className="rounded-xl">Cancel</Button>
          <Button onClick={handleConfirm} className="bg-orange-600 hover:bg-orange-700 rounded-xl text-white">OK</Button>
        </div>
      </div>
    </Modal>
  );

  return { prompt, PromptComponent };
}
