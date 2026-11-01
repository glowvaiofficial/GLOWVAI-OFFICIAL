import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "brand" | "outline" | "ghost" | "dark";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-brand active:translate-y-px disabled:opacity-50 disabled:pointer-events-none rounded-[10px] cursor-pointer border-[1.5px] border-transparent whitespace-nowrap";

    const variants = {
      primary: "bg-brand text-white hover:bg-brand-dark",
      brand: "bg-brand text-white hover:bg-brand-dark",
      dark: "bg-ink text-white hover:bg-brand",
      secondary: "bg-white text-ink border-ink/20 hover:border-ink",
      outline: "bg-white text-ink border-ink/20 hover:border-ink",
      ghost: "text-brand hover:underline px-3",
    };

    const sizes = {
      sm: "text-[0.9375rem] px-5 gap-2 min-h-[44px]",
      md: "text-[1.0625rem] px-7 gap-2.5 min-h-[52px]",
      lg: "text-lg px-9 gap-2.5 min-h-[60px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center space-x-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Processing...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
