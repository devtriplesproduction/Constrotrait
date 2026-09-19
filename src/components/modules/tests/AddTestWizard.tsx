"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { createTestSchema, CreateTestInput } from "@/lib/validations/test";
import { testService } from "@/services/test.service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect } from "@/components/forms/FormSelect";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming Checkbox exists, or fallback to input type="checkbox"

const steps = [
  { id: "step1", title: "Basic Classification" },
  { id: "step2", title: "Test Subject" },
  { id: "step3", title: "Methodology" },
];

export function AddTestWizard({ onSuccess }: { onSuccess?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    trigger,
    formState: { errors },
  } = useForm<CreateTestInput>({
    resolver: zodResolver(createTestSchema),
    defaultValues: {
      is_nabl: true,
      category: "Construction",
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof CreateTestInput)[] = [];
    
    if (currentStep === 0) {
      fieldsToValidate = ["category", "discipline_group"];
    } else if (currentStep === 1) {
      fieldsToValidate = ["serial_no", "material_product", "component_parameter"];
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
      await testService.createTestMaster(data);
      toast({
        title: "Test Master Created",
        description: "The test has been successfully registered.",
      });
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Error",
        description: error.message || "Failed to create test master",
      });
    } finally {
      setIsSubmitting(false);
    }
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
                  <label className="text-sm font-medium text-zinc-300">Category</label>
                  <FormSelect
                    control={control}
                    name="category"
                    options={[
                      { label: "Construction", value: "Construction" },
                      { label: "Environmental", value: "Environmental" },
                    ]}
                  />
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">Discipline / Group</label>
                  <Input {...register("discipline_group")} placeholder="e.g. Mechanical, Chemical..." className="mt-1" />
                  {errors.discipline_group && <p className="text-red-500 text-xs mt-1">{errors.discipline_group.message}</p>}
                </div>

                <div className="flex items-center space-x-2 mt-6">
                  <input
                    type="checkbox"
                    id="is_nabl"
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                    {...register("is_nabl")}
                  />
                  <label htmlFor="is_nabl" className="text-sm font-medium text-zinc-300 cursor-pointer">
                    Is NABL Accredited?
                  </label>
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
                  <label className="text-sm font-medium text-zinc-300">S.No</label>
                  <Input {...register("serial_no")} placeholder="Enter S.No" className="mt-1" />
                  {errors.serial_no && <p className="text-red-500 text-xs mt-1">{errors.serial_no.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">Materials or Products Tested</label>
                  <Input {...register("material_product")} placeholder="e.g. Cement, Soil..." className="mt-1" />
                  {errors.material_product && <p className="text-red-500 text-xs mt-1">{errors.material_product.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">Component / Parameter Tested</label>
                  <Input {...register("component_parameter")} placeholder="e.g. Compressive Strength..." className="mt-1" />
                  {errors.component_parameter && <p className="text-red-500 text-xs mt-1">{errors.component_parameter.message}</p>}
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
                <div>
                  <label className="text-sm font-medium text-zinc-300">Specific Test Performed</label>
                  <Input {...register("specific_test")} placeholder="Type of test performed" className="mt-1" />
                  {errors.specific_test && <p className="text-red-500 text-xs mt-1">{errors.specific_test.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">Test Method Specification</label>
                  <Input {...register("test_method")} placeholder="e.g. IS 516" className="mt-1" />
                  {errors.test_method && <p className="text-red-500 text-xs mt-1">{errors.test_method.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300">Technique / Equipment used</label>
                  <Input {...register("technique_equipment")} placeholder="e.g. Compression Testing Machine" className="mt-1" />
                  {errors.technique_equipment && <p className="text-red-500 text-xs mt-1">{errors.technique_equipment.message}</p>}
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
