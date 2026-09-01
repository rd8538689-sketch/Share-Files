# 📱 COMPLETE APK BUILD GUIDE

## Prerequisites

### Required Software
- **Node.js** v18+ → https://nodejs.org
- **Android Studio** → https://developer.android.com/studio
- **Android SDK** (installed via Android Studio)
- **JDK 11+** (included with Android Studio)
- **Git**

### Verify Installation
```bash
node --version      # v18+
npm --version       # 9+
java -version       # 11+
```

---

## Setup

### 1. Install Dependencies
```bash
npm install
npm run capacitor:install
```

### 2. Configure Environment
Edit `.env.production`:
```env
VITE_API_URL=http://192.168.1.100:3000
VITE_WS_URL=ws://192.168.1.100:3000
NODE_ENV=production
```

### 3. Initialize Capacitor (First Time)
```bash
npm run capacitor:init
npm run capacitor:add-android
```

---

## Build

### Full Build Process
```bash
npm run clean
npm run build
npm run capacitor:sync
npm run capacitor:open
```

Or all at once:
```bash
npm run build:apk
```

---

## Generate APK

### Option A: Android Studio (Recommended)
1. Wait for Gradle sync
2. **Build** → **Build APK(s)**
3. APK: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option B: Command Line
```bash
cd android
./gradlew assembleDebug
cd ..
```

---

## Testing

### On Physical Device
1. Enable Developer Mode (tap Build Number 7 times)
2. Enable USB Debugging
3. Connect via USB
4. Run: `adb install android/app/build/outputs/apk/debug/app-debug.apk`

### On Emulator
1. Android Studio → Device Manager → Create Virtual Device
2. Run emulator
3. Run: `adb install android/app/build/outputs/apk/debug/app-debug.apk`

---

## Release APK

### Generate Signing Key
```bash
keytool -genkey -v -keystore my-release-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias
```

### Edit `android/app/build.gradle`
```gradle
signingConfigs {
    release {
        storeFile file('../my-release-key.keystore')
        storePassword 'your-password'
        keyAlias 'my-key-alias'
        keyPassword 'your-password'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

### Build Release APK
```bash
cd android
./gradlew assembleRelease
cd ..
```

APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## Troubleshooting

### SDK not found
```bash
export ANDROID_HOME=/path/to/android-sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### Gradle sync fails
```bash
cd android
./gradlew clean
cd ..
npm run capacitor:sync
```

### App crashes
- Check API URL in `.env.production`
- Verify backend is running
- Check logs: `adb logcat`

---

## APK Specs
- **Min Android:** 6.0 (API 23)
- **Target Android:** 14+ (API 34+)
- **Size:** ~15-20 MB

---

Done! Your APK is ready. 🎉
