"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { Field, TextArea } from "@/components/vendor-web/ui/Field";
import { isVendorApiError } from "@/lib/vendor-web/errors";
import { acceptOrder, declineOrder, fetchInventory } from "@/lib/vendor-web/ops/api";
import { ACCEPT_SUCCESS, DECLINE_SUCCESS, messageFor } from "@/lib/vendor-web/ops/copy";
import { DECLINE_LABELS, DECLINE_REASONS, declineBody, declineNoteError, type DeclineReason } from "@/lib/vendor-web/ops/decline";
import { describeGap, parseMissing, stockGaps, type StockGap } from "@/lib/vendor-web/ops/stock";
import { offerView } from "@/lib/vendor-web/ops/offerView";
import type { InventoryLine } from "@/lib/vendor-web/ops/types";
import { formatRupees, placedAgoLabel } from "@/lib/vendor-web/ops/time";
import { useOrders } from "./OrdersProvider";

// Refusals after which the list is stale, so it is refreshed to show what is still available.
const LIST_STALE_CODES = new Set(["ORDER_ALREADY_ASSIGNED", "ORDER_CANCELLED", "NOT_ELIGIBLE", "NOT_FOUND"]);

export function OfferScreen({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { book, loaded, loading, error: listError, refresh, putOrder, dropOrderLocal } = useOrders();
  const order = book[orderId];

  const [inv, setInv] = useState<{ status: "loading" | "ok" | "error"; lines: InventoryLine[]; error: string | null }>({
    status: "loading",
    lines: [],
    error: null,
  });
  const loadInventory = useCallback(async () => {
    setInv((s) => ({ ...s, status: "loading", error: null }));
    try {
      const res = await fetchInventory();
      setInv({ status: "ok", lines: res.items, error: null });
    } catch (err) {
      setInv({ status: "error", lines: [], error: messageFor(err) });
    }
  }, []);
  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shortages, setShortages] = useState<StockGap[]>([]);
  const [acceptedNote, setAcceptedNote] = useState<string | null>(null);
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  const [declined, setDeclined] = useState(false);

  if (!loaded) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        {listError ? (
          <Notice tone="error" onRetry={refresh} retrying={loading}>
            {listError}
          </Notice>
        ) : (
          <Skeleton lines={3} />
        )}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <EmptyState
          title="This order is no longer available"
          body="Another store may have taken it, or it was cancelled."
          action={
            <Link href="/vendor/orders" className="font-semibold text-[#0057FB]">
              Back to orders
            </Link>
          }
        />
      </div>
    );
  }

  const view = offerView(order);
  const now = Date.now();
  const isOffer = order.isOffer;
  const gaps = inv.status === "ok" ? stockGaps(order.items, inv.lines) : [];
  const noteError = reason ? declineNoteError(reason, note) : null;

  async function accept() {
    setBusy("accept");
    setActionError(null);
    setShortages([]);
    try {
      const res = await acceptOrder(orderId);
      putOrder(res.order);
      setAcceptedNote(ACCEPT_SUCCESS);
    } catch (err) {
      const code = isVendorApiError(err) ? err.code : "";
      if (code === "OUT_OF_STOCK") {
        setShortages(parseMissing(isVendorApiError(err) ? err.details : undefined));
      }
      setActionError(messageFor(err));
      if (LIST_STALE_CODES.has(code)) refresh();
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    if (!reason) return;
    if (declineNoteError(reason, note)) {
      setNoteTouched(true);
      return;
    }
    setBusy("decline");
    setActionError(null);
    try {
      await declineOrder(orderId, declineBody(reason, note));
      dropOrderLocal(orderId);
      setDeclined(true);
    } catch (err) {
      const code = isVendorApiError(err) ? err.code : "";
      setActionError(messageFor(err));
      if (LIST_STALE_CODES.has(code)) refresh();
    } finally {
      setBusy(null);
    }
  }

  if (declined) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Notice tone="success">{DECLINE_SUCCESS}</Notice>
        <Button variant="secondary" onClick={() => router.replace("/vendor/orders")}>
          Back to orders
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold text-ink">Order {order.reference}</h1>
        {isOffer ? <StatusChip tone="info">New offer</StatusChip> : <StatusChip tone="warn">Accepted</StatusChip>}
      </div>

      <Card title="Items">
        <ul className="divide-y divide-black/10">
          {view.items.map((it, i) => (
            <li key={`${it.title}-${i}`} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div>
                <p className="text-[15px] font-semibold text-ink">{it.title}</p>
                <p className="text-[13px] text-ink-muted">
                  {[it.brand, it.variantLabel].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="text-[14px] text-ink">
                {it.quantity} × {formatRupees(it.unitPrice)}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3">
          <span className="text-[14px] text-ink-muted">{placedAgoLabel(view.placedAt, now)}</span>
          <span className="text-[16px] font-semibold text-ink">
            {view.itemCount} {view.itemCount === 1 ? "item" : "items"} · {formatRupees(view.itemsValue)}
          </span>
        </div>
        {view.customerFirstName ? <p className="mt-3 text-[14px] text-ink">For {view.customerFirstName}</p> : null}
      </Card>

      <Card title="Stock at your store" description="Checked on this device. The server checks again when you accept.">
        {inv.status === "loading" ? <Skeleton lines={1} /> : null}
        {inv.status === "error" ? (
          <Notice tone="warning" onRetry={() => void loadInventory()}>
            Couldn&apos;t load your stock. {inv.error}
          </Notice>
        ) : null}
        {inv.status === "ok" && gaps.length === 0 ? <p className="text-[15px] text-ink">You have enough stock for every item.</p> : null}
        {inv.status === "ok" && gaps.length > 0 ? (
          <ul className="flex flex-col gap-1 text-[15px] text-[#7A1F17]">
            {gaps.map((g) => (
              <li key={g.key}>{describeGap(g)}</li>
            ))}
          </ul>
        ) : null}
      </Card>

      {isOffer ? (
        <>
          {actionError ? (
            <Notice tone="error" title="Could not complete that">
              {actionError}
              {shortages.length > 0 ? (
                <ul className="mt-2 list-disc pl-5">
                  {shortages.map((s) => (
                    <li key={s.key}>{describeGap(s)}</li>
                  ))}
                </ul>
              ) : null}
            </Notice>
          ) : null}
          {acceptedNote ? <Notice tone="success">{acceptedNote}</Notice> : null}

          <Card title="Accept this order">
            <p className="mb-3 text-[14px] text-ink-muted">Accepting reserves the stock for these items and assigns the order to your store.</p>
            <Button loading={busy === "accept"} disabled={busy !== null} fullWidth onClick={() => void accept()}>
              Accept order
            </Button>
          </Card>

          <Card title="Decline this order" description="The order stays open for other stores.">
            <fieldset className="flex flex-col gap-2" disabled={busy !== null}>
              <legend className="sr-only">Reason</legend>
              {DECLINE_REASONS.map((r) => (
                <label key={r} className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] text-ink">
                  <input type="radio" name="decline-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5" />
                  {DECLINE_LABELS[r]}
                </label>
              ))}
            </fieldset>
            {reason === "OTHER" ? (
              <div className="mt-3">
                <Field id="decline-note" label="Note" error={noteTouched ? noteError : null} hint="3 to 200 characters">
                  <TextArea
                    id="decline-note"
                    rows={3}
                    maxLength={200}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={() => setNoteTouched(true)}
                    placeholder="Tell us briefly why"
                    invalid={noteTouched && !!noteError}
                    error={noteTouched ? noteError : null}
                  />
                </Field>
              </div>
            ) : null}
            <div className="mt-4">
              <Button variant="danger" loading={busy === "decline"} disabled={busy !== null || !reason} fullWidth onClick={() => void decline()}>
                Decline order
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card title="Next step">
          {order.status === "VENDOR_ACCEPTED" ? (
            <Link href={`/vendor/orders/${encodeURIComponent(orderId)}/pack`} className="font-semibold text-[#0057FB]">
              Pack this order
            </Link>
          ) : (
            <p className="text-[15px] text-ink">This order is {order.cancelled ? "cancelled" : "no longer waiting for packing"}.</p>
          )}
        </Card>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/vendor/orders" className="text-[14px] font-semibold text-[#0057FB]">
      ← Orders
    </Link>
  );
}
