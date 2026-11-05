# PERSONAL BANK — ANDROID TWA PACKAGING & SETUP GUIDE
**Trusted Web Activity (TWA) Generation & Release Instructions**

---

## 1. Overview & Architecture

**Personal Bank** uses a **Trusted Web Activity (TWA)** architecture to deliver an Android application. 

### Why TWA?
- **Full Browser Engine Parity:** TWAs execute directly within Google Chrome (or default Chromium browser) on the Android device, guaranteeing identical rendering, IndexedDB performance, and service worker execution as the web application.
- **Zero Browser Address Bar:** With verified **Digital Asset Links**, the Chrome address bar is completely hidden. The application displays as a 100% native full-screen app.
- **Lightweight App Bundle:** APK/AAB size is typically under 3 MB because the heavy rendering engine is provided by the Android OS Chrome runtime.
- **Instant Cloud Updates:** Changes pushed to the web app (`https://personalbannk.vercel.app/`) are immediately live in the Android app without waiting for Google Play store review, while offline functionality continues working via Service Workers and IndexedDB.

---

## 2. Prerequisites & Environment Setup

To compile the Android App Bundle (`.aab`) locally, the following tools are required:

1. **Node.js:** v18.0.0 or higher.
2. **Java Development Kit (JDK):** OpenJDK 17 or higher (Required by Android Gradle Plugin 8+).
   - On macOS: `brew install openjdk@17`
   - Set environment variable: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`
3. **Android SDK & Build Tools:**
   - Install Android Studio or Android Command-line Tools (`cmdline-tools`).
   - Set environment variable: `export ANDROID_HOME=$HOME/Library/Android/sdk`
4. **Bubblewrap CLI:**
   ```bash
   npm install -g @bubblewrap/cli
   ```

---

## 3. Keystore Generation & Digital Asset Links

### 3.1 Generate a Production Signing Keystore
When you are ready to prepare your release build, run the following command to generate the production release keystore:

```bash
cd /Users/apple/Downloads/pappa/android

keytool -genkeypair \
  -v \
  -keystore release.keystore \
  -alias personalbank \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_SECURE_PASSWORD \
  -keypass YOUR_SECURE_PASSWORD \
  -dname "CN=Personal Bank, OU=Finance, O=Sumit Jagtap, L=Mumbai, ST=Maharashtra, C=IN"
```

#### Key Alias & Parameter Rules:
- **Alias:** Use `personalbank` (matches `"signingKey.alias": "personalbank"` in `twa-manifest.json`).
- **Keysize & Algorithm:** `RSA 2048-bit` with `10,000 days` validity (required for Google Play).
- **Password Protection:** Choose a high-entropy passphrase (minimum 16 characters). Never reuse repository or server passwords.

#### Keystore Security & Backup Protocol:
> [!CAUTION]
> **CRITICAL SECURITY RULE:** Never commit `release.keystore`, `.jks`, or keystore passwords to git. The `.gitignore` in `android/` strictly excludes these files.
> 1. Store `release.keystore` and its passwords in a secure team password manager (e.g., 1Password, Bitwarden).
> 2. Create redundant, encrypted offline backups (e.g. encrypted USB in cold storage).
> 3. If this keystore is permanently lost before enrolling in Google Play App Signing, you will **never** be able to update the app on the Google Play Store under this package name.

### 3.2 Extract the SHA-256 Certificate Fingerprint
Run `keytool -list` to extract your SHA-256 certificate fingerprint:

```bash
keytool -list -v -keystore release.keystore -alias personalbank -storepass YOUR_SECURE_PASSWORD
```

Locate the line beginning with `SHA256:`. Example output:
```text
Certificate fingerprints:
  SHA1: 4B:12:34:...
  SHA256: 14:6D:E8:F2:8C:3A:9B:41:22:98:F0:B5:12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12:34:56:78
```

### 3.3 Configure Digital Asset Links (`assetlinks.json`)
The application serves Digital Asset Links at `https://personalbannk.vercel.app/.well-known/assetlinks.json`.

Currently, the endpoint contains an explicitly documented placeholder fingerprint (`00:00:00...`) to maintain a safe, non-fabricated state.

Once your real fingerprint is extracted, update [`public/.well-known/assetlinks.json`](file:///Users/apple/Downloads/pappa/public/.well-known/assetlinks.json) or set the `ANDROID_SHA256_FINGERPRINT` environment variable in Vercel:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.sumitjagtap.personalbank",
      "sha256_cert_fingerprints": [
        "14:6D:E8:F2:8C:3A:9B:41:22:98:F0:B5:12:34:56:78:9A:BC:DE:F0:12:34:56:78"
      ]
    }
  }
]
```

### 3.4 Google Play App Signing Dual-Fingerprint Requirement
When deploying via Google Play:
1. Google Play App Signing is mandatory for all new applications.
2. Your local `release.keystore` becomes your **Upload Key**.
3. Google generates and holds the official **App Signing Key** in Google's secure infrastructure.
4. Android devices downloading the app from Google Play verify against Google's App Signing certificate fingerprint, NOT your local upload key!
5. **Action Required:** Once your first bundle is uploaded to Google Play Console, navigate to **Release > Setup > App Signing**, copy the **App signing key certificate SHA-256 fingerprint**, and add it as a second entry in `assetlinks.json`:
   ```json
   "sha256_cert_fingerprints": [
     "YOUR_LOCAL_UPLOAD_KEY_SHA256_FINGERPRINT",
     "GOOGLE_PLAY_APP_SIGNING_KEY_SHA256_FINGERPRINT"
   ]
   ```
   This ensures that both local testing APKs and Play Store production builds pass domain verification with zero browser address bar.

---

## 4. Building the Android App with Bubblewrap

### 4.1 Initialize the Project (Using Prepared Manifest)
We have already generated the complete [`android/twa-manifest.json`](file:///Users/apple/Downloads/pappa/android/twa-manifest.json) tailored for Personal Bank:
- **Package ID:** `com.sumitjagtap.personalbank`
- **Host:** `personalbannk.vercel.app`
- **Theme Color:** `#2F7D4F`
- **Background Color:** `#F5F7F3`
- **Start URL:** `/`
- **Icon:** `512x512` maskable icon

To generate the full native Android Gradle wrapper and project files, run inside `android/`:
```bash
cd /Users/apple/Downloads/pappa/android
bubblewrap build
```
*(On first run, Bubblewrap will prompt to download Android build tools if not found in PATH, or you can point it to your existing Android SDK).*

### 4.2 Build Outputs
Upon completion, the build produces:
- `app-release-bundle.aab` — **The production Android App Bundle to upload to Google Play Console.**
- `app-release-signed.apk` — **The local test APK for testing on physical devices.**

---

## 5. Device Verification & Testing Guide

### 5.1 Installing on a Test Device
Connect an Android phone via USB with USB Debugging enabled, then run:
```bash
adb install -r android/app-release-signed.apk
```

### 5.2 Verification Checklist on Device:
1. **Zero Browser Address Bar:**
   - Launch "Personal Bank" from the Android app drawer.
   - Verify the app launches in **full-screen standalone mode** without a Chrome URL bar.
   - *(Note: If the Chrome URL bar appears, it means the SHA-256 fingerprint on `personalbannk.vercel.app/.well-known/assetlinks.json` does not match the APK signature. Verify using Chrome Remote Debugging).*
2. **Offline Functionality:**
   - Turn on Airplane Mode.
   - Close the app and re-open it.
   - Verify that all records load from IndexedDB and the offline banner appears.
   - Create a test expense (e.g. "Diesel ₹500"). Verify it saves to local queue.
   - Turn off Airplane Mode. Verify that sync triggers automatically and the transaction pushes to MongoDB Atlas.
3. **Storage Persistence:**
   - Open Settings in the app.
   - Check the **"Offline Storage & Durability"** card.
   - Verify that Storage Persistence shows **"Persistent (Protected against OS eviction)"**.
4. **Chrome Remote Debugging:**
   - Connect phone via USB to computer.
   - Open `chrome://inspect/#devices` in Google Chrome on your computer.
   - Click "Inspect" under Personal Bank to view console logs, network requests, and service worker states in real time.
