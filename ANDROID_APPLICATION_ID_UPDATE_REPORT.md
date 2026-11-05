# PERSONAL BANK — ANDROID APPLICATION ID UPDATE REPORT
**Trusted Web Activity (TWA) Identity Alignment & Signing Preparation**

---

## 1. Application Identity Overview

- **Old Application ID (Candidate):** `com.personalbank.app`
- **New Permanent Application ID:** `com.sumitjagtap.personalbank`
- **Production Origin:** `https://personalbannk.vercel.app/`
- **Target Platform:** Android (Trusted Web Activity via Google Bubblewrap)
- **Git Branch:** `feat/android-twa-security-hardening`

---

## 2. Modified Files Inventory

The application ID has been consistently updated across all active runtime, packaging, and configuration files:

| File Path | Component | Change Summary |
|---|---|---|
| [`android/twa-manifest.json`](file:///Users/apple/Downloads/pappa/android/twa-manifest.json) | Bubblewrap Packaging | Updated `"packageId": "com.sumitjagtap.personalbank"`. Preserved app name, origin, theme color `#2F7D4F`, and maskable icon. |
| [`public/.well-known/assetlinks.json`](file:///Users/apple/Downloads/pappa/public/.well-known/assetlinks.json) | Digital Asset Links (Static) | Updated `"package_name": "com.sumitjagtap.personalbank"`. Preserved safe placeholder fingerprint. |
| [`src/app/.well-known/assetlinks.json/route.ts`](file:///Users/apple/Downloads/pappa/src/app/.well-known/assetlinks.json/route.ts) | Next.js Asset Links Endpoint | Updated default fallback: `process.env.ANDROID_PACKAGE_NAME \|\| "com.sumitjagtap.personalbank"`. |
| [`.env.example`](file:///Users/apple/Downloads/pappa/.env.example) | Environment Template | Added `ANDROID_PACKAGE_NAME="com.sumitjagtap.personalbank"` and `ANDROID_SHA256_FINGERPRINT`. |
| [`.env.local.example`](file:///Users/apple/Downloads/pappa/.env.local.example) | Local Env Template | Added `ANDROID_PACKAGE_NAME="com.sumitjagtap.personalbank"` and placeholder fingerprint. |
| [`ANDROID_TWA_SETUP_GUIDE.md`](file:///Users/apple/Downloads/pappa/ANDROID_TWA_SETUP_GUIDE.md) | Release Guide | Updated package ID to `com.sumitjagtap.personalbank`. Enhanced keystore signing protocol and Play App Signing dual-fingerprint instructions. |
| [`PLAY_STORE_RELEASE_CHECKLIST.md`](file:///Users/apple/Downloads/pappa/PLAY_STORE_RELEASE_CHECKLIST.md) | Play Store Checklist | Explicitly documented `com.sumitjagtap.personalbank` under Section 4.1 Production Bundle. |

---

## 3. Remaining Old-ID References and Why They Remain

A strict repository scan (`grep -rn "com\.personalbank\.app"`) confirmed that **zero active runtime, build, or configuration files contain the old ID**.

The old ID appears exclusively in the following **historical audit reports**:
1. [`PHASE_1_IMPLEMENTATION_REPORT.md`](file:///Users/apple/Downloads/pappa/PHASE_1_IMPLEMENTATION_REPORT.md) — Line 125: Preserved as Option 1 in the initial multiple-choice proposal submitted to the user during Phase 1.
2. [`PHASE_1_INDEPENDENT_VERIFICATION.md`](file:///Users/apple/Downloads/pappa/PHASE_1_INDEPENDENT_VERIFICATION.md) — Lines 22, 48, 137: Preserved as the historical record of what was audited at commit `b3493b8`.
3. [`PHASE_1_FINAL_SECURITY_REVIEW.md`](file:///Users/apple/Downloads/pappa/PHASE_1_FINAL_SECURITY_REVIEW.md) — Lines 20, 160, 171: Preserved as the historical audit log of commit `88af0e5`.

> **Auditor Note:** In software auditing, historical audit certificates and decision logs are immutable records of prior states. Modifying historical certificates after sign-off violates documentation integrity. All active configuration is 100% migrated to `com.sumitjagtap.personalbank`.

---

## 4. Bubblewrap Configuration Validation

[`android/twa-manifest.json`](file:///Users/apple/Downloads/pappa/android/twa-manifest.json) was validated against Google Bubblewrap's specification schema:

```json
{
  "packageId": "com.sumitjagtap.personalbank",
  "host": "personalbannk.vercel.app",
  "name": "Personal Bank",
  "launcherName": "Personal Bank",
  "themeColor": "#2F7D4F",
  "navigationColor": "#000000",
  "navigationColorDark": "#000000",
  "navigationDividerColor": "#000000",
  "navigationDividerColorDark": "#000000",
  "backgroundColor": "#F5F7F3",
  "enableNotifications": true,
  "startUrl": "/",
  "iconUrl": "https://personalbannk.vercel.app/icon-512.png",
  "maskableIconUrl": "https://personalbannk.vercel.app/icon-512.png",
  "splashScreenFadeOutDuration": 300,
  "signingKey": {
    "path": "./release.keystore",
    "alias": "personalbank"
  },
  "appVersionName": "1.0.0",
  "appVersionCode": 1,
  "shortcuts": [],
  "generatorApp": "bubblewrap-cli",
  "webManifestUrl": "https://personalbannk.vercel.app/manifest.json",
  "fallbackType": "customtabs",
  "features": {
    "locationDelegation": {
      "enabled": false
    },
    "playBilling": {
      "enabled": false
    }
  },
  "alphaDependencies": {
    "enabled": false
  },
  "enableSiteSettingsShortcut": true,
  "isChromeOSOnly": false,
  "isAndroidXEnabled": true
}
```

- **JSON Syntax:** Verified valid via `JSON.parse`.
- **Package ID:** `com.sumitjagtap.personalbank` complies with Java/Android package naming conventions (starts with a reversed domain, contains only alphanumeric characters and underscores, each segment starts with a letter).
- **Origin & Manifest:** Launch URL resolves to `https://personalbannk.vercel.app/` with matching theme and background colors.

---

## 5. Digital Asset Links Status

- **Endpoint Served:** `https://personalbannk.vercel.app/.well-known/assetlinks.json`
- **Current Declaration:**
  ```json
  [
    {
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.sumitjagtap.personalbank",
        "sha256_cert_fingerprints": [
          "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00"
        ]
      }
    }
  ]
  ```
- **Domain Verification Status:** **Incomplete / Pending Real Key Generation (Expected).**
- **Safety Compliance:** In strict adherence to security requirements, **no fake or unverified fingerprints were published**. Domain verification will be completed once the developer generates their official keystore.

---

## 6. Secure Signing Preparation Guide

The guide in [`ANDROID_TWA_SETUP_GUIDE.md`](file:///Users/apple/Downloads/pappa/ANDROID_TWA_SETUP_GUIDE.md) has been updated with the following instructions:

### 6.1 Generation Command
To be executed manually by the authorized developer on an offline machine:
```bash
cd android
keytool -genkeypair \
  -v \
  -keystore release.keystore \
  -alias personalbank \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Personal Bank, OU=Finance, O=Sumit Jagtap, L=Mumbai, ST=Maharashtra, C=IN"
```

### 6.2 Key Rules
1. **Alias Preservation:** Must remain `personalbank` to align with `twa-manifest.json`.
2. **Password Security:** Use a 20+ character random passphrase stored in a team password manager. Never commit passwords or keystores to git.
3. **Fingerprint Extraction:**
   ```bash
   keytool -list -v -keystore release.keystore -alias personalbank
   ```
4. **Google Play App Signing (Dual Fingerprints):**
   When Google Play App Signing is enabled, Google re-signs the application bundle (`.aab`) with its own key upon distribution. The developer must register **both** fingerprints in `assetlinks.json`:
   - Fingerprint 1: Local Upload Key (extracted from `release.keystore`).
   - Fingerprint 2: Google Play App Signing Key (copied from Google Play Console under **Release > Setup > App Signing**).

---

## 7. Verification & Test Results

1. **JSON Syntax Validation:**
   - `android/twa-manifest.json`: **PASS**
   - `public/.well-known/assetlinks.json`: **PASS**
2. **TypeScript Compilation:**
   `npx tsc --noEmit` exited with code `0` (**0 errors**).
3. **Next.js Production Build:**
   `npm run build` compiled all **23 routes** successfully, including `/.well-known/assetlinks.json`.
4. **Phase 1 Automated Security & Sync Tests:**
   `npx tsx scripts/test-phase1-security-sync.ts` passed **14/14 tests (100%)**:
   - Monotonic versioning, clock skew defenses, atomic Lua rate limiting, full-token SHA-256 derivation, and storage persistence contracts all verified.

---

## 8. Outstanding Manual Tasks for Production Release

1. **Create Keystore:** Run `keytool -genkeypair` inside `android/` with a secure password.
2. **Extract Fingerprint:** Run `keytool -list -v -keystore release.keystore -alias personalbank`.
3. **Set Environment Variable in Vercel:** Add `ANDROID_SHA256_FINGERPRINT` in Vercel under Production & Preview.
4. **Build Android App Bundle:** Run `bubblewrap build` inside `android/`.
5. **Google Play Console:** Upload `app-release-bundle.aab` under package name `com.sumitjagtap.personalbank`.
