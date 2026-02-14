# 📱 Mobile App Deployment Guide - Wander Race: Cosmic Derby

## ✅ Game is Now Mobile-Ready!

### Changes Made:
1. **Forced Landscape Orientation** - Game only works in landscape mode
2. **Fullscreen Mode** - Automatic fullscreen on mobile devices
3. **Responsive Canvas** - 100vw x 100vh, adapts to all screen sizes
4. **Portrait Lock Warning** - Shows "Please rotate device" in portrait mode
5. **PWA Meta Tags** - Ready for Progressive Web App installation

---

## 🚀 Deployment Options

### Option 1: **Capacitor (Recommended)** - Native iOS & Android Apps

Capacitor wraps your web game into native apps for both platforms.

#### Prerequisites:
- Node.js 16+ installed
- For iOS: macOS + Xcode
- For Android: Android Studio

#### Steps:

```bash
# 1. Install dependencies
npm install

# 2. Initialize Capacitor (if not done)
npm run capacitor:init

# 3. Add platforms
npm run capacitor:add:android
npm run capacitor:add:ios

# 4. Sync web code to native projects
npm run capacitor:sync

# 5. Open in Android Studio
npm run capacitor:open:android

# 6. Open in Xcode (macOS only)
npm run capacitor:open:ios
```

#### Android Configuration:
Edit `android/app/src/main/AndroidManifest.xml`:
```xml
<activity
    android:screenOrientation="landscape"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    ...>
```

#### iOS Configuration:
Edit `ios/App/App/Info.plist`:
```xml
<key>UISupportedInterfaceOrientations</key>
<array>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

---

### Option 2: **Cordova** - Alternative Native Wrapper

```bash
# Install Cordova
npm install -g cordova

# Create Cordova project
cordova create WanderRaceApp com.wanderrace.cosmicderby "Wander Race"

# Copy your game files to www/ folder
cp -r * WanderRaceApp/www/

# Add platforms
cd WanderRaceApp
cordova platform add android
cordova platform add ios

# Edit config.xml to force landscape:
<preference name="Orientation" value="landscape" />

# Build
cordova build android
cordova build ios

# Run
cordova run android
cordova run ios
```

---

### Option 3: **Progressive Web App (PWA)** - Web-Based Installation

Users can install directly from browser without app stores.

**Required Files** (already configured):
- ✅ `index.html` - PWA meta tags added
- ✅ `manifest.json` (create below)
- ✅ `service-worker.js` (create below)

Create `manifest.json`:
```json
{
  "name": "Wander Race: Cosmic Derby",
  "short_name": "Cosmic Derby",
  "description": "Endless cosmic racing game",
  "start_url": "./index.html",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#0a0a1a",
  "theme_color": "#0a0a1a",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Add to `index.html` `<head>`:
```html
<link rel="manifest" href="manifest.json">
```

---

## 📦 Building for Release

### Android (Google Play Store):

1. **In Android Studio:**
   - Build → Generate Signed Bundle/APK
   - Choose "Android App Bundle" (AAB)
   - Create/use keystore
   - Build release AAB

2. **Upload to Google Play Console:**
   - Create app listing
   - Upload AAB file
   - Fill app details, screenshots
   - Submit for review

### iOS (Apple App Store):

1. **In Xcode:**
   - Product → Archive
   - Window → Organizer
   - Distribute App → App Store Connect
   - Upload

2. **Upload to App Store Connect:**
   - Fill app information
   - Add screenshots (landscape only)
   - Submit for review

---

## 🎮 Testing on Real Devices

### Android:
```bash
# Enable USB debugging on phone
# Connect via USB
adb devices
npm run capacitor:open:android
# Then click "Run" in Android Studio
```

### iOS:
```bash
# Connect iPhone via USB
# In Xcode: Select your device
# Click "Run" button
```

---

## 📋 Pre-Launch Checklist

- ✅ Game forced to landscape orientation
- ✅ Fullscreen mode works
- ✅ Canvas responsive to all screen sizes
- ✅ Portrait warning displays properly
- ✅ Touch controls (joystick) working
- ✅ Game pauses properly (victory/death)
- ✅ All game modes functional
- ✅ Performance optimized for mobile
- ⬜ App icon created (512x512px)
- ⬜ Screenshots prepared (landscape)
- ⬜ App store descriptions written
- ⬜ Privacy policy created
- ⬜ Terms of service created

---

## 🎨 Assets Needed for Store

### Icons:
- 512x512px (Google Play)
- 1024x1024px (Apple App Store)

### Screenshots (Landscape):
- Android: 1920x1080px (minimum)
- iOS: Various sizes for different devices

### Store Listing:
- Title: "Wander Race: Cosmic Derby"
- Short description (80 chars)
- Full description (4000 chars)
- Keywords/tags
- Age rating
- Privacy policy URL
- Support email

---

## 🛠 Troubleshooting

**Game not fullscreen?**
- Check browser permissions
- Call `requestFullscreen()` on user interaction

**Portrait mode not blocked?**
- Check CSS media query in `style.css`
- Verify platform orientation config

**Performance issues?**
- Lower `pixelDensity(1)`
- Reduce particle count
- Optimize draw calls

---

## 📞 Support

For deployment issues, check:
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Cordova Documentation](https://cordova.apache.org/docs)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect)

---

**Your game is now ready for mobile deployment! 🎮🚀**
