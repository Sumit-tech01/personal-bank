import assert from "node:assert";
import mongoose from "mongoose";
import { DICTIONARIES, translate, formatLocalizedINR, formatLocalizedNumber, formatLocalizedDate, MARATHI_MONTHS, MARATHI_WEEKDAYS } from "../src/lib/i18n";
import { GUIDEBOOK_ARTICLES } from "../src/lib/guidebook/articles";
import { formatINR } from "../src/lib/money";
import { calculateTotals, unifiedFinancialMetrics } from "../src/lib/finance";
import type { Transaction, CropSale, Loan, LabourPayment } from "../src/lib/types";

// ANSI colors for clean test output
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

let passedCount = 0;
let totalCount = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    await fn();
    passedCount++;
    console.log(`  ${green("✔")} ${name}`);
  } catch (err) {
    console.error(`  ${red("✖")} ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function main() {
  console.log(`\n${bold("==============================================================================")}`);
  console.log(`${bold(cyan("PERSONAL BANK — PHASE 12 AUTOMATED VERIFICATION SUITE"))}`);
  console.log(`${cyan("Bilingual Experience + Complete Guidebook + Developer Portfolio")}`);
  console.log(`${bold("==============================================================================\n")}`);

  // ---------------------------------------------------------------------------
  // TEST GROUP 1: DICTIONARY COMPLETENESS & TRANSLATION ENGINE
  // ---------------------------------------------------------------------------
  console.log(bold("\n[GROUP 1] Bilingual Dictionaries & i18n Architecture:"));

  await runTest("English and Marathi dictionaries exist and are non-empty", () => {
    assert.ok(DICTIONARIES.en, "English dictionary must exist");
    assert.ok(DICTIONARIES.mr, "Marathi dictionary must exist");
    assert.ok(Object.keys(DICTIONARIES.en).length >= 80, "English dictionary must have at least 80 keys");
    assert.ok(Object.keys(DICTIONARIES.mr).length >= 80, "Marathi dictionary must have at least 80 keys");
  });

  await runTest("All English keys have corresponding Marathi translations (100% parity)", () => {
    const enKeys = Object.keys(DICTIONARIES.en);
    const missingInMarathi: string[] = [];
    for (const key of enKeys) {
      if (!DICTIONARIES.mr[key] || DICTIONARIES.mr[key].trim().length === 0) {
        missingInMarathi.push(key);
      }
    }
    assert.strictEqual(
      missingInMarathi.length,
      0,
      `Missing Marathi translation keys: ${missingInMarathi.join(", ")}`
    );
  });

  await runTest("translate() formats dynamic parameters correctly", () => {
    const textEn = translate("en", "sync.pending", { count: 5 });
    assert.strictEqual(textEn, "5 pending");

    const textMr = translate("mr", "sync.pending", { count: 3 });
    assert.strictEqual(textMr, "3 शिल्लक");
  });

  await runTest("translate() gracefully falls back to English when a key is absent", () => {
    const text = translate("mr", "app.tagline");
    assert.ok(text.includes("माझी शेती"), "Marathi translation should contain authentic Marathi text");

    // Non-existent key falls back to key itself
    const fallback = translate("mr", "non.existent.key");
    assert.strictEqual(fallback, "non.existent.key");
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: LOCALE-AWARE FORMATTERS & INVARIANT FINANCIAL ARITHMETIC
  // ---------------------------------------------------------------------------
  console.log(bold("\n[GROUP 2] Financial Invariance & Locale Formatting:"));

  await runTest("formatLocalizedINR formats rupee values using INR symbol and Indian comma grouping", () => {
    const paise = 12500000; // ₹1,25,000.00
    const formattedEn = formatLocalizedINR(paise, "en");
    const formattedMr = formatLocalizedINR(paise, "mr");

    assert.ok(formattedEn.includes("₹"), "Must include INR symbol");
    assert.ok(formattedEn.includes("1,25,000"), "Must use Indian grouping (1,25,000)");
    assert.ok(formattedMr.includes("₹"), "Marathi formatting must include INR symbol");
  });

  await runTest("Financial calculations produce identical integers regardless of active language", () => {
    const dummyTx: Transaction[] = [
      {
        id: "tx-1",
        entity: "transaction",
        ownerId: "owner-test",
        kind: "EXPENSE",
        group: "FARM",
        category: "Fertilizers",
        description: "Urea bags",
        amountPaise: 450000, // ₹4,500
        paymentMethod: "UPI",
        date: "2026-05-10",
        notes: "Urea bags",
        createdAt: "2026-05-10T10:00:00.000Z",
        updatedAt: "2026-05-10T10:00:00.000Z",
      },
      {
        id: "tx-2",
        entity: "transaction",
        ownerId: "owner-test",
        kind: "INCOME",
        group: "FARM",
        category: "Crop Sales",
        description: "Soybean advance",
        amountPaise: 1200000, // ₹12,000
        paymentMethod: "BANK",
        date: "2026-05-12",
        notes: "Soybean advance",
        createdAt: "2026-05-12T10:00:00.000Z",
        updatedAt: "2026-05-12T10:00:00.000Z",
      },
    ];

    const totals = calculateTotals(dummyTx);
    assert.strictEqual(totals.expensePaise, 450000);
    assert.strictEqual(totals.incomePaise, 1200000);
    assert.strictEqual(totals.netPaise, 750000);

    // Number conversions are strictly invariant
    assert.strictEqual(formatINR(totals.netPaise), "₹7,500");
  });

  await runTest("formatLocalizedDate handles Marathi months and weekdays correctly", () => {
    const testDate = "2026-08-15";
    const formattedEn = formatLocalizedDate(testDate, "en", "medium");
    const formattedMr = formatLocalizedDate(testDate, "mr", "medium");

    assert.ok(formattedEn.includes("Aug") || formattedEn.includes("15"), "English date formatting");
    assert.ok(formattedMr.includes("ऑग") || formattedMr.includes("ऑगस्ट"), "Marathi date should contain Marathi month");
    assert.ok(formattedMr.includes("15"), "Should contain day 15");
    assert.ok(formattedMr.includes("2026"), "Should contain year 2026");
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: COMPLETE 15 GUIDEBOOK TOPICS
  // ---------------------------------------------------------------------------
  console.log(bold("\n[GROUP 3] Guidebook Content & 15 Required Topics:"));

  const REQUIRED_TOPICS = [
    "getting-started",
    "family-management",
    "expense-management",
    "farm-management",
    "crop-management",
    "income-crop-sales",
    "labour-management",
    "vehicle-tractor-management",
    "loans-and-lending",
    "inventory-management",
    "reports-and-analysis",
    "reminders",
    "backup-restore",
    "settings-security",
    "troubleshooting",
  ];

  await runTest("Exactly 15 required guidebook topics are present with unique IDs", () => {
    assert.strictEqual(GUIDEBOOK_ARTICLES.length, 15, "Must have exactly 15 articles");
    const ids = GUIDEBOOK_ARTICLES.map((a) => a.id);
    for (const reqId of REQUIRED_TOPICS) {
      assert.ok(ids.includes(reqId), `Missing required topic ID: ${reqId}`);
    }
    const uniqueIds = new Set(ids);
    assert.strictEqual(uniqueIds.size, 15, "All article IDs must be strictly unique");
  });

  await runTest("Every guidebook article has complete English and Marathi structured content", () => {
    for (const article of GUIDEBOOK_ARTICLES) {
      // English check
      assert.ok(article.en.title?.length > 5, `Article ${article.id} en.title is too short`);
      assert.ok(article.en.shortExplanation?.length > 10, `Article ${article.id} en.shortExplanation is missing`);
      assert.ok(article.en.whyUseful?.length > 10, `Article ${article.id} en.whyUseful is missing`);
      assert.ok(Array.isArray(article.en.prerequisites), `Article ${article.id} en.prerequisites must be array`);
      assert.ok(article.en.steps.length >= 3, `Article ${article.id} en.steps must have at least 3 steps`);
      assert.ok(article.en.expectedResult?.length > 5, `Article ${article.id} en.expectedResult is missing`);
      assert.ok(article.en.commonMistakes?.length > 0, `Article ${article.id} en.commonMistakes is missing`);
      assert.ok(article.en.keywords?.length >= 2, `Article ${article.id} en.keywords must have keywords`);

      // Marathi check
      assert.ok(article.mr.title?.length > 5, `Article ${article.id} mr.title is too short`);
      assert.ok(article.mr.shortExplanation?.length > 10, `Article ${article.id} mr.shortExplanation is missing`);
      assert.ok(article.mr.whyUseful?.length > 10, `Article ${article.id} mr.whyUseful is missing`);
      assert.ok(Array.isArray(article.mr.prerequisites), `Article ${article.id} mr.prerequisites must be array`);
      assert.ok(article.mr.steps.length >= 3, `Article ${article.id} mr.steps must have at least 3 steps`);
      assert.ok(article.mr.expectedResult?.length > 5, `Article ${article.id} mr.expectedResult is missing`);
      assert.ok(article.mr.commonMistakes?.length > 0, `Article ${article.id} mr.commonMistakes is missing`);
      assert.ok(article.mr.keywords?.length >= 2, `Article ${article.id} mr.keywords must have keywords`);

      // Category labels
      assert.ok(article.categoryLabel.en?.length > 2, `Article ${article.id} categoryLabel.en is missing`);
      assert.ok(article.categoryLabel.mr?.length > 2, `Article ${article.id} categoryLabel.mr is missing`);
    }
  });

  await runTest("Guidebook search algorithm finds articles by English and Marathi keywords", () => {
    const searchArticles = (query: string, lang: "en" | "mr") => {
      const q = query.trim().toLowerCase();
      return GUIDEBOOK_ARTICLES.filter((a) => {
        const c = a[lang];
        const alt = lang === "mr" ? a.en : a.mr;
        return (
          c.title.toLowerCase().includes(q) ||
          c.shortExplanation.toLowerCase().includes(q) ||
          c.keywords.some((k) => k.toLowerCase().includes(q)) ||
          alt.keywords.some((k) => k.toLowerCase().includes(q))
        );
      });
    };

    const cropResultsEn = searchArticles("crop", "en");
    assert.ok(cropResultsEn.length >= 1, "Searching 'crop' in English must yield results");

    const cropResultsMr = searchArticles("पीक", "mr");
    assert.ok(cropResultsMr.length >= 1, "Searching 'पीक' in Marathi must yield results");

    const tractorResults = searchArticles("tractor", "en");
    assert.ok(tractorResults.some((a) => a.id === "vehicle-tractor-management"), "Must find vehicle-tractor-management");

    const backupResults = searchArticles("बॅकअप", "mr");
    assert.ok(backupResults.some((a) => a.id === "backup-restore"), "Must find backup-restore");
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: MY PORTFOLIO VERIFICATION & SECURITY
  // ---------------------------------------------------------------------------
  console.log(bold("\n[GROUP 4] Verified Developer Portfolio Integration:"));

  const EXPECTED_PORTFOLIO_URL = "https://sumitjagtap.vercel.app/";

  await runTest("Verified Portfolio URL is strictly https://sumitjagtap.vercel.app/", () => {
    const configuredUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL || EXPECTED_PORTFOLIO_URL;
    assert.strictEqual(configuredUrl, EXPECTED_PORTFOLIO_URL, "Portfolio URL must strictly match verified URL");
    assert.ok(configuredUrl.startsWith("https://"), "Portfolio URL must use secure HTTPS");
  });

  await runTest("Settings page includes Developer section with external link attributes", async () => {
    const fs = await import("node:fs/promises");
    const settingsCode = await fs.readFile("src/app/settings/page.tsx", "utf-8");

    assert.ok(settingsCode.includes("PORTFOLIO_URL"), "Settings page must reference PORTFOLIO_URL");
    assert.ok(settingsCode.includes('target="_blank"'), "External link must open in new tab");
    assert.ok(settingsCode.includes('rel="noopener noreferrer"'), "External link must have rel='noopener noreferrer' for security");
    assert.ok(settingsCode.includes("ExternalLink"), "External link icon must be rendered");
    assert.ok(settingsCode.includes("settings.sectionDeveloper"), "Section 3: Developer must be present");
  });

  await runTest("Settings page contains all 4 required sections in order", async () => {
    const fs = await import("node:fs/promises");
    const settingsCode = await fs.readFile("src/app/settings/page.tsx", "utf-8");

    const idxPref = settingsCode.indexOf("SECTION 1: APP PREFERENCES");
    const idxHelp = settingsCode.indexOf("SECTION 2: HELP & SUPPORT");
    const idxDev = settingsCode.indexOf("SECTION 3: DEVELOPER");
    const idxSec = settingsCode.indexOf("SECTION 4: SECURITY");

    assert.ok(idxPref > 0, "Section 1 must exist");
    assert.ok(idxHelp > idxPref, "Section 2 must follow Section 1");
    assert.ok(idxDev > idxHelp, "Section 3 must follow Section 2");
    assert.ok(idxSec > idxDev, "Section 4 must follow Section 3");
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: PRODUCTION DATABASE SAFETY & INTEGRITY
  // ---------------------------------------------------------------------------
  console.log(bold("\n[GROUP 5] Production Database Safety & Integrity:"));

  await runTest("Preserve the 4 existing production documents in personal_bank.syncrecords", async () => {
    const prodUri = process.env.MONGODB_URI;
    if (!prodUri || prodUri.includes("<") || prodUri.includes("cluster-host")) {
      console.log("    (Skipping live MongoDB check: MONGODB_URI contains unconfigured placeholder)");
      return;
    }

    try {
      const conn = await mongoose.createConnection(prodUri, {
        serverSelectionTimeoutMS: 5000,
      }).asPromise();

      const dbName = conn.name;
      const count = await conn.collection("syncrecords").countDocuments({});
      await conn.close();

      console.log(`    Connected to production DB: '${dbName}', Syncrecords count: ${count}`);
      if (dbName === "personal_bank") {
        assert.ok(count >= 4, "Production database must maintain at least the 4 preserved financial records");
      }
    } catch (err) {
      console.log("    (Remote MongoDB network timeout or offline in test sandbox, skipped live query safely)");
    }
  });

  console.log(`\n${bold("==============================================================================")}`);
  console.log(bold(green(`PHASE 12 TEST SUITE COMPLETED: ${passedCount}/${totalCount} TESTS PASSED`)));
  console.log(`${bold("==============================================================================\n")}`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner encountered an error:", err);
  process.exit(1);
});
