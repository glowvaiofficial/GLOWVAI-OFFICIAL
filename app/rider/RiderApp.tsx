"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

// The rider screen. It talks only to /api/rider/* on this site. Nothing secret is in the bundle: the session is an
// HttpOnly cookie the browser sends by itself. The address and phone appear only after "Start delivery".

type Payment = { method: "COD" | "ONLINE"; amountToCollect: number | null; paid: boolean };
type Row = {
  orderId: string;
  status: string;
  itemsCount: number;
  area: string;
  pincode: string;
  payment: Payment;
  cashCollected: boolean;
  exceptionOpen: boolean;
  cancelled: boolean;
};
type Details = {
  orderId: string;
  status: string;
  customerFirstName: string;
  fullAddress: string;
  landmark: string;
  area: string;
  city: string;
  pincode: string;
  customerPhone: string | null;
  payment: Payment;
  itemsCount: number;
  cashCollected: boolean;
  exceptionOpen: boolean;
};

class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function api<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string };
  if (!res.ok || !data.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", res.status, data.code || "");
  return data as T;
}

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const STATUS_LABEL: Record<string, string> = {
  READY_FOR_PICKUP: "Ready for pickup",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for delivery",
};

export function RiderApp() {
  const [phase, setPhase] = useState<"loading" | "signedOut" | "signedIn">("loading");
  const [firstName, setFirstName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Details>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  const outCount = rows.filter((r) => r.status === "OUT_FOR_DELIVERY").length;

  const refresh = useCallback(async () => {
    const data = await api<{ deliveries: Row[] }>("/api/rider/deliveries");
    setRows(data.deliveries);
    return data.deliveries;
  }, []);

  // Session check on load. No location is read here.
  useEffect(() => {
    let alive = true;
    api<{ partner: { firstName: string } }>("/api/rider/me")
      .then(async (me) => {
        if (!alive) return;
        setFirstName(me.partner.firstName);
        setPhase("signedIn");
        await refresh();
      })
      .catch(() => {
        if (alive) setPhase("signedOut");
      });
    return () => {
      alive = false;
    };
  }, [refresh]);

  const stopSharing = useCallback(() => {
    setSharing(false);
    setGeoNote(null);
    if (watchRef.current !== null) window.clearInterval(watchRef.current);
    watchRef.current = null;
    api("/api/rider/location/stop", {}).catch(() => undefined);
  }, []);

  // While sharing: one fix now, then every 30 seconds, only while a delivery is out.
  useEffect(() => {
    if (!sharing) return;
    if (outCount === 0) {
      stopSharing();
      return;
    }
    const send = () => {
      if (!("geolocation" in navigator)) {
        setGeoNote("This phone cannot share its location.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoNote("Sharing your location every 30 seconds.");
          api("/api/rider/location", {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          }).catch((err: ApiError) => {
            if (err.status === 429) setGeoNote("Sharing is paused for a moment to save battery.");
          });
        },
        () => setGeoNote("Location is off. Allow location for this site to share it."),
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
      );
    };
    send();
    watchRef.current = window.setInterval(send, 30_000);
    return () => {
      if (watchRef.current !== null) window.clearInterval(watchRef.current);
      watchRef.current = null;
    };
  }, [sharing, outCount, stopSharing]);

  async function run(orderId: string, task: () => Promise<void>) {
    setBusy(orderId);
    setNotice(null);
    try {
      await task();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function startDelivery(orderId: string) {
    await run(orderId, async () => {
      const data = await api<{ delivery: Details }>(`/api/rider/deliveries/${encodeURIComponent(orderId)}/start`, {});
      setDetails((d) => ({ ...d, [orderId]: data.delivery }));
      setOpenId(orderId);
      await refresh();
    });
  }

  async function signIn(phone: string, pin: string) {
    setNotice(null);
    const data = await api<{ partner: { firstName: string } }>("/api/rider/signin", { phone, pin });
    setFirstName(data.partner.firstName);
    setPhase("signedIn");
    await refresh();
  }

  async function signOut() {
    if (sharing) stopSharing();
    await api("/api/rider/logout", {}).catch(() => undefined);
    setRows([]);
    setDetails({});
    setOpenId(null);
    setPhase("signedOut");
  }

  if (phase === "loading") {
    return (
      <Shell>
        <p className="py-16 text-center text-[15px] text-[#5B6478]">Loading…</p>
      </Shell>
    );
  }

  if (phase === "signedOut") {
    return (
      <Shell>
        <SignInForm onSubmit={signIn} />
      </Shell>
    );
  }

  return (
    <Shell
      right={
        <button type="button" onClick={signOut} className="min-h-[44px] rounded-full px-4 text-[14px] font-semibold text-white/90 underline-offset-4 hover:underline">
          Sign out
        </button>
      }
      title={`Hi ${firstName || "there"}`}
      subtitle="Your deliveries for today"
    >
      {notice && (
        <div role="alert" className={`mb-4 rounded-2xl px-4 py-3 text-[14px] leading-snug ${notice.tone === "ok" ? "bg-[#E8F7EE] text-[#0E6B3A]" : "bg-[#FDECEC] text-[#9B1C1C]"}`}>
          {notice.text}
        </div>
      )}

      <section aria-labelledby="deliveries-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="deliveries-heading" className="text-[18px] font-semibold tracking-tight text-[#0B1B3F]">
            Today&apos;s deliveries
          </h2>
          <button type="button" onClick={() => refresh().catch((e: Error) => setNotice({ tone: "error", text: e.message }))} className="min-h-[44px] rounded-full px-4 text-[14px] font-semibold text-[#0057FB]">
            Refresh
          </button>
        </div>

        <LocationCard sharing={sharing} outCount={outCount} note={geoNote} onStart={() => setSharing(true)} onStop={stopSharing} />

        {rows.length === 0 && (
          <div className="rounded-3xl bg-white p-6 text-center shadow-[0_8px_30px_rgba(11,27,63,0.06)]">
            <p className="text-[16px] font-semibold text-[#0B1B3F]">No deliveries right now</p>
            <p className="mt-1 text-[14px] text-[#5B6478]">New deliveries appear here when staff assign them to you.</p>
          </div>
        )}

        {rows.map((row) => {
          const open = openId === row.orderId;
          const d = details[row.orderId];
          return (
            <article key={row.orderId} className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(11,27,63,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[13px] tracking-wide text-[#5B6478]">{row.orderId}</p>
                  <p className="mt-1 text-[16px] font-semibold text-[#0B1B3F]">
                    {row.area || "Delivery area"}
                    {row.pincode ? ` · ${row.pincode}` : ""}
                  </p>
                  <p className="mt-1 text-[14px] text-[#5B6478]">
                    {row.itemsCount} {row.itemsCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <StatusChip row={row} />
              </div>

              <div className="mt-4 rounded-2xl bg-[#F4F7FF] px-4 py-3 text-[15px]">
                {row.payment.method === "COD" ? (
                  <p className="font-semibold text-[#0B1B3F]">
                    Cash on delivery · collect {money(row.payment.amountToCollect ?? 0)}
                  </p>
                ) : (
                  <p className="font-semibold text-[#0E6B3A]">Paid online</p>
                )}
              </div>

              {row.status !== "OUT_FOR_DELIVERY" && (
                <button
                  type="button"
                  disabled={busy === row.orderId || row.cancelled}
                  onClick={() => startDelivery(row.orderId)}
                  className="mt-4 min-h-[48px] w-full rounded-2xl bg-[#0057FB] px-5 text-[16px] font-semibold text-white shadow-[0_6px_18px_rgba(0,87,251,0.3)] disabled:opacity-60"
                >
                  {busy === row.orderId ? "Starting…" : "Start delivery"}
                </button>
              )}

              {row.status === "OUT_FOR_DELIVERY" && (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : row.orderId)}
                  className="mt-4 min-h-[44px] w-full rounded-2xl border border-[#D6E0FF] px-5 text-[15px] font-semibold text-[#0057FB]"
                >
                  {open ? "Hide details" : "Show address and complete delivery"}
                </button>
              )}

              {open && row.status === "OUT_FOR_DELIVERY" && (
                <DeliveryPanel
                  row={row}
                  details={d}
                  busy={busy === row.orderId}
                  onRun={(task) => run(row.orderId, task)}
                  onDone={async (message) => {
                    setOpenId(null);
                    if (message) setNotice({ tone: "ok", text: message });
                    await refresh();
                  }}
                  onDetails={(next) => setDetails((all) => ({ ...all, [row.orderId]: next }))}
                />
              )}
            </article>
          );
        })}
      </section>
    </Shell>
  );
}

function Shell({ children, title, subtitle, right }: { children: ReactNode; title?: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#F4F7FF] font-[family-name:var(--font-body),Inter,system-ui,sans-serif] text-[#0B1B3F]">
      <header className="bg-[linear-gradient(135deg,#0057FB,#0A3FC4)] px-5 pb-8 pt-6 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/80">GLOW VAI · Partner</p>
          {right}
        </div>
        {title && (
          <div className="mx-auto mt-5 max-w-md">
            <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-[15px] text-white/85">{subtitle}</p>}
          </div>
        )}
      </header>
      <div className="mx-auto mt-6 max-w-md px-4 pb-16">{children}</div>
    </div>
  );
}

function SignInForm({ onSubmit }: { onSubmit: (phone: string, pin: string) => Promise<void> }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) return setError("Enter your 10-digit mobile number.");
    if (!/^\d{6}$/.test(pin)) return setError("Enter your 6-digit PIN.");
    setBusy(true);
    try {
      await onSubmit(phone.replace(/\s/g, ""), pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(11,27,63,0.08)]" noValidate>
      <h2 className="text-[20px] font-semibold tracking-tight">Sign in</h2>
      <p className="mt-1 text-[14px] text-[#5B6478]">Use the mobile number and PIN your GLOW VAI team gave you.</p>

      <label className="mt-5 block text-[14px] font-semibold" htmlFor="rider-phone">
        Mobile number
      </label>
      <input
        id="rider-phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        maxLength={14}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="98765 43210"
        className="mt-2 min-h-[48px] w-full rounded-2xl border border-[#D6E0FF] bg-white px-4 text-[16px] outline-none focus:border-[#0057FB] focus:ring-4 focus:ring-[#0057FB]/15"
      />

      <label className="mt-4 block text-[14px] font-semibold" htmlFor="rider-pin">
        6-digit PIN
      </label>
      <input
        id="rider-pin"
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        className="mt-2 min-h-[48px] w-full rounded-2xl border border-[#D6E0FF] bg-white px-4 text-[18px] tracking-[0.3em] outline-none focus:border-[#0057FB] focus:ring-4 focus:ring-[#0057FB]/15"
      />

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-[#FDECEC] px-4 py-3 text-[14px] text-[#9B1C1C]">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="mt-6 min-h-[52px] w-full rounded-2xl bg-[#0057FB] text-[16px] font-semibold text-white shadow-[0_6px_18px_rgba(0,87,251,0.3)] disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function StatusChip({ row }: { row: Row }) {
  const label = row.cancelled ? "Cancelled" : row.exceptionOpen ? "Awaiting review" : STATUS_LABEL[row.status] ?? row.status;
  const tone = row.cancelled ? "bg-[#FDECEC] text-[#9B1C1C]" : row.exceptionOpen ? "bg-[#FFF4E0] text-[#8A5300]" : row.status === "OUT_FOR_DELIVERY" ? "bg-[#E6EEFF] text-[#0057FB]" : "bg-[#F1F3F8] text-[#3C4660]";
  return <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${tone}`}>{label}</span>;
}

function LocationCard({ sharing, outCount, note, onStart, onStop }: { sharing: boolean; outCount: number; note: string | null; onStart: () => void; onStop: () => void }) {
  if (outCount === 0 && !sharing) return null;
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(11,27,63,0.06)]">
      <p className="text-[15px] font-semibold">Share my location</p>
      <p className="mt-1 text-[14px] text-[#5B6478]">{note ?? "Lets the customer see roughly where you are while a delivery is out."}</p>
      {sharing ? (
        <button type="button" onClick={onStop} className="mt-3 min-h-[44px] w-full rounded-2xl border border-[#D6E0FF] text-[15px] font-semibold text-[#0057FB]">
          Stop sharing
        </button>
      ) : (
        <button type="button" onClick={onStart} className="mt-3 min-h-[44px] w-full rounded-2xl bg-[#E6EEFF] text-[15px] font-semibold text-[#0057FB]">
          Share my location
        </button>
      )}
    </div>
  );
}

function DeliveryPanel({
  row,
  details,
  busy,
  onRun,
  onDone,
  onDetails,
}: {
  row: Row;
  details: Details | undefined;
  busy: boolean;
  onRun: (task: () => Promise<void>) => Promise<void>;
  onDone: (message?: string) => Promise<void>;
  onDetails: (d: Details) => void;
}) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<"CUSTOMER_NO_CODE" | "CODE_NOT_WORKING">("CUSTOMER_NO_CODE");
  const [note, setNote] = useState("");
  const [askException, setAskException] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // A reload loses the address from memory: start again returns it without changing the order.
  // Asked once per mount: a failed call is not retried in a loop.
  const asked = useRef(false);
  useEffect(() => {
    if (details || asked.current) return;
    asked.current = true;
    api<{ delivery: Details }>(`/api/rider/deliveries/${encodeURIComponent(row.orderId)}/start`, {})
      .then((data) => onDetails(data.delivery))
      .catch(() => undefined);
    // onDetails is a fresh closure on every render; the once-per-mount guard above keeps this from repeating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details, row.orderId]);

  if (!details) return <p className="mt-4 text-[14px] text-[#5B6478]">Loading address…</p>;

  const isCod = details.payment.method === "COD";
  const recorded = details.cashCollected || row.cashCollected;

  return (
    <div className="mt-5 space-y-5 border-t border-[#E6EBF5] pt-5">
      <section aria-label="Delivery address">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#5B6478]">Deliver to</p>
        <p className="mt-1 text-[16px] font-semibold">{details.customerFirstName || "Customer"}</p>
        <p className="mt-1 text-[15px] leading-relaxed">
          {details.fullAddress}
          {details.landmark ? `, near ${details.landmark}` : ""}
          <br />
          {[details.area, details.city, details.pincode].filter(Boolean).join(", ")}
        </p>
        {details.customerPhone && (
          <a href={`tel:+91${details.customerPhone}`} className="mt-3 inline-flex min-h-[44px] items-center rounded-2xl bg-[#E6EEFF] px-5 text-[15px] font-semibold text-[#0057FB]">
            Call customer
          </a>
        )}
      </section>

      {isCod && !recorded && (
        <section aria-label="Cash collection" className="space-y-3">
          <label htmlFor={`amount-${row.orderId}`} className="block text-[14px] font-semibold">
            Cash collected (₹, exact total)
          </label>
          <input
            id={`amount-${row.orderId}`}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder={`Order total ${money(details.payment.amountToCollect ?? 0)}`}
            className="min-h-[48px] w-full rounded-2xl border border-[#D6E0FF] px-4 text-[16px] outline-none focus:border-[#0057FB]"
          />
          <button
            type="button"
            disabled={busy || !amount}
            onClick={() =>
              onRun(async () => {
                await api(`/api/rider/deliveries/${encodeURIComponent(row.orderId)}/cash`, { amount: Number(amount) });
                setAmount("");
                onDetails({ ...details, cashCollected: true });
              })
            }
            className="min-h-[48px] w-full rounded-2xl border border-[#0057FB] text-[16px] font-semibold text-[#0057FB] disabled:opacity-50"
          >
            Record cash collected
          </button>
        </section>
      )}
      {isCod && recorded && <p className="rounded-2xl bg-[#E8F7EE] px-4 py-3 text-[14px] font-semibold text-[#0E6B3A]">Cash recorded.</p>}

      {!askException && (
        <section aria-label="Complete with code" className="space-y-3">
          <label htmlFor={`code-${row.orderId}`} className="block text-[14px] font-semibold">
            Customer&apos;s 4-digit delivery code
          </label>
          <input
            id={`code-${row.orderId}`}
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="• • • •"
            className="min-h-[52px] w-full rounded-2xl border border-[#D6E0FF] px-4 text-center text-[22px] tracking-[0.4em] outline-none focus:border-[#0057FB]"
          />
          {localError && (
            <p role="alert" className="text-[14px] text-[#9B1C1C]">
              {localError}
            </p>
          )}
          <button
            type="button"
            disabled={busy || code.length !== 4 || (isCod && !recorded)}
            onClick={() =>
              onRun(async () => {
                setLocalError(null);
                try {
                  await api(`/api/rider/deliveries/${encodeURIComponent(row.orderId)}/code`, { code });
                  setCode("");
                  await onDone("Delivered. Thank you.");
                } catch (err) {
                  // Shown next to the code field only (not also in the page notice).
                  setCode("");
                  setLocalError(err instanceof Error ? err.message : "That code did not work.");
                }
              })
            }
            className="min-h-[52px] w-full rounded-2xl bg-[#0057FB] text-[16px] font-semibold text-white disabled:opacity-50"
          >
            Confirm delivery
          </button>
          {isCod && !recorded && <p className="text-[13px] text-[#5B6478]">Record the cash first, then confirm.</p>}
          <button type="button" onClick={() => setAskException(true)} className="min-h-[44px] w-full text-[15px] font-semibold text-[#8A5300] underline-offset-4 hover:underline">
            The customer cannot give a code
          </button>
        </section>
      )}

      {askException && (
        <section aria-label="Delivery exception" className="space-y-3 rounded-2xl bg-[#FFF8EC] p-4">
          <p className="text-[15px] font-semibold text-[#8A5300]">Mark as delivered without code</p>
          <p className="text-[13px] leading-snug text-[#6B4A10]">
            This is not a delivery yet. Staff review it before the order closes. Use it only when the customer cannot give you the code.
          </p>
          <fieldset className="space-y-2">
            <legend className="sr-only">Reason</legend>
            {(
              [
                ["CUSTOMER_NO_CODE", "Customer does not have the code"],
                ["CODE_NOT_WORKING", "Code is not working"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex min-h-[44px] items-center gap-3 text-[15px]">
                <input type="radio" name={`reason-${row.orderId}`} checked={reason === value} onChange={() => setReason(value)} className="h-5 w-5 accent-[#0057FB]" />
                {label}
              </label>
            ))}
          </fieldset>
          <textarea
            aria-label="Note for staff (optional)"
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note for staff (optional)"
            rows={2}
            className="w-full rounded-2xl border border-[#E6D6B0] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#8A5300]"
          />
          <button
            type="button"
            disabled={busy || row.exceptionOpen}
            onClick={() =>
              onRun(async () => {
                await api(`/api/rider/deliveries/${encodeURIComponent(row.orderId)}/exception`, { reason, note });
                setAskException(false);
                setNote("");
                await onDone("Recorded. Staff will review this delivery before it is closed.");
              })
            }
            className="min-h-[48px] w-full rounded-2xl bg-[#8A5300] text-[16px] font-semibold text-white disabled:opacity-50"
          >
            Mark as delivered without code
          </button>
          <button type="button" onClick={() => setAskException(false)} className="min-h-[44px] w-full text-[15px] font-semibold text-[#0057FB]">
            Back to the code
          </button>
        </section>
      )}
    </div>
  );
}
