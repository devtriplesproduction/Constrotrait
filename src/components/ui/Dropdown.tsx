import React, { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { Select, SelectItem } from "./select";

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: React.ReactNode;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
  buttonClassName?: string;
  id?: string;
}

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Select an option",
      label,
      error,
      disabled,
      required,
      name,
      className,
      buttonClassName,
      id,
    },
    ref
  ) => {
    return (
      <div className={cn("w-full space-y-1.5", className)} ref={ref}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <Select
          id={id}
          value={value}
          onValueChange={(val) => {
            if (onChange) onChange(val);
          }}
          placeholder={placeholder}
          disabled={disabled}
          buttonClassName={cn(
            "h-10 text-sm",
            error && "border-error focus:ring-error",
            buttonClassName
          )}
        >
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </Select>
        
        {name && (
          <select
            name={name}
            value={value || ""}
            required={required}
            onChange={() => {}}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          >
            <option value=""></option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);

Dropdown.displayName = "Dropdown";
