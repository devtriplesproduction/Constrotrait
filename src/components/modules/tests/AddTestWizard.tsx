"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { createTestSchema, CreateTestInput } from "@/lib/validations/test";
import { createTestMasterAction, updateTestMasterAction } from "@/actions/test.actions";
import { TestMaster } from "@/services/test.service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectItem } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const steps = [
  { id: "step1", title: "Test Details" },
  { id: "step2", title: "Additional Details" },
];

export function AddTestWizard({
  onSuccess,
  initialData
}: {
  onSuccess?: () => void,
  initialData?: TestMaster
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [details, setDetails] = useState<string[]>(
    initialData?.additional_details && initialData.additional_details.length > 0
      ? initialData.additional_details
      : [""]
  );

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTestInput>({
    resolver: zodResolver(createTestSchema),
    defaultValues: {
      additional_details: initialData?.additional_details || [],
      category: initialData?.category || "Construction",
      discipline_group: initialData?.discipline_group || "",
      material_product: initialData?.material_product || "",
      component_parameter: initialData?.component_parameter || "",
      test_method: initialData?.test_method || "",
    },
  });

  const category = watch("category");

  const [submitEnabled, setSubmitEnabled] = useState(false);

  useEffect(() => {
    if (currentStep === steps.length - 1) {
      setSubmitEnabled(false);
      const timer = setTimeout(() => setSubmitEnabled(true), 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof CreateTestInput)[] = [];

    if (currentStep === 0) {
      fieldsToValidate = ["category", "discipline_group", "material_product", "component_parameter", "test_method"];
    } else if (currentStep === 1) {
      fieldsToValidate = ["additional_details"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault(); // Completely prevent Enter key from submitting in inputs
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === steps.length - 1 && submitEnabled) {
      handleSubmit(onSubmit)(e);
    }
  };

  const onSubmit = async (data: CreateTestInput) => {
    setIsSubmitting(true);
    try {
      // Filter out empty details
      const validDetails = details.filter(d => d.trim() !== "");
      data.additional_details = validDetails;

      let result;
      if (initialData) {
        result = await updateTestMasterAction(initialData.id, data);
      } else {
        result = await createTestMasterAction(data);
      }

      if (result.success) {
        toast({
          title: `Test Master ${initialData ? "Updated" : "Created"}`,
          description: `The test has been successfully ${initialData ? "updated" : "registered"}.`,
        });
        onSuccess?.();
      } else {
        toast({
          variant: "error",
          title: "Error",
          description: result.error || `Failed to ${initialData ? "update" : "create"} test master`,
        });
      }
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "error",
        title: "Error",
        description: err.message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDetail = (index: number, value: string) => {
    const newDetails = [...details];
    newDetails[index] = value;
    setDetails(newDetails);
    setValue("additional_details", newDetails.filter(d => d.trim() !== ""));
  };

  const addDetail = () => {
    setDetails([...details, ""]);
  };

  const removeDetail = (index: number) => {
    const newDetails = details.filter((_, i) => i !== index);
    setDetails(newDetails);
    setValue("additional_details", newDetails.filter(d => d.trim() !== ""));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl border border-slate-200 bg-white rounded-2xl overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
          <span>{initialData ? "Edit" : "Add"} Test Master</span>
          <span className="text-sm font-medium text-slate-500">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </span>
        </CardTitle>
        <div className="flex w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
          <motion.div
            className="h-full bg-orange-500"
            initial={{ width: `${((currentStep) / steps.length) * 100}%` }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </CardHeader>

      <CardContent className="min-h-[300px] mt-4 relative overflow-hidden">
        <form id="add-test-form" onSubmit={handleFormSubmit} onKeyDown={handleKeyDown}>
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step1"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 px-2 md:px-2"
              >
                <div className="flex flex-col justify-end gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Category <span className="text-red-500">*</span></label>
                  <Select
                    value={category || "Construction"}
                    onValueChange={(val) => setValue("category", val as "Construction" | "Environmental")}
                  >
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="Environmental">Environmental</SelectItem>
                  </Select>
                  {errors.category && <p className="text-red-500 text-xs">{errors.category.message}</p>}
                </div>

                <div className="flex flex-col justify-end gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 leading-tight">Discipline / Group <span className="text-red-500">*</span></label>
                  <Input {...register("discipline_group")} placeholder="e.g. Mechanical, Chemical..." />
                  {errors.discipline_group && <p className="text-red-500 text-xs">{errors.discipline_group.message}</p>}
                </div>

                <div className="flex flex-col justify-end gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 leading-tight">Materials or Products tested <span className="text-red-500">*</span></label>
                  <Input {...register("material_product")} placeholder="e.g. Cement, Soil..." />
                  {errors.material_product && <p className="text-red-500 text-xs">{errors.material_product.message}</p>}
                </div>

                <div className="flex flex-col justify-end gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 leading-tight">Component, parameter or characteristic tested <span className="text-red-500">*</span></label>
                  <Input {...register("component_parameter")} placeholder="e.g. Compressive Strength..." />
                  {errors.component_parameter && <p className="text-red-500 text-xs">{errors.component_parameter.message}</p>}
                </div>

                <div className="flex flex-col justify-end gap-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 leading-tight">Test Method Specification & Techniques <span className="text-red-500">*</span></label>
                  <Input {...register("test_method")} placeholder="e.g. IS 516 / Compression Testing Machine" />
                  {errors.test_method && <p className="text-red-500 text-xs">{errors.test_method.message}</p>}
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step2"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 px-4 md:px-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Additional Details Required for Testing (Optional)</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDetail}
                    className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Detail
                  </Button>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {details.map((detail, index) => (
                    <div key={index} className="flex items-start gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex-1">
                        <Input
                          value={detail}
                          onChange={(e) => updateDetail(index, e.target.value)}
                          placeholder={`Detail ${index + 1}`}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDetail(index)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {details.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      No additional details added. Click &quot;Add Detail&quot; to include more information.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </CardContent>

      <CardFooter className="flex justify-between border-t border-slate-100 bg-slate-50 p-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 0 || isSubmitting}
          className="border-slate-200 hover:bg-slate-100 text-slate-700 font-medium px-6"
        >
          Previous
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button type="button" onClick={handleNext} className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-8 shadow-sm">
            Next
          </Button>
        ) : (
          <Button type="submit" form="add-test-form" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-8 shadow-sm">
            {isSubmitting ? (
              <>
                <Spinner className="mr-2" /> Submitting...
              </>
            ) : (
              "Submit Test"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
