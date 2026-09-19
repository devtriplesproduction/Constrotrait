"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { createTestSchema, CreateTestInput } from "@/lib/validations/test";
import { createTestMasterAction } from "@/actions/test.actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Trash2 } from "lucide-react";

const steps = [
  { id: "step1", title: "Classification & Subject" },
  { id: "step2", title: "Testing Methodology" },
  { id: "step3", title: "Additional Details" },
];

export function AddTestWizard({ onSuccess }: { onSuccess?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [details, setDetails] = useState<string[]>([""]);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<CreateTestInput>({
    resolver: zodResolver(createTestSchema),
    defaultValues: {
      additional_details: [],
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof CreateTestInput)[] = [];
    
    if (currentStep === 0) {
      fieldsToValidate = ["discipline_group", "material_product"];
    } else if (currentStep === 1) {
      fieldsToValidate = ["component_parameter", "test_method"];
    } else if (currentStep === 2) {
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

  const onSubmit = async (data: CreateTestInput) => {
    setIsSubmitting(true);
    try {
      // Filter out empty details
      const validDetails = details.filter(d => d.trim() !== "");
      data.additional_details = validDetails;

      const result = await createTestMasterAction(data);
      if (result.success) {
        toast({
          title: "Test Master Created",
          description: "The test has been successfully registered.",
        });
        onSuccess?.();
      } else {
        toast({
          variant: "error",
          title: "Error",
          description: result.error || "Failed to create test master",
        });
      }
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Error",
        description: error.message || "An unexpected error occurred",
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
    <Card className="w-full max-w-2xl mx-auto shadow-lg border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-zinc-100 flex items-center justify-between">
          <span>Add Test Master</span>
          <span className="text-sm font-normal text-zinc-400">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </span>
        </CardTitle>
        <div className="flex w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-4">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: `${((currentStep) / steps.length) * 100}%` }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </CardHeader>
      
      <CardContent className="min-h-[300px] mt-4 relative overflow-hidden">
        <form id="add-test-form" onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step1"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-zinc-300">Discipline / Group <span className="text-red-500">*</span></label>
                  <Input {...register("discipline_group")} placeholder="e.g. Mechanical, Chemical..." className="mt-1" />
                  {errors.discipline_group && <p className="text-red-500 text-xs mt-1">{errors.discipline_group.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">Materials or Products tested <span className="text-red-500">*</span></label>
                  <Input {...register("material_product")} placeholder="e.g. Cement, Soil..." className="mt-1" />
                  {errors.material_product && <p className="text-red-500 text-xs mt-1">{errors.material_product.message}</p>}
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
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-zinc-300">Component, parameter or characteristic tested <span className="text-red-500">*</span></label>
                  <Input {...register("component_parameter")} placeholder="e.g. Compressive Strength..." className="mt-1" />
                  {errors.component_parameter && <p className="text-red-500 text-xs mt-1">{errors.component_parameter.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">Test Method Specification & Techniques <span className="text-red-500">*</span></label>
                  <Input {...register("test_method")} placeholder="e.g. IS 516 / Compression Testing Machine" className="mt-1" />
                  {errors.test_method && <p className="text-red-500 text-xs mt-1">{errors.test_method.message}</p>}
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step3"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-300">Additional Details Required for Testing (Optional)</label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addDetail}
                    className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Detail
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {details.map((detail, index) => (
                    <div key={index} className="flex items-start gap-2 bg-zinc-900/50 p-2 rounded-md border border-zinc-800">
                      <div className="flex-1">
                        <Input 
                          value={detail}
                          onChange={(e) => updateDetail(index, e.target.value)}
                          placeholder={`Detail ${index + 1}`} 
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeDetail(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {details.length === 0 && (
                    <div className="text-center py-6 text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-md">
                      No additional details added. Click "Add Detail" to include more information.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t border-zinc-800 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 0 || isSubmitting}
          className="border-zinc-700 hover:bg-zinc-800"
        >
          Previous
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button type="button" onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
            Next
          </Button>
        ) : (
          <Button type="submit" form="add-test-form" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
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
