export const PUBLIC_FORMS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwzeYeD59OvwAHSyJ4BAxQrwk44EP6FlJ6KyhTs8XYSjaLVPd3-Svg8EsMseSfVvNvw/exec";

export type PublicTab = "Contact" | "Waitlist" | "Newsletter" | "DataRequests" | "Feedback" | "OrderIntents";

/**
 * Sends a public form submission to the Google Sheet backend.
 * Returns false on any failure so callers can show their own error state.
 */
export async function submitPublicForm(tab: PublicTab, data: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(PUBLIC_FORMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "public_submit", tab, data }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return Boolean(json && json.ok);
  } catch {
    return false;
  }
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}
