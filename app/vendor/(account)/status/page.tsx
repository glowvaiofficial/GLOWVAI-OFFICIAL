"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { VendorShell } from "@/components/vendor-web/Shell";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { canEditApplication, formatIst, STATE_COPY } from "@/lib/vendor-web/copy";
import { useVendorSession } from "@/lib/vendor-web/session";

export default function VendorStatusPage() {
  const router = useRouter();
  const s = useVendorSession();

  useEffect(() => {
    if (s.authPhase === "signed-out") router.replace("/vendor/sign-in");
  }, [s.authPhase, router]);

  if (s.error && !s.me) {
    return (
      <VendorShell>
        <Notice title="We could not load your store status" onRetry={() => void s.refresh()} retrying={s.loading}>
          {s.error}
        </Notice>
      </VendorShell>
    );
  }

  if (!s.me) {
    return (
      <VendorShell>
        <Skeleton lines={4} />
      </VendorShell>
    );
  }

  const me = s.me;
  const copy = STATE_COPY[me.state];
  const approved = me.state === "APPROVED_ACTIVE" || me.state === "APPROVED_PAUSED";
  const editable = canEditApplication(me.state) && me.state !== "NO_APPLICATION";
  const underReview = me.state === "UNDER_REVIEW";
  const suspended = me.state === "SUSPENDED";
  const updatedAt = me.application?.updatedAt ? formatIst(me.application.updatedAt) : "";

  return (
    <VendorShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[24px] font-semibold leading-tight">Store status</h1>
          <StatusChip tone={copy.tone}>{copy.label}</StatusChip>
        </header>

        {s.error ? (
          <Notice title="Showing your last saved status" onRetry={() => void s.refresh()} retrying={s.loading}>
            {s.error}
          </Notice>
        ) : null}

        <Card>
          <p className="text-[16px] leading-relaxed">{copy.summary}</p>

          {suspended ? (
            <div className="mt-4">
              <Notice title="Your store is suspended">
                {me.reason ? <span className="block">{me.reason}</span> : null}
                <span className="mt-2 block">
                  To find out why or to ask for a review, <Link href="/vendor/support" className="font-semibold underline underline-offset-2">contact support</Link>.
                </span>
              </Notice>
            </div>
          ) : null}

          {!suspended && me.reason ? (
            <div className="mt-4 rounded-xl bg-[#F6F7F9] px-4 py-3">
              <p className="text-[13px] font-semibold text-ink-muted">Message from our team</p>
              <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{me.reason}</p>
            </div>
          ) : null}

          {me.state === "DOCUMENTS_REQUESTED" ? (
            <div className="mt-4">
              <p className="text-[14px] font-semibold">Please send</p>
              {me.requestedDocuments && me.requestedDocuments.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
                  {me.requestedDocuments.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[14px] text-ink-muted">Our team will contact you with the details.</p>
              )}
              <p className="mt-3 text-[14px] text-ink-muted">Our team will contact you to verify documents. You do not need to upload anything here.</p>
            </div>
          ) : null}

          {underReview ? <p className="mt-4 text-[14px] text-ink-muted">You cannot edit the application while it is being reviewed.</p> : null}
          {updatedAt ? <p className="mt-4 text-[13px] text-ink-muted">Last updated {updatedAt}</p> : null}
        </Card>

        <div className="flex flex-wrap gap-3">
          {me.state === "NO_APPLICATION" ? (
            <Link href="/vendor/onboarding" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0057FB] px-5 text-[15px] font-semibold text-white hover:bg-[#0047D1]">
              Start your application
            </Link>
          ) : null}
          {editable ? (
            <Link href="/vendor/onboarding" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0057FB] px-5 text-[15px] font-semibold text-white hover:bg-[#0047D1]">
              Edit and resubmit
            </Link>
          ) : null}
          {approved ? (
            <Link href="/vendor/home" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0057FB] px-5 text-[15px] font-semibold text-white hover:bg-[#0047D1]">
              Go to your store
            </Link>
          ) : null}
          <Button variant="secondary" onClick={() => void s.refresh()} loading={s.loading}>
            Refresh
          </Button>
        </div>
        <p className="text-[13px] text-ink-muted">Refresh only when you need to. This page does not update by itself.</p>
      </div>
    </VendorShell>
  );
}
