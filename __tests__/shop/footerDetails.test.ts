import { test } from "node:test";
import assert from "node:assert/strict";
import { readFooterDetails } from "@/lib/shop/homeLayout";
import { mergeFooterSocials, configuredSocials } from "../../glowvai-app/features/shop/lib/homeModel";

const layout = (footer: Record<string, unknown>) => ({
  blocks: [{ id: "footer", enabled: true, position: 11, settings: { footer } }],
});

test("valid https links on allowed hosts are kept", () => {
  const got = readFooterDetails(
    layout({
      appStoreUrl: "https://apps.apple.com/in/app/glowvai/id123",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.glowvai",
      instagramUrl: "https://www.instagram.com/glowvai",
      facebookUrl: "https://www.facebook.com/glowvai",
      youtubeUrl: "https://www.youtube.com/@glowvai",
      linkedinUrl: "https://www.linkedin.com/company/glowvai/",
      xUrl: "https://x.com/glowvai",
      companyLine: "GlowVai Pvt. Ltd., Bengaluru",
    }),
  );
  assert.equal(got.appStoreUrl, "https://apps.apple.com/in/app/glowvai/id123");
  assert.equal(got.playStoreUrl, "https://play.google.com/store/apps/details?id=com.glowvai");
  assert.equal(got.instagramUrl, "https://www.instagram.com/glowvai");
  assert.equal(got.facebookUrl, "https://www.facebook.com/glowvai");
  assert.equal(got.youtubeUrl, "https://www.youtube.com/@glowvai");
  assert.equal(got.linkedinUrl, "https://www.linkedin.com/company/glowvai/");
  assert.equal(got.xUrl, "https://x.com/glowvai");
  assert.equal(got.companyLine, "GlowVai Pvt. Ltd., Bengaluru");
});

test("twitter.com is an allowed host", () => {
  assert.equal(readFooterDetails(layout({ xUrl: "https://twitter.com/glowvai" })).xUrl, "https://twitter.com/glowvai");
});

test("http is dropped", () => {
  assert.equal(readFooterDetails(layout({ instagramUrl: "http://www.instagram.com/glowvai" })).instagramUrl, "");
});

test("a wrong host is dropped", () => {
  assert.equal(readFooterDetails(layout({ facebookUrl: "https://www.facebook.evil.com/glowvai" })).facebookUrl, "");
  assert.equal(readFooterDetails(layout({ xUrl: "https://notx.com/glowvai" })).xUrl, "");
  assert.equal(readFooterDetails(layout({ youtubeUrl: "https://example.com/?youtube.com" })).youtubeUrl, "");
});

test("a subdomain of an allowed host is kept", () => {
  assert.equal(readFooterDetails(layout({ appStoreUrl: "https://itunes.apple.com/app/x" })).appStoreUrl, "https://itunes.apple.com/app/x");
  assert.equal(readFooterDetails(layout({ youtubeUrl: "https://m.youtube.com/c/glowvai" })).youtubeUrl, "https://m.youtube.com/c/glowvai");
});

test("credentials and over-long URLs are dropped", () => {
  assert.equal(readFooterDetails(layout({ xUrl: "https://user:pw@x.com/glowvai" })).xUrl, "");
  assert.equal(readFooterDetails(layout({ xUrl: "https://x.com/" + "a".repeat(300) })).xUrl, "");
});

test("companyLine over 160 characters is dropped", () => {
  assert.equal(readFooterDetails(layout({ companyLine: "a".repeat(160) })).companyLine.length, 160);
  assert.equal(readFooterDetails(layout({ companyLine: "a".repeat(161) })).companyLine, "");
});

test("missing settings gives all empty", () => {
  const empty = {
    appStoreUrl: "",
    playStoreUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
    linkedinUrl: "",
    xUrl: "",
    companyLine: "",
  };
  assert.deepEqual(readFooterDetails(undefined), empty);
  assert.deepEqual(readFooterDetails({ blocks: [{ id: "footer", enabled: true, position: 11 }] }), empty);
  assert.deepEqual(readFooterDetails({ blocks: [{ id: "hero", enabled: true, position: 0, settings: { footer: { xUrl: "https://x.com/a" } } }] }), empty);
});

test("a footer detail replaces the configured link of that network; an empty one keeps it", () => {
  const configured = { instagram: "https://www.instagram.com/old", twitter: "https://x.com/old", youtube: "", linkedin: "https://www.linkedin.com/company/glowvai/" };
  const merged = mergeFooterSocials(configured, {
    instagramUrl: "https://www.instagram.com/new",
    facebookUrl: "https://www.facebook.com/glowvai",
    youtubeUrl: "",
    linkedinUrl: "",
    xUrl: "",
  });
  assert.deepEqual(configuredSocials(merged), [
    { label: "Instagram", url: "https://www.instagram.com/new" },
    { label: "X", url: "https://x.com/old" },
    { label: "LinkedIn", url: "https://www.linkedin.com/company/glowvai/" },
    { label: "Facebook", url: "https://www.facebook.com/glowvai" },
  ]);
});
