const isStaticExport = process.env.DEPLOY_TARGET === 'github-pages';

// Hosts the site actually calls (checked in code): Google Apps Script (forms, sheet),
// Google Sheets (admin read), Google Analytics (after consent), IP and location lookup
// used by the scan, and the QR image service used by the referral portal.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://api.qrserver.com https://www.google-analytics.com https://www.googletagmanager.com https://*.googleusercontent.com https://drive.google.com https://firebasestorage.googleapis.com https://*.gstatic.com https://*.nykaa.com https://*.cureka.com https://*.apollo247.in https://*.gumlet.io https://thedermaco.com https://beminimalist.co https://*.speedsize.com https://m.media-amazon.com https://cdn.shopify.com https://*.ppl-media.com https://rukminim2.flixcart.com https://*.flixcart.com",
  "font-src 'self' data:",
  // The shop bundle also runs on these pages after a client-side link to /shop (the document keeps this policy), so the
  // Firebase hosts it calls are listed here too. Firestore reads go over HTTPS and its listen channel over WSS.
  "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://docs.google.com https://api.ipify.org https://ipapi.co https://nominatim.openstreetmap.org https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://firestore.googleapis.com wss://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// The glowvai app shell under /shop talks to Firebase, Razorpay and the scan backend, so it gets its own policy.
const devEval = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";
// Local backends (scan API on :4000, the CNN server on :10000) are reachable only from development builds.
const devConnect = process.env.NODE_ENV === 'production' ? '' : ' http://localhost:4000 http://localhost:10000';

// Google Maps (the order tracking map) is allowed on the shop only when the build has a key. The shop is one page, so the
// hosts are added to its policy and nowhere else; without a key the policy is unchanged.
const MAPS_ON = Boolean((process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim());
const withMaps = (csp) =>
  MAPS_ON
    ? ['script-src', 'img-src', 'connect-src'].reduce((acc, directive) => acc.replace(new RegExp(`(${directive} [^;]*)`), '$1 https://maps.googleapis.com https://maps.gstatic.com'), csp)
    : csp;

const shopCsp = withMaps([
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval} 'wasm-unsafe-eval' https://www.googletagmanager.com https://checkout.razorpay.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://firebasestorage.googleapis.com https://*.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com https://*.gstatic.com https://*.nykaa.com https://*.cureka.com https://*.apollo247.in https://*.gumlet.io https://thedermaco.com https://beminimalist.co https://*.speedsize.com https://m.media-amazon.com https://cdn.shopify.com https://*.ppl-media.com https://rukminim2.flixcart.com https://*.flixcart.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google.com/recaptcha/ https://glowvai-backend-r7u2.onrender.com https://api.razorpay.com https://lumberjack.razorpay.com https://script.google.com https://script.googleusercontent.com https://nominatim.openstreetmap.org https://api.bigdatacloud.net https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com${devConnect}`,
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.firebaseapp.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.razorpay.com",
].join('; '));

// Static files that load their own third-party scripts keep their own rules. The shop has its own policy above.
const exceptStaticPortals = '(?!portal\\.html|referral/portal\\.html|referral/index\\.html|shop|firebase-messaging-sw\\.js|rider).*';

// The rider page (delivery partners) talks only to this site. It gets its own, stricter policy and no third-party hosts.
const riderCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
// The shop's Firebase web config is written into the browser bundle at build time, so a production build without it
// would ship a shop that cannot start. Fail the Vercel production build instead (see .env.example).
const SHOP_FIREBASE_ENV = ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'];
const missingShopEnv = SHOP_FIREBASE_ENV.filter((name) => !process.env[name]);
if (process.env.VERCEL_ENV === 'production' && missingShopEnv.length > 0) {
  throw new Error(`Missing shop Firebase settings: ${missingShopEnv.join(', ')}. Add them to the Vercel project's Production environment.`);
}

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
        // The admin console runs as its own app. Requests for /admin2006/console go to ADMIN_CONSOLE_ORIGIN, and the
        // middleware checks the admin session before this runs.
        async rewrites() {
          const origin = process.env.ADMIN_CONSOLE_ORIGIN;
          if (!origin) return [];
          return [{ source: '/admin2006/console/:path*', destination: `${origin.replace(/\/+$/, '')}/admin2006/console/:path*` }];
        },
        async headers() {
          return [
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
              source: '/rider',
              headers: [
                { key: 'Content-Security-Policy', value: riderCsp },
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Referrer-Policy', value: 'no-referrer' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
                { key: 'Cache-Control', value: 'no-store' },
                { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
              ],
            },
            {
              source: '/api/rider/:path*',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'no-referrer' },
                { key: 'Cache-Control', value: 'no-store' },
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
              source: '/((?!face-analysis|shop).*)',
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
            // The push service worker: its own policy, so it may load the Firebase messaging scripts from Google's CDN and
            // nothing else. It is served from the app origin only.
            {
              source: '/firebase-messaging-sw.js',
              headers: [
                { key: 'Content-Security-Policy', value: "default-src 'none'; script-src 'self' https://www.gstatic.com; connect-src 'self' https://*.googleapis.com" },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Cache-Control', value: 'no-cache' },
              ],
            },
            {
              source: '/images/:path*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
            },
            // Shop images and fonts keep their file names when they change, so cache for a day rather than a week.
            {
              source: '/glowvai/assets/:path*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
            },
          ];
        },
      }),
};

module.exports = nextConfig;
