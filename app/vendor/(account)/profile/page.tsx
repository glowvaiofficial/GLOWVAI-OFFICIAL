"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { VendorShell } from "@/components/vendor-web/Shell";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Field, TextArea } from "@/components/vendor-web/ui/Field";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { Toast } from "@/components/vendor-web/ui/Toast";
import { vendorFetch } from "@/lib/vendor-web/api";
import { messageForError } from "@/lib/vendor-web/errors";
import { STATE_COPY } from "@/lib/vendor-web/copy";
import { checkTicket, CATEGORY_LABELS } from "@/lib/vendor-web/validation";
import { useVendorSession } from "@/lib/vendor-web/session";
import type { VendorApplicationView } from "@/lib/vendor-web/types";

export default function VendorProfilePage() {
  const router = useRouter();
  const s = useVendorSession();
  useEffect(() => {
    if (s.authPhase === "signed-out") router.replace("/vendor/sign-in");
  }, [s.authPhase, router]);

  if (s.error && !s.me) {
    return (
      <VendorShell>
        <Notice title="We could not load your profile" onRetry={() => void s.refresh()} retrying={s.loading}>
          {s.error}
        </Notice>
      </VendorShell>
    );
  }
  if (!s.me) {
    return (
      <VendorShell>
        <Skeleton lines={6} />
      </VendorShell>
    );
  }

  const app = s.me.application;
  return (
    <VendorShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[24px] font-semibold leading-tight">Profile</h1>
          <StatusChip tone={STATE_COPY[s.me.state].tone}>{STATE_COPY[s.me.state].label}</StatusChip>
        </header>

        {!app ? (
          <EmptyState
            title="Your store details are not in yet"
            body="Set up your store to see your details here."
            action={
              <Link href="/vendor/onboarding" className="inline-flex min-h-[44px] items-center rounded-xl bg-[#0057FB] px-5 text-[15px] font-semibold text-white">
                Set up your store
              </Link>
            }
          />
        ) : (
          <>
            <ProfileDetails app={app} email={s.account?.email ?? app.email} />
            <Card title="Request a change" description="Changes to your store details are made by our team. Tell us what should change and we will reply in support.">
              <ChangeRequest />
            </Card>
            <p className="text-[14px] text-ink-muted">
              To change these details now, <Link href="/vendor/onboarding" className="font-semibold text-[#0057FB] underline underline-offset-2">edit your application</Link> while it is still open.
            </p>
          </>
        )}
      </div>
    </VendorShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-[14px] text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-[15px] font-medium">{value || "Not added"}</dd>
    </div>
  );
}

function ProfileDetails({ app, email }: { app: VendorApplicationView; email: string }) {
  const hours = app.operatingHours;
  const bank = app.bank;
  return (
    <>
      <Card title="Store">
        <dl className="divide-y divide-black/10">
          <Row label="Store name" value={app.storeName} />
          <Row label="Owner" value={app.ownerName} />
          <Row label="Contact mobile" value={app.contactNumber.replace(/^\+91/, "+91 ")} />
          <Row label="Account email" value={email} />
        </dl>
      </Card>
      <Card title="Address and hours">
        <dl className="divide-y divide-black/10">
          <Row label="Address" value={[app.streetAddress, app.city, app.state, app.pincode].filter(Boolean).join(", ")} />
          <Row label="Delivers to" value={app.servicePincodes.join(", ")} />
          <Row label="Hours" value={hours.isOpenToday ? `${hours.openTime} to ${hours.closeTime}` : "Closed today"} />
          <Row label="Categories" value={app.categories.map((c) => (CATEGORY_LABELS as Record<string, string>)[c] ?? c).join(", ")} />
        </dl>
      </Card>
      <Card title="Tax and bank" description="Sensitive numbers are shown in part only.">
        <dl className="divide-y divide-black/10">
          <Row label="GSTIN" value={app.gstNumber ?? ""} />
          <Row label="Registration number" value={app.businessRegistrationNumber ?? ""} />
          <Row label="PAN" value={app.panLast4 ? `Ending ${app.panLast4}` : ""} />
          <Row label="Account holder" value={bank?.holderName ?? ""} />
          <Row label="Bank" value={bank?.bankName ?? ""} />
          <Row label="IFSC" value={bank?.ifscMasked ?? ""} />
          <Row label="Account" value={bank?.accLast4 ? `•••• ${bank.accLast4}` : ""} />
          <Row label="UPI" value={bank?.upiVpa ?? ""} />
        </dl>
      </Card>
    </>
  );
}

function ChangeRequest() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const checked = checkTicket({
      category: "ACCOUNT_ISSUE",
      subject: "Profile change request",
      description: text.trim(),
      orderId: "",
    });
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setBusy(true);
    try {
      const res = await vendorFetch<{ ok: true; ticketId: string }>("/support", { method: "POST", body: checked.value });
      setSent(res.ticketId);
      setText("");
      setToast("Request sent. Our team will reply in support.");
    } catch (err) {
      setError(messageForError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error ? <Notice>{error}</Notice> : null}
      {sent ? <Notice tone="success">Your request is open as {sent}. You can follow it under Support.</Notice> : null}
      <Field id="change" label="What should change?" hint="10 to 2000 characters. Say which detail and what it should be now.">
        <TextArea id="change" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} disabled={busy} hint="10 to 2000 characters. Say which detail and what it should be now." />
      </Field>
      <Button type="submit" variant="secondary" loading={busy} disabled={busy}>
        Send request
      </Button>
      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </form>
  );
}
