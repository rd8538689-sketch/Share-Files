# 🚀 Deploy Backend to Production

Your app needs a backend server running. Choose one:

## Option 1: Railway.app (RECOMMENDED - Fastest) ⚡

1. Push your repo to GitHub
2. Go to https://railway.app
3. **New Project** → **Deploy from GitHub repo**
4. Select `rd8538689-sketch/Share-Files`
5. Railway auto-detects Node.js app
6. Add these environment variables:
   ```
   NODE_ENV=production
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-app-password
   PORT=3000
   ```
7. Wait for deployment (2-3 min)
8. Get public URL from **Railway dashboard**
9. Update `.env.production`:
   ```
   VITE_API_URL=https://your-railway-url.up.railway.app
   VITE_WS_URL=wss://your-railway-url.up.railway.app
   ```

**Cost:** $5/month (included free tier $5)

---

## Option 2: Render.com (Free Tier Available)

1. Go to https://render.com
2. **New** → **Web Service**
3. Connect GitHub account
4. Select repository
5. Settings:
   - **Name:** share-files-app
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Add environment variables (same as above)
7. Deploy
8. Copy public URL from Render dashboard

**Cost:** Free (with limitations) or $7/month for reliability

---

## Option 3: Heroku (Paid but Popular)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Add environment variables
heroku config:set NODE_ENV=production
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-app-password

# Deploy
git push heroku main

# Get URL
heroku apps:info your-app-name
```

---

## Option 4: Docker + Your Own Server (Advanced)

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY server.ts .
COPY src ./src

EXPOSE 3000
CMD ["npm", "start"]
```

Deploy to AWS, DigitalOcean, etc.

---

## Setup Gmail for Email Notifications

1. Enable 2FA on Gmail
2. Go to https://myaccount.google.com/apppasswords
3. Create **App Password** for "Mail" and "Windows"
4. Copy the 16-character password
5. Use as `EMAIL_PASS` in environment variables

---

## Test Backend Connection

After deployment, test your URL:
```bash
curl https://your-backend-url.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "env": "production",
  "time": "2024-01-01T12:00:00.000Z",
  "port": 3000
}
```

---

## Update APK with Backend URL

Once backend is deployed:

1. Edit `.env.production`:
   ```
   VITE_API_URL=https://your-actual-backend-url.com
   VITE_WS_URL=wss://your-actual-backend-url.com
   ```

2. Rebuild APK:
   ```bash
   npm run build
   npm run capacitor:sync
   ```

3. Generate new APK in Android Studio

---

Done! Your backend is live and your APK can now talk to production server. 🎉
