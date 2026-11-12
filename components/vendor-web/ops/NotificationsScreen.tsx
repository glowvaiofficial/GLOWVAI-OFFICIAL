"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/vendor-web/ui/Button";
import { Card } from "@/components/vendor-web/ui/Card";
import { Notice } from "@/components/vendor-web/ui/Notice";
import { registerPushToken } from "@/lib/vendor-web/ops/api";
import { messageFor } from "@/lib/vendor-web/ops/copy";
import { VENDOR_APP_NAME, vendorAuth } from "@/lib/vendor-web/firebase";

const SERVICE_WORKER_PATH = "/firebase-messaging-sw.js";

type Support = "checking" | "available" | "unavailable";

/** Browser APIs needed for Web Push, checked without asking for anything. */
function browserHasPush(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function NotificationsScreen() {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";
  const [support, setSupport] = useState<Support>("checking");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);

  // Only checks support. Permission is never requested on load.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!vapidKey || !browserHasPush()) {
        setSupport("unavailable");
        return;
      }
      try {
        const { isSupported } = await import("firebase/messaging");
        const ok = await isSupported();
        if (!cancelled) setSupport(ok ? "available" : "unavailable");
      } catch {
        if (!cancelled) setSupport("unavailable");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  async function turnOn() {
    setBusy(true);
    setResult(null);
    try {
      if (Notification.permission === "denied") {
        setResult({ tone: "warning", text: "Notifications are blocked for this site. Allow them in your browser settings, then try again." });
        return;
      }
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setResult({ tone: "warning", text: "Notifications were not turned on." });
        return;
      }

      const [{ getApp }, { getMessaging, getToken }] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
      vendorAuth(); // Creates the vendor's named Firebase app if it does not exist yet.
      const messaging = getMessaging(getApp(VENDOR_APP_NAME));
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (!token) {
        setResult({ tone: "error", text: "This browser could not get a notification token. Try again later." });
        return;
      }
      const res = await registerPushToken(token);
      setResult({ tone: "success", text: res.devices > 1 ? `Notifications are on for this browser. ${res.devices} devices are registered.` : "Notifications are on for this browser." });
    } catch (err) {
      setResult({ tone: "error", text: messageFor(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-semibold text-ink">Notifications</h1>

      <Card title="Order alerts in this browser" description="Get an alert when a new order is offered to your store. You choose this; nothing is asked when the page opens.">
        {support === "checking" ? <p className="text-[14px] text-ink-muted">Checking this browser…</p> : null}
        {support === "unavailable" ? <p className="text-[15px] text-ink">Notifications are not set up yet.</p> : null}
        {support === "available" ? (
          <Button loading={busy} disabled={busy} onClick={() => void turnOn()}>
            Turn on notifications
          </Button>
        ) : null}
        {result ? (
          <div className="mt-4">
            <Notice tone={result.tone === "success" ? "success" : result.tone === "warning" ? "warning" : "error"}>{result.text}</Notice>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
