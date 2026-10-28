import { entityConfig, getRenderableEntityConfig } from "../config/entity";
import {
  buildHomeGraph,
  buildAboutPageGraph,
  buildContactPageGraph,
  ORG_ID,
  WEBSITE_ID,
  FOUNDER_1_ID,
  FOUNDER_2_ID,
  FOUNDER_3_ID,
} from "../lib/seo/entity-graph";

function runEntityTests() {
  console.log("🧪 Running Entity SEO & Knowledge Graph Unit Tests...");
  let errors = 0;

  // Test 1: Brand Casing & Facts
  if (entityConfig.brand.name !== "GLOW VAI") {
    console.error(`❌ Brand name must be exact casing 'GLOW VAI', got: '${entityConfig.brand.name}'`);
    errors++;
  }

  // Test 2: Unverified Flag logic (TODO fields must be omitted when flag is false)
  const renderable = getRenderableEntityConfig();
  if (renderable.legalName !== undefined) {
    console.error("❌ legalName must be undefined when legalNameVerified is false!");
    errors++;
  }
  if (renderable.foundingDate !== undefined) {
    console.error("❌ foundingDate must be undefined when foundingDateVerified is false!");
    errors++;
  }
  if (renderable.address !== undefined) {
    console.error("❌ address must be undefined when addressVerified is false!");
    errors++;
  }

  // Test 3: Home Graph Validation
  const homeGraph = buildHomeGraph();
  const homeJson = JSON.stringify(homeGraph);

  // Check banned strings in rendered JSON-LD output
  const bannedTerms = ["localhost", "glowvai.com", "stkn", "utm_", "TODO"];
  bannedTerms.forEach((term) => {
    if (homeJson.toLowerCase().includes(term.toLowerCase())) {
      console.error(`❌ Home graph JSON-LD contains banned term '${term}'!`);
      errors++;
    }
  });

  // Check em-dashes
  if (homeJson.includes("—")) {
    console.error("❌ Home graph contains em-dash ('—')!");
    errors++;
  }

  // Test 4: Stable @id validation in Home Graph
  const graphNodes = homeGraph["@graph"] as any[];
  const orgNode = graphNodes.find((n) => n["@type"] === "Organization");
  const websiteNode = graphNodes.find((n) => n["@type"] === "WebSite");

  if (!orgNode || orgNode["@id"] !== ORG_ID) {
    console.error(`❌ Organization node missing or @id invalid! Expected ${ORG_ID}`);
    errors++;
  }
  if (!websiteNode || websiteNode["@id"] !== WEBSITE_ID) {
    console.error(`❌ WebSite node missing or @id invalid! Expected ${WEBSITE_ID}`);
    errors++;
  }

  // Test 5: AboutPage Graph Validation
  const aboutGraph = buildAboutPageGraph();
  const aboutJson = JSON.stringify(aboutGraph);

  bannedTerms.forEach((term) => {
    if (aboutJson.toLowerCase().includes(term.toLowerCase())) {
      console.error(`❌ About page graph JSON-LD contains banned term '${term}'!`);
      errors++;
    }
  });

  if (aboutJson.includes("—")) {
    console.error("❌ About page graph contains em-dash ('—')!");
    errors++;
  }

  const aboutNodes = aboutGraph["@graph"] as any[];
  const founderNodes = aboutNodes.filter((n) => n["@type"] === "Person");

  if (founderNodes.length !== 3) {
    console.error(`❌ Expected 3 Person nodes in About graph, found ${founderNodes.length}`);
    errors++;
  }

  const founderIds = founderNodes.map((f) => f["@id"]);
  const expectedFounderIds = [FOUNDER_1_ID, FOUNDER_2_ID, FOUNDER_3_ID];
  expectedFounderIds.forEach((expectedId) => {
    if (!founderIds.includes(expectedId)) {
      console.error(`❌ Missing expected founder @id in graph: ${expectedId}`);
      errors++;
    }
  });

  // Test 6: @id Uniqueness across About Graph
  const allIds = aboutNodes.map((n) => n["@id"]).filter(Boolean);
  const uniqueIds = new Set(allIds);
  if (allIds.length !== uniqueIds.size) {
    console.error(`❌ Duplicate @id values found in About graph! Total: ${allIds.length}, Unique: ${uniqueIds.size}`);
    errors++;
  }

  // Test 7: Absolute HTTPS URLs Check
  const urlCheck = (obj: any) => {
    if (typeof obj === "string") {
      if (obj.startsWith("http://") || (obj.startsWith("http") && !obj.startsWith("https://glowvai.in") && !obj.startsWith("https://www.instagram.com") && !obj.startsWith("https://x.com") && !obj.startsWith("https://www.linkedin.com") && !obj.startsWith("https://schema.org"))) {
        console.error(`❌ Non-canonical or insecure URL found in schema: ${obj}`);
        errors++;
      }
    } else if (typeof obj === "object" && obj !== null) {
      Object.values(obj).forEach((val) => urlCheck(val));
    }
  };
  urlCheck(aboutGraph);

  // Test 8: Visual Description Match Check
  const visibleAboutText = "GLOW VAI is an Indian skincare retail brand offering a free AI face scan and instant WhatsApp ordering for authentic Minimalist and The Derma Co products.";
  if (entityConfig.brand.description !== visibleAboutText) {
    console.error(`❌ Schema description does not match visible About text!\nSchema: "${entityConfig.brand.description}"\nVisible: "${visibleAboutText}"`);
    errors++;
  }

  if (errors > 0) {
    console.error(`❌ Entity SEO unit tests failed with ${errors} error(s).`);
    process.exit(1);
  }

  console.log("✅ All Entity SEO & Knowledge Graph unit tests passed successfully!");
}

runEntityTests();
