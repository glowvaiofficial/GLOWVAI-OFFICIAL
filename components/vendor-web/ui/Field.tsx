import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const CONTROL =
  "min-h-[44px] w-full rounded-xl border bg-white px-3.5 py-2.5 text-[16px] text-ink placeholder:text-ink-light focus:outline-none focus:ring-2 focus:ring-[#0057FB]/40 disabled:bg-[#F6F7F9] disabled:text-ink-muted";

const border = (invalid?: boolean) => (invalid ? "border-[#B42318]" : "border-black/15");

/** A labelled form row. The error (or hint) sits under the control and is linked to it for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  optional,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-semibold text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-ink-muted">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] leading-snug text-[#B42318]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] leading-snug text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string | null, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextInput({ id, invalid, hint, error, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { id: string; invalid?: boolean; hint?: string; error?: string | null }) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={`${CONTROL} ${border(invalid)} ${className}`.trim()}
      {...rest}
    />
  );
}

export function SelectInput({ id, invalid, hint, error, className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { id: string; invalid?: boolean; hint?: string; error?: string | null }) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={`${CONTROL} ${border(invalid)} ${className}`.trim()}
      {...rest}
    >
      {children}
    </select>
  );
}

export function TextArea({ id, invalid, hint, error, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; invalid?: boolean; hint?: string; error?: string | null }) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={`${CONTROL} ${border(invalid)} min-h-[110px] ${className}`.trim()}
      {...rest}
    />
  );
}

/** A checkbox row with a large touch target. */
export function Checkbox({ id, label, checked, onChange, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] text-ink">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded border-black/30 accent-[#0057FB]"
      />
      <span>{label}</span>
    </label>
  );
}
