# 0warn — Cybersecurity Research Platform

Modern cybersecurity research platform with blog, video gallery, and community forum. Built for GitHub Pages with Firebase backend.

## Features

- **Blog** — Full-featured blog with Markdown support, categories, tags
- **Videos** — YouTube & Odysee video gallery with auto-embed
- **Forum** — Professional cybersecurity discussion forum with categories, threads, replies
- **Admin Panel** — Full CRUD management for all content
- **Responsive** — Dark cyber theme, works on all devices

## Quick Start

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Sign-in method → **Email/Password**
4. Create an admin user account
5. Enable **Cloud Firestore** → Create database (start in test mode, then add rules below)

### 2. Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

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
├── content/                # Static content storage
└── README.md
```

## Security Notes

- Firestore rules restrict writes to authenticated users only
- Admin panel is guarded by Firebase Authentication
- All user input is escaped to prevent XSS
- Markdown is rendered client-side with `marked` (sanitized)

## Tech Stack

- GitHub Pages (static hosting)
- Firebase Firestore (database)
- Firebase Auth (authentication)
- marked.js (markdown rendering)
- highlight.js (syntax highlighting)
- Font Awesome (icons)
