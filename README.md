# Group-Bank
small financing for -dream to reality

---

## 📱 Mobile App Download

> **Latest release:** Go to the [Releases](../../releases) page and download the Android `.apk`.

### Install the APK on your phone
1. Open the [Releases](../../releases) page on your phone.
2. Tap the `.apk` file to download it.
3. Open **Settings → Security** and enable **"Install from unknown sources"** (one-time step).
4. Open the downloaded APK and tap **Install**.
5. Open **SHG Bank** and log in.

### iOS – signed IPA / TestFlight (recommended)
1. Go to **Actions** tab → **Build iOS App** workflow.
2. Open the latest run → scroll down to **Artifacts** → download **shg-bank-ios-ipa**.
3. It is uploaded to TestFlight automatically when version-tagged and
   `IOS_ASC_API_KEY_*` secrets are configured (see below). For manual upload
   use the **Transporter** app (Mac App Store, free).

### iOS – simulator build (no Apple account needed)
If the signing secrets are **not** configured the workflow produces a simulator
artifact instead:  
Download **shg-bank-ios-simulator-app** from the Actions run (run on macOS simulator only).

---

## 🛠️ Build APK Yourself (GitHub Actions)

A new APK is built automatically every time code is pushed to `main`:

1. Go to **Actions** tab → **Build Android APK** workflow.
2. Open the latest run → scroll down to **Artifacts**.
3. Download **shg-bank-apk** and install it.

### To publish a release APK with a version tag
```bash
git tag v1.0.0
git push origin v1.0.0
```
This triggers the workflow and creates a GitHub Release with the APK attached.

## 🍎 Build iOS IPA (GitHub Actions)

An iOS build runs automatically every time code is pushed to `main`/`master`.

| Signing secrets present? | Artifact produced |
|---|---|
| ✅ Yes | Signed `.ipa` (App Store / TestFlight compatible) |
| ❌ No | Simulator `.app.zip` (testing only) |

### To publish a signed IPA with a version tag
```bash
git tag v1.0.0
git push origin v1.0.0
```
This triggers the workflow and, when signing secrets are present, creates a
GitHub Release with the `.ipa` attached **and** uploads the build to TestFlight
(if the App Store Connect API key secrets are also configured).

### Secrets required for signed IPA

Add these in **Settings → Secrets and variables → Actions**:

#### Code-signing (required for signed IPA)

| Secret | How to get it |
|---|---|
| `IOS_DISTRIBUTION_CERT_BASE64` | Export `.p12` from Keychain → `base64 -i cert.p12` (macOS) |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | Password you set when exporting the `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Download App Store profile from developer.apple.com → `base64 -i app.mobileprovision` (macOS) |
| `IOS_TEAM_ID` | 10-character Team ID shown in developer.apple.com/account |

#### TestFlight auto-upload (optional – only used on version tags)

| Secret | How to get it |
|---|---|
| `IOS_ASC_API_KEY_ID` | App Store Connect → Users & Access → Keys → Key ID |
| `IOS_ASC_API_KEY_ISSUER_ID` | Same page → Issuer ID |
| `IOS_ASC_API_KEY_PRIVATE_KEY` | Content of the downloaded `.p8` file |

Without **code-signing** secrets the workflow falls back to a simulator build.  
Without **ASC API key** secrets the signed IPA is produced but **not** auto-uploaded to TestFlight.

### Steps to set up Apple Distribution certificate

1. On a Mac: open **Keychain Access → Certificate Assistant → Request a Certificate from a CA**.
2. Upload the CSR to **developer.apple.com → Certificates → +** (choose *Apple Distribution*).
3. Download and double-click to install in Keychain.
4. Right-click the certificate in Keychain → **Export** → choose `.p12` format and set a password.
5. Run `base64 -i cert.p12 | pbcopy` (macOS) and paste as `IOS_DISTRIBUTION_CERT_BASE64`.

### Steps to create an App Store provisioning profile

1. Go to **developer.apple.com → Identifiers** and register `com.groupbank.shg`.
2. Go to **Profiles → +**, choose *App Store Connect*, select your App ID and certificate.
3. Download the `.mobileprovision` file.
4. Run `base64 -i app.mobileprovision | pbcopy` (macOS) and paste as `IOS_PROVISIONING_PROFILE_BASE64`.

### Optional: Signed release APK
Add these secrets in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | Base64-encoded `.keystore` file (`base64 release.keystore`) |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_PASSWORD` | Key alias password |

Without these secrets the workflow produces a **debug APK** (works fine for testing).

---

## 💻 Local Development

```bash
npm install
npm run dev          # start dev server at http://localhost:5173
```

### Build + sync to Android (requires Android Studio)
```bash
npm run cap:sync:android  # builds web assets and syncs to Android project
npm run cap:open     # opens Android Studio to build/run the app
```

### Build + sync to iOS (requires Xcode on macOS)
```bash
npm run cap:sync:ios   # builds web assets and syncs to iOS project
npm run cap:open:ios   # opens Xcode to build/run the app
```

---

## Cross-device data sharing (Laptop + Mobile)

By default, app data is stored in each browser's local storage.  
To sync updates across devices, configure a shared JSON API endpoint:

- `VITE_SHARED_STATE_URL` = shared endpoint URL
- `VITE_SHARED_STATE_TOKEN` = optional bearer token
- `VITE_SHARED_STATE_METHOD` = optional HTTP method (`PUT` default, supports `POST` / `PATCH`)

### Expected API behavior

- `GET VITE_SHARED_STATE_URL` should return either:
  - `{ "version": 1, "updatedAt": "...", "state": { ...appState } }`, or
  - direct state object `{ ...appState }`
- Write method (`PUT`/`POST`/`PATCH`) should accept the same envelope JSON body.

Once configured, admin changes made on laptop can be fetched by member mobile sessions using the same shared endpoint.
