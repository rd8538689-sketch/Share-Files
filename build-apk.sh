#!/bin/bash

# APK Build Automation Script

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting APK Build${NC}"

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
npm run capacitor:install

echo -e "${YELLOW}🧹 Cleaning...${NC}"
npm run clean

echo -e "${YELLOW}🔨 Building React app...${NC}"
npm run build

if [ ! -d "android" ]; then
    echo -e "${YELLOW}🔧 Initializing Capacitor...${NC}"
    npm run capacitor:init
    npm run capacitor:add-android
fi

echo -e "${YELLOW}🔄 Syncing Capacitor...${NC}"
npm run capacitor:sync

echo -e "${YELLOW}🔨 Building APK...${NC}"
cd android
./gradlew assembleDebug
cd ..

if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo -e "${GREEN}✅ APK built successfully!${NC}"
    echo -e "${GREEN}📱 Location: android/app/build/outputs/apk/debug/app-debug.apk${NC}"
else
    echo -e "${RED}❌ APK build failed${NC}"
    exit 1
fi
