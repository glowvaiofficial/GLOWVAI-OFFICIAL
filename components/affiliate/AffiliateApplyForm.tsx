"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { apiFetch } from "@/glowvai-app/core/services/customerSession";
import { AFFILIATE_CONFIG, AFFILIATE_COMPLIANCE_TEXT, AUDIENCE_LABELS, CATEGORY_LABELS, CHANNEL_LABELS, type AffiliateCategory, type AffiliateChannel, type AudienceRange } from "@/lib/shop/affiliate/config";
import { parseApplication } from "@/lib/shop/affiliate/application";
import { focusRing } from "@/components/home/shared";

// The application form. The browser runs the same checks as the server (parseApplication), so errors show before the
// request; the server checks again and is the one that decides.
type Dashboard = {
  eligibility: { eligible: boolean; reason?: string };
  affiliate: { state: string; statusMessage: string };
};

const inputClass = `w-full rounded-[10px] border border-ink/25 bg-white px-4 py-3 text-[16px] text-ink ${focusRing}`;

export function AffiliateApplyForm() {
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Dashboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [channel, setChannel] = useState<AffiliateChannel | "">("");
  const [channelUrl, setChannelUrl] = useState("");
  const [audience, setAudience] = useState<AudienceRange | "">("");
  const [categories, setCategories] = useState<AffiliateCategory[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const ids = { name: useId(), channel: useId(), url: useId(), audience: useId(), cats: useId(), comp: useId() };

  useEffect(() => {
    let alive = true;
    apiFetch<Dashboard>("/api/shop/affiliate").then((res) => {
      if (!alive) return;
      if (res.ok && res.data) setCurrent(res.data);
      else setLoadError(res.error ?? "We could not load your affiliate status. Please try again.");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggleCategory = (c: AffiliateCategory) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : prev.length < AFFILIATE_CONFIG.maxCategories ? [...prev, c] : prev));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const payload = {
      displayName,
      primaryChannel: channel,
      channelUrl,
      audienceRange: audience,
      categories,
      complianceVersion: AFFILIATE_CONFIG.complianceVersion,
      complianceAccepted: accepted,
    };
    const local = parseApplication(payload);
    if (!local.ok) {
      setErrors({ [local.field]: local.error });
      return;
    }
    setErrors({});
    setSubmitting(true);
    const res = await apiFetch<{ field?: string }>("/api/shop/affiliate", { method: "POST", body: JSON.stringify(payload) });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
      return;
    }
    if (res.data?.field) setErrors({ [res.data.field]: res.error ?? "Check this field." });
    else setFormError(res.error ?? "Your application could not be sent. Please try again.");
  }

  if (loading) return <p role="status" className="text-ink-muted">Checking your affiliate status...</p>;
  if (loadError) return <p role="alert" className="text-ink">{loadError}</p>;
  if (done) {
    return (
      <div role="status" className="rounded-[14px] border border-ink/20 bg-white p-6">
        <h2 className="font-display text-2xl font-semibold">Application received</h2>
        <p className="mt-2 text-ink-light">Your application is waiting for review. You can follow its status on your dashboard.</p>
        <Link href="/affiliate/dashboard" className={`mt-4 inline-block underline underline-offset-4 rounded ${focusRing}`}>Go to your dashboard</Link>
      </div>
    );
  }
  if (current && current.affiliate.state !== "NONE" && current.affiliate.state !== "REJECTED") {
    return (
      <div className="rounded-[14px] border border-ink/20 bg-white p-6">
        <p className="text-ink">{current.affiliate.statusMessage}</p>
        <Link href="/affiliate/dashboard" className={`mt-4 inline-block underline underline-offset-4 rounded ${focusRing}`}>Go to your dashboard</Link>
      </div>
    );
  }
  if (current && !current.eligibility.eligible) {
    return (
      <div role="note" className="rounded-[14px] border border-ink/20 bg-white p-6">
        <p className="text-ink">Verify your email, or use your GlowVai account for 7 days, before you apply.</p>
      </div>
    );
  }

  const err = (field: string) =>
    errors[field] ? (
      <p id={`${field}-error`} className="mt-1 text-sm text-red-700">{errors[field]}</p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-7" aria-label="Affiliate application">
      {formError && <p role="alert" className="rounded-[10px] border border-red-700/40 bg-white p-3 text-red-800">{formError}</p>}

      <div>
        <label htmlFor={ids.name} className="block font-medium">Display name</label>
        <p className="text-sm text-ink-muted">Your first name and an initial is enough, for example Priya S.</p>
        <input
          id={ids.name}
          className={`${inputClass} mt-2`}
          value={displayName}
          maxLength={AFFILIATE_CONFIG.displayNameMax}
          autoComplete="given-name"
          onChange={(e) => setDisplayName(e.target.value)}
          aria-invalid={Boolean(errors.displayName)}
          aria-describedby={errors.displayName ? `displayName-error` : undefined}
        />
        {err("displayName")}
      </div>

      <div>
        <label htmlFor={ids.channel} className="block font-medium">Where do you mainly share?</label>
        <select id={ids.channel} className={`${inputClass} mt-2`} value={channel} onChange={(e) => setChannel(e.target.value as AffiliateChannel)} aria-invalid={Boolean(errors.primaryChannel)} aria-describedby={errors.primaryChannel ? "primaryChannel-error" : undefined}>
          <option value="">Choose one</option>
          {AFFILIATE_CONFIG.channels.map((c) => (
            <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
          ))}
        </select>
        {err("primaryChannel")}
      </div>

      <div>
        <label htmlFor={ids.url} className="block font-medium">Link to your channel (optional)</label>
        <p className="text-sm text-ink-muted">A full https:// address. Short links are not accepted.</p>
        <input
          id={ids.url}
          type="url"
          inputMode="url"
          className={`${inputClass} mt-2`}
          value={channelUrl}
          maxLength={AFFILIATE_CONFIG.channelUrlMax}
          placeholder="https://"
          onChange={(e) => setChannelUrl(e.target.value)}
          aria-invalid={Boolean(errors.channelUrl)}
          aria-describedby={errors.channelUrl ? "channelUrl-error" : undefined}
        />
        {err("channelUrl")}
      </div>

      <div>
        <label htmlFor={ids.audience} className="block font-medium">Audience size</label>
        <select id={ids.audience} className={`${inputClass} mt-2`} value={audience} onChange={(e) => setAudience(e.target.value as AudienceRange)} aria-invalid={Boolean(errors.audienceRange)} aria-describedby={errors.audienceRange ? "audienceRange-error" : undefined}>
          <option value="">Choose a range</option>
          {AFFILIATE_CONFIG.audienceRanges.map((r) => (
            <option key={r} value={r}>{AUDIENCE_LABELS[r]}</option>
          ))}
        </select>
        {err("audienceRange")}
      </div>

      <fieldset aria-describedby={errors.categories ? "categories-error" : undefined}>
        <legend className="font-medium">Categories you share about (choose up to six)</legend>
        <div className="mt-3 flex flex-wrap gap-2" id={ids.cats}>
          {AFFILIATE_CONFIG.categories.map((c) => {
            const on = categories.includes(c);
            return (
              <label key={c} className={`cursor-pointer rounded-full border px-4 py-2 text-[15px] ${on ? "border-ink bg-ink text-paper" : "border-ink/30 bg-white text-ink"} has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-brand`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleCategory(c)} />
                {CATEGORY_LABELS[c]}
              </label>
            );
          })}
        </div>
        {err("categories")}
      </fieldset>

      <div className="rounded-[14px] border border-ink/20 bg-white p-5">
        <p id={`${ids.comp}-text`} className="text-[15px] text-ink-light">{AFFILIATE_COMPLIANCE_TEXT}</p>
        <label className="mt-4 flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} aria-describedby={`${ids.comp}-text`} aria-invalid={Boolean(errors.compliance)} />
          <span>I have read these affiliate rules and agree to them. (Rules version {AFFILIATE_CONFIG.complianceVersion})</span>
        </label>
        {err("compliance")}
        <p className="mt-3 text-sm text-ink-muted">
          Read the <Link href="/affiliate/terms" className={`gv-link-inline underline underline-offset-4 rounded ${focusRing}`}>affiliate terms</Link>.
        </p>
      </div>

      <button type="submit" disabled={submitting} className={`rounded-full bg-ink px-6 py-3 font-medium text-paper disabled:opacity-60 ${focusRing}`}>
        {submitting ? "Sending..." : "Send application"}
      </button>
    </form>
  );
}
