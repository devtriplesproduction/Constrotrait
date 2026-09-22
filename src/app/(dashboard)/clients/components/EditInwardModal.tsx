"use client";

import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database } from "@/types/database";
import { updateJobEntryTestAction } from "@/actions/job-entry.actions";
import { useToast } from "@/components/ui/toast";

type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

interface EditInwardModalProps {
  test: JobEntryTest;
  onClose: (updatedTest?: JobEntryTest) => void;
}

export default function EditInwardModal({ test, onClose }: EditInwardModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    material_description: test.material_description || "",
    test_method: test.test_method || "",
    grade: test.grade || "",
    date_of_casting: test.date_of_casting || "",
    date_of_receiving: test.date_of_receiving || "",
    date_of_testing: test.date_of_testing || "",
    sample_quantity: test.sample_quantity || "",
    testing_age: test.testing_age || "",
    testing_day: test.testing_day || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await updateJobEntryTestAction(test.id, formData);
      if (res.success && res.data) {
        toast({
          title: "Inward updated successfully",
          variant: "default",
        });
        onClose(res.data as JobEntryTest);
      } else {
        toast({
          title: "Error updating inward",
          description: res.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error updating inward",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background w-full max-w-3xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Inward</h3>
          <Button variant="ghost" size="icon" onClick={() => onClose()}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto">
          <form id="edit-inward-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-muted p-4 rounded-md">
              <label className="block text-sm font-medium mb-1">UID (Strictly Read-Only)</label>
              <Input
                value={test.uid}
                readOnly
                disabled
                className="bg-background font-mono text-primary font-bold"
              />
              <p className="text-xs text-muted-foreground mt-1">UID is immutable and generated upon creation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Material Description</label>
                <Input
                  name="material_description"
                  value={formData.material_description}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Test Method</label>
                <Input
                  name="test_method"
                  value={formData.test_method}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grade</label>
                <Input
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sample Quantity</label>
                <Input
                  name="sample_quantity"
                  value={formData.sample_quantity}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date of Casting</label>
                <Input
                  type="date"
                  name="date_of_casting"
                  value={formData.date_of_casting}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date of Receiving</label>
                <Input
                  type="date"
                  name="date_of_receiving"
                  value={formData.date_of_receiving}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date of Testing</label>
                <Input
                  type="date"
                  name="date_of_testing"
                  value={formData.date_of_testing}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Testing Age</label>
                <Input
                  name="testing_age"
                  value={formData.testing_age}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Testing Day</label>
                <Input
                  name="testing_day"
                  value={formData.testing_day}
                  onChange={handleChange}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t flex justify-end space-x-2 bg-muted/20">
          <Button variant="outline" onClick={() => onClose()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-inward-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
