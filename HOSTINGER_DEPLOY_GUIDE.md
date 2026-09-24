# Hostinger Deployment Guide for APNI PEHCHAAN (अपनी पहचान)

This guide provides step-by-step instructions to deploy the **APNI PEHCHAAN** affiliate platform to any Hostinger hosting plan (Single Web Hosting, Premium, Business, Cloud, or VPS).

---

## 🚀 Quick Summary / सारांश
- **Framework**: React + Vite + Tailwind CSS (SPA) with Express Server
- **Ready for Hostinger**: Yes! Configured for both **Hostinger Node.js Web Application deployer** (with `server.js` and `npm start`) and standard static `/public_html/` upload.

---

## ⚡ Hostinger Node.js / Web Application Screen Settings (Screenshot Solution)
If you see the Hostinger screen shown in your dashboard:
- **App file**: `apni-pehchaan.zip` (Contains all project files including `package.json`, `server.js`, `src/`, etc.)
- **Framework preset**: **`Express`** *(or `Node.js`)*
- **Node version**: **`22.x`** *(Matches the screenshot)*
- **Root directory**: **`./`**
- **Build command**: `npm run build`
- **Start command**: `npm start` *(or `node server.js`)*
- **Port**: `3000` *(Default)*

---

## 📋 Step 1: Create Production Build (अगर आपके पास प्रोजेक्ट फाइल्स हैं)
In your terminal / command prompt:
```bash
npm install
npm run build
```
This generates a folder named `dist/` which contains:
- `index.html`
- `.htaccess` (Pre-configured for clean URL routing & caching)
- `apni-pehchaan-logo.jpg`
- `favicon.png` & `apple-touch-icon.png`
- `assets/` (bundled JS & CSS)

---

## 🌐 Step 2: Upload to Hostinger (hPanel)

### Method A: Hostinger File Manager (सबसे आसान तरीका)
1. **Login to Hostinger**: Go to [https://hpanel.hostinger.com](https://hpanel.hostinger.com).
2. Go to **Websites** -> Click **Manage** next to your domain.
3. In the left menu or search bar, open **File Manager** (Files -> File Manager).
4. Select **Access files of [your domain]**.
5. Open the folder: **`public_html`**.
6. *(Important)* If there is a default Hostinger file named `default.php` or `index.php`, delete or rename it.
7. **Upload the contents of `dist`**:
   - Zip all files *inside* the `dist/` folder into `dist.zip`.
   - In Hostinger File Manager, click **Upload** -> select `dist.zip`.
   - Right-click `dist.zip` inside `public_html/` and click **Extract**.
   - Make sure `index.html` is directly inside `public_html/index.html` (not inside `public_html/dist/index.html`).
   - Confirm `.htaccess` is also extracted inside `public_html/`.

---

## ⚡ Method B: Hostinger Git / GitHub Deployment
If your code is hosted on GitHub:
1. In Hostinger hPanel, go to **Advanced** -> **Git**.
2. Paste your GitHub Repository URL.
3. Branch: `main`.
4. Install directory: `/public_html`.
5. Click **Create** / **Deploy**.

---

## 🔧 Why is `.htaccess` Important for Hostinger?
We have already created and placed `.htaccess` in the `public/` directory with:
- **URL Rewriting**: Redirects all routes (like `/admin`, `/category/gujjar-jaat-style`, `/blog/...`) to `index.html` so you never get a "404 Not Found" error when refreshing the page.
- **LiteSpeed / Gzip Compression**: Boosts page speed score on Google PageSpeed Insights.
- **Image & Asset Caching**: Caches images and CSS for 1 year for fast performance.

---

## 🔑 Admin Credentials (WordPress-Style Admin Dashboard)
- **Login URL**: `https://yourdomain.com/admin` or `https://yourdomain.com/wp-admin`
- **Default Username**: `admin`
- **Default Password**: `apnipehchaan2026`
*(You can customize products, categories, affiliate links, banners, and blogs directly from this panel).*

---

## 💡 Hostinger AI Website Builder Prompt (अगर Hostinger AI Builder यूज़ कर रहे हैं)
If you are using **Hostinger AI Website Builder**, use this prompt:

> "Create a high-end cultural and ethnic fashion affiliate portal named 'APNI PEHCHAAN' with the tagline 'Your Style. Your Identity.' The site features luxury Indian heritage apparel and accessories including Gujjar & Jaat pride style (heavy silver kadas, royal kurtas, pride hoodies, royal bullet keychains), Rajputi & Royal heritage (pagris, safas, mojris, royal talwar brooches), Yadav & Brahmin ethnic wear, and modern fusion styling. Include direct affiliate buy buttons for Amazon, Flipkart, and Meesho, a live discount coupon system, community reviews, an affiliate disclosure statement, and a WordPress-inspired admin management dashboard for products and blogs with an amber-gold and obsidian black luxury color palette."
