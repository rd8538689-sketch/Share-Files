@echo off
REM APK Build Automation Script for Windows

setlocal enabledelayedexpansion

echo.
echo ====================================
echo 🚀 Starting APK Build
echo ====================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Install from https://nodejs.org
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install
call npm run capacitor:install

echo 🧹 Cleaning...
call npm run clean

echo 🔨 Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

if not exist "android" (
    echo 🔧 Initializing Capacitor...
    call npm run capacitor:init
    call npm run capacitor:add-android
)

echo 🔄 Syncing Capacitor...
call npm run capacitor:sync

echo 🔨 Building APK...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo ❌ APK build failed
    cd ..
    exit /b 1
)
cd ..

if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo ✅ APK built successfully!
    echo 📱 Location: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo 🎉 APK is ready to install!
    echo.
) else (
    echo ❌ APK not found
    exit /b 1
)

pause
