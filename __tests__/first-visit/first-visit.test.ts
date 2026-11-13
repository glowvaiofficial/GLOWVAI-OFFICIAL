import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  QUIZ_DISMISSED_KEY,
  SKIN_CONCERNS_KEY,
  SKIN_RECOMMENDATIONS_KEY,
  dismissQuiz,
  firstVisitState,
  saveQuizAnswers,
  skinMatchedPicks,
  type KeyValueStore,
} from "../../glowvai-app/features/shop/lib/firstVisit";

// A storage that survives "reloads": the same backing map is handed to each new read.
const memoryStore = (seed: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error("storage blocked");
  },
  setItem: () => {
    throw new Error("storage blocked");
  },
};

type Product = { name: string; description: string; keyActives: string[] };
const catalog: Product[] = [
  { name: "Gentle Cleanser", description: "Everyday wash", keyActives: ["glycerin"] },
  { name: "Acne Gel", description: "Targets breakouts", keyActives: ["niacinamide", "salicylic acid"] },
  { name: "Hydra Cream", description: "Deep hydration for dry skin", keyActives: ["hyaluronic acid", "ceramide"] },
  { name: "Night Serum", description: "Retinol for fine lines", keyActives: ["peptide"] },
];

describe("first visit: what the shop home shows", () => {
  test("a new visitor opens the products, with the quiz banner and no recommendations", () => {
    const state = firstVisitState(memoryStore());
    assert.equal(state.screen, "shop-home");
    assert.equal(state.showQuizBanner, true);
    assert.equal(state.recommendationsOn, false);
    assert.deepEqual(state.concerns, []);
  });

  test("blocked or missing storage still opens the products", () => {
    assert.equal(firstVisitState(null).screen, "shop-home");
    assert.equal(firstVisitState(null).showQuizBanner, true);
    assert.equal(firstVisitState(brokenStore).screen, "shop-home");
    assert.equal(firstVisitState(brokenStore).showQuizBanner, true);
  });

  test("the first screen never changes, whatever has been stored", () => {
    const values = [undefined, "true", "false", "[]", "not json", '["ACNE"]'];
    for (const dismissed of values) {
      for (const answered of values) {
        for (const concerns of values) {
          const seed: Record<string, string> = {};
          if (dismissed !== undefined) seed[QUIZ_DISMISSED_KEY] = dismissed;
          if (answered !== undefined) seed[SKIN_RECOMMENDATIONS_KEY] = answered;
          if (concerns !== undefined) seed[SKIN_CONCERNS_KEY] = concerns;
          assert.equal(firstVisitState(memoryStore(seed)).screen, "shop-home");
        }
      }
    }
  });
});

describe("first visit: skipping the quiz", () => {
  test("dismissing hides the banner, and it stays hidden after a reload", () => {
    const store = memoryStore();
    dismissQuiz(store);
    assert.equal(store.data.get(QUIZ_DISMISSED_KEY), "true");
    // A reload reads the same storage again.
    const afterReload = firstVisitState(store);
    assert.equal(afterReload.showQuizBanner, false);
    assert.equal(afterReload.recommendationsOn, false);
    assert.equal(afterReload.screen, "shop-home");
  });

  test("dismissing with blocked storage does not throw", () => {
    assert.doesNotThrow(() => dismissQuiz(brokenStore));
    assert.doesNotThrow(() => dismissQuiz(null));
  });

  test("finishing the quiz with no concern chosen counts as a skip", () => {
    const store = memoryStore();
    saveQuizAnswers(store, []);
    assert.equal(store.data.get(QUIZ_DISMISSED_KEY), "true");
    assert.equal(store.data.has(SKIN_RECOMMENDATIONS_KEY), false);
    assert.equal(firstVisitState(store).showQuizBanner, false);
  });
});

describe("first visit: taking the quiz", () => {
  test("answering sets the recommendations flag, saves the concerns and hides the banner", () => {
    const store = memoryStore();
    saveQuizAnswers(store, ["ACNE", "DRYNESS"]);
    assert.equal(store.data.get(SKIN_RECOMMENDATIONS_KEY), "true");
    assert.equal(store.data.get(SKIN_CONCERNS_KEY), JSON.stringify(["ACNE", "DRYNESS"]));
    const state = firstVisitState(store);
    assert.equal(state.recommendationsOn, true);
    assert.equal(state.showQuizBanner, false);
    assert.deepEqual(state.concerns, ["ACNE", "DRYNESS"]);
    assert.equal(state.screen, "shop-home");
  });

  test("unknown concern ids and damaged saved answers are ignored", () => {
    const store = memoryStore();
    saveQuizAnswers(store, ["ACNE", "toString", "__proto__"]);
    assert.deepEqual(firstVisitState(store).concerns, ["ACNE"]);

    const damaged = memoryStore({ [SKIN_CONCERNS_KEY]: "{oops", [SKIN_RECOMMENDATIONS_KEY]: "true" });
    const state = firstVisitState(damaged);
    assert.deepEqual(state.concerns, []);
    assert.equal(state.recommendationsOn, false);
  });

  test("the flag alone, without saved concerns, does not switch recommendations on", () => {
    const state = firstVisitState(memoryStore({ [SKIN_RECOMMENDATIONS_KEY]: "true" }));
    assert.equal(state.recommendationsOn, false);
  });
});

describe("skin-matched picks", () => {
  test("picks follow the quiz answers, best matches first", () => {
    const picks = skinMatchedPicks(catalog, ["ACNE"]);
    assert.deepEqual(picks.map((p) => p.name), ["Acne Gel"]);
    const hydration = skinMatchedPicks(catalog, ["DRYNESS", "FINE_LINES"]);
    // Hydra Cream matches most keywords, so it comes first. Gentle Cleanser matches "glycerin" (a hydration keyword).
    assert.equal(hydration[0].name, "Hydra Cream");
    assert.ok(hydration.some((p) => p.name === "Night Serum"));
    assert.ok(!hydration.some((p) => p.name === "Acne Gel"));
  });

  test("no answers, or nothing matching, gives an empty list so the normal list shows", () => {
    assert.deepEqual(skinMatchedPicks(catalog, []), []);
    assert.deepEqual(skinMatchedPicks(catalog, ["HYPERPIGMENTATION"]), []);
    assert.deepEqual(skinMatchedPicks([], ["ACNE"]), []);
  });
});

describe("no route forces the profile form before products", () => {
  const files = [
    "glowvai-app/context/AppContext.tsx",
    "glowvai-app/screens/OnboardingScreen.tsx",
    "glowvai-app/features/auth/SkinSurveyScreen.tsx",
    "glowvai-app/features/settings/settingsSections.tsx",
    "glowvai-app/features/shop/screens/ShopHomeScreen.tsx",
    "glowvai-app/features/shop/shared/SkinQuizBanner.tsx",
    "glowvai-app/features/shop/lib/firstVisit.ts",
  ];
  // Sign-in with a phone number is the account gate (features/auth/accountGate.ts), so 'login' and 'auth-login' are allowed.
  const detailsRoutes = /navigate\(\s*['"](customer-details|auth-profile-setup)['"]/;
  const root = join(import.meta.dirname, "..", "..");

  for (const file of files) {
    test(`${file} never navigates to the "Your details" form`, () => {
      const source = readFileSync(join(root, file), "utf8");
      assert.doesNotMatch(source, detailsRoutes);
    });
  }

  test("the shop home has no blocking gate before the product lists", () => {
    const source = readFileSync(join(root, "glowvai-app/features/shop/screens/ShopHomeScreen.tsx"), "utf8");
    assert.match(source, /<SkinQuizBanner \/>/);
    assert.doesNotMatch(source, /if \(!firstVisit|return <SkinQuizBanner/);
  });
});
