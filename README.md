# 0warn — Cybersecurity Research Platform

Modern cybersecurity research platform with blog, video gallery, and community forum. Built for GitHub Pages with Firebase backend.

## Features

- **Blog** — Full-featured blog with Markdown support, categories, tags
- **Videos** — YouTube & Odysee video gallery with auto-embed
- **Forum** — Professional cybersecurity discussion forum with categories, threads, replies
- **Admin Panel** — Full CRUD management for all content
- **Separated Profiles** — Private account records and public profile pages are stored separately
- **Responsive** — Dark cyber theme, works on all devices

## Quick Start

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Sign-in method → **Email/Password**
4. Create an admin user account
5. Enable **Cloud Firestore** → Create database (start in test mode, then add rules below)

### 2. Firestore Security Rules

Deploy the rules from `firestore.rules` instead of using open write access. The included rules:

- restrict admin-only collections to admins
- keep `profiles` private to the owner/admin
- expose only `public_profiles` for public profile pages
- allow public reads only where the site needs them
- prevent unpublished blog posts from being readable by regular users

### 3. Configure

Edit `assets/js/firebase-config.js` and replace with your Firebase project config:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then enable GitHub Pages in your repo settings (Settings → Pages → Deploy from main branch / root folder).

### 5. Login

Navigate to `/#/login` and sign in with the admin email/password you created in Firebase.

Admin access is strict by default. A user becomes admin only if one of these is true:

- their email is in the bootstrap admin list in `assets/js/app.js`
- `site_settings/admin_config.emails` contains their email
- their Firebase custom claim contains `{ admin: true }`

Setting only `profiles/{uid}.role = "admin"` is not enough in strict mode.

## Structure

```
├── index.html              # SPA entry point
├── 404.html                # 404 page
├── assets/
│   ├── css/
│   │   └── style.css       # Full stylesheet
│   ├── js/
│   │   ├── firebase-config.js  # Firebase configuration
│   │   └── app.js          # Application (router, views, admin)
├── firestore.rules         # Recommended Firestore security rules
├── content/                # Static content storage
└── README.md
```

## Security Notes

- Admin access is enforced by user role, not only by hidden links
- Private profile data is separated from public profile data
- Markdown is sanitized before insertion into the DOM
- Firestore security must be deployed from `firestore.rules`; client-side checks alone are not sufficient

## Tech Stack

- GitHub Pages (static hosting)
- Firebase Firestore (database)
- Firebase Auth (authentication)
- marked.js (markdown rendering)
- highlight.js (syntax highlighting)
- Font Awesome (icons)
