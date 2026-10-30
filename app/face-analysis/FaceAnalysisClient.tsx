"use client";

import React, { useReducer, useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Section, Eyebrow, SectionTitle, focusRing } from "@/components/home/shared";
import { analyse, detectFace, DEMOGRAPHIC_BASE_SCORES, AnalysisReport } from "@/lib/analysis";
import { parseUserAgent, fetchClientIP, requestLocationWithOSPermission } from "@/lib/clientInfo";
import { PRIVACY_STATEMENT, MEDICAL_NOTE } from "@/config/privacy-copy";
import { formatPrice, getAssetPath } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useCartStore } from "@/lib/store/cart";
import { bestsellerProducts } from "@/config/content";
import { routineProducts } from "@/config/home-content";
import { Camera, AlertCircle, RotateCcw, ArrowRight, Sun, Glasses, UserRound, Upload, ExternalLink, Check, ShoppingBag, MessageCircle } from "lucide-react";

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
      return { ...state, step: "FORM_ENTRY", capturedImage: action.capturedImage };
    case "FORM_SUBMIT_START":
      return { ...state, isSubmittingForm: true };
    case "FORM_SUBMIT_SUCCESS":
      return { ...state, isSubmittingForm: false, step: "RESULT", report: action.report, sessionId: action.sessionId };
    case "RETAKE":
      return { ...state, step: "SCAN_READY", report: null, capturedImage: null, errorMessage: "" };
    default:
      return state;
  }
}

const input =
  "w-full min-h-[52px] px-4 text-[17px] text-ink bg-white border-[1.5px] border-ink/30 rounded-[10px] placeholder:text-ink-light focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20";

const tips = [
  { Icon: Sun, t: "Face a window", d: "Even daylight gives the clearest photo." },
  { Icon: Glasses, t: "Remove glasses", d: "Nothing should cover your eyes or cheeks." },
  { Icon: UserRound, t: "Hair off your face", d: "Keep your forehead and jawline in view." },
];

const steps = [
  { img: "/images/face-analysis/camera_scan.png", alt: "A face being scanned by a phone camera", t: "Take a photo", d: "Use your camera or upload a selfie. Good light helps." },
  { img: "/images/face-analysis/barrier_depth.png", alt: "Skin hydration check illustration", t: "We score four things", d: "Hydration, texture, tone and clarity, each out of 100." },
  { img: "/images/face-analysis/routine_match.png", alt: "Skincare products matched to a scan", t: "Get a routine", d: "We suggest a routine from our own range." },
  { img: "/images/face-analysis/glow_results.png", alt: "A skin score improving over time", t: "Scan again later", d: "Repeat the scan to see how your scores change." },
];

const gallery = [
  { src: "/images/face-scan/indian_female.png", alt: "A woman taking a face scan on her phone", cap: "Scan on your phone" },
  { src: "/images/face-scan/indian_male.png", alt: "A man taking a face scan on his phone", cap: "Works for everyone" },
  { src: "/images/face-scan/skin_grid.png", alt: "A grid of skin samples", cap: "Four scores" },
  { src: "/images/home-ai/express_delivery.png", alt: "A rider carrying a skincare order", cap: "Delivery by rider" },
  { src: "/images/hero/product.webp", alt: "A skincare product", cap: "Matched routine" },
];

const scoreLabels: { key: keyof AnalysisReport["subScores"]; label: string }[] = [
  { key: "hydration", label: "Hydration" },
  { key: "texture", label: "Texture" },
  { key: "tone", label: "Tone" },
  { key: "clarity", label: "Clarity" },
];

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
  const [addedAll, setAddedAll] = useState(false);

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
      }).catch(() => {});
    } catch {}

    dispatch({ type: "FORM_SUBMIT_SUCCESS", report, sessionId });
  };

  // Routine from our own range, in routine order.
  const routine = routineProducts
    .map((r) => bestsellerProducts.find((p) => p.slug === r.slug))
    .filter((p): p is (typeof bestsellerProducts)[number] => Boolean(p));

  const addProduct = (p: (typeof bestsellerProducts)[number]) =>
    addItem({
      id: p.id,
      slug: p.slug,
      name: p.name,
      size: p.size,
      price: p.price,
      mrp: p.originalPrice ?? p.price,
      image: getAssetPath(p.image),
    });

  const scanning = flow.step === "SCAN_READY" || flow.step === "CAMERA_RUNNING" || flow.step === "ANALYSING" || flow.step === "CAMERA_DENIED";

  return (
    <div className="bg-paper text-ink">
      <CartDrawer />

      {scanning && (
        <>
          <Section pad="tight" labelledBy="scan-title">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-start">
              <div className="lg:col-span-6">
                <Eyebrow>Free face scan</Eyebrow>
                <h1
                  id="scan-title"
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-4 font-display font-semibold text-[clamp(2.5rem,1.6rem+4.5vw,4.75rem)] leading-[1] tracking-[-0.03em] outline-none"
                >
                  Know your skin in <span className="text-brand">30 seconds.</span>
                </h1>
                <p className="mt-6 text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] leading-[1.5] text-ink-muted max-w-[46ch]">
                  Take a selfie, answer two quick questions, and get a plain report with a routine to match.
                </p>

                <ul className="mt-8 border-t border-ink/20">
                  {tips.map(({ Icon, t, d }) => (
                    <li key={t} className="flex items-center gap-4 py-4 border-b border-ink/20">
                      <Icon className="w-6 h-6 text-brand shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-display font-semibold text-lg leading-tight">{t}</p>
                        <p className="text-[15px] text-ink-muted">{d}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 space-y-2 text-[14px] leading-relaxed text-ink-muted max-w-[56ch]">
                  <p>We use your camera to take a photo for your skin check. {PRIVACY_STATEMENT}</p>
                  <p>The scan is for users aged 18 and over. [CONFIRM AGE POLICY]</p>
                  <p>{MEDICAL_NOTE}</p>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="bg-white border border-ink/15 rounded-[24px] p-4 sm:p-6">
                  {flow.step === "SCAN_READY" && (
                    <>
                      <div className="relative aspect-[4/5] sm:aspect-[5/4] rounded-[10px] overflow-hidden bg-paper-deep">
                        <Image
                          src={getAssetPath("/images/hero/face-scan-selfie.webp")}
                          alt="Example of a selfie being scanned on a phone"
                          fill
                          priority
                          sizes="(max-width: 1024px) 90vw, 560px"
                          className="object-cover"
                        />
                        <svg aria-hidden="true" viewBox="0 0 200 250" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                          <g fill="none" stroke="#fff" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round">
                            <path vectorEffect="non-scaling-stroke" d="M20 50 V32 a8 8 0 0 1 8 -8 H46" />
                            <path vectorEffect="non-scaling-stroke" d="M154 24 H172 a8 8 0 0 1 8 8 V50" />
                            <path vectorEffect="non-scaling-stroke" d="M20 200 V218 a8 8 0 0 0 8 8 H46" />
                            <path vectorEffect="non-scaling-stroke" d="M154 226 H172 a8 8 0 0 0 8 -8 V200" />
                          </g>
                        </svg>
                        <div aria-hidden="true" className="gv-scan-line" />
                      </div>

                      {inAppBrowser && (
                        <div className="mt-4 rounded-[10px] border border-ink/20 bg-paper p-4 text-[15px] space-y-2">
                          <p>You are in an in-app browser. Open this page in Chrome or Safari for a better camera.</p>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href);
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2000);
                            }}
                            className={`inline-flex items-center gap-2 font-semibold underline underline-offset-4 rounded ${focusRing}`}
                          >
                            <ExternalLink className="w-4 h-4" aria-hidden="true" />
                            {isCopied ? "Link copied" : "Copy page link"}
                          </button>
                        </div>
                      )}

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button variant="primary" size="lg" onClick={handleOpenCamera} className="w-full">
                          <Camera className="w-5 h-5" aria-hidden="true" />
                          <span>Start camera</span>
                        </Button>
                        <label
                          className={`inline-flex items-center justify-center gap-2 min-h-[60px] px-9 rounded-[10px] border-[1.5px] border-ink/20 bg-white text-lg font-semibold text-ink cursor-pointer hover:border-ink focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-[3px] focus-within:outline-brand`}
                        >
                          <Upload className="w-5 h-5" aria-hidden="true" />
                          <span>Upload a photo</span>
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="sr-only" />
                        </label>
                      </div>
                    </>
                  )}

                  {flow.step === "CAMERA_RUNNING" && (
                    <>
                      <div className="relative aspect-[4/5] sm:aspect-[5/4] rounded-[10px] overflow-hidden bg-ink">
                        <video ref={videoRef} autoPlay playsInline muted aria-label="Camera preview" className="w-full h-full object-cover scale-x-[-1]" />
                        <div
                          aria-hidden="true"
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] aspect-[4/5] rounded-[50%] border-2 border-dashed border-white pointer-events-none"
                        />
                        <p className="absolute top-3 left-1/2 -translate-x-1/2 text-[13px] font-medium text-white bg-ink/80 rounded-[10px] px-3 py-1">
                          Keep your face inside the oval
                        </p>
                      </div>
                      <Button variant="primary" size="lg" onClick={handleShutterClick} className="mt-5 w-full">
                        <Camera className="w-5 h-5" aria-hidden="true" />
                        <span>Take photo</span>
                      </Button>
                    </>
                  )}

                  {flow.step === "ANALYSING" && (
                    <div role="status" aria-live="polite" className="relative aspect-[4/5] sm:aspect-[5/4] rounded-[10px] overflow-hidden bg-paper-deep flex flex-col items-center justify-center text-center gap-3">
                      <div aria-hidden="true" className="gv-scan-line" />
                      <p className="font-display font-semibold text-2xl">Checking your photo</p>
                      <p className="text-ink-muted">This takes a few seconds.</p>
                    </div>
                  )}

                  {flow.step === "CAMERA_DENIED" && (
                    <div className="rounded-[10px] bg-paper p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-[#9B1C1C]" aria-hidden="true" />
                        <p className="font-display font-semibold text-xl">We could not open your camera</p>
                      </div>
                      <p className="text-ink-muted">Allow camera access in your browser, or upload a photo instead.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button variant="primary" size="md" onClick={() => dispatch({ type: "RETAKE" })} className="w-full">
                          Try again
                        </Button>
                        <label className={`inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold cursor-pointer hover:border-ink focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-[3px] focus-within:outline-brand`}>
                          <Upload className="w-5 h-5" aria-hidden="true" />
                          <span>Upload a photo</span>
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="sr-only" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section tone="deep" pad="tight" labelledBy="how-title">
            <Eyebrow>How it works</Eyebrow>
            <SectionTitle id="how-title" className="mt-4 max-w-[20ch]">
              Four steps, no sign-up.
            </SectionTitle>
            <ol className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {steps.map((s, i) => (
                <li key={s.t}>
                  <div className="relative aspect-[16/10] rounded-[10px] overflow-hidden border border-ink/15 bg-paper">
                    <Image src={s.img} alt={s.alt} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover" />
                  </div>
                  <p className="mt-4 font-mono text-xs tracking-[0.12em] text-ink-muted">0{i + 1}</p>
                  <h3 className="font-display font-semibold text-xl">{s.t}</h3>
                  <p className="mt-1 text-[15px] text-ink-muted">{s.d}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section pad="tight" labelledBy="gallery-title">
            <SectionTitle id="gallery-title">What you will see</SectionTitle>
            <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {gallery.map((g) => (
                <li key={g.src}>
                  <div className="relative aspect-square rounded-[10px] overflow-hidden border border-ink/15 bg-paper-deep">
                    <Image src={g.src} alt={g.alt} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover" />
                  </div>
                  <p className="mt-2 text-[15px] font-medium">{g.cap}</p>
                  <p className="text-[13px] text-ink-light">Illustration</p>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}

      {flow.step === "FACE_NOT_DETECTED" && (
        <Section pad="md" labelledBy="nf-title">
          <div className="max-w-[560px] mx-auto bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8">
            <AlertCircle className="w-8 h-8 text-[#9B1C1C]" aria-hidden="true" />
            <h1 id="nf-title" ref={headingRef} tabIndex={-1} className="mt-3 font-display font-semibold text-3xl outline-none">
              We could not find a face
            </h1>
            <p role="alert" className="mt-2 text-ink-muted">
              {flow.errorMessage || "We could not detect a face in the photo. No score was made."}
            </p>
            <ul className="mt-5 border-t border-ink/20">
              {["Centre your face in the frame", "Face a window for daylight", "Take the photo when your face is clear"].map((t) => (
                <li key={t} className="flex items-center gap-3 py-3 border-b border-ink/20">
                  <Check className="w-5 h-5 text-brand shrink-0" aria-hidden="true" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button variant="primary" size="lg" onClick={() => dispatch({ type: "RETAKE" })} className="mt-6 w-full">
              Try again
            </Button>
          </div>
        </Section>
      )}

      {flow.step === "FORM_ENTRY" && (
        <Section pad="md" labelledBy="form-title">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-start">
            <div className="lg:col-span-5">
              <Eyebrow>Step 2 of 3</Eyebrow>
              <h1 id="form-title" ref={headingRef} tabIndex={-1} className="mt-4 font-display font-semibold text-[clamp(2rem,1.4rem+3vw,3.5rem)] leading-[1.02] tracking-[-0.025em] outline-none">
                Face found. Two details to get your report.
              </h1>
              {flow.capturedImage && (
                <div className="mt-6 relative aspect-[4/3] max-w-[360px] rounded-[10px] overflow-hidden border border-ink/15 bg-paper-deep">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flow.capturedImage} alt="Your photo" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="mt-5 text-[15px] leading-relaxed text-ink-muted max-w-[46ch]">{PRIVACY_STATEMENT}</p>
              <p className="mt-2 text-[14px] text-ink-light max-w-[46ch]">{MEDICAL_NOTE}</p>
            </div>

            <form onSubmit={handleFormSubmit} noValidate className="lg:col-span-7 bg-white border border-ink/15 rounded-[24px] p-6 sm:p-8 space-y-5">
              <div>
                <label htmlFor="fa-name" className="block text-sm font-semibold">Full name</label>
                <input id="fa-name" type="text" autoComplete="name" required placeholder="Ananya Roy" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? "fa-name-err" : undefined} className={`${input} mt-2`} />
                {errors.name && <p id="fa-name-err" role="alert" className="mt-1 text-sm text-[#9B1C1C]">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="fa-phone" className="block text-sm font-semibold">Mobile number</label>
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex items-center px-4 rounded-[10px] border-[1.5px] border-ink/30 bg-paper text-ink-muted font-semibold">+91</span>
                  <input id="fa-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} required placeholder="9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "fa-phone-err" : undefined} className={input} />
                </div>
                {errors.phone && <p id="fa-phone-err" role="alert" className="mt-1 text-sm text-[#9B1C1C]">{errors.phone}</p>}
              </div>

              <div>
                <label htmlFor="fa-email" className="block text-sm font-semibold">Email <span className="font-normal text-ink-muted">(optional)</span></label>
                <input id="fa-email" type="email" autoComplete="email" placeholder="ananya@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${input} mt-2`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="fa-demo" className="block text-sm font-semibold">Who is this scan for?</label>
                  <select id="fa-demo" value={form.demographic} onChange={(e) => setForm({ ...form, demographic: e.target.value })} className={`${input} mt-2`}>
                    {Object.entries(DEMOGRAPHIC_BASE_SCORES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fa-concern" className="block text-sm font-semibold">Main skin concern</label>
                  <select id="fa-concern" value={form.skinConcern} onChange={(e) => setForm({ ...form, skinConcern: e.target.value })} className={`${input} mt-2`}>
                    <option value="hydration">Dryness and dehydration</option>
                    <option value="acne">Breakouts and oil</option>
                    <option value="pigmentation">Dark spots</option>
                    <option value="aging">Fine lines</option>
                    <option value="sensitive">Redness and sensitivity</option>
                  </select>
                </div>
              </div>

              <Button type="submit" variant="primary" size="lg" disabled={flow.isSubmittingForm} className="w-full">
                <span>{flow.isSubmittingForm ? "Making your report..." : "Get my report"}</span>
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </Section>
      )}

      {flow.step === "RESULT" && flow.report && (
        <>
          <Section pad="md" labelledBy="result-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Eyebrow>Step 3 of 3 · Your report</Eyebrow>
                <h1 id="result-title" ref={headingRef} tabIndex={-1} className="mt-4 font-display font-semibold text-[clamp(2rem,1.4rem+3vw,3.5rem)] leading-[1.02] tracking-[-0.025em] outline-none">
                  Here is your skin check.
                </h1>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "RETAKE" })}
                className={`inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[10px] border-[1.5px] border-ink/20 bg-white font-semibold hover:border-ink ${focusRing}`}
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                New scan
              </button>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10 items-start">
              <div className="lg:col-span-5">
                <p aria-hidden="true" className="font-display font-semibold leading-[0.8] tracking-[-0.06em] text-brand text-[clamp(7rem,4rem+10vw,12rem)] [font-feature-settings:'tnum']">
                  {flow.report.overall}
                </p>
                <p className="mt-3 font-mono text-sm uppercase tracking-[0.12em] text-ink-muted">
                  <span className="sr-only">Overall score: {flow.report.overall} </span>out of 100, overall
                </p>
                <p className="mt-6 text-lg leading-snug max-w-[40ch]">{flow.report.summary}</p>
              </div>

              <div className="lg:col-span-7">
                <ul className="border-t border-ink/20">
                  {scoreLabels.map(({ key, label }) => {
                    const v = flow.report!.subScores[key];
                    return (
                      <li key={key} className="py-4 border-b border-ink/20">
                        <div className="flex items-baseline justify-between">
                          <span className="font-display font-semibold text-xl">{label}</span>
                          <span className="font-mono text-lg [font-feature-settings:'tnum']">{v}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-[3px] bg-ink/10 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
                          <div className="h-full bg-brand" style={{ width: `${v}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {flow.report.concerns.length > 0 && (
                  <div className="mt-6">
                    <h2 className="font-display font-semibold text-xl">What to focus on</h2>
                    <ul className="mt-2 space-y-1.5 text-ink-muted">
                      {flow.report.concerns.map((c) => (
                        <li key={c} className="pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[0.7em] before:w-2 before:h-px before:bg-ink">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-6 text-[14px] text-ink-light max-w-[56ch]">{MEDICAL_NOTE}</p>
              </div>
            </div>
          </Section>

          <Section tone="deep" pad="md" labelledBy="routine-title">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <Eyebrow>Matched to your report</Eyebrow>
                <SectionTitle id="routine-title" className="mt-4">Your routine.</SectionTitle>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  routine.forEach(addProduct);
                  setAddedAll(true);
                  setTimeout(() => setAddedAll(false), 2500);
                }}
              >
                {addedAll ? <Check className="w-5 h-5" aria-hidden="true" /> : <ShoppingBag className="w-5 h-5" aria-hidden="true" />}
                <span aria-live="polite">{addedAll ? "Routine added to bag" : "Add full routine"}</span>
              </Button>
            </div>

            <ul className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {routine.map((p) => (
                <li key={p.id} className="bg-white border border-ink/15 rounded-[10px] p-3 flex flex-col">
                  <Link href={`/product/${p.slug}`} className={`block rounded ${focusRing}`}>
                    <div className="relative aspect-[4/5] rounded-[8px] overflow-hidden bg-paper">
                      <Image src={getAssetPath(p.image)} alt={p.altText} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
                    </div>
                    <h3 className="mt-3 font-display font-semibold text-base leading-snug">{p.name}</h3>
                  </Link>
                  <p className="mt-1 font-semibold">
                    {formatPrice(p.price)}
                    {p.originalPrice && p.originalPrice > p.price && <span className="ml-2 text-sm font-normal text-ink-light line-through">{formatPrice(p.originalPrice)}</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => addProduct(p)}
                    className={`mt-3 min-h-[44px] rounded-[10px] bg-brand text-white font-semibold text-sm hover:bg-brand-dark ${focusRing}`}
                  >
                    Add to bag
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-10 border-t border-ink/20 pt-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <a
                href={`https://wa.me/918977855998?text=${encodeURIComponent(`Hello GLOW VAI, I did the face scan (score ${flow.report.overall}/100). Please help me order my routine.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 font-semibold underline underline-offset-[5px] rounded ${focusRing}`}
              >
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
                Order on WhatsApp
              </a>
              <Link href="/shop" className={`inline-flex items-center gap-2 font-medium underline underline-offset-[5px] decoration-ink/30 hover:decoration-ink rounded ${focusRing}`}>
                Browse the full shop
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
