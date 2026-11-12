"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Field, SelectInput, TextArea, TextInput } from "@/components/vendor-web/ui/Field";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { isVendorApiError } from "@/lib/vendor-web/errors";
import { createProductRequest, fetchProductRequests } from "@/lib/vendor-web/ops/api";
import { messageFor } from "@/lib/vendor-web/ops/copy";
import {
  MAX_PICTURES,
  MAX_REQUEST_MRP,
  PRODUCT_CATEGORIES,
  REQUEST_STATUS_LABELS,
  validateProductRequest,
  type FormErrors,
  type ProductRequestForm,
} from "@/lib/vendor-web/ops/productRequest";
import type { ProductRequestStatus, ProductRequestView } from "@/lib/vendor-web/ops/types";

const EMPTY_FORM: ProductRequestForm = { name: "", brand: "", category: "", mrp: "", barcode: "", pictureUrls: [""], reason: "" };

const STATUS_TONE: Record<ProductRequestStatus, "neutral" | "ok" | "bad" | "warn" | "info"> = {
  PENDING: "neutral",
  APPROVED: "ok",
  REJECTED: "bad",
  NEEDS_INFO: "warn",
};

export function ProductRequestsScreen() {
  const [list, setList] = useState<{ status: "loading" | "ok" | "error"; items: ProductRequestView[]; error: string | null }>({
    status: "loading",
    items: [],
    error: null,
  });
  const [form, setForm] = useState<ProductRequestForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    setList((s) => ({ ...s, status: "loading", error: null }));
    try {
      const res = await fetchProductRequests();
      setList({ status: "ok", items: res.requests, error: null });
    } catch (err) {
      setList((s) => ({ ...s, status: "error", error: messageFor(err) }));
    }
  }, []);

  // Loaded once when the screen opens; requests are not polled.
  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof ProductRequestForm>(key: K, value: ProductRequestForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setSent(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendError(null);
    const check = validateProductRequest(form);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await createProductRequest(check.value);
      setList((s) => ({ ...s, items: [res.request, ...s.items] }));
      setForm(EMPTY_FORM);
      setSent("Request sent. GlowVai reviews every request.");
    } catch (err) {
      if (isVendorApiError(err) && err.code === "DAILY_LIMIT") setLimitReached(true);
      setSendError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-semibold text-ink">Product requests</h1>
      <p className="text-[14px] text-ink-muted">Ask GlowVai to add a product that is not in the catalogue yet. You can send up to 5 requests a day.</p>

      <Card title="Request a product">
        {limitReached ? (
          <Notice tone="warning">You have reached today&apos;s limit of 5 product requests. Try again tomorrow.</Notice>
        ) : null}
        {sent ? <Notice tone="success">{sent}</Notice> : null}
        {sendError && !limitReached ? <Notice tone="error">{sendError}</Notice> : null}

        <form onSubmit={(e) => void submit(e)} noValidate className="mt-3 flex flex-col gap-4">
          <Field id="pr-name" label="Product name" error={errors.name}>
            <TextInput id="pr-name" value={form.name} onChange={(e) => update("name", e.target.value)} invalid={!!errors.name} error={errors.name ?? null} maxLength={120} autoComplete="off" />
          </Field>
          <Field id="pr-brand" label="Brand" error={errors.brand}>
            <TextInput id="pr-brand" value={form.brand} onChange={(e) => update("brand", e.target.value)} invalid={!!errors.brand} error={errors.brand ?? null} maxLength={80} autoComplete="off" />
          </Field>
          <Field id="pr-category" label="Category" error={errors.category}>
            <SelectInput id="pr-category" value={form.category} onChange={(e) => update("category", e.target.value)} invalid={!!errors.category} error={errors.category ?? null}>
              <option value="">Choose a category</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="pr-mrp" label="MRP (₹)" error={errors.mrp} hint={`Whole rupees, up to ${MAX_REQUEST_MRP.toLocaleString("en-IN")}`}>
            <TextInput id="pr-mrp" inputMode="numeric" value={form.mrp} onChange={(e) => update("mrp", e.target.value)} invalid={!!errors.mrp} error={errors.mrp ?? null} />
          </Field>
          <Field id="pr-barcode" label="Barcode (optional)" error={errors.barcode} hint="8 to 14 digits">
            <TextInput id="pr-barcode" inputMode="numeric" value={form.barcode} onChange={(e) => update("barcode", e.target.value)} invalid={!!errors.barcode} error={errors.barcode ?? null} />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[15px] font-medium text-ink">Pictures (optional, up to {MAX_PICTURES})</legend>
            <p className="text-[13px] text-ink-muted">Links must be https and from an image host GlowVai accepts.</p>
            {form.pictureUrls.map((url, i) => (
              <TextInput
                key={i}
                id={`pr-picture-${i}`}
                aria-label={`Picture link ${i + 1}`}
                type="url"
                value={url}
                onChange={(e) => {
                  const next = [...form.pictureUrls];
                  next[i] = e.target.value;
                  update("pictureUrls", next);
                }}
                invalid={!!errors.pictureUrls}
                placeholder="https://"
              />
            ))}
            {errors.pictureUrls ? (
              <p role="alert" className="text-xs text-[#7A1F17]">
                {errors.pictureUrls}
              </p>
            ) : null}
            {form.pictureUrls.length < MAX_PICTURES ? (
              <Button variant="ghost" className="self-start" onClick={() => update("pictureUrls", [...form.pictureUrls, ""])}>
                Add another picture
              </Button>
            ) : null}
          </fieldset>

          <Field id="pr-reason" label="Why should it be added?" error={errors.reason} hint="10 to 500 characters">
            <TextArea id="pr-reason" rows={4} maxLength={500} value={form.reason} onChange={(e) => update("reason", e.target.value)} invalid={!!errors.reason} error={errors.reason ?? null} />
          </Field>

          <Button type="submit" loading={busy} disabled={busy || limitReached}>
            Send request
          </Button>
        </form>
      </Card>

      <section aria-labelledby="pr-list-title" className="flex flex-col gap-3">
        <h2 id="pr-list-title" className="text-[17px] font-semibold text-ink">
          Your requests
        </h2>
        {list.status === "error" ? (
          <Notice tone="error" onRetry={() => void load()} retrying={false}>
            {list.error}
          </Notice>
        ) : null}
        {list.status === "loading" ? <Skeleton lines={2} /> : null}
        {list.status === "ok" && list.items.length === 0 ? (
          <EmptyState title="No requests yet" body="Requests you send appear here with GlowVai's decision." />
        ) : null}
        {list.status === "ok"
          ? list.items.map((r) => (
              <Card key={r.id} className="!p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold text-ink">
                    {r.name} · {r.brand}
                  </p>
                  <StatusChip tone={STATUS_TONE[r.status]}>{REQUEST_STATUS_LABELS[r.status] ?? "Waiting for review"}</StatusChip>
                </div>
                <p className="mt-1 text-[13px] text-ink-muted">
                  MRP ₹{r.mrp}
                  {r.barcode ? ` · Barcode ${r.barcode}` : ""} · Sent {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </p>
                {r.staffNote ? <p className="mt-2 text-[14px] text-ink">GlowVai: {r.staffNote}</p> : null}
              </Card>
            ))
          : null}
      </section>
    </div>
  );
}
