"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { decideVendorRoute } from "@/lib/vendor-web/routing";
import { useVendorSession } from "@/lib/vendor-web/session";

/** /vendor: sends the visitor to the right screen for their account and store state. Never a blank page. */
export default function VendorIndexPage() {
  const router = useRouter();
  const s = useVendorSession();
  const decision = decideVendorRoute({
    auth: s.authPhase,
    state: s.me?.state ?? null,
    emailVerified: s.account ? s.account.emailVerified : null,
    errorCode: s.errorCode,
  });
  const href = decision.kind === "redirect" ? decision.href : null;

  useEffect(() => {
    if (href) router.replace(href);
  }, [href, router]);

  if (decision.kind === "notice") {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Notice title="We could not load your store" onRetry={() => void s.refresh()} retrying={s.loading}>
          {decision.message}
        </Notice>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Skeleton lines={3} />
    </div>
  );
}
