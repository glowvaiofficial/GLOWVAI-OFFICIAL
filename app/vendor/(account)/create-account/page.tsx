"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { VendorAuthFrame } from "@/components/vendor-web/Shell";
import { Button } from "@/components/vendor-web/ui/Button";
import { Field, TextInput } from "@/components/vendor-web/ui/Field";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { authCodeOf, authErrorMessage } from "@/lib/vendor-web/firebaseErrors";
import { vendorAuth } from "@/lib/vendor-web/firebase";
import { NETWORK_MESSAGE } from "@/lib/vendor-web/errors";
import { checkEmail, checkNewPassword } from "@/lib/vendor-web/validation";
import { useVendorSession } from "@/lib/vendor-web/session";

type FieldKey = "email" | "password" | "confirm";

export default function CreateAccountPage() {
  const router = useRouter();
  const s = useVendorSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (s.authPhase === "signed-in") router.replace("/vendor");
  }, [s.authPhase, router]);

  function validate(): { email: string; password: string } | null {
    const errs: Partial<Record<FieldKey, string>> = {};
    const e = checkEmail(email);
    if (!e.ok) errs.email = e.error;
    const p = checkNewPassword(password);
    if (!p.ok) errs.password = p.error;
    if (p.ok && confirm !== password) errs.confirm = "The passwords do not match.";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0 || !e.ok || !p.ok) return null;
    return { email: e.value, password: p.value };
  }

  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (busy) return;
    setError(null);
    const ok = validate();
    if (!ok) return;
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(vendorAuth(), ok.email, ok.password);
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // The account exists. The verify screen offers a resend, so the flow can continue.
      }
      router.replace("/vendor/verify-email");
    } catch (err) {
      const code = authCodeOf(err);
      setError(code === "auth/network-request-failed" ? NETWORK_MESSAGE : authErrorMessage(code));
      setBusy(false);
    }
  }

  return (
    <VendorAuthFrame title="Create your store account" subtitle="You will confirm your email next. Then you can tell us about your store.">
      <form onSubmit={submit} noValidate className="space-y-5">
        {error ? <Notice>{error}</Notice> : null}
        <Field id="email" label="Store email" hint="We send the verification link here. Use an inbox you check often." error={fieldErrors.email ?? null}>
          <TextInput
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!fieldErrors.email}
            error={fieldErrors.email ?? null}
            hint="We send the verification link here. Use an inbox you check often."
            disabled={busy}
          />
        </Field>
        <Field id="password" label="Password" hint="At least 8 characters." error={fieldErrors.password ?? null}>
          <TextInput
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!fieldErrors.password}
            error={fieldErrors.password ?? null}
            hint="At least 8 characters."
            disabled={busy}
          />
        </Field>
        <Field id="confirm" label="Confirm password" error={fieldErrors.confirm ?? null}>
          <TextInput
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            invalid={!!fieldErrors.confirm}
            error={fieldErrors.confirm ?? null}
            disabled={busy}
          />
        </Field>
        <Button type="submit" fullWidth loading={busy}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-[14px] text-ink-muted">
        Already have an account?{" "}
        <Link href="/vendor/sign-in" className="font-semibold text-[#0057FB] underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </VendorAuthFrame>
  );
}
