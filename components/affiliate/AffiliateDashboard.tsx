"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/glowvai-app/core/services/customerSession";
import type { AffiliateDashboardView } from "@/lib/shop/affiliate/projection";
import { focusRing } from "@/components/home/shared";

type DashboardData = {
  eligibility: { eligible: boolean };
  affiliate: AffiliateDashboardView;
};

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-ink/15 bg-white p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function AffiliateDashboard() {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: DashboardData | null }>({ loading: true, error: null, data: null });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch<DashboardData>("/api/shop/affiliate").then((res) => {
      if (!alive) return;
      setState({ loading: false, error: res.ok ? null : res.error, data: res.ok ? res.data : null });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) return <p role="status" className="text-ink-muted">Loading your dashboard...</p>;
  if (state.error || !state.data) return <p role="alert" className="text-ink">{state.error ?? "Your dashboard could not be loaded. Please try again."}</p>;

  const { affiliate: a, eligibility } = state.data;

  if (a.state === "NONE") {
    return (
      <div className="rounded-[14px] border border-ink/20 bg-white p-6">
        <p className="text-ink">{a.statusMessage}</p>
        {eligibility.eligible ? (
          <Link href="/affiliate/apply" className={`mt-4 inline-block rounded-full bg-ink px-6 py-3 font-medium text-paper ${focusRing}`}>Apply to the affiliate programme</Link>
        ) : (
          <p className="mt-3 text-ink-light">Verify your email, or use your GlowVai account for 7 days, before you apply.</p>
        )}
      </div>
    );
  }

  const profile = a.profile && (
    <div className="rounded-[14px] border border-ink/20 bg-white p-6">
      <h2 className="font-display text-xl font-semibold">Your profile</h2>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-[15px] sm:grid-cols-2">
        <div><dt className="text-ink-muted">Name</dt><dd>{a.profile.displayName}</dd></div>
        <div><dt className="text-ink-muted">Main channel</dt><dd>{a.profile.channel}</dd></div>
        <div><dt className="text-ink-muted">Audience</dt><dd>{a.profile.audience}</dd></div>
        <div><dt className="text-ink-muted">Categories</dt><dd>{a.profile.categories.join(", ")}</dd></div>
        {a.profile.channelUrl && (
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Channel link</dt>
            <dd className="break-all">
              <a href={a.profile.channelUrl} target="_blank" rel="noopener noreferrer nofollow" className={`underline underline-offset-4 rounded ${focusRing}`}>{a.profile.channelUrl}</a>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );

  const status = (
    <div className="rounded-[14px] border border-ink/20 bg-white p-6" role="status">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">Status</p>
      <p className="mt-2 text-[17px] text-ink">{a.statusMessage}</p>
    </div>
  );

  if (a.state === "APPROVED" && a.link) {
    const link = a.link;
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(link.url);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div className="space-y-6">
        {status}
        <div className="rounded-[14px] border border-ink/20 bg-white p-6">
          <h2 className="font-display text-xl font-semibold">Your affiliate link</h2>
          <p className="mt-2 break-all font-mono text-[15px]">{link.url}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={copy} className={`rounded-full border border-ink px-5 py-2 font-medium ${focusRing}`}>Copy link</button>
            {copied && <span role="status" className="text-sm text-ink-light">Copied</span>}
            {!link.active && <span className="text-sm text-ink-light">This link is switched off at the moment.</span>}
          </div>
          <p className="mt-3 text-sm text-ink-muted">Orders placed within {a.orders.attributionWindowDays} days of a click on your link, from a different account, are attributed to you. The most recent click counts.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Clicks, last 30 days" value={String(a.clicks.last30Days)} />
          <Stat label="Clicks, all time" value={String(a.clicks.allTime)} />
          <Stat label="Attributed orders" value={String(a.orders.attributedCount)} />
          <Stat label="Attributed order value" value={rupees(a.orders.attributedValueRupees)} />
        </div>
        {profile}
        <Money commission={a.commissionLine} payout={a.payoutLine} />
      </div>
    );
  }

  if (a.state === "APPLIED" || a.state === "UNDER_REVIEW") {
    return (
      <div className="space-y-6">
        {status}
        {profile}
        <p className="text-sm text-ink-muted">Your affiliate link appears here once your application is approved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {status}
      {profile}
      {a.state === "REJECTED" && (
        <Link href="/affiliate/apply" className={`inline-block rounded-full bg-ink px-6 py-3 font-medium text-paper ${focusRing}`}>Apply again</Link>
      )}
    </div>
  );
}

function Money({ commission, payout }: { commission: string; payout: string }) {
  return (
    <div className="rounded-[14px] border border-ink/20 bg-white p-6">
      <h2 className="font-display text-xl font-semibold">Commission and payouts</h2>
      <p className="mt-2 text-[15px] text-ink-light">{commission}.</p>
      <p className="mt-1 text-[15px] text-ink-light">{payout}.</p>
    </div>
  );
}
