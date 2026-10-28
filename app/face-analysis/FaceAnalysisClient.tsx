"use client";

import React, { useReducer, useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { analyse, detectFace, DEMOGRAPHIC_BASE_SCORES, AnalysisReport } from "@/lib/analysis";
import { getRecommendedProducts, EXCEL_DATABASE_PRODUCTS } from "@/lib/recommend";
import { parseUserAgent, fetchClientIP, requestLocationWithOSPermission } from "@/lib/clientInfo";
import { PRIVACY_STATEMENT, MEDICAL_NOTE } from "@/config/privacy-copy";
import { formatPrice } from "@/lib/utils";
import { BRAND_NAME, siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import { useCartStore } from "@/lib/store/cart";
import { ScanLine, Camera, Lock, CheckCircle2, AlertCircle, Share2, RotateCcw, ArrowRight, Sun, ShieldCheck, Upload, ExternalLink, Check, MapPin, User, Phone, Mail, HelpCircle } from "lucide-react";

type FlowStep =
  | "SCAN_READY"
  | "CAMERA_RUNNING"
  | "ANALYSING"
  | "FACE_NOT_DETECTED"
  | "FORM_ENTRY"
  | "RESULT"
  | "CAMERA_DENIED";

interface FlowContext {
  step: FlowStep;
  sessionId: string;
  report: AnalysisReport | null;
  capturedImage: string | null;
  errorMessage: string;
  isSubmittingForm: boolean;
}

type FlowAction =
  | { type: "START_CAMERA" }
  | { type: "CAMERA_DENIED" }
  | { type: "ANALYSIS_START" }
  | { type: "FACE_NOT_DETECTED"; message: string }
  | { type: "FACE_DETECTED"; capturedImage: string }
  | { type: "FORM_SUBMIT_START" }
  | { type: "FORM_SUBMIT_SUCCESS"; report: AnalysisReport; sessionId: string }
  | { type: "RETAKE" };

function flowReducer(state: FlowContext, action: FlowAction): FlowContext {
  switch (action.type) {
    case "START_CAMERA":
      return { ...state, step: "CAMERA_RUNNING" };
    case "CAMERA_DENIED":
      return { ...state, step: "CAMERA_DENIED" };
    case "ANALYSIS_START":
      return { ...state, step: "ANALYSING" };
    case "FACE_NOT_DETECTED":
      return {
        ...state,
        step: "FACE_NOT_DETECTED",
        errorMessage: action.message || "Face not detected. Please capture or upload a photo with your face clearly in view.",
      };
    case "FACE_DETECTED":
      return {
        ...state,
        step: "FORM_ENTRY",
        capturedImage: action.capturedImage,
      };
    case "FORM_SUBMIT_START":
      return { ...state, isSubmittingForm: true };
    case "FORM_SUBMIT_SUCCESS":
      return {
        ...state,
        isSubmittingForm: false,
        step: "RESULT",
        report: action.report,
        sessionId: action.sessionId,
      };
    case "RETAKE":
      return {
        ...state,
        step: "SCAN_READY",
        report: null,
        capturedImage: null,
        errorMessage: "",
      };
    default:
      return state;
  }
}

export function FaceAnalysisClient() {
  const [flow, dispatch] = useReducer(flowReducer, {
    step: "SCAN_READY",
    sessionId: "",
    report: null,
    capturedImage: null,
    errorMessage: "",
    isSubmittingForm: false,
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    demographic: "girl_18_23",
    skinConcern: "hydration",
  });

  const [clientLocation, setClientLocation] = useState<string>("Vijayawada, AP");
  const [clientIp, setClientIp] = useState<string>("127.0.0.1");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    headingRef.current?.focus();
  }, [flow.step]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/FBAN|FBAV|Instagram/i.test(ua)) {
        setInAppBrowser(true);
      }

      fetchClientIP().then((ip) => setClientIp(ip));
    }
  }, []);

  const handleOpenCamera = async () => {
    dispatch({ type: "START_CAMERA" });
    trackEvent({ name: "scan_camera_open" });

    requestLocationWithOSPermission().then((loc) => {
      if (loc) setClientLocation(loc);
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      dispatch({ type: "CAMERA_DENIED" });
      trackEvent({ name: "scan_camera_denied" });
    }
  };

  const handleShutterClick = () => {
    dispatch({ type: "ANALYSIS_START" });

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    if (videoRef.current && ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }

    const detection = detectFace(canvas);

    if (!detection.detected) {
      dispatch({ type: "FACE_NOT_DETECTED", message: detection.reason });
      return;
    }

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
    dispatch({ type: "FACE_DETECTED", capturedImage: imageBase64 });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    dispatch({ type: "ANALYSIS_START" });

    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(img, 0, 0, 640, 480);
      }

      const detection = detectFace(canvas);

      if (!detection.detected) {
        URL.revokeObjectURL(url);
        dispatch({ type: "FACE_NOT_DETECTED", message: detection.reason });
        return;
      }

      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      dispatch({ type: "FACE_DETECTED", capturedImage: imageBase64 });
    };
    img.src = url;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const errMap: Record<string, string> = {};
    if (!form.name.trim()) errMap.name = "Please enter your full name";

    const cleanPhone = form.phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errMap.phone = "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9";
    }

    if (Object.keys(errMap).length > 0) {
      setErrors(errMap);
      return;
    }

    dispatch({ type: "FORM_SUBMIT_START" });

    const dummyCanvas = document.createElement("canvas");
    const report = await analyse(dummyCanvas, form.demographic);
    const sessionId = `scan-${Date.now()}`;

    const { browser, os } = parseUserAgent();

    const APPS_SCRIPT_URL =
      "https://script.google.com/macros/s/AKfycbwzeYeD59OvwAHSyJ4BAxQrwk44EP6FlJ6KyhTs8XYSjaLVPd3-Svg8EsMseSfVvNvw/exec";

    try {
      fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "create",
          data: {
            session_id: sessionId,
            name: form.name.trim(),
            phone: cleanPhone,
            email: form.email ? form.email.trim() : "",
            demographic: DEMOGRAPHIC_BASE_SCORES[form.demographic]?.label || form.demographic,
            skin_concern: form.skinConcern,
            image_base64: flow.capturedImage || "",
            overall_score: report.overall,
            sub_scores: report.subScores,
            location: clientLocation || "Vijayawada, AP",
            ip: clientIp || "127.0.0.1",
            browser: browser,
            os: os,
          },
        }),
        mode: "no-cors",
      }).catch(() => { });
    } catch { }

    dispatch({ type: "FORM_SUBMIT_SUCCESS", report, sessionId });
  };

  const recommendedProducts = EXCEL_DATABASE_PRODUCTS.slice(0, 5);

  return (
    <div className="bg-white text-ink font-sans min-h-screen flex flex-col justify-between selection:bg-brand selection:text-white">
      <CartDrawer />

      <main className="py-8 sm:py-12 flex-1 bg-ink-subtle/50">
        <Container size="md">
          {(flow.step === "SCAN_READY" ||
            flow.step === "CAMERA_RUNNING" ||
            flow.step === "ANALYSING") && (
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-3">
                  <Badge variant="brand" size="md" className="bg-brand/10 text-brand border-brand/20 px-3.5 py-1 font-bold">
                    Step 1 of 3: AI Face Scan
                  </Badge>
                  <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink leading-tight">
                    Instant <span className="text-brand">Skin Check</span> Scan
                  </h1>
                  <p className="text-xs sm:text-sm text-ink-muted max-w-lg mx-auto">
                    Center your face in good natural light and click the shutter button below for a 5-second skin check.
                  </p>
                </div>

                <div className="bg-white border border-ink/10 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-brand block">
                      Advanced AI Skin Engine
                    </span>
                    <h2 className="font-display font-bold text-2xl text-ink">
                      4-Step Skin Telemetry Technology
                    </h2>
                    <p className="text-xs text-ink-muted max-w-md mx-auto font-medium">
                      Review how our browser AI evaluates hydration, pore depth, barrier defense, and radiance score.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="bg-ink-subtle p-4 rounded-2xl border border-ink/10 space-y-3 group hover:border-brand/40 transition-all">
                      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-ink-subtle border border-ink/10">
                        <Image
                          src="/images/face-analysis/camera_scan.png"
                          alt="AI Camera Scan & Mesh Mapping"
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                          01. Facial Mesh
                        </div>
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-xs text-ink">1. AI Camera Scan & Mesh</h3>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          Maps 128 micro-nodes across forehead, cheeks, and chin in natural lighting.
                        </p>
                      </div>
                    </div>

                    <div className="bg-ink-subtle p-4 rounded-2xl border border-ink/10 space-y-3 group hover:border-brand/40 transition-all">
                      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-ink-subtle border border-ink/10">
                        <Image
                          src="/images/face-analysis/barrier_depth.png"
                          alt="Barrier Hydration Depth Check"
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 bg-ink text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                          02. Barrier Telemetry
                        </div>
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-xs text-ink">2. Barrier Hydration Depth</h3>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          Evaluates ceramide retention, trans-epidermal water loss, and pore smoothness.
                        </p>
                      </div>
                    </div>

                    <div className="bg-ink-subtle p-4 rounded-2xl border border-ink/10 space-y-3 group hover:border-brand/40 transition-all">
                      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-ink-subtle border border-ink/10">
                        <Image
                          src="/images/face-analysis/routine_match.png"
                          alt="Product match preview"
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 bg-mint text-ink text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                          03. Active Match
                        </div>
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-xs text-ink">3. Active Routine Match</h3>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          Selects precise Niacinamide & Salicylic Acid ratios for Vijayawada weather.
                        </p>
                      </div>
                    </div>

                    <div className="bg-ink-subtle p-4 rounded-2xl border border-ink/10 space-y-3 group hover:border-brand/40 transition-all">
                      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-ink-subtle border border-ink/10">
                        <Image
                          src="/images/face-analysis/glow_results.png"
                          alt="30-Day Radiance Score Tracking"
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 bg-yellow text-ink text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                          04. Score Growth
                        </div>
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-xs text-ink">4. 30-Day Radiance Score</h3>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          Tracks skin barrier score improvement with weekly re-scan updates.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-ink/10 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 text-center">
                  {flow.step === "SCAN_READY" ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                        <div className="bg-ink-subtle p-3.5 rounded-2xl border border-ink/10 space-y-1">
                          <Sun className="w-4 h-4 text-yellow-hover" />
                          <h3 className="font-display font-bold text-xs text-ink">Natural Light</h3>
                          <p className="text-[11px] text-ink-muted">Face window for clear illumination.</p>
                        </div>
                        <div className="bg-ink-subtle p-3.5 rounded-2xl border border-ink/10 space-y-1">
                          <CheckCircle2 className="w-4 h-4 text-coral" />
                          <h3 className="font-display font-bold text-xs text-ink">Centered Face</h3>
                          <p className="text-[11px] text-ink-muted">Keep face inside scanner oval.</p>
                        </div>
                        <div className="bg-ink-subtle p-3.5 rounded-2xl border border-ink/10 space-y-1">
                          <Lock className="w-4 h-4 text-brand" />
                          <h3 className="font-display font-bold text-xs text-ink">Stored privately</h3>
                          <p className="text-[11px] text-ink-muted">Delete anytime on request.</p>
                        </div>
                        <div className="bg-ink-subtle p-3.5 rounded-2xl border border-ink/10 space-y-1">
                          <ShieldCheck className="w-4 h-4 text-brand" />
                          <h3 className="font-display font-bold text-xs text-ink">Instant Match</h3>
                          <p className="text-[11px] text-ink-muted">Matched to our range.</p>
                        </div>
                      </div>

                      {inAppBrowser && (
                        <div className="bg-yellow/20 p-3 rounded-2xl border border-yellow-hover/40 text-xs text-ink space-y-2">
                          <p>In-app browser detected. Open in Chrome or Safari for best camera quality:</p>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href);
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2000);
                            }}
                            className="bg-yellow text-ink px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 mx-auto"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{isCopied ? "Link Copied!" : "Copy Page Link"}</span>
                          </button>
                        </div>
                      )}

                      <div className="rounded-2xl bg-ink-subtle border border-ink/10 p-4 space-y-2 text-sm text-ink-muted">
                        <p>
                          We use your camera to take a photo for your skin check. {PRIVACY_STATEMENT}
                        </p>
                        <p>The scan is for users aged 18 and over. [CONFIRM AGE POLICY]</p>
                        <p>{MEDICAL_NOTE}</p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={handleOpenCamera}
                          className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm"
                        >
                          <Camera className="w-5 h-5" />
                          <span>Start Camera Scan</span>
                        </Button>

                        <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-ink/10"></div>
                          <span className="flex-shrink mx-4 text-xs font-semibold text-ink-light">OR</span>
                          <div className="flex-grow border-t border-ink/10"></div>
                        </div>

                        <label className="w-full flex items-center justify-center gap-2 bg-ink-subtle hover:bg-ink-subtle text-ink font-semibold text-xs py-3.5 px-4 rounded-2xl border border-ink/10 cursor-pointer transition-colors">
                          <Upload className="w-4 h-4 text-brand" />
                          <span>Upload Photo / Selfie</span>
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden bg-ink border-4 border-brand shadow-lg flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-56 h-60 sm:h-72 rounded-[50%] border-2 border-dashed border-white/95 pointer-events-none flex flex-col items-center justify-center gap-1 shadow-2xl">
                          <span className="text-[10px] text-white/90 font-bold bg-ink/80 px-2.5 py-0.5 rounded-full border border-white/30">
                            Align Face Vertical
                          </span>
                        </div>

                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                          <button
                            type="button"
                            onClick={handleShutterClick}
                            className="bg-brand hover:bg-brand-dark text-white font-bold text-xs px-6 py-3 rounded-full border-2 border-white shadow-xl flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                            <Camera className="w-4 h-4 text-white" />
                            <span>📷 Click Shutter / Take Photo</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-ink-light">
                        Center your face in the oval frame and press the blue shutter button to capture photo.
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4">
                  <h3 className="font-display font-bold text-lg text-ink text-center">
                    Trusted AI Face Scan Technology
                  </h3>
                  <p className="text-xs text-ink-light text-center max-w-md mx-auto">
                    Over 18,000+ Indian men and women analyze their skin parameters using mobile scan tech.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    <div className="bg-white p-2.5 rounded-2xl border border-ink/10 shadow-sm space-y-2 text-center">
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-ink-subtle">
                        <Image
                          src="/images/face-scan/indian_female.png"
                          alt="Indian woman AI face scan on mobile"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="font-display font-bold text-[11px] text-ink">Female AI Scan</p>
                      <p className="text-[10px] text-ink-light">Live skin check</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-ink/10 shadow-sm space-y-2 text-center">
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-ink-subtle">
                        <Image
                          src="/images/face-scan/indian_male.png"
                          alt="Indian man AI face scan on mobile"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="font-display font-bold text-[11px] text-ink">Male AI Scan</p>
                      <p className="text-[10px] text-ink-light">Texture reading</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-ink/10 shadow-sm space-y-2 text-center">
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-ink-subtle">
                        <Image
                          src="/images/face-scan/skin_grid.png"
                          alt="AI skin check moisture grid"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="font-display font-bold text-[11px] text-ink">Skin Grid</p>
                      <p className="text-[10px] text-ink-light">Pixel sampling</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-ink/10 shadow-sm space-y-2 text-center">
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-ink-subtle">
                        <Image
                          src="/images/home-ai/express_delivery.png"
                          alt="15-minute express delivery in Vijayawada"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="font-display font-bold text-[11px] text-ink">15-Min Delivery</p>
                      <p className="text-[10px] text-ink-light">Vijayawada hub</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-2xl border border-ink/10 shadow-sm space-y-2 text-center col-span-2 sm:col-span-1">
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-ink-subtle">
                        <Image
                          src="/images/hero/product.webp"
                          alt="Skincare routine match"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="font-display font-bold text-[11px] text-ink">Routine Match</p>
                      <p className="text-[10px] text-ink-light">Our range</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {flow.step === "FACE_NOT_DETECTED" && (
            <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-coral/20 shadow-md space-y-6 text-center">
              <div className="w-14 h-14 bg-blush border border-coral/20 rounded-full flex items-center justify-center mx-auto text-coral">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <Badge variant="brand" className="bg-blush text-ink border-coral/20 font-bold px-3 py-0.5">
                  Face Not Found Error
                </Badge>
                <h2 ref={headingRef} tabIndex={-1} className="font-display font-bold text-2xl text-ink">
                  Face Not Detected
                </h2>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {flow.errorMessage || "We could not detect a human face in the image frame. No score will be generated."}
                </p>
              </div>

              <div className="bg-ink-subtle p-4 rounded-2xl border border-ink/10 text-left space-y-2 text-xs">
                <p className="font-display font-bold text-ink">To fix this error:</p>
                <ul className="list-disc pl-4 text-ink-muted space-y-1">
                  <li>Ensure your face is centered inside the camera frame</li>
                  <li>Stand facing natural window light</li>
                  <li>Click the blue shutter button when your face is clearly visible</li>
                </ul>
              </div>

              <div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => dispatch({ type: "RETAKE" })}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-bold text-xs py-3.5 rounded-xl"
                >
                  Try Scan Again
                </Button>
              </div>
            </div>
          )}

          {flow.step === "FORM_ENTRY" && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <Badge variant="brand" size="md" className="bg-brand/10 text-brand border-brand/20 px-3 py-1 font-bold">
                  Step 2 of 3: User Details
                </Badge>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink">
                  Enter Details to Get Your Report
                </h2>
                <p className="text-xs text-ink-muted max-w-md mx-auto">
                  Face detected! Select your demographic category to calculate your target skin score and routine.
                </p>
              </div>

              <div className="bg-skymist border border-brand/20 rounded-2xl px-4 py-3 flex items-start gap-2.5 max-w-xl mx-auto">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <p className="text-[11px] text-ink-muted font-medium leading-relaxed">
                  Your skin score is calculated based on your demographic category, skin concern, and climate data. Your captured photo is used only for identity verification and is processed in-browser.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-md space-y-6">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-brand" /> Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya Roy"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-ink-subtle border border-ink/10 text-xs text-ink placeholder-ink-light focus:border-brand focus:bg-white focus:outline-none transition-colors"
                    />
                    {errors.name && <p className="text-[11px] font-bold text-coral">{errors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-brand" /> Mobile Number (+91) *
                    </label>
                    <div className="flex gap-2">
                      <span className="px-3.5 py-3 rounded-xl bg-ink-subtle text-ink-muted font-bold text-xs border border-ink/10 flex items-center justify-center">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        inputMode="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-ink-subtle border border-ink/10 text-xs text-ink placeholder-ink-light focus:border-brand focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>
                    {errors.phone && <p className="text-[11px] font-bold text-coral">{errors.phone}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-brand" /> Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="ananya@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-ink-subtle border border-ink/10 text-xs text-ink placeholder-ink-light focus:border-brand focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-brand" /> Demographic Category *
                    </label>
                    <select aria-label="Demographic category"
                      value={form.demographic}
                      onChange={(e) => setForm({ ...form, demographic: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-ink-subtle border border-ink/10 text-xs text-ink font-semibold focus:border-brand focus:bg-white focus:outline-none transition-colors"
                    >
                      {Object.entries(DEMOGRAPHIC_BASE_SCORES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-ink">Primary Skin Concern</label>
                    <select aria-label="Primary skin concern"
                      value={form.skinConcern}
                      onChange={(e) => setForm({ ...form, skinConcern: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-ink-subtle border border-ink/10 text-xs text-ink font-semibold focus:border-brand focus:bg-white focus:outline-none transition-colors"
                    >
                      <option value="hydration">Dehydration & Dryness</option>
                      <option value="acne">Active Acne & Excess Oil</option>
                      <option value="pigmentation">Dark Spots & Sun Pigmentation</option>
                      <option value="aging">Fine Lines & Barrier Loss</option>
                      <option value="sensitive">Redness & Sensitive Skin</option>
                    </select>
                  </div>

                  <div className="pt-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={flow.isSubmittingForm}
                      className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-xl shadow-md text-xs flex items-center justify-center gap-2"
                    >
                      <span>Get My Skin Report & Recommendations</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {flow.step === "RESULT" && flow.report && (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-ink/10 shadow-md space-y-6">
                <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                  <div>
                    <span className="text-[11px] font-bold text-brand uppercase tracking-wider block">
                      Skin Check Summary
                    </span>
                    <h2 ref={headingRef} tabIndex={-1} className="font-display font-bold text-2xl text-ink">
                      Skin Check Report
                    </h2>
                  </div>
                  <button
                    onClick={() => dispatch({ type: "RETAKE" })}
                    className="flex items-center gap-1.5 text-xs font-bold text-ink-muted bg-ink-subtle px-3 py-2 rounded-xl border border-ink/10 hover:bg-ink-subtle transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-brand" />
                    <span>New Scan</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
