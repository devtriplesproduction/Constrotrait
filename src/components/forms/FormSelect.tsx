"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { Dropdown } from "../ui/Dropdown";
import { cn } from "@/lib/utils/cn";

export interface FormSelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  options: FormSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  align?: "left" | "right";
  id?: string;
  onChange?: (value: string) => void;
}

export function FormSelect<T extends FieldValues>({
  name,
  control,
  options,
  placeholder = "Select an option",
  className,
  buttonClassName,
  disabled,
  id,
  onChange,
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Dropdown
          id={id}
          value={field.value}
          onChange={(val) => {
            field.onChange(val);
            if (onChange) onChange(val);
          }}
          placeholder={placeholder}
          className={className}
          buttonClassName={cn("glass-input", buttonClassName)}
          disabled={disabled || field.disabled}
          options={options}
        />
      )}
    />
  );
}
