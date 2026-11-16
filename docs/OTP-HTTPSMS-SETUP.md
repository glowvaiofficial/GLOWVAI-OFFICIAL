# SMS OTP sign-in through httpSMS: setup

An Android phone with the httpSMS app is the SMS gateway. Each code costs SIM credit, and carriers block SIMs that send spam, so keep the limits in place.

1. **Install the app.** On a spare Android phone with an active SIM, install httpSMS from https://httpsms.com (Google Play or the APK on the site). Sign in, grant the SMS permission, turn off battery optimisation for the app and keep the phone on charge and online.
2. **Create the API key.** In the httpSMS dashboard (https://httpsms.com/settings) copy your API key and the phone number of the SIM (this is the sender).
3. **Set env vars in Vercel** (Project > Settings > Environment Variables, Production, then redeploy):
   - `HTTPSMS_API_KEY`: the API key from step 2.
   - `HTTPSMS_FROM`: the SIM number in E.164, e.g. `+919876543210`.
   - `OTP_HMAC_SECRET`: 32+ random bytes, e.g. `openssl rand -hex 32`. Changing it later invalidates pending codes.
   - Optional: `HTTPSMS_BASE_URL` (default `https://api.httpsms.com`) and `OTP_DAILY_CAP` (default 300 SMS a day).
4. **Switch the website client on.** Set `NEXT_PUBLIC_OTP_PROVIDER=httpsms` and redeploy (it is baked in at build time). Leave it unset or `firebase` to keep Firebase phone sign-in.
5. **Firestore rules.** The `otp_challenges` collection is written only by the server (Admin SDK bypasses rules). Add this to the rules of project `glowvai-38bde` (Firebase console > Firestore > Rules), inside `match /databases/{database}/documents`:

   ```
   match /otp_challenges/{id} {
     allow read, write: if false;
   }
   ```
6. **Cleanup.** Expired codes are deleted on the next verify attempt for that number; leftovers are tiny hashed documents.

Sessions from this flow are Firebase custom-token sessions carrying the claims `otpVia: "httpsms"` and `otpPhone`. The server accepts them wherever a phone sign-in is required (for example `/api/shop/account/create`); a custom token without those claims is rejected.
