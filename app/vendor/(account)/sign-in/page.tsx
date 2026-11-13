"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { VendorAuthFrame } from "@/components/vendor-web/Shell";
import { Button } from "@/components/vendor-web/ui/Button";
import { Field, TextInput } from "@/components/vendor-web/ui/Field";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { authCodeOf, authErrorMessage } from "@/lib/vendor-web/firebaseErrors";
import { vendorAuth } from "@/lib/vendor-web/firebase";
import { checkEmail } from "@/lib/vendor-web/validation";
import { useVendorSession } from "@/lib/vendor-web/session";

export default function VendorSignInPage() {
  const router = useRouter();
  const s = useVendorSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (s.authPhase === "signed-in") router.replace("/vendor");
  }, [s.authPhase, router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const checked = checkEmail(email);
    if (!checked.ok) {
      setFieldError({ field: "email", message: checked.error });
      return;
    }
    if (!password) {
      setFieldError({ field: "password", message: "Enter your password." });
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(vendorAuth(), checked.value, password);
      router.replace("/vendor");
    } catch (err) {
      setError(authErrorMessage(authCodeOf(err)));
      setBusy(false);
    }
  }

  return (
    <VendorAuthFrame title="Sign in to your store" subtitle="Use the email and password you created for your GlowVai store.">
      <form onSubmit={submit} noValidate className="space-y-5">
        {error ? <Notice>{error}</Notice> : null}
        <Field id="email" label="Email" error={fieldError?.field === "email" ? fieldError.message : null}>
          <TextInput
            id="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={fieldError?.field === "email"}
            error={fieldError?.field === "email" ? fieldError.message : null}
            disabled={busy}
          />
        </Field>
        <Field id="password" label="Password" error={fieldError?.field === "password" ? fieldError.message : null}>
          <TextInput
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={fieldError?.field === "password"}
            error={fieldError?.field === "password" ? fieldError.message : null}
            disabled={busy}
          />
        </Field>
        <Button type="submit" fullWidth loading={busy}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 space-y-2 text-[14px]">
        <p>
          <Link href="/vendor/forgot-password" className="gv-link-inline font-semibold text-[#0057FB] underline underline-offset-2">
            Forgot password?
          </Link>
        </p>
        <p className="text-ink-muted">
          New to GlowVai?{" "}
          <Link href="/vendor/create-account" className="gv-link-inline font-semibold text-[#0057FB] underline underline-offset-2">
            Create a store account
          </Link>
        </p>
        <p className="pt-2 text-[13px] text-ink-muted">Phone sign-in is not available yet. Use your email and password.</p>
      </div>
    </VendorAuthFrame>
  );
}
