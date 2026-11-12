"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { VendorShell } from "@/components/vendor-web/Shell";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { Checkbox, Field, SelectInput, TextInput } from "@/components/vendor-web/ui/Field";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { vendorFetch } from "@/lib/vendor-web/api";
import { VendorApiError, messageForError } from "@/lib/vendor-web/errors";
import { clearDraft, loadDraft, saveDraft } from "@/lib/vendor-web/drafts";
import { canEditApplication } from "@/lib/vendor-web/copy";
import {
  buildApplicationInput,
  draftable,
  EMPTY_FORM,
  firstStepWithErrors,
  formFromApplication,
  formFromDraft,
  stepForServerField,
  STEPS,
  validateStep,
  type FormErrors,
  type OnboardingForm,
  type StepId,
} from "@/lib/vendor-web/application";
import { setVendorMe, useVendorSession } from "@/lib/vendor-web/session";
import { INDIAN_STATES, MAX_SERVICE_PINCODES, PINCODE_RE, STORE_CATEGORY_IDS, CATEGORY_LABELS } from "@/lib/vendor-web/validation";
import type { VendorMe } from "@/lib/vendor-web/types";

const PAN_HINT = "Enter it in full to check the format. We keep only the last four characters, so re-enter it when you edit.";

export default function OnboardingPage() {
  const router = useRouter();
  const s = useVendorSession();
  const uid = s.user?.uid ?? null;
  const [form, setForm] = useState<OnboardingForm>(EMPTY_FORM);
  const [ready, setReady] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [extraPincode, setExtraPincode] = useState("");
  const [busy, setBusy] = useState(false);

  const step: StepId = STEPS[stepIndex].id;
  const editable = canEditApplication(s.me?.state);

  // Start the form once, from the saved application (Edit and resubmit) or this browser's draft.
  useEffect(() => {
    if (!s.me || ready) return;
    if (s.me.application) setForm(formFromApplication(s.me.application));
    else setForm(formFromDraft(uid ? loadDraft(uid) : null) ?? EMPTY_FORM);
    setReady(true);
  }, [s.me, uid, ready]);

  // Keep a draft as the user types. The PAN is left out (draftable).
  useEffect(() => {
    if (ready && uid) saveDraft(uid, draftable(form));
  }, [form, ready, uid]);

  useEffect(() => {
    if (s.authPhase === "signed-out") router.replace("/vendor/sign-in");
    else if (s.me && !editable) router.replace("/vendor/status");
  }, [s.authPhase, s.me, editable, router]);

  function update(patch: Partial<OnboardingForm>) {
    setForm((f) => ({ ...f, ...patch }));
    setServerError(null);
  }

  function goNext() {
    const found = validateStep(step, form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function addPincode() {
    const p = extraPincode.trim();
    const problems: FormErrors = {};
    if (!PINCODE_RE.test(p)) problems.servicePincodes = "Enter a valid 6-digit pincode.";
    else if (p === form.pincode || form.extraPincodes.includes(p)) problems.servicePincodes = "That pincode is already on the list.";
    else if (form.extraPincodes.length + 1 >= MAX_SERVICE_PINCODES) problems.servicePincodes = `Up to ${MAX_SERVICE_PINCODES} service pincodes, including the store's own.`;
    setErrors((e) => ({ ...e, servicePincodes: problems.servicePincodes }));
    if (problems.servicePincodes) return;
    update({ extraPincodes: [...form.extraPincodes, p] });
    setExtraPincode("");
  }

  function toggleCategory(id: string, on: boolean) {
    const next = on ? [...form.categories, id] : form.categories.filter((c) => c !== id);
    update({ categories: next });
    setErrors((e) => ({ ...e, categories: undefined }));
  }

  async function submit() {
    if (busy) return;
    const built = buildApplicationInput(form);
    if (!built.ok) {
      setErrors(built.errors);
      const first = firstStepWithErrors(form);
      if (first) setStepIndex(STEPS.findIndex((x) => x.id === first));
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      const res = await vendorFetch<{ ok: true; vendor: VendorMe }>("/application", { method: "POST", body: built.value });
      setVendorMe(res.vendor);
      if (uid) clearDraft(uid);
      router.replace("/vendor/status");
    } catch (err) {
      setServerError(messageForError(err));
      if (err instanceof VendorApiError && err.code === "INVALID_INPUT") {
        const field = typeof err.details.field === "string" ? err.details.field : null;
        setStepIndex(STEPS.findIndex((x) => x.id === stepForServerField(field)));
      }
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === "review") void submit();
    else goNext();
  }

  const isEdit = Boolean(s.me?.application);

  return (
    <VendorShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-[24px] font-semibold leading-tight">{isEdit ? "Edit your store application" : "Set up your store"}</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">Four short steps. Your progress is saved on this device until you send it.</p>
        </header>

        {s.error ? (
          <Notice title="We could not load your details" onRetry={() => void s.refresh()} retrying={s.loading}>
            {s.error}
          </Notice>
        ) : null}

        {!ready || !s.me ? (
          <Skeleton lines={5} />
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
              {STEPS.map((x, i) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => i < stepIndex && setStepIndex(i)}
                    aria-current={i === stepIndex ? "step" : undefined}
                    disabled={i > stepIndex}
                    className={`flex min-h-[44px] w-full flex-col items-start justify-center rounded-xl border px-3 py-2 text-left text-[13px] ${
                      i === stepIndex ? "border-[#0057FB] bg-[#EAF2FF] text-[#0B3B8F]" : "border-black/10 bg-white text-ink-muted"
                    } disabled:opacity-60`}
                  >
                    <span className="font-semibold">{x.letter}</span>
                    <span className="hidden sm:inline">{x.label}</span>
                  </button>
                </li>
              ))}
            </ol>

            {serverError ? <Notice>{serverError}</Notice> : null}

            {step === "store" ? (
              <Card title="A. Store details" description="How customers and our team know your store.">
                <div className="space-y-5">
                  <Field id="storeName" label="Store name" error={errors.storeName ?? null}>
                    <TextInput id="storeName" value={form.storeName} onChange={(e) => update({ storeName: e.target.value })} maxLength={130} autoComplete="organization" invalid={!!errors.storeName} error={errors.storeName ?? null} />
                  </Field>
                  <Field id="ownerName" label="Owner's name" error={errors.ownerName ?? null}>
                    <TextInput id="ownerName" value={form.ownerName} onChange={(e) => update({ ownerName: e.target.value })} maxLength={130} autoComplete="name" invalid={!!errors.ownerName} error={errors.ownerName ?? null} />
                  </Field>
                  <Field id="mobile" label="Contact mobile" hint="10-digit Indian mobile number. We call this number about orders." error={errors.mobile ?? null}>
                    <TextInput id="mobile" inputMode="numeric" autoComplete="tel-national" value={form.mobile} onChange={(e) => update({ mobile: e.target.value.replace(/[^\d+ ]/g, "").slice(0, 16) })} placeholder="9876543210" invalid={!!errors.mobile} error={errors.mobile ?? null} hint="10-digit Indian mobile number. We call this number about orders." />
                  </Field>
                  <Field id="accountEmail" label="Account email" hint="This is the email you signed in with. To change it, contact GlowVai support.">
                    <TextInput id="accountEmail" value={s.account?.email ?? s.user?.email ?? ""} readOnly disabled className="bg-[#F6F7F9]" hint="This is the email you signed in with. To change it, contact GlowVai support." />
                  </Field>
                </div>
              </Card>
            ) : null}

            {step === "address" ? (
              <Card title="B. Address and hours" description="Where orders are packed, which pincodes you deliver to, and when you are open.">
                <div className="space-y-5">
                  <Field id="street" label="Street address" error={errors.street ?? null}>
                    <TextInput id="street" value={form.street} onChange={(e) => update({ street: e.target.value })} autoComplete="street-address" invalid={!!errors.street} error={errors.street ?? null} />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="city" label="City" error={errors.city ?? null}>
                      <TextInput id="city" value={form.city} onChange={(e) => update({ city: e.target.value })} autoComplete="address-level2" invalid={!!errors.city} error={errors.city ?? null} />
                    </Field>
                    <Field id="state" label="State or union territory" error={errors.state ?? null}>
                      <SelectInput id="state" value={form.state} onChange={(e) => update({ state: e.target.value })} invalid={!!errors.state} error={errors.state ?? null}>
                        <option value="">Choose a state</option>
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>
                  <Field id="pincode" label="Store pincode" error={errors.pincode ?? null}>
                    <TextInput id="pincode" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => update({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} autoComplete="postal-code" invalid={!!errors.pincode} error={errors.pincode ?? null} />
                  </Field>

                  <div>
                    <p className="text-[14px] font-semibold">Pincodes you deliver to</p>
                    <p className="mt-1 text-[13px] text-ink-muted">
                      Your store pincode is always included. Add up to {MAX_SERVICE_PINCODES - 1} more. {1 + form.extraPincodes.length} of {MAX_SERVICE_PINCODES} used.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Pincodes you deliver to">
                      {form.pincode && PINCODE_RE.test(form.pincode) ? (
                        <span className="inline-flex min-h-[36px] items-center rounded-full bg-[#EAF2FF] px-3 text-[13px] font-semibold text-[#0B3B8F]">{form.pincode} (store)</span>
                      ) : null}
                      {form.extraPincodes.map((p) => (
                        <span key={p} className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-black/15 bg-white pl-3 text-[13px] font-semibold">
                          {p}
                          <button
                            type="button"
                            aria-label={`Remove ${p}`}
                            onClick={() => update({ extraPincodes: form.extraPincodes.filter((x) => x !== p) })}
                            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-ink-muted hover:text-ink"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-start gap-2">
                      <div className="flex-1">
                        <Field id="extraPincode" label="Add a pincode" error={errors.servicePincodes ?? null}>
                          <TextInput id="extraPincode" inputMode="numeric" maxLength={6} value={extraPincode} onChange={(e) => setExtraPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} invalid={!!errors.servicePincodes} error={errors.servicePincodes ?? null} />
                        </Field>
                      </div>
                      <div className="pt-7">
                        <Button variant="secondary" onClick={addPincode}>
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <fieldset className="space-y-3">
                    <legend className="text-[14px] font-semibold">Opening hours (24-hour)</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="openTime" label="Opens at">
                        <TextInput id="openTime" type="time" value={form.openTime} onChange={(e) => update({ openTime: e.target.value })} invalid={!!errors.hours} />
                      </Field>
                      <Field id="closeTime" label="Closes at">
                        <TextInput id="closeTime" type="time" value={form.closeTime} onChange={(e) => update({ closeTime: e.target.value })} invalid={!!errors.hours} />
                      </Field>
                    </div>
                    {errors.hours ? <p className="text-[13px] text-[#B42318]">{errors.hours}</p> : null}
                    <Checkbox id="isOpenToday" label="Open today" checked={form.isOpenToday} onChange={(v) => update({ isOpenToday: v })} />
                  </fieldset>

                  <fieldset className="space-y-3">
                    <legend className="text-[14px] font-semibold">What you sell</legend>
                    <p className="text-[13px] text-ink-muted">Pick every category that applies (up to {STORE_CATEGORY_IDS.length}).</p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {STORE_CATEGORY_IDS.map((id) => (
                        <Checkbox key={id} id={`cat-${id}`} label={CATEGORY_LABELS[id]} checked={form.categories.includes(id)} onChange={(on) => toggleCategory(id, on)} />
                      ))}
                    </div>
                    {errors.categories ? <p className="text-[13px] text-[#B42318]">{errors.categories}</p> : null}
                  </fieldset>
                </div>
              </Card>
            ) : null}

            {step === "tax" ? (
              <Card title="C. Tax and bank" description="Optional for now, but needed before your first payout. Leave a section blank if you do not have it yet.">
                <div className="space-y-5">
                  <Field id="gstNumber" label="GSTIN" optional hint="15 characters, for example 27ABCDE1234F1Z5." error={errors.gstNumber ?? null}>
                    <TextInput id="gstNumber" value={form.gstNumber} onChange={(e) => update({ gstNumber: e.target.value.toUpperCase() })} maxLength={20} autoCapitalize="characters" invalid={!!errors.gstNumber} error={errors.gstNumber ?? null} hint="15 characters, for example 27ABCDE1234F1Z5." />
                  </Field>
                  <Field id="registrationNumber" label="Business registration number" optional error={errors.registrationNumber ?? null}>
                    <TextInput id="registrationNumber" value={form.registrationNumber} onChange={(e) => update({ registrationNumber: e.target.value })} maxLength={41} invalid={!!errors.registrationNumber} error={errors.registrationNumber ?? null} />
                  </Field>
                  <Field id="pan" label="PAN" optional hint={PAN_HINT} error={errors.pan ?? null}>
                    <TextInput id="pan" value={form.pan} onChange={(e) => update({ pan: e.target.value.toUpperCase() })} maxLength={12} autoCapitalize="characters" invalid={!!errors.pan} error={errors.pan ?? null} hint={PAN_HINT} />
                  </Field>

                  <div className="space-y-5 border-t border-black/10 pt-5">
                    <div>
                      <p className="text-[14px] font-semibold">Bank account for payouts</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                        For your safety we store only the last 4 digits of the account number, and only the first 5 and last 2 characters of the IFSC. The full account number is never sent to us here. Our payments team uses the last 4 digits to match your account.
                      </p>
                    </div>
                    <Field id="bankHolder" label="Account holder's name" optional error={errors.bankHolder ?? null}>
                      <TextInput id="bankHolder" value={form.bankHolder} onChange={(e) => update({ bankHolder: e.target.value })} maxLength={130} invalid={!!errors.bankHolder} error={errors.bankHolder ?? null} />
                    </Field>
                    <Field id="bankName" label="Bank name" optional error={errors.bankName ?? null}>
                      <TextInput id="bankName" value={form.bankName} onChange={(e) => update({ bankName: e.target.value })} maxLength={130} invalid={!!errors.bankName} error={errors.bankName ?? null} />
                    </Field>
                    <Field id="ifsc" label="IFSC" optional hint="11 characters, for example HDFC0001234. Re-enter it when you edit." error={errors.ifsc ?? null}>
                      <TextInput id="ifsc" value={form.ifsc} onChange={(e) => update({ ifsc: e.target.value.toUpperCase() })} maxLength={15} autoCapitalize="characters" invalid={!!errors.ifsc} error={errors.ifsc ?? null} hint="11 characters, for example HDFC0001234. Re-enter it when you edit." />
                    </Field>
                    <Field id="accLast4" label="Last 4 digits of the account number" optional error={errors.accLast4 ?? null}>
                      <TextInput id="accLast4" inputMode="numeric" maxLength={4} value={form.accLast4} onChange={(e) => update({ accLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} invalid={!!errors.accLast4} error={errors.accLast4 ?? null} />
                    </Field>
                    <Field id="upiVpa" label="UPI ID" optional hint="For example store@okhdfc. Leave empty if you do not use UPI." error={errors.upiVpa ?? null}>
                      <TextInput id="upiVpa" value={form.upiVpa} onChange={(e) => update({ upiVpa: e.target.value })} maxLength={100} autoCapitalize="none" invalid={!!errors.upiVpa} error={errors.upiVpa ?? null} hint="For example store@okhdfc. Leave empty if you do not use UPI." />
                    </Field>
                  </div>
                </div>
              </Card>
            ) : null}

            {step === "review" ? (
              <Card title="D. Review and send" description="Check the details. You can go back to any step to change them.">
                <dl className="divide-y divide-black/10 text-[15px]">
                  <ReviewRow label="Store" value={`${form.storeName} · ${form.ownerName}`} onEdit={() => setStepIndex(0)} />
                  <ReviewRow label="Mobile" value={form.mobile ? `+91 ${form.mobile}` : "Not added"} onEdit={() => setStepIndex(0)} />
                  <ReviewRow label="Address" value={[form.street, form.city, form.state, form.pincode].filter(Boolean).join(", ") || "Not added"} onEdit={() => setStepIndex(1)} />
                  <ReviewRow label="Delivers to" value={[form.pincode, ...form.extraPincodes].filter(Boolean).join(", ") || "Not added"} onEdit={() => setStepIndex(1)} />
                  <ReviewRow label="Hours" value={form.isOpenToday ? `${form.openTime} to ${form.closeTime}` : "Closed today"} onEdit={() => setStepIndex(1)} />
                  <ReviewRow label="Categories" value={form.categories.map((c) => (CATEGORY_LABELS as Record<string, string>)[c] ?? c).join(", ") || "None chosen"} onEdit={() => setStepIndex(1)} />
                  <ReviewRow label="GSTIN" value={form.gstNumber || "Not added"} onEdit={() => setStepIndex(2)} />
                  <ReviewRow label="PAN" value={form.pan ? `Ending ${form.pan.slice(-4)}` : "Not entered"} onEdit={() => setStepIndex(2)} />
                  <ReviewRow label="Bank" value={form.bankName ? `${form.bankName}${form.accLast4 ? ` · account ending ${form.accLast4}` : ""}` : "Not added"} onEdit={() => setStepIndex(2)} />
                </dl>
                <div className="mt-5">
                  <Notice tone="info" title="What happens next">
                    Our team will contact you to verify documents. You do not need to upload anything here yet.
                  </Notice>
                </div>
              </Card>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              {stepIndex > 0 ? (
                <Button variant="secondary" onClick={goBack} disabled={busy}>
                  Back
                </Button>
              ) : (
                <Link href="/vendor/status" className="inline-flex min-h-[44px] items-center px-2 text-[14px] font-semibold text-[#0057FB]">
                  Cancel
                </Link>
              )}
              {step === "review" ? (
                <Button type="submit" loading={busy}>
                  Send application
                </Button>
              ) : (
                <Button type="submit">Next</Button>
              )}
            </div>
            {step === "review" ? <p className="text-[13px] text-ink-muted">Once sent, the application is locked while our team reviews it.</p> : null}
          </form>
        )}
      </div>
    </VendorShell>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="w-28 shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium">{value}</dd>
      <button type="button" onClick={onEdit} className="min-h-[44px] shrink-0 px-2 text-[14px] font-semibold text-[#0057FB]">
        Edit
      </button>
    </div>
  );
}
