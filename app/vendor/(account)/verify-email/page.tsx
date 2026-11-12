"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { VendorAuthFrame } from "@/components/vendor-web/Shell";
import { Button } from "@/components/vendor-web/ui/Button";
import { Notice, type NoticeTone } from "@/components/vendor-web/ui/Notice";
import { vendorAuth } from "@/lib/vendor-web/firebase";
import { authCodeOf, authErrorMessage } from "@/lib/vendor-web/firebaseErrors";
import { NETWORK_MESSAGE, messageForError } from "@/lib/vendor-web/errors";
import { signOutVendor, useVendorSession } from "@/lib/vendor-web/session";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const router = useRouter();
  const s = useVendorSession();
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<"resend" | "check" | "signout" | null>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);

  useEffect(() => {
    if (s.authPhase === "signed-out") router.replace("/vendor/sign-in");
  }, [s.authPhase, router]);

  useEffect(() => {
    if (s.account?.emailVerified) router.replace("/vendor");
  }, [s.account?.emailVerified, router]);

  // The countdown only ticks while the cooldown is running. Nothing polls the server.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const email = s.user?.email ?? s.account?.email ?? "";

  async function resend() {
    const user = vendorAuth().currentUser;
    if (!user || busy || secondsLeft > 0) return;
    setBusy("resend");
    setNotice(null);
    setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    setNow(Date.now());
    try {
      await sendEmailVerification(user);
      setNotice({ tone: "success", text: `We sent a new verification link to ${email}.` });
    } catch (err) {
      const code = authCodeOf(err);
      setNotice({ tone: "error", text: code === "auth/network-request-failed" ? NETWORK_MESSAGE : authErrorMessage(code) });
    } finally {
      setBusy(null);
    }
  }

  async function checkVerified() {
    const user = vendorAuth().currentUser;
    if (!user || busy) return;
    setBusy("check");
    setNotice(null);
    try {
      // Reload the account, then refresh the token and the store record so the new email status is seen everywhere.
      await user.reload();
      await s.refresh();
      if (user.emailVerified) {
        router.replace("/vendor");
        return;
      }
      setNotice({ tone: "warning", text: "Not verified yet. Open the link in the email, then press this button again." });
    } catch (err) {
      setNotice({ tone: "error", text: messageForError(err) });
    } finally {
      setBusy(null);
    }
  }

  async function useAnotherAccount() {
    if (busy) return;
    setBusy("signout");
    try {
      await signOutVendor();
      router.replace("/vendor/sign-in");
    } catch (err) {
      setNotice({ tone: "error", text: messageForError(err) });
      setBusy(null);
    }
  }

  return (
    <VendorAuthFrame title="Confirm your email" subtitle={email ? `We sent a verification link to ${email}.` : "We sent a verification link to your store email."}>
      <div className="space-y-5">
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Open the email and tap the link. Then come back here and press <span className="font-semibold text-ink">I&apos;ve verified</span>. Check your spam folder if you cannot see it.
        </p>
        <Button fullWidth onClick={checkVerified} loading={busy === "check"} disabled={busy !== null && busy !== "check"}>
          I&apos;ve verified my email
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={resend}
          loading={busy === "resend"}
          disabled={busy !== null && busy !== "resend" || secondsLeft > 0}
        >
          {secondsLeft > 0 ? `Resend email in ${secondsLeft}s` : "Resend verification email"}
        </Button>
        <div className="pt-2 text-center">
          <Button variant="ghost" onClick={useAnotherAccount} loading={busy === "signout"} disabled={busy !== null && busy !== "signout"}>
            Use a different account
          </Button>
        </div>
      </div>
    </VendorAuthFrame>
  );
}
