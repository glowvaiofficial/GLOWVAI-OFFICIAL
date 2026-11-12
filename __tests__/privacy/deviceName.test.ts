import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { coarseDeviceName } from "../../lib/shop/privacy/rules";

const UA = {
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.50 Mobile/15E148 Safari/604.1",
  edgeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.61",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
  safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  chromeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

describe("coarse device names", () => {
  test("names the browser and the system", () => {
    assert.equal(coarseDeviceName(UA.chromeAndroid), "Chrome on Android");
    assert.equal(coarseDeviceName(UA.safariIphone), "Safari on iPhone");
    assert.equal(coarseDeviceName(UA.chromeIphone), "Chrome on iPhone");
    assert.equal(coarseDeviceName(UA.edgeWindows), "Edge on Windows");
    assert.equal(coarseDeviceName(UA.firefoxLinux), "Firefox on Linux");
    assert.equal(coarseDeviceName(UA.safariMac), "Safari on Mac");
    assert.equal(coarseDeviceName(UA.samsung), "Samsung Internet on Android");
    assert.equal(coarseDeviceName(UA.chromeWindows), "Chrome on Windows");
  });

  test("never shows a version number, a model or a raw user agent", () => {
    for (const ua of Object.values(UA)) {
      const name = coarseDeviceName(ua);
      assert.doesNotMatch(name, /\d/, `version or model in "${name}"`);
      assert.doesNotMatch(name, /SM-S911B|Mozilla|AppleWebKit/);
      assert.ok(name.length <= 40);
    }
  });

  test("an empty or missing user agent is named plainly", () => {
    assert.equal(coarseDeviceName(""), "Unknown device");
    assert.equal(coarseDeviceName(undefined), "Unknown device");
    assert.equal(coarseDeviceName("curl/8.0"), "Browser on Unknown system");
  });
});
