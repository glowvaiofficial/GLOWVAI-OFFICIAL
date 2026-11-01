const isStaticExport = process.env.DEPLOY_TARGET === 'github-pages';

// Hosts the site actually calls (checked in code): Google Apps Script (forms, sheet),
// Google Sheets (admin read), Google Analytics (after consent), IP and location lookup
// used by the scan, and the QR image service used by the referral portal.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://api.qrserver.com https://www.google-analytics.com https://www.googletagmanager.com https://*.googleusercontent.com https://drive.google.com",
  "font-src 'self' data:",
  "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://docs.google.com https://api.ipify.org https://ipapi.co https://nominatim.openstreetmap.org https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// The glowvai app shell under /shop talks to Firebase, Razorpay and the scan backend, so it gets its own policy.
const devEval = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";

const shopCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval} 'wasm-unsafe-eval' https://www.googletagmanager.com https://checkout.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://firebasestorage.googleapis.com https://*.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com https://*.gstatic.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://glowvai-backend-r7u2.onrender.com https://api.razorpay.com https://lumberjack.razorpay.com https://script.google.com https://script.googleusercontent.com https://nominatim.openstreetmap.org https://api.bigdatacloud.net https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com http://localhost:4000 http://localhost:10000",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.firebaseapp.com https://www.openstreetmap.org",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.razorpay.com",
].join('; ');

// The seller portal under /sellers is the vendor app built for the web (Expo, public/sellers). It calls the vendor
// API set at build time; NEXT_PUBLIC_VENDOR_API_URL must hold the same URL so this policy allows it.
const vendorApi = process.env.NEXT_PUBLIC_VENDOR_API_URL || 'http://localhost:4000';
const vendorWs = vendorApi.replace(/^http/, 'ws');
const sellerCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://unpkg.com https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  `connect-src 'self' ${vendorApi} ${vendorWs} https://nominatim.openstreetmap.org`,
  "media-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const sellerHeaders = [
  { key: 'Content-Security-Policy', value: sellerCsp },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=()' },
];

// Static files that load their own third-party scripts keep their own rules. The shop and sellers have their own policies.
const exceptStaticPortals = '(?!portal\\.html|referral/portal\\.html|referral/index\\.html|shop|sellers).*';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticExport ? { output: 'export' } : {}),
  env: {
    CUSTOM_DOMAIN: 'true',
  },
  images: {
    ...(isStaticExport ? { unoptimized: true } : {}),
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  ...(isStaticExport
    ? {}
    : {
        async redirects() {
          return [
            {
              source: '/:path*',
              has: [{ type: 'host', value: 'www.glowvai.in' }],
              destination: 'https://glowvai.in/:path*',
              permanent: true,
            },
          ];
        },
        // The seller portal is a single-page app: any /sellers path that isn't a file serves its index.html.
        async rewrites() {
          return [
            { source: '/sellers', destination: '/sellers/index.html' },
            { source: '/sellers/:path*', destination: '/sellers/index.html' },
          ];
        },
        async headers() {
          return [
            { source: '/sellers', headers: sellerHeaders },
            { source: '/sellers/:path*', headers: sellerHeaders },
            {
              source: `/(${exceptStaticPortals})`,
              headers: [
                { key: 'Content-Security-Policy', value: csp },
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
              ],
            },
            {
              source: '/shop',
              headers: [
                { key: 'Content-Security-Policy', value: shopCsp },
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(self)' },
              ],
            },
            {
              source: '/shop/:path*',
              headers: [
                { key: 'Content-Security-Policy', value: shopCsp },
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(self)' },
              ],
            },
            {
              source: '/((?!face-analysis|shop|sellers).*)',
              headers: [{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' }],
            },
            {
              source: '/face-analysis',
              headers: [{ key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=()' }],
            },
            {
              source: '/',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400' }],
            },
            {
              source: '/images/:path*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
            },
          ];
        },
      }),
};

module.exports = nextConfig;
