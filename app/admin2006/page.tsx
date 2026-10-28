"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Lock,
  Unlock,
  Search,
  Download,
  RefreshCw,
  Sparkles,
  ImageIcon,
  Users,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Mail,
  Send,
  Eye,
  ExternalLink,
} from "lucide-react";
import { AdminLead } from "@/lib/adminData";
import { fetchLeadsFromSheet } from "@/lib/googleSheet";
import { generateGlowVaiEmailHTML, sendResendEmail, isEmailProxyConfigured } from "@/lib/resend";

export default function AdminDashboardPage() {
  // 1. Authentication State (Passcode 2006)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 2. Data Store State
  const [activeTab, setActiveTab] = useState<"leads" | "emails">("leads");
  const [searchQuery, setSearchQuery] = useState("");

  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // 3. Email Dispatcher State
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("Your GLOW VAI Custom AI Skin Analysis Report");
  const [emailTemplateType, setEmailTemplateType] = useState<"scan_report" | "order_confirmation" | "waitlist_alert" | "support_reply">("scan_report");
  const [emailCustomerName, setEmailCustomerName] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setIsLoadingLeads(true);
    setLoadError(null);
    try {
      const rows = await fetchLeadsFromSheet();
      setLeads(rows.reverse()); // newest first
      setLastSyncedAt(new Date());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load leads from the sheet.");
    } finally {
      setIsLoadingLeads(false);
    }
  }, []);

  // Check stored auth session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAuth = sessionStorage.getItem("gv_admin_authed");
      if (storedAuth === "true") {
        setIsAuthenticated(true);
      }
      setIsCheckingAuth(false);
    }
  }, []);

  // Once authenticated, load real data
  useEffect(() => {
    if (isAuthenticated) {
      loadLeads();
    }
  }, [isAuthenticated, loadLeads]);

  // Handle Passcode Login (Code 2006)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === "2006") {
      setIsAuthenticated(true);
      setAuthError(false);
      sessionStorage.setItem("gv_admin_authed", "true");
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("gv_admin_authed");
    setPasscode("");
  };

  // Dispatch Email via Resend API (Client-side directly using Resend Key)
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient || !emailRecipient.includes("@")) return;

    setIsSendingEmail(true);
    setEmailSendStatus(null);

    try {
      const result = await sendResendEmail({
        to: emailRecipient,
        subject: emailSubject,
        templateType: emailTemplateType,
        data: {
          name: emailCustomerName || "Valued Glow Customer",
        },
      });

      setIsSendingEmail(false);

      if (result.ok) {
        setEmailSendStatus(`Sent via Resend API to ${emailRecipient}`);
      } else {
        setEmailSendStatus(`Resend API error: ${result.error || "unknown"}`);
      }
    } catch (err) {
      setIsSendingEmail(false);
      setEmailSendStatus(err instanceof Error ? `Error: ${err.message}` : "Email dispatch failed.");
    }
  };

  const handleExportCSV = (data: AdminLead[], filename: string) => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]).filter((k) => k !== "rowIndex") as (keyof AdminLead)[];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [keys.join(","), ...data.map((row) => keys.map((k) => `"${String(row[k]).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-ink-subtle flex items-center justify-center text-ink-muted">
        <RefreshCw className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  // -------------------------------------------------------------
  // 1. GLOW VAI BRAND AUTHENTICATION LOCK SCREEN (Passcode: 2006)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-ink-subtle to-skymist/50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-ink/10 rounded-[32px] p-8 sm:p-10 shadow-2xl space-y-6 text-ink text-center relative overflow-hidden">

          <div className="w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center mx-auto shadow-lg shadow-brand/30">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand bg-skymist px-3 py-1 rounded-full border border-brand/20 inline-block">
              MASTER SYSTEM ACCESS
            </span>
            <h1 className="font-display font-bold text-3xl text-ink">
              GLOW VAI Admin Console
            </h1>
            <p className="text-xs text-ink-muted font-medium">
              Enter security passcode to view real face-scan leads and send Resend emails.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setAuthError(false);
                }}
                placeholder="Enter Admin Passcode"
                className="w-full px-4 py-4 rounded-2xl bg-ink-subtle border-2 border-ink/10 text-ink placeholder-ink-light text-base font-bold text-center focus:border-brand focus:bg-white focus:outline-none transition-all shadow-xs"
              />
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>Invalid Passcode. Access Denied.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl bg-brand hover:bg-brand-dark text-white font-semibold text-sm shadow-xl shadow-brand/25 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Enter Master Console</span>
            </button>
          </form>

          <div className="pt-4 border-t border-ink/10 text-[11px] text-ink-light font-medium">
            GLOW VAI Vijayawada & Visakhapatnam
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. MAIN GLOW VAI BRAND ADMIN DASHBOARD (UNLOCKED)
  // -------------------------------------------------------------
  const completedLeads = leads.filter((l) => l.name && l.phone);
  const leadsWithPhoto = leads.filter((l) => l.image_url);
  const uniquePhones = new Set(leads.filter((l) => l.phone).map((l) => l.phone)).size;
  const emailProxyReady = isEmailProxyConfigured();

  const filteredLeads = leads.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.phone.includes(searchQuery) ||
      l.email.toLowerCase().includes(q) ||
      l.skin_concern.toLowerCase().includes(q) ||
      l.location.toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-ink-subtle text-ink font-sans pb-20">

      {/* Brand Header Banner */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-ink/10 px-4 sm:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-2xl tracking-tight text-brand">
              GLOW VAI
            </span>
            <span className="text-[10px] font-semibold tracking-widest text-ink uppercase bg-yellow px-2 py-0.5 rounded-md border border-yellow-hover">
              Admin Portal
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLeads}
            disabled={isLoadingLeads}
            className="hidden sm:flex items-center gap-2 bg-skymist text-brand hover:bg-skymist/70 px-3.5 py-2 rounded-xl border border-brand/20 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLeads ? "animate-spin" : ""}`} />
            <span>{isLoadingLeads ? "Syncing..." : "Refresh from Sheet"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ink-subtle hover:bg-blush text-ink-muted hover:text-coral text-xs font-bold border border-ink/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Lock / Exit</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8">

        {loadError && (
          <div className="bg-blush border border-coral/30 text-ink p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-coral shrink-0" />
              <span>Couldn&apos;t load real leads: {loadError}</span>
            </div>
            <button onClick={loadLeads} className="text-coral font-semibold text-xs underline">
              Retry
            </button>
          </div>
        )}

        {lastSyncedAt && !loadError && (
          <div className="text-[11px] text-ink-light font-semibold">
            Last synced from Google Sheet: {lastSyncedAt.toLocaleString()}
          </div>
        )}

        {/* Summary Metric Cards (all derived from real sheet data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

          <div className="bg-white p-6 rounded-3xl border border-ink/10 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-light uppercase tracking-wider">Total Rows Captured</span>
              <div className="w-10 h-10 rounded-2xl bg-skymist text-brand flex items-center justify-center border border-brand/10">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <p className="font-display font-bold text-3xl text-ink">{leads.length}</p>
            <p className="text-xs text-ink-muted font-semibold">All scan sessions, including incomplete</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-ink/10 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-light uppercase tracking-wider">Completed Leads</span>
              <div className="w-10 h-10 rounded-2xl bg-mint text-ink flex items-center justify-center border border-mint">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="font-display font-bold text-3xl text-ink">{completedLeads.length}</p>
            <p className="text-xs text-ink-muted font-semibold">{uniquePhones} unique phone numbers</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-ink/10 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-light uppercase tracking-wider">Leads With Photo</span>
              <div className="w-10 h-10 rounded-2xl bg-yellow text-ink flex items-center justify-center border border-yellow-hover">
                <ImageIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="font-display font-bold text-3xl text-ink">{leadsWithPhoto.length}</p>
            <p className="text-xs text-ink-muted font-semibold">Face scan image saved to Drive</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-ink/10 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-light uppercase tracking-wider">Email Proxy</span>
              <div className="w-10 h-10 rounded-2xl bg-skymist text-brand flex items-center justify-center border border-brand/10">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            <p className="font-display font-bold text-lg text-brand truncate">{emailProxyReady ? "Connected" : "Not configured"}</p>
            <p className="text-xs text-brand font-semibold">{emailProxyReady ? "Ready to send" : "Set NEXT_PUBLIC_EMAIL_PROXY_URL"}</p>
          </div>

        </div>

        {/* Tab Navigation & Action Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 rounded-3xl border border-ink/10 shadow-sm">

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("leads")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "leads"
                  ? "bg-brand text-white shadow-md"
                  : "text-ink-muted hover:text-ink hover:bg-ink-subtle"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Face Scan Leads ({leads.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("emails")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "emails"
                  ? "bg-brand text-white shadow-md"
                  : "text-ink-muted hover:text-ink hover:bg-ink-subtle"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Resend Mailer</span>
            </button>
          </div>

          {activeTab === "leads" && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-60">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rows..."
                  className="w-full px-3.5 py-2 rounded-xl bg-ink-subtle border border-ink/10 text-ink text-xs font-semibold placeholder-ink-light focus:outline-none focus:border-brand"
                />
                <Search className="w-4 h-4 text-ink-light absolute right-3 top-2.5" />
              </div>

              <button
                onClick={() => handleExportCSV(leads, "glowvai_leads")}
                disabled={leads.length === 0}
                className="px-3.5 py-2 bg-ink-subtle hover:bg-ink/10 text-ink-muted font-bold text-xs rounded-xl flex items-center gap-1.5 border border-ink/10 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-brand" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: FACE SCAN LEADS TABLE (real data from Google Sheet) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "leads" && (
          <div className="bg-white rounded-3xl border border-ink/10 overflow-hidden shadow-lg">
            {isLoadingLeads && leads.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-ink-muted">
                <RefreshCw className="w-6 h-6 animate-spin text-brand" />
                <span className="text-xs font-semibold">Loading real leads from Google Sheet...</span>
              </div>
            ) : leads.length === 0 && !loadError ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-ink-muted text-center">
                <Users className="w-8 h-8 text-ink-light" />
                <span className="text-xs font-semibold">No face-scan sessions recorded yet.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-ink-subtle text-ink-muted uppercase text-[10px] font-semibold tracking-wider border-b border-ink/10">
                    <tr>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Phone / Email</th>
                      <th className="p-4">Skin Concern</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Device</th>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4 text-right">Photo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 font-medium">
                    {filteredLeads.map((item) => (
                      <tr key={item.rowIndex} className="hover:bg-skymist/40 transition-colors">
                        <td className="p-4 font-bold text-ink">{item.name || "-"}</td>
                        <td className="p-4 text-ink-muted">
                          <div className="font-semibold text-ink">{item.phone || "-"}</div>
                          <div className="text-[10px] text-ink-light">{item.email || "-"}</div>
                        </td>
                        <td className="p-4 text-ink font-semibold">{item.skin_concern || "-"}</td>
                        <td className="p-4 text-ink-muted font-semibold">{item.location || "-"}</td>
                        <td className="p-4 text-ink-light">
                          <div>{item.browser || "-"}</div>
                          <div className="text-[10px]">{item.os}</div>
                        </td>
                        <td className="p-4 text-ink-light">{item.timestamp || "-"}</td>
                        <td className="p-4 text-right">
                          {item.image_url ? (
                            <a
                              href={item.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-brand font-semibold hover:underline"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-ink-light">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: RESEND EMAIL TEMPLATES & DISPATCH CONSOLE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "emails" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Form Left (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-lg space-y-5">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-brand uppercase tracking-widest bg-skymist px-2.5 py-0.5 rounded-full border border-brand/20">
                  Resend Email Integration
                </span>
                <h2 className="font-display font-bold text-2xl text-ink">Dispatch Styled Email</h2>
                <p className="text-xs text-ink-light font-medium">
                  Send a GLOW VAI branded email using the configured Resend API key.
                </p>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-ink-muted block">Recipient Email Address *</label>
                  <input
                    type="email"
                    required
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="customer@glowvai.in"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-ink-subtle border border-ink/20 text-ink font-semibold focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-muted block">Customer Name</label>
                  <input
                    type="text"
                    value={emailCustomerName}
                    onChange={(e) => setEmailCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-ink-subtle border border-ink/20 text-ink font-semibold focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-muted block">Select Email Template</label>
                  <select
                    value={emailTemplateType}
                    onChange={(e) => {
                      const val = e.target.value as typeof emailTemplateType;
                      setEmailTemplateType(val);
                      if (val === "scan_report") setEmailSubject("Your GLOW VAI Custom AI Skin Analysis Report");
                      if (val === "order_confirmation") setEmailSubject("Order Confirmed | GLOW VAI 15-Min Express");
                      if (val === "support_reply") setEmailSubject("GLOW VAI Support Response");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-ink-subtle border border-ink/20 text-ink font-bold focus:outline-none focus:border-brand"
                  >
                    <option value="scan_report">AI Face Scan Skin Report Template</option>
                    <option value="order_confirmation">Express Order Confirmation Template</option>
                    <option value="support_reply">Customer Support Reply Template</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-muted block">Subject Line</label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-ink-subtle border border-ink/20 text-ink font-semibold focus:outline-none focus:border-brand"
                  />
                </div>

                {emailSendStatus && (
                  <div className="bg-skymist border border-brand/20 text-brand p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{emailSendStatus}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-semibold text-xs shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingEmail ? "Sending via Resend API..." : "Send Email Now"}</span>
                </button>
              </form>
            </div>

            {/* Live Template HTML Preview Right (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-ink/10 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <span className="text-xs font-semibold text-ink-muted flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-brand" />
                  <span>Live GLOW VAI Styled Template Preview</span>
                </span>
                <span className="text-[10px] font-bold bg-mint text-ink px-2.5 py-0.5 rounded-full border border-mint">
                  Resend Ready
                </span>
              </div>

              <div className="border border-ink/10 rounded-2xl p-2 bg-ink-subtle overflow-hidden max-h-[500px] overflow-y-auto">
                <iframe
                  srcDoc={generateGlowVaiEmailHTML(emailTemplateType, {
                    name: emailCustomerName || "Valued Glow Customer",
                  })}
                  className="w-full h-[450px] rounded-xl border-none"
                  title="Email Template Preview"
                />
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
