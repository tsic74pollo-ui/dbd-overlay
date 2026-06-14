import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "outline" | "ghost" | "danger";
type Size = "default" | "sm";

const variants: Record<Variant, string> = {
  default: "bg-orange-600 hover:bg-orange-500 text-white",
  outline:
    "bg-transparent border border-gray-600 hover:border-gray-400 hover:bg-gray-800 text-gray-100",
  ghost: "bg-transparent hover:bg-gray-800 text-gray-100",
  danger:
    "bg-transparent text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-transparent",
};
const sizes: Record<Size, string> = {
  default: "h-9 px-4 text-sm",
  sm: "h-7 px-2 text-xs",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
