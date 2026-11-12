"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { VendorAuthFrame } from "@/components/vendor-web/Shell";
import { Button } from "@/components/vendor-web/ui/Button";
import { Field, TextInput } from "@/components/vendor-web/ui/Field";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { vendorAuth } from "@/lib/vendor-web/firebase";
import { authCodeOf, authErrorMessage } from "@/lib/vendor-web/firebaseErrors";
import { NETWORK_MESSAGE } from "@/lib/vendor-web/errors";
import { checkEmail } from "@/lib/vendor-web/validation";
import { RESET_CONFIRMATION } from "@/lib/vendor-web/copy";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const checked = checkEmail(email);
    if (!checked.ok) {
      setFieldError(checked.error);
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      await sendPasswordResetEmail(vendorAuth(), checked.value);
      setSent(true);
    } catch (err) {
      const code = authCodeOf(err);
      if (code === "auth/network-request-failed") setError(NETWORK_MESSAGE);
      else if (code === "auth/too-many-requests") setError(authErrorMessage(code));
      else setSent(true); // Unknown or "no such account": the same confirmation, by design.
    } finally {
      setBusy(false);
    }
  }

  return (
    <VendorAuthFrame title="Reset your password" subtitle="Enter the email you use for your store. We will send a link to choose a new password.">
      {sent ? (
        <div className="space-y-5">
          <Notice tone="success">{RESET_CONFIRMATION}</Notice>
          <p className="text-[14px] text-ink-muted">Check your inbox and spam folder. The link works for a limited time.</p>
          <Link href="/vendor/sign-in" className="inline-flex min-h-[44px] items-center font-semibold text-[#0057FB] underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {error ? <Notice>{error}</Notice> : null}
          <Field id="email" label="Store email" error={fieldError}>
            <TextInput
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={!!fieldError}
              error={fieldError}
              disabled={busy}
            />
          </Field>
          <Button type="submit" fullWidth loading={busy}>
            Send reset link
          </Button>
          <p className="text-[14px]">
            <Link href="/vendor/sign-in" className="font-semibold text-[#0057FB] underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </VendorAuthFrame>
  );
}
