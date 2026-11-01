import dns from "node:dns/promises";

/**
 * GLOW VAI Automated Email DNS Verification Script.
 * Checks SPF, DKIM, DMARC, and MX records for send.glowvai.in and news.glowvai.in.
 * Run with: npx tsx scripts/check-email-dns.ts
 */

async function checkDnsRecords() {
  console.log("============================================================");
  console.log("GLOW VAI EMAIL DNS RECORD VERIFIER");
  console.log("============================================================\n");

  const domains = ["send.glowvai.in", "news.glowvai.in"];

  for (const domain of domains) {
    console.log(`Checking Subdomain: ${domain}`);

    // 1. Check MX Record
    try {
      const mxRecords = await dns.resolveMx(domain);
      console.log(`  [PASS] MX Records found: ${mxRecords.map((m) => m.exchange).join(", ")}`);
    } catch {
      console.log(`  [WARN] MX Record not resolved for ${domain} (Verify in Resend dashboard)`);
    }

    // 2. Check SPF Record
    try {
      const txtRecords = await dns.resolveTxt(domain);
      const spfRecord = txtRecords.flat().find((t) => t.startsWith("v=spf1"));
      if (spfRecord) {
        console.log(`  [PASS] SPF TXT Record found: ${spfRecord}`);
      } else {
        console.log(`  [WARN] No SPF TXT record starting with v=spf1 found on ${domain}`);
      }
    } catch {
      console.log(`  [WARN] TXT Record query failed for ${domain}`);
    }

    // 3. Check DKIM Record
    const dkimDomain = `resend._domainkey.${domain}`;
    try {
      const dkimTxt = await dns.resolveTxt(dkimDomain);
      console.log(`  [PASS] DKIM Record found for ${dkimDomain}: ${dkimTxt.flat().join("")}`);
    } catch {
      console.log(`  [WARN] DKIM record not resolved for ${dkimDomain}`);
    }

    console.log("");
  }

  // 4. Check Root DMARC Record
  console.log("Checking DMARC Record at _dmarc.glowvai.in");
  try {
    const dmarcTxt = await dns.resolveTxt("_dmarc.glowvai.in");
    const dmarcRecord = dmarcTxt.flat().find((t) => t.startsWith("v=DMARC1"));
    if (dmarcRecord) {
      console.log(`  [PASS] DMARC TXT Record found: ${dmarcRecord}`);
    } else {
      console.log("  [WARN] DMARC record found but does not start with v=DMARC1");
    }
  } catch {
    console.log("  [WARN] DMARC TXT Record not found at _dmarc.glowvai.in");
  }

  console.log("\n============================================================");
  console.log("DNS Audit Completed. Note: DNS propagation can take up to 24 hours.");
  console.log("============================================================");
}

checkDnsRecords().catch(console.error);
