import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  "aria-label"?: string;
}

/** Minimal controlled checkbox (no external dependency). */
export function Checkbox({
  checked,
  onCheckedChange,
  id,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:border-primary/50",
      )}
      {...props}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}