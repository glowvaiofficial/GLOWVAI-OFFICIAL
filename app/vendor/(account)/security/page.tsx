"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { VendorShell } from "@/components/vendor-web/Shell";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { Field, TextInput } from "@/components/vendor-web/ui/Field";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Toast } from "@/components/vendor-web/ui/Toast";
import { vendorAuth } from "@/lib/vendor-web/firebase";
import { authCodeOf, authErrorMessage, changePasswordMessage } from "@/lib/vendor-web/firebaseErrors";
import { NETWORK_MESSAGE } from "@/lib/vendor-web/errors";
import { RESET_CONFIRMATION } from "@/lib/vendor-web/copy";
import { checkNewPassword } from "@/lib/vendor-web/validation";
import { signOutVendor, useVendorSession } from "@/lib/vendor-web/session";

export default function VendorSecurityPage() {
  const router = useRouter();
  const s = useVendorSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"password" | "reset" | "signout" | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (s.authPhase === "signed-out") router.replace("/vendor/sign-in");
  }, [s.authPhase, router]);

  const email = s.account?.email ?? s.user?.email ?? "";

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setFieldError(null);
    const user = vendorAuth().currentUser;
    if (!user || !user.email) {
      setError("Your session has ended. Please sign in again.");
      return;
    }
    if (!current) {
      setFieldError("Enter your current password.");
      return;
    }
    const checked = checkNewPassword(next);
    if (!checked.ok) {
      setFieldError(checked.error);
      return;
    }
    if (next === current) {
      setFieldError("Choose a password you have not used just now.");
      return;
    }
    if (confirm !== next) {
      setFieldError("The new passwords do not match.");
      return;
    }
    setBusy("password");
    try {
      // Re-enter the current password first, so a left-open screen cannot change it.
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, checked.value);
      setCurrent("");
      setNext("");
      setConfirm("");
      setToast("Password changed.");
    } catch (err) {
      setError(changePasswordMessage(authCodeOf(err)));
    } finally {
      setBusy(null);
    }
  }

  async function sendReset() {
    if (busy || !email) return;
    setBusy("reset");
    setError(null);
    try {
      await sendPasswordResetEmail(vendorAuth(), email);
      setResetSent(true);
    } catch (err) {
      const code = authCodeOf(err);
      if (code === "auth/network-request-failed") setError(NETWORK_MESSAGE);
      else if (code === "auth/too-many-requests") setError(authErrorMessage(code));
      else setResetSent(true); // Same confirmation as the reset page, by design.
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    if (busy) return;
    setBusy("signout");
    try {
      await signOutVendor();
      router.replace("/vendor/sign-in");
    } catch (err) {
      setError(authErrorMessage(authCodeOf(err)));
      setBusy(null);
    }
  }

  return (
    <VendorShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-[24px] font-semibold leading-tight">Security</h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">Signed in as {email || "your store account"}.</p>
        </header>

        {error ? <Notice>{error}</Notice> : null}

        <Card title="Change password" description="Enter your current password, then the new one.">
          <form onSubmit={changePassword} noValidate className="space-y-5">
            {fieldError ? <Notice>{fieldError}</Notice> : null}
            <Field id="currentPassword" label="Current password">
              <TextInput id="currentPassword" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={busy !== null} />
            </Field>
            <Field id="newPassword" label="New password" hint="At least 8 characters.">
              <TextInput id="newPassword" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} disabled={busy !== null} hint="At least 8 characters." />
            </Field>
            <Field id="confirmPassword" label="Confirm new password">
              <TextInput id="confirmPassword" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy !== null} />
            </Field>
            <Button type="submit" loading={busy === "password"} disabled={busy !== null && busy !== "password"}>
              Change password
            </Button>
          </form>
        </Card>

        <Card title="Reset by email" description="Forgot your current password? We will email a link to choose a new one.">
          {resetSent ? (
            <Notice tone="success">{RESET_CONFIRMATION}</Notice>
          ) : (
            <Button variant="secondary" onClick={sendReset} loading={busy === "reset"} disabled={busy !== null && busy !== "reset"}>
              Email me a reset link
            </Button>
          )}
        </Card>

        <Card title="Sign out" description="Signing out clears the store details and any unsent onboarding drafts from this browser.">
          <Button variant="danger" onClick={signOut} loading={busy === "signout"} disabled={busy !== null && busy !== "signout"}>
            Sign out
          </Button>
        </Card>
        {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
      </div>
    </VendorShell>
  );
}
