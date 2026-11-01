"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Clock3,
  Heart,
  Search,
  ScanLine,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";
import { bestsellerProducts } from "@/config/content";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice, getAssetPath } from "@/lib/utils";

const audiences = [
  { label: "For You", icon: Sparkles },
  { label: "Women", icon: UserRound },
  { label: "Men", icon: UserRound },
  { label: "All Categories", icon: Boxes },
];

const categories = [
  { label: "Skincare", image: "/images/products/serum-1.png", tint: "#e9f0ff", query: "serum" },
  { label: "Makeup", image: "/images/products/lip-1.png", tint: "#ffecef", query: "makeup" },
  { label: "Haircare", image: "/images/products/body-1.png", tint: "#fff1df", query: "hair" },
  { label: "Fragrances", image: "/images/products/moisturiser-2.png", tint: "#f0ebff", query: "fragrance" },
  { label: "Personal Care", image: "/images/products/cleanser-2.png", tint: "#e7f1ff", query: "personal care" },
  { label: "Beauty Tools", image: "/images/products/sunscreen-2.png", tint: "#ffecef", query: "tools" },
];

export function HomeHero({ city = "Vijayawada" }: { city?: string }) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [query, setQuery] = useState("");
  const [activeAudience, setActiveAudience] = useState("For You");
  const [added, setAdded] = useState<string | null>(null);
  const deals = bestsellerProducts.slice(0, 4);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    router.push(query.trim() ? "/shop?q=" + encodeURIComponent(query.trim()) : "/shop");
  }

  function addDeal(product: (typeof bestsellerProducts)[number]) {
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      size: product.size,
      price: product.price,
      mrp: product.originalPrice ?? product.price,
      image: getAssetPath(product.image),
    });
    setAdded(product.id);
    window.setTimeout(() => setAdded(null), 1400);
  }

  return (
    <section aria-labelledby="hero-title" className="bg-[#f7f9ff] pb-14 pt-5 sm:pt-7 lg:pb-16">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-8 lg:px-10">
        <div className="overflow-hidden rounded-[22px] border border-[#dce6ff] bg-[#eaf0ff]">
          <div className="grid min-h-[76px] grid-cols-1 items-center gap-4 px-5 py-4 sm:px-7 lg:grid-cols-[1fr_1px_1fr_auto] lg:gap-7 lg:py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-brand shadow-sm">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-base font-bold leading-tight text-[#071b4d]">Hi, Glowvai User 👋</p>
                <p className="mt-0.5 text-xs text-[#53617d]">Discover. Shop. Glow.</p>
              </div>
            </div>
            <span className="hidden h-8 bg-[#cbd8f7] lg:block" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <p className="font-display text-base font-bold leading-tight text-[#071b4d]">Delivery in 12 mins</p>
                <p className="mt-0.5 text-xs text-[#53617d]">{city}, Andhra Pradesh</p>
              </div>
            </div>
            <Link href="/track-order" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              Track order <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <form onSubmit={submitSearch} className="mt-3 flex h-[58px] items-center rounded-[18px] border border-[#dce6ff] bg-white px-4 shadow-[0_8px_26px_rgba(10,55,160,.06)]">
          <Search className="h-5 w-5 shrink-0 text-[#17233c]" aria-hidden="true" />
          <label htmlFor="home-search" className="sr-only">Search products and brands</label>
          <input id="home-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search niacinamide, sunscreen, brands..." className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-[#071b4d] outline-none placeholder:text-[#7d879c]" />
          <Link href="/face-analysis" className="hidden min-h-10 items-center gap-2 rounded-xl bg-[#edf3ff] px-4 text-sm font-semibold text-brand transition hover:bg-[#dce8ff] sm:inline-flex">
            <ScanLine className="h-4 w-4" aria-hidden="true" /> Skin scan
          </Link>
        </form>

        <div className="relative mt-4 min-h-[320px] overflow-hidden rounded-[24px] bg-[#c8d9ff] sm:min-h-[380px] lg:min-h-[400px]">
          <Image src={getAssetPath("/images/hero/glowvai-shopping-hero.png")} alt="Glowvai beauty campaign featuring an Indian woman holding a serum" fill priority sizes="(max-width: 1280px) 100vw, 1200px" className="object-cover object-[67%_center] sm:object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#c8d9ff] via-[#c8d9ff]/90 to-transparent sm:via-[#c8d9ff]/48" aria-hidden="true" />
          <div className="relative z-10 flex min-h-[320px] max-w-[700px] flex-col justify-center px-6 py-9 sm:min-h-[380px] sm:px-11 lg:min-h-[400px] lg:px-14">
            <p className="mb-4 w-fit rounded-full bg-white/72 px-4 py-2 text-sm font-semibold text-[#16357c] backdrop-blur-sm">Your glow-up starts here ✨</p>
            <h1 id="hero-title" className="max-w-[650px] font-display text-[clamp(3.1rem,6vw,5.4rem)] font-bold leading-[0.92] tracking-[-0.055em] text-[#071b4d]">Glow your way.</h1>
            <p className="mt-5 max-w-[560px] text-[clamp(1.05rem,1.7vw,1.4rem)] font-medium leading-snug text-[#17305f]">Beauty, skincare &amp; more — delivered in 12 mins.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#071b4d] px-7 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#071b4d]">
                Shop now <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/face-analysis" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#071b4d]/20 bg-white/80 px-6 text-sm font-semibold text-[#071b4d] backdrop-blur-sm transition hover:bg-white">
                <ScanLine className="h-4 w-4" aria-hidden="true" /> Free skin scan
              </Link>
            </div>
          </div>
          <div className="absolute bottom-5 left-6 z-10 flex gap-2 sm:left-11" aria-hidden="true"><span className="h-2.5 w-6 rounded-full bg-brand" /><span className="h-2.5 w-2.5 rounded-full bg-white/70" /><span className="h-2.5 w-2.5 rounded-full bg-white/70" /></div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3" role="tablist" aria-label="Shop audience">
          {audiences.map(({ label, icon: Icon }) => {
            const active = activeAudience === label;
            return (
              <button key={label} type="button" role="tab" aria-selected={active} onClick={() => setActiveAudience(label)} className={"inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition " + (active ? "border-brand bg-brand text-white shadow-[0_8px_20px_rgba(20,71,230,.18)]" : "border-[#d9e2f5] bg-white text-[#14203a] hover:border-brand/40")}>
                <Icon className="h-4 w-4" aria-hidden="true" />{label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {categories.map((category) => (
            <Link key={category.label} href={"/shop?q=" + encodeURIComponent(category.query)} className="group text-center">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-white" style={{ backgroundColor: category.tint }}>
                <Image src={getAssetPath(category.image)} alt={category.label} fill sizes="(max-width: 640px) 30vw, 180px" className="object-contain p-3 transition duration-300 group-hover:scale-105 sm:p-4" />
              </div>
              <p className="mt-2 text-xs font-semibold text-[#14203a] sm:text-sm">{category.label}</p>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.08fr_.92fr]">
          <Link href="/shop" className="group relative min-h-[150px] overflow-hidden rounded-[22px] bg-[#081f68] px-6 py-5 text-white sm:px-8">
            <div className="absolute -right-12 -top-24 h-64 w-64 rotate-12 rounded-[54px] bg-gradient-to-br from-[#3971ff] to-transparent opacity-65" aria-hidden="true" />
            <p className="relative text-xs font-semibold uppercase tracking-[.12em] text-[#b9ccff]">Bank offer</p>
            <p className="relative mt-2 font-display text-3xl font-bold tracking-[-.03em]">Flat ₹250 off</p>
            <p className="relative text-base text-[#d9e3ff]">on orders above ₹1499</p>
            <span className="absolute bottom-5 right-5 grid h-10 w-10 place-items-center rounded-full bg-white text-brand transition group-hover:translate-x-1"><ArrowRight className="h-5 w-5" aria-hidden="true" /></span>
          </Link>
          <div className="relative min-h-[150px] overflow-hidden rounded-[22px] bg-[#e8eaff] px-6 py-5 sm:px-8">
            <p className="font-display text-3xl font-bold tracking-[-.03em] text-[#071b4d]">Free delivery</p>
            <p className="mt-1 text-base text-[#30436c]">on all orders</p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#53617d]"><Clock3 className="h-4 w-4" aria-hidden="true" />Limited time only</p>
            <Truck className="absolute bottom-6 right-8 h-16 w-16 text-brand" strokeWidth={1.5} aria-hidden="true" />
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-display text-[clamp(1.65rem,3vw,2.2rem)] font-bold tracking-[-.03em] text-[#071b4d]"><span aria-hidden="true">⚡</span> Flash Deals</p>
            <p className="mt-1 text-sm text-[#6b7590]">Ends in 01h : 24m</p>
          </div>
          <Link href="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">View all <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {deals.map((product) => {
            const mrp = product.originalPrice ?? product.price;
            const discount = mrp > product.price ? Math.round(((mrp - product.price) / mrp) * 100) : 0;
            return (
              <li key={product.id} className="group rounded-[20px] border border-[#e1e7f3] bg-white p-3 shadow-[0_6px_24px_rgba(26,54,120,.05)] sm:p-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-[#f4f6fb]">
                  {discount > 0 && <span className="absolute left-2 top-2 z-10 rounded-full bg-[#d7f7d8] px-2 py-1 text-[10px] font-bold text-[#16702b]">{discount}% OFF</span>}
                  <button type="button" aria-label={"Save " + product.name} className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white text-[#27324a]"><Heart className="h-4 w-4" aria-hidden="true" /></button>
                  <Image src={getAssetPath(product.image)} alt={product.altText} fill sizes="(max-width: 1024px) 46vw, 280px" className="object-contain p-4 transition duration-300 group-hover:scale-105" />
                </div>
                <Link href={"/product/" + product.slug} className="mt-3 block min-h-[42px] font-display text-sm font-semibold leading-snug text-[#111b32] hover:text-brand sm:text-base">{product.name}</Link>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="whitespace-nowrap"><span className="font-display text-base font-bold text-[#071b4d]">{formatPrice(product.price)}</span> <s className="ml-1 text-xs text-[#8d95a7]">{formatPrice(mrp)}</s></p>
                  <button type="button" onClick={() => addDeal(product)} className="min-h-9 rounded-full bg-brand px-4 text-xs font-semibold text-white transition hover:bg-brand-dark">{added === product.id ? "Added ✓" : "Add +"}</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
