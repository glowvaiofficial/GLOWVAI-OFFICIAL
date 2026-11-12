"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { VendorShell } from "@/components/vendor-web/Shell";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Field, SelectInput, TextArea, TextInput } from "@/components/vendor-web/ui/Field";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { Toast } from "@/components/vendor-web/ui/Toast";
import { vendorFetch } from "@/lib/vendor-web/api";
import { messageForError } from "@/lib/vendor-web/errors";
import { formatIst, supportCategoryLabel, SUPPORT_CATEGORY_LABELS } from "@/lib/vendor-web/copy";
import { useVendorSession } from "@/lib/vendor-web/session";
import { checkTicket, TICKET_DESCRIPTION_MAX, TICKET_SUBJECT_MAX } from "@/lib/vendor-web/validation";
import type { VendorTicket } from "@/lib/vendor-web/types";

type Loaded = { status: "idle" } | { status: "loading" } | { status: "ready"; tickets: VendorTicket[] } | { status: "error"; message: string };

export default function VendorSupportPage() {
  const router = useRouter();
  const s = useVendorSession();
  const [list, setList] = useState<Loaded>({ status: "idle" });
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (s.authPhase === "signed-out") router.replace("/vendor/sign-in");
  }, [s.authPhase, router]);

  // Loads once when the page opens (and again only when the user presses Refresh). Nothing polls.
  const signedIn = s.authPhase === "signed-in";
  useEffect(() => {
    if (signedIn && list.status === "idle") void loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  async function loadTickets() {
    setList({ status: "loading" });
    try {
      const res = await vendorFetch<{ ok: true; tickets: VendorTicket[] }>("/support");
      setList({ status: "ready", tickets: res.tickets });
    } catch (err) {
      setList({ status: "error", message: messageForError(err) });
    }
  }

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setSendError(null);
    const checked = checkTicket({ category, subject, description, orderId });
    if (!checked.ok) {
      setFieldError({ field: checked.field, message: checked.error });
      return;
    }
    setFieldError(null);
    setSending(true);
    try {
      const res = await vendorFetch<{ ok: true; ticketId: string }>("/support", { method: "POST", body: checked.value });
      setCategory("");
      setSubject("");
      setDescription("");
      setOrderId("");
      setToast(`Ticket ${res.ticketId} sent. Our team will reply here.`);
      void loadTickets();
    } catch (err) {
      setSendError(messageForError(err));
    } finally {
      setSending(false);
    }
  }

  const fe = (field: string) => (fieldError?.field === field ? fieldError.message : null);

  return (
    <VendorShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-[24px] font-semibold leading-tight">Support</h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">Ask our team about an order, a payout or your account. Replies appear on the ticket.</p>
        </header>

        <Card title="Your tickets" description="The 30 most recent tickets.">
          <div className="mb-4 flex justify-end">
            <Button variant="secondary" onClick={loadTickets} loading={list.status === "loading"}>
              Refresh
            </Button>
          </div>
          {list.status === "loading" || list.status === "idle" ? <Skeleton lines={3} /> : null}
          {list.status === "error" ? (
            <Notice title="We could not load your tickets" onRetry={loadTickets} retrying={false}>
              {list.message}
            </Notice>
          ) : null}
          {list.status === "ready" && list.tickets.length === 0 ? (
            <EmptyState title="No tickets yet" body="When you ask for help, your tickets and replies appear here." />
          ) : null}
          {list.status === "ready" && list.tickets.length > 0 ? (
            <ul className="space-y-3">
              {list.tickets.map((t) => (
                <li key={t.id} className="rounded-xl border border-black/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[15px] font-semibold">{t.subject || "Ticket"}</p>
                    <StatusChip tone={t.status === "OPEN" ? "info" : t.status === "RESOLVED" || t.status === "CLOSED" ? "ok" : "neutral"}>{ticketStatusLabel(t.status)}</StatusChip>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {t.id} · {supportCategoryLabel(t.category)}
                    {t.orderId ? ` · Order ${t.orderId}` : ""}
                    {t.createdAt ? ` · ${formatIst(t.createdAt)}` : ""}
                  </p>
                  {t.resolution ? <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed">{t.resolution}</p> : null}
                  {t.messages.length > 0 ? (
                    <ul className="mt-3 space-y-2 border-t border-black/10 pt-3">
                      {t.messages.map((m, i) => (
                        <li key={i} className="whitespace-pre-line text-[14px] leading-relaxed">
                          {typeof m.text === "string" ? m.text : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card title="Open a ticket" description="Tell us what happened. Please do not send bank details or full card numbers.">
          <form onSubmit={send} noValidate className="space-y-5">
            {sendError ? <Notice>{sendError}</Notice> : null}
            <Field id="category" label="What is it about?" error={fe("category")}>
              <SelectInput id="category" value={category} onChange={(e) => setCategory(e.target.value)} invalid={!!fe("category")} error={fe("category")} disabled={sending}>
                <option value="">Choose one</option>
                {Object.keys(SUPPORT_CATEGORY_LABELS).map((code) => (
                  <option key={code} value={code}>
                    {SUPPORT_CATEGORY_LABELS[code]}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field id="subject" label="Subject" hint={`3 to ${TICKET_SUBJECT_MAX} characters.`} error={fe("subject")}>
              <TextInput id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={TICKET_SUBJECT_MAX} invalid={!!fe("subject")} error={fe("subject")} hint={`3 to ${TICKET_SUBJECT_MAX} characters.`} disabled={sending} />
            </Field>
            <Field id="description" label="What happened?" hint={`10 to ${TICKET_DESCRIPTION_MAX} characters. ${description.length}/${TICKET_DESCRIPTION_MAX}`} error={fe("description")}>
              <TextArea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={TICKET_DESCRIPTION_MAX} invalid={!!fe("description")} error={fe("description")} hint={`10 to ${TICKET_DESCRIPTION_MAX} characters.`} disabled={sending} />
            </Field>
            <Field id="orderId" label="Order ID" optional hint="Add it if the ticket is about one order." error={fe("orderId")}>
              <TextInput id="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value.trim())} maxLength={64} invalid={!!fe("orderId")} error={fe("orderId")} hint="Add it if the ticket is about one order." disabled={sending} />
            </Field>
            <Button type="submit" loading={sending}>
              Send ticket
            </Button>
          </form>
        </Card>
        {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
      </div>
    </VendorShell>
  );
}

function ticketStatusLabel(status: string): string {
  switch (status) {
    case "OPEN":
      return "Open";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
    case "IN_PROGRESS":
    case "PENDING":
      return "In progress";
    default:
      return "Received";
  }
}
