# iPhone / iOS setup

Building and running on iPhone requires a **Mac with Xcode** installed. The `ios/` project is already generated; finish configuration on macOS.

## 1. Clone and install (on Mac)

```bash
git clone https://github.com/Smartbarbeiro/smartbarbeiro-mobile.git
cd smartbarbeiro-mobile
npm install
cp .env.example .env
```

Set `VITE_API_URL` to a URL reachable from the iPhone (Cloudflare tunnel, ngrok, or LAN IP).

## 2. Apple Developer

1. Open [Apple Developer](https://developer.apple.com) and sign in.
2. In Xcode: **Signing & Capabilities** → select your **Team**.
3. Bundle ID is `com.smartbarbeiro.client` (must match Google OAuth iOS client).

## 3. Build and open in Xcode

```bash
npm run cap:sync:ios
npm run ios:open
```

In Xcode:

1. Select your iPhone or simulator as the run target.
2. Press **Run** (▶).

## 4. Google Sign-In on iOS

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **iOS** OAuth client:
   - Bundle ID: `com.smartbarbeiro.client`
2. Copy the **iOS Client ID** into `.env`:

```env
VITE_GOOGLE_IOS_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

3. Update `ios/App/App/Info.plist` — replace `REPLACE_ME` in the Google URL scheme:

For client ID `123456789-abcdef.apps.googleusercontent.com`, use:

```xml
<string>com.googleusercontent.apps.123456789-abcdef</string>
```

4. Rebuild and sync:

```bash
npm run cap:sync:ios
```

## 5. Camera (QR scanner)

`NSCameraUsageDescription` is already in `Info.plist`. The first time the user opens the QR screen, iOS will ask for camera permission.

## 6. TestFlight / App Store

1. In Xcode: **Product → Archive**.
2. **Distribute App** → App Store Connect or TestFlight.
3. Ensure `VITE_API_URL` points to your **production** Laravel API before the release build.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API requests fail on device | Use HTTPS public URL, not `127.0.0.1` |
| Google login fails on iOS | Check iOS client ID, URL scheme in Info.plist, and bundle ID |
| Camera not working | Settings → Smart Barbeiro → enable Camera |
| `pod install` errors | Run on Mac: `cd ios/App && pod install` (if using CocoaPods workflow) |

Capacitor 8 uses Swift Package Manager for plugins by default; `npx cap sync ios` updates `Package.swift` automatically.
