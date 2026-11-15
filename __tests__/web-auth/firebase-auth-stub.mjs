export const getAuth = () => ({ verifyIdToken: (token) => globalThis.__fakeVerifyIdToken(token) });
