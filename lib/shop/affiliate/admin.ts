// Staff hooks for the affiliate programme. Exported only: the GlowVai admin team builds the screens and calls these from
// their own signed routes. Every decision is validated, written in one transaction with its audit record, and carries the
// staff actor's name. Nothing here reads or returns a customer's contact details.
import type { GrowthRepo } from "../growth/repo";
import { AFFILIATE_CONFIG } from "./config";
import { applicationPath, auditPath, linkPath, newId, pickFreeCode, userPath } from "./store";
import { checkTransition, isAffiliateStatus, type AffiliateStatus } from "./state";
import { safeHttpUrl } from "./url";

export type StaffResult<T = Record<string, never>> = ({ ok: true } & T) | { ok: false; code: string; message: string };

function checkActor(actor: unknown): { ok: true; actor: string } | { ok: false; code: "BAD_ACTOR"; message: string } {
  const name = typeof actor === "string" ? actor.trim() : "";
  if (name.length < 2 || name.length > 80) return { ok: false, code: "BAD_ACTOR", message: "Name the staff member making this change." };
  return { ok: true, actor: name };
}

function checkReason(reason: unknown): { ok: true; reason: string | null } | { ok: false; code: "BAD_REASON"; message: string } {
  if (reason === undefined || reason === null || reason === "") return { ok: true, reason: null };
  if (typeof reason !== "string" || reason.trim().length > AFFILIATE_CONFIG.reasonMax) {
    return { ok: false, code: "BAD_REASON", message: `The reason must be at most ${AFFILIATE_CONFIG.reasonMax} characters.` };
  }
  return { ok: true, reason: reason.trim() || null };
}

export interface ApplicationListRow {
  applicationId: string;
  status: AffiliateStatus;
  displayName: string;
  primaryChannel: string;
  // Host of the channel link only ("instagram.com/..."), never the full path or the customer's account id.
  channelHost: string | null;
  audienceRange: string;
  categories: string[];
  uidMasked: string;
  linkCode: string | null;
  createdAt: number;
}

export function maskUid(uid: string): string {
  return uid.length <= 6 ? "••••" : `${uid.slice(0, 3)}••••${uid.slice(-2)}`;
}

function channelHost(value: unknown): string | null {
  const url = safeHttpUrl(value);
  return url ? new URL(url).host : null;
}

// Applications for the review queue, newest first. Filters: an optional status and a limit (1 to 100).
export async function listAffiliateApplications(
  repo: GrowthRepo,
  filters: { status?: unknown; limit?: unknown } = {},
): Promise<StaffResult<{ rows: ApplicationListRow[] }>> {
  if (filters.status !== undefined && !isAffiliateStatus(filters.status)) return { ok: false, code: "BAD_FILTER", message: "Unknown status." };
  const limit = filters.limit === undefined ? 50 : Number(filters.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return { ok: false, code: "BAD_FILTER", message: "The limit must be 1 to 100." };
  const where: Array<[string, "==", unknown]> = filters.status ? [["status", "==", filters.status]] : [];
  const snaps = await repo.query("affiliateApplications", where, { limit, orderByDesc: "createdAt" });
  const rows: ApplicationListRow[] = snaps.map((s) => {
    const d = s.data() ?? {};
    return {
      applicationId: s.id,
      status: d.status as AffiliateStatus,
      displayName: String(d.displayName ?? ""),
      primaryChannel: String(d.primaryChannel ?? ""),
      channelHost: channelHost(d.channelUrl),
      audienceRange: String(d.audienceRange ?? ""),
      categories: Array.isArray(d.categories) ? d.categories.map(String) : [],
      uidMasked: maskUid(String(d.uid ?? "")),
      linkCode: typeof d.linkCode === "string" ? d.linkCode : null,
      createdAt: Number(d.createdAt ?? 0),
    };
  });
  return { ok: true, rows };
}

// Moves an application to a new status. REJECTED and SUSPENDED need a reason. APPROVED creates the one link (or
// reactivates the existing one). SUSPENDED and REJECTED switch the link off, so it stops counting clicks and orders.
export async function reviewAffiliate(
  repo: GrowthRepo,
  input: { applicationId: string; status: unknown; reason?: unknown; actor: unknown; now: number },
): Promise<StaffResult<{ status: AffiliateStatus; linkCode: string | null }>> {
  const who = checkActor(input.actor);
  if (!who.ok) return who;
  const why = checkReason(input.reason);
  if (!why.ok) return why;
  if (!isAffiliateStatus(input.status)) return { ok: false, code: "INVALID_STATUS", message: "Unknown status." };
  const to = input.status;
  if (typeof input.applicationId !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(input.applicationId)) {
    return { ok: false, code: "NOT_FOUND", message: "Application not found." };
  }
  const id = input.applicationId;

  return repo.runTx(async (tx) => {
    const app = await tx.get(repo.ref(applicationPath(id)));
    if (!app.exists) return { ok: false, code: "NOT_FOUND", message: "Application not found." };
    const data = app.data() ?? {};
    const from = data.status as AffiliateStatus;
    const check = checkTransition(from, to, why.reason);
    if (!check.ok) return { ok: false, code: check.code, message: check.message };
    const uid = String(data.uid ?? "");
    const user = await tx.get(repo.ref(userPath(uid)));
    const userData = user.data() ?? {};
    if (userData.activeApplicationId !== id) return { ok: false, code: "NOT_ACTIVE", message: "This application is no longer the open one." };

    // Reads first: the existing link, and a free code when a new link is needed.
    const knownCode = typeof data.linkCode === "string" && data.linkCode ? data.linkCode : typeof userData.linkCode === "string" ? userData.linkCode : null;
    const linkSnap = knownCode ? await tx.get(repo.ref(linkPath(knownCode))) : null;
    const newCode = to === "APPROVED" && !knownCode ? await pickFreeCode(tx, repo) : null;
    if (to === "APPROVED" && !knownCode && !newCode) {
      return { ok: false, code: "CODE_UNAVAILABLE", message: "No link code could be created. Try again." };
    }

    const linkCode = knownCode ?? newCode;
    tx.set(
      repo.ref(applicationPath(id)),
      {
        status: to,
        updatedAt: input.now,
        decidedAt: input.now,
        decidedBy: who.actor,
        decisionReason: why.reason,
        ...(to === "APPROVED" ? { linkCode } : {}),
      },
      { merge: true },
    );

    if (to === "APPROVED") {
      if (knownCode && linkSnap?.exists) {
        tx.set(repo.ref(linkPath(knownCode)), { active: true, applicationId: id, updatedAt: input.now }, { merge: true });
      } else if (newCode) {
        tx.create(repo.ref(linkPath(newCode)), { code: newCode, uid, applicationId: id, active: true, createdAt: input.now, updatedAt: input.now });
      }
      tx.set(repo.ref(userPath(uid)), { linkCode, updatedAt: input.now }, { merge: true });
    }
    if ((to === "SUSPENDED" || to === "REJECTED") && knownCode && linkSnap?.exists) {
      tx.set(repo.ref(linkPath(knownCode)), { active: false, updatedAt: input.now }, { merge: true });
    }
    if (to === "REJECTED") {
      tx.set(repo.ref(userPath(uid)), { activeApplicationId: null, lastApplicationId: id, updatedAt: input.now }, { merge: true });
    }

    tx.create(repo.ref(auditPath(newId())), {
      at: input.now,
      action: "REVIEW",
      actor: who.actor,
      applicationId: id,
      linkCode,
      from,
      to,
      reason: why.reason,
    });
    return { ok: true, status: to, linkCode: to === "REJECTED" ? null : linkCode };
  });
}

// Switches one affiliate link on or off. Turning a link on needs its application to be APPROVED. Turning it off needs a
// reason. Audited.
export async function setAffiliateLinkActive(
  repo: GrowthRepo,
  input: { linkCode: string; active: boolean; reason?: unknown; actor: unknown; now: number },
): Promise<StaffResult<{ active: boolean }>> {
  const who = checkActor(input.actor);
  if (!who.ok) return who;
  const why = checkReason(input.reason);
  if (!why.ok) return why;
  if (typeof input.active !== "boolean") return { ok: false, code: "INVALID_STATUS", message: "Say whether the link is on or off." };
  if (!input.active && (!why.reason || why.reason.length < 3)) {
    return { ok: false, code: "REASON_REQUIRED", message: "A reason of at least 3 characters is required to switch a link off." };
  }
  if (typeof input.linkCode !== "string" || !/^[A-Za-z0-9]{6,20}$/.test(input.linkCode)) return { ok: false, code: "NOT_FOUND", message: "Link not found." };
  const code = input.linkCode;

  return repo.runTx(async (tx) => {
    const link = await tx.get(repo.ref(linkPath(code)));
    if (!link.exists) return { ok: false, code: "NOT_FOUND", message: "Link not found." };
    const ld = link.data() ?? {};
    const appId = String(ld.applicationId ?? "");
    const app = appId ? await tx.get(repo.ref(applicationPath(appId))) : null;
    if (input.active && app?.data()?.status !== "APPROVED") {
      return { ok: false, code: "NOT_APPROVED", message: "A link can only be switched on for an approved affiliate." };
    }
    if (ld.active === input.active) return { ok: true, active: input.active };
    tx.set(repo.ref(linkPath(code)), { active: input.active, updatedAt: input.now }, { merge: true });
    tx.create(repo.ref(auditPath(newId())), {
      at: input.now,
      action: input.active ? "LINK_ON" : "LINK_OFF",
      actor: who.actor,
      applicationId: appId || null,
      linkCode: code,
      from: ld.active === true ? "ON" : "OFF",
      to: input.active ? "ON" : "OFF",
      reason: why.reason,
    });
    return { ok: true, active: input.active };
  });
}
