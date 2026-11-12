import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057FB] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[#0057FB] text-white hover:bg-[#0047D1]",
  secondary: "border border-[#0057FB]/30 bg-white text-[#0057FB] hover:bg-[#EAF2FF]",
  ghost: "text-[#0057FB] hover:bg-[#EAF2FF]",
  danger: "bg-[#B42318] text-white hover:bg-[#912018]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows a spinner and blocks a second press while a request is in flight. */
  loading?: boolean;
  fullWidth?: boolean;
}

/** Touch target is at least 44px high. `loading` disables the button, so a request cannot be sent twice. */
export function Button({ variant = "primary", loading = false, fullWidth = false, disabled, className = "", children, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${fullWidth ? "w-full" : ""} ${className}`.trim()}
      {...rest}
    >
      {loading ? <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      <span>{children}</span>
    </button>
  );
}
