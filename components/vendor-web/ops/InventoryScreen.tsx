"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { EmptyState } from "@/components/vendor-web/ui/EmptyState";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { Skeleton } from "@/components/vendor-web/ui/Skeleton";
import { StatusChip } from "@/components/vendor-web/ui/StatusChip";
import { Field, TextInput } from "@/components/vendor-web/ui/Field";
import { isVendorApiError } from "@/lib/vendor-web/errors";
import { fetchInventory, saveInventory, type InventoryResponse } from "@/lib/vendor-web/ops/api";
import { messageFor } from "@/lib/vendor-web/ops/copy";
import { chunkForSave, checkEdit, isLowStock, parseStockInput, STOCK_MAX, SAVE_BATCH_MAX, type SaveItem } from "@/lib/vendor-web/ops/inventory";
import type { InventoryLine, VariantView } from "@/lib/vendor-web/ops/types";

type Mode = "edit" | "count";

interface RowEdit {
  stock: string;
  isAvailable: boolean;
  price: string;
}

interface RowErrors {
  stock?: string;
  price?: string;
}

const priceText = (line: InventoryLine) => (line.unitPriceOverride !== undefined ? String(line.unitPriceOverride) : "");

export function InventoryScreen() {
  const [data, setData] = useState<{ status: "loading" | "ok" | "error"; res: InventoryResponse | null; error: string | null }>({
    status: "loading",
    res: null,
    error: null,
  });
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [variants, setVariants] = useState<Record<string, VariantView[]>>({});
  const [mode, setMode] = useState<Mode>("edit");
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [errors, setErrors] = useState<Record<string, RowErrors>>({});
  const [busy, setBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ tone: "success" | "error"; text: string; extra?: string[] } | null>(null);

  const load = useCallback(async () => {
    setData((d) => ({ ...d, status: "loading", error: null }));
    try {
      const res = await fetchInventory();
      setLines(res.items);
      setVariants(res.variants ?? {});
      setEdits({});
      setErrors({});
      setData({ status: "ok", res, error: null });
    } catch (err) {
      setData({ status: "error", res: null, error: messageFor(err) });
    }
  }, []);

  // Loaded when the screen opens; stock is not polled.
  useEffect(() => {
    void load();
  }, [load]);

  const productLines = useMemo(() => lines.filter((l) => l.variantId === null), [lines]);
  const optionLines = useMemo(() => lines.filter((l) => l.variantId !== null), [lines]);

  const editFor = (line: InventoryLine): RowEdit => edits[line.productId] ?? { stock: String(line.stock), isAvailable: line.isAvailable, price: priceText(line) };
  // Count mode only tracks stock; edit mode tracks stock, availability and the store price.
  const dirtyIds = productLines.filter((line) => {
    const e = edits[line.productId];
    if (!e) return false;
    if (mode === "count") return e.stock !== String(line.stock);
    return e.stock !== String(line.stock) || e.isAvailable !== line.isAvailable || e.price !== priceText(line);
  });

  function setEdit(line: InventoryLine, patch: Partial<RowEdit>) {
    setEdits((prev) => ({ ...prev, [line.productId]: { ...editFor(line), ...patch } }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[line.productId];
      return next;
    });
    setSaveMessage(null);
  }

  async function save() {
    setSaveMessage(null);
    if (dirtyIds.length === 0) return;

    // Validate every changed row first. Nothing is sent while any row is wrong.
    const nextErrors: Record<string, RowErrors> = {};
    const items: SaveItem[] = [];
    for (const line of dirtyIds) {
      const e = editFor(line);
      const isCount = mode === "count";
      // A product with options has no store-price field here, so its current price is sent back unchanged (an empty
      // price would clear it). Count mode keeps availability and price exactly as they are.
      const result = checkEdit({
        productId: line.productId,
        stock: e.stock,
        isAvailable: isCount ? line.isAvailable : e.isAvailable,
        price: isCount || hasVariants(line.productId) ? priceText(line) : e.price,
      });
      if (result.ok) items.push(result.item);
      else nextErrors[line.productId] = result.errors;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSaveMessage({ tone: "error", text: "Fix the highlighted rows, then save again. Nothing was saved." });
      return;
    }

    setBusy(true);
    let saved = 0;
    try {
      for (const chunk of chunkForSave(items, SAVE_BATCH_MAX)) {
        const res = await saveInventory(chunk);
        const byId = new Map(res.items.filter((r) => r.variantId === null).map((r) => [r.productId, r]));
        setLines((prev) => prev.map((l) => (l.variantId === null && byId.has(l.productId) ? (byId.get(l.productId) as InventoryLine) : l)));
        setEdits((prev) => {
          const next = { ...prev };
          for (const r of res.items) delete next[r.productId];
          return next;
        });
        saved += chunk.length;
      }
      setSaveMessage({ tone: "success", text: `Saved ${saved} ${saved === 1 ? "product" : "products"}.` });
    } catch (err) {
      const extra =
        isVendorApiError(err) && Array.isArray(err.details.productIds) ? (err.details.productIds as unknown[]).map(String) : undefined;
      setSaveMessage({
        tone: "error",
        text: `${messageFor(err)}${saved ? ` ${saved} ${saved === 1 ? "product was" : "products were"} saved before this.` : ""}`,
        extra,
      });
    } finally {
      setBusy(false);
    }
  }

  function hasVariants(productId: string): boolean {
    return (variants[productId] ?? []).length > 0;
  }

  if (data.status === "loading" && !data.res) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-[24px] font-semibold text-ink">Inventory</h1>
        <Skeleton lines={4} />
      </div>
    );
  }
  if (data.status === "error" && !data.res) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-[24px] font-semibold text-ink">Inventory</h1>
        <Notice tone="error" onRetry={() => void load()} retrying={false}>
          {data.error}
        </Notice>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold text-ink">Inventory</h1>
        <div role="group" aria-label="Mode" className="flex gap-2">
          {(["edit", "count"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-[44px] rounded-full px-4 text-[14px] font-semibold ${mode === m ? "bg-[#0057FB] text-white" : "border border-black/10 bg-white text-ink"}`}
            >
              {m === "edit" ? "Edit stock" : "Count stock"}
            </button>
          ))}
        </div>
      </div>

      {data.status === "error" ? (
        <Notice tone="warning" onRetry={() => void load()}>
          Couldn&apos;t refresh · {data.error}
        </Notice>
      ) : null}
      {mode === "count" ? (
        <p className="text-[14px] text-ink-muted">Enter the number you counted on the shelf, then save all counts together. Availability and store prices are unchanged in this mode.</p>
      ) : (
        <p className="text-[14px] text-ink-muted">Low stock is 3 or fewer. Store prices must not be more than the MRP. Saves are sent in batches of up to {SAVE_BATCH_MAX} products.</p>
      )}

      {productLines.length === 0 ? (
        <EmptyState title="No stock lines yet" body="Your products appear here once they are on your store's inventory." />
      ) : null}

      <ul className="flex flex-col gap-3">
        {productLines.map((line) => {
          const e = editFor(line);
          const err = errors[line.productId] ?? {};
          const parsed = parseStockInput(e.stock);
          const shownStock = parsed.ok ? parsed.value : line.stock;
          const opts = variants[line.productId] ?? [];
          const lineOptions = optionLines.filter((o) => o.productId === line.productId);
          const idBase = `inv-${line.productId}`;
          return (
            <li key={line.productId}>
              <Card className="!p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">Product {line.productId}</p>
                    <p className="text-[12px] text-ink-muted">Updated {line.updatedAt ? new Date(line.updatedAt).toLocaleDateString("en-IN") : "never"}</p>
                  </div>
                  {isLowStock(shownStock) ? <StatusChip tone="warn">Low stock</StatusChip> : null}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field id={`${idBase}-stock`} label="Stock" error={err.stock ?? null} hint={`Whole number, 0 to ${STOCK_MAX.toLocaleString("en-IN")}`}>
                    <TextInput
                      id={`${idBase}-stock`}
                      inputMode="numeric"
                      value={e.stock}
                      onChange={(ev) => setEdit(line, { stock: ev.target.value })}
                      invalid={!!err.stock}
                      error={err.stock ?? null}
                    />
                  </Field>
                  {mode === "edit" && opts.length === 0 ? (
                    <Field id={`${idBase}-price`} label="Store price (₹)" error={err.price ?? null} hint="Optional. Leave empty to use the catalogue price.">
                      <TextInput
                        id={`${idBase}-price`}
                        inputMode="decimal"
                        value={e.price}
                        onChange={(ev) => setEdit(line, { price: ev.target.value })}
                        invalid={!!err.price}
                        error={err.price ?? null}
                      />
                    </Field>
                  ) : null}
                </div>

                {mode === "edit" ? (
                  <label className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] text-ink">
                    <input type="checkbox" className="h-5 w-5" checked={e.isAvailable} onChange={(ev) => setEdit(line, { isAvailable: ev.target.checked })} />
                    Available to customers
                  </label>
                ) : null}

                {opts.length > 0 ? (
                  <div className="mt-4 border-t border-black/10 pt-3">
                    <p className="text-[13px] font-semibold text-ink-muted">Options (read-only, set by the GlowVai catalogue)</p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {opts.map((v) => {
                        const own = lineOptions.find((o) => o.variantId === v.id);
                        return (
                          <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-ink">
                            <span>{v.label}</span>
                            <span className="text-ink-muted">
                              {own ? `${own.stock} in stock${own.isAvailable ? "" : ", not available"}` : "No stock line yet"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>

      {saveMessage ? (
        <Notice tone={saveMessage.tone === "success" ? "success" : "error"}>
          {saveMessage.text}
          {saveMessage.extra && saveMessage.extra.length ? <span className="block">Not on sale on GlowVai: {saveMessage.extra.join(", ")}</span> : null}
        </Notice>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-[14px] text-ink-muted">
            {dirtyIds.length === 0 ? "No changes" : `${dirtyIds.length} changed`}
          </span>
          <Button
            loading={busy}
            disabled={busy || dirtyIds.length === 0}
            onClick={() => void save()}
          >
            {mode === "count" ? "Save counts" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
