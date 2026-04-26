# Geothority Mobile Distribution

Geothority is built as a Progressive Web App (PWA) that can be distributed on three platforms:

## 1. Web (Railway / any Next.js host)

Already the primary distribution. Railway is the intended production host, but any host that can run `next build` + `next start` works.

```bash
cd .. # project root
npm install
npm run build
npm run start
```

### Railway notes
- Set `NEXT_PUBLIC_APP_URL` and `APP_URL` to the live domain.
- Railway injects `PORT`; do not hardcode it.
- Recreate the app cron schedule with Railway cron jobs or another scheduler.

## 2. Google Play Store (TWA via Bubblewrap)

Uses Trusted Web Activity (TWA) to wrap the PWA as an Android app.

### Prerequisites
- Node.js 18+
- Android Studio + SDK (for signing)
- Java JDK 11+

### Steps

```bash
# Install Bubblewrap CLI
npm install -g @nicolo-ribaudo/bubblewrap-cli

# Initialize project (first time only)
bubblewrap init --manifest https://geothority.ai/manifest.json

# Or use our pre-built config
cp bubblewrap-config.json twa-manifest.json

# Build the APK/AAB
bubblewrap build

# This generates:
# - app-release-signed.aab (upload to Play Store)
# - app-release-signed.apk (for testing)
```

### Digital Asset Links
Add this to your domain at `/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "ai.geothority.twa",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

### Play Store Listing
- Category: Business
- Content Rating: Everyone
- Privacy Policy: https://geothority.ai/privacy
- In-app purchases: Stripe (web-based checkout, no Play Store billing)

## 3. iOS App Store (Capacitor)

Uses Capacitor to wrap the PWA as an iOS app.

### Prerequisites
- macOS with Xcode 15+
- Apple Developer Account ($99/year)
- CocoaPods installed

### Steps

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard

# Initialize (first time)
npx cap init Geothority ai.geothority.app --web-dir out

# Copy our config
cp capacitor.config.ts ../capacitor.config.ts

# Add iOS platform
cd ..
npx cap add ios

# Build the web app (static export for Capacitor)
# Note: Update next.config.mjs to add `output: 'export'` for static builds
npm run build

# Sync web assets to native project
npx cap sync ios

# Open in Xcode
npx cap open ios

# Build & submit from Xcode
```

### iOS-Specific Notes

**Billing:**
- Stripe web checkout is acceptable for PWA/Capacitor hybrid apps
- Apple's 30% cut only applies to native IAP; web-initiated purchases via Safari/WKWebView are typically exempt
- If Apple rejects, add a note that purchases are initiated through the web interface
- Monitor Apple's guidelines as they evolve

**App Store Review Checklist:**
- ✅ Privacy Policy accessible at /privacy
- ✅ Terms of Service accessible at /terms  
- ✅ No misleading claims
- ✅ Login via Google OAuth (Sign in with Apple may need to be added)
- ✅ App provides functionality beyond a website wrapper (scan, content gen, competitor tracking)
- ⚠️ Consider adding "Sign in with Apple" as Apple requires it when other social logins are present

**Sign in with Apple (recommended addition):**
```typescript
// Add to Supabase Auth configuration
// Dashboard → Authentication → Providers → Apple
// Requires Apple Developer Account configuration
```

### Common Issues

1. **WKWebView cookies:** Capacitor handles cookie persistence automatically
2. **Safe area insets:** Already handled by `contentInset: "always"` in config
3. **Keyboard overlap:** Handled by Keyboard plugin with `resize: "body"`

## Testing

### PWA Testing
1. Deploy to Railway (or use `next build && next start`)
2. Open Chrome DevTools → Application → Service Workers
3. Check "Installable" in the Manifest panel
4. Test offline mode

### Android Testing
```bash
# Install APK on device
adb install app-release-signed.apk
```

### iOS Testing
- Use Xcode Simulator or TestFlight for device testing

## App Icons

Generated icons are in `public/icons/`:
- `icon-192x192.png` — Android & PWA
- `icon-512x512.png` — Android splash & PWA install
- `apple-touch-icon.png` — iOS home screen (180x180)

For production, replace these with professionally designed icons.
The design spec is: "LA" monogram in white on electric blue (#3B82F6) background.
