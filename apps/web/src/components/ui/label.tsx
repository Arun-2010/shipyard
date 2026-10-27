import type { ComponentProps, JSX } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">): JSX.Element {
  return <label className={cn("text-sm font-medium leading-none", className)} {...props} />;
}
