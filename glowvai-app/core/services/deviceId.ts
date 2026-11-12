// A random id for this browser, kept in local storage. It is sent with each shop call (header X-GlowVai-Device) so the
// server can list the account's devices and mark this one. The server stores only a salted hash of it, never the id.
// Blocked storage gives '' and the header is simply not sent.
const KEY = 'glowvai.device.v1';
const VALID = /^[A-Za-z0-9_-]{16,64}$/;

function newId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function currentDeviceId(): string {
  try {
    const stored = localStorage.getItem(KEY) ?? '';
    if (VALID.test(stored)) return stored;
    const fresh = newId();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return '';
  }
}
