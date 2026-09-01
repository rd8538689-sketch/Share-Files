# 🛡️ ShadowVault - Fast & Secure File Sharing & Cloud Vault

A fast, encrypted peer-to-peer file transfer and secure cloud storage vault built for mobile and desktop.

---

## 📱 How to Download the Android APK on GitHub

The Android APK is built automatically using GitHub Actions. You can find and download it in two places on GitHub:

### Option 1: From GitHub Releases (Easiest)
1. On your GitHub repository page, look at the **right-hand sidebar** and click on **Releases** (or navigate to `https://github.com/<your-username>/<repo-name>/releases`).
2. Click on the latest release tag (e.g. `Debug APK Build #...`).
3. Under the **Assets** section at the bottom of the release, click the `.apk` file (e.g. `app-debug-build-X.apk`) to download it directly to your phone.

---

### Option 2: From GitHub Actions (Artifacts)
1. Go to the **Actions** tab at the top of your GitHub repository (`https://github.com/<your-username>/<repo-name>/actions`).
2. Click on the latest **"Build Debug APK & Publish Release"** workflow run.
3. Scroll down to the **Artifacts** section at the bottom of the summary page.
4. Click on **`app-debug-apk`** to download the ZIP file containing the APK installer.

---

### Option 3: Trigger a New APK Build Manually on GitHub
If you don't see an APK yet:
1. Go to your GitHub repository > **Actions** tab.
2. Click on **Build Debug APK & Publish Release** in the left sidebar.
3. Click the **Run workflow** dropdown button on the right and select `main`/`master` branch.
4. Click **Run workflow**. In ~2 minutes, the fresh APK will be ready in **Releases** and **Artifacts**!

> **Note**: To allow GitHub Actions to create Releases automatically, ensure **Settings -> Actions -> General -> Workflow permissions** is set to **"Read and write permissions"** in your GitHub repository settings.
