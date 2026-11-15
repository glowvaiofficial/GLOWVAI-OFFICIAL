import { NextResponse } from "next/server";

/**
 * Old public form routes (contact, data-request, feedback, lead, lead/image, newsletter POST, order-intent, waitlist).
 * Nothing calls them any more: the site's forms post straight to the Google Sheet (lib/forms/submit.ts), and neither the
 * admin, the vendor app nor the customer app uses them. While they stayed live, anyone could use them to save rows and
 * send email, so each one now answers 410 Gone before doing any work.
 *
 * The route code is kept unchanged below the check. To bring the routes back, set this to false.
 * The newsletter GET (the confirm link in emails already sent) is not affected.
 */
export const RETIRED_FORM_ROUTES: boolean = true;

export function retiredRoute(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "This form is no longer available here. Please use the form on glowvai.in." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
