# PERSONAL BANK — GOOGLE PLAY STORE RELEASE CHECKLIST
**Comprehensive Production Readiness & Policy Compliance**

---

## 1. Account & Legal Readiness

- [ ] **Google Play Developer Account:**
  - Active Google Play Console account registered.
  - Identity verification completed (Government ID and address verification).
  - D-U-N-S number verified (if registered as an Organization).
  - One-time registration fee ($25) settled.
- [ ] **Privacy Policy Hosting:**
  - Publicly accessible Privacy Policy URL deployed at `https://personalbannk.vercel.app/guidebook` (or dedicated `/privacy` route).
  - Discloses local IndexedDB storage, cloud sync token hashing (SHA-256), and MongoDB Atlas hosting.
  - Explains that Personal Bank is an offline-first farm/family financial tracker and not a licensed bank or lending institution.

---

## 2. Google Play Store Listing Assets

### 2.1 Text Metadata
- [ ] **App Title (max 30 characters):**
  `Personal Bank`
- [ ] **Short Description (max 80 characters):**
  `Personal, family & farm accounting ledger with offline cloud sync.`
- [ ] **Full Description (English & Marathi):**
  - Highlight key capabilities:
    - 🌾 Farm & Crop ledger (sowing, fertilizers, labour payments, mandi harvest sales).
    - 🚜 Vehicle maintenance, fuel, and trip logbook.
    - 💰 Family loans, borrowings, interest tracking & repayments.
    - 📶 100% Offline-First: add entries without internet; auto-syncs when online.
    - 🔒 Private & Encrypted: token-based access with zero third-party ads.

### 2.2 Graphic Assets
- [ ] **App Icon:**
  - 512 x 512 px, 32-bit PNG.
  - Max file size: 1 MB.
  - Source file: [`public/icon-512.png`](file:///Users/apple/Downloads/pappa/public/icon-512.png).
- [ ] **Feature Graphic:**
  - 1024 x 500 px, JPG or 24-bit PNG (no alpha).
  - Max file size: 1 MB.
  - Visuals showcasing farm & finance dashboard.
- [ ] **Phone Screenshots:**
  - Minimum: 2 screenshots. Recommended: 6 to 8 screenshots.
  - Formats: 16:9 or 9:16 aspect ratio (e.g. 1080 x 2400 px).
  - Recommended views:
    1. Home Dashboard (Balance, Inflow, Outflow, Quick Actions).
    2. Farm & Crop Management (Plot view, crop expenses).
    3. Vehicle Logbook (Tractor, Bike, Car maintenance).
    4. Loans & Repayment Timeline.
    5. Detailed Reports (Income vs Expense charts).
    6. Marathi Language interface view.

---

## 3. Policy Declarations & App Content

### 3.1 Data Safety Section
- [ ] **Data Collection & Sharing:**
  - Data Collected:
    - Financial Info: User-entered purchase history, income, loans, expenses (Purpose: App Functionality).
    - Device or Other IDs: Sync Token / Client installation identifier (Purpose: App Functionality, Account Management).
  - Data Shared: **No data shared with third parties.**
  - Security Practices:
    - Data is encrypted in transit over HTTPS (TLS 1.3).
    - Users can request data deletion directly from the Settings screen ("Reset Local Data" and MongoDB account purge).

### 3.2 Financial Services Declaration (CRITICAL)
- [ ] Google Play mandates strict declarations for apps with "Bank" in the title:
  - Form Selection: Select **"Personal Financial Management / Budgeting & Accounting Tool"**.
  - Explicitly declare that the app **does NOT provide loans, credit lines, deposit accounts, wire transfers, or regulated banking services**.
  - It is a digital khata / ledger for self-employed farmers and families.

### 3.3 Target Audience & Content Rating
- [ ] **IARC Content Rating:**
  - Complete the questionnaire in Play Console.
  - Rating result: **Everyone 3+** (PEGI 3).
  - Contains no violence, no gambling, no mature content.
- [ ] **Target Age:** 18 and older.
- [ ] **Ads Declaration:** Declare **"No, my app does not contain ads"**.

---

## 4. Technical Bundle & Testing Phase

### 4.1 Production Bundle (`.aab`)
- [ ] Generated signed release bundle using Bubblewrap:
  - File: `android/app-release-bundle.aab`.
  - Target SDK: Android 14 (API level 34) or higher.
  - Keystore signature verified.
- [ ] **Digital Asset Links Verification:**
  - Deployed `https://personalbannk.vercel.app/.well-known/assetlinks.json`.
  - Verified with Google Digital Asset Links tool.
  - Both upload key and Play App Signing SHA-256 fingerprints registered.

### 4.2 20-Tester Closed Testing Requirement (Personal Accounts)
- [ ] For personal developer accounts created after Nov 2023, Google mandates:
  - 20 testers opted in for at least 14 continuous days on the Closed Testing track.
  - Create a Google Group with 20 family/community testers.
  - Deploy `app-release-bundle.aab` to the Closed Testing track.
  - Gather feedback and confirm zero crash rates.
  - Apply for Production Track access via the Play Console dashboard questionnaire after 14 days.

---

## 5. Rollout Strategy

- [ ] **Stage 1 (10% Staged Rollout):**
  - Monitor crash metrics in Android Vitals.
  - Monitor sync failure logs in MongoDB Atlas and Vercel Analytics.
- [ ] **Stage 2 (25% Staged Rollout):**
  - Verify error rates remain under 0.05%.
- [ ] **Stage 3 (50% Staged Rollout):**
  - Monitor Upstash Redis rate-limit metrics and server latency.
- [ ] **Stage 4 (100% Full Production Rollout):**
  - Full availability to all users across India and globally.
