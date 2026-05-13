(function() {
  'use strict';

  let currentUser = null;
  let currentUserProfile = null;
  let currentUserRole = null;
  let currentUserClaims = {};
  let currentRoute = '';
  let authResolved = false;
  let strictAdminMode = true;
  let allBlogPosts = [];
  let allVideos = [];
  let allForumCategories = [];
  let allBlogCategories = [];
  let allVideoCategories = [];
  const ADMIN_EMAILS = ['official0warn@gmail.com'];
  const adminEmailSet = new Set(ADMIN_EMAILS.map(email => email.trim().toLowerCase()));

  const $ = id => document.getElementById(id);
  const q = sel => document.querySelector(sel);
  const qq = sel => document.querySelectorAll(sel);
  const esc = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
  const PROFILE_LINK_KEYS = ['github', 'twitter', 'youtube', 'website'];

  const toast = (msg, type = 'info') => {
    const c = $('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${esc(msg)}`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 3500);
  };

  window.router = {
    navigate(path) {
      window.location.hash = '#' + path;
    },
    init() {
      window.addEventListener('hashchange', () => this.handleRoute());
      this.handleRoute();
    },
    handleRoute() {
      const hash = window.location.hash.slice(1) || '/';
      currentRoute = hash;
      const parts = hash.split('/').filter(Boolean);
      let matched = false;

      const routes = [
        { pattern: '/', handler: 'home' },
        { pattern: '/login', handler: 'login' },
        { pattern: '/register', handler: 'register' },
        { pattern: '/blog', handler: 'blog' },
        { pattern: '/blog/*', handler: 'blogPost' },
        { pattern: '/videos', handler: 'videos' },
        { pattern: '/forum', handler: 'forum' },
        { pattern: '/forum/*/*', handler: 'forumThread' },
        { pattern: '/forum/*', handler: 'forumCategory' },
        { pattern: '/profile', handler: 'profile' },
        { pattern: '/profile/*', handler: 'profileView' },
        { pattern: '/settings', handler: 'profile' },
        { pattern: '/admin*', handler: 'admin' },
      ];

      for (const route of routes) {
        const routeParts = route.pattern.split('/').filter(Boolean);
        if (route.pattern === '/' && hash === '/') { matched = true; this.render('home'); break; }
        if (route.pattern === '/login' && hash === '/login') { matched = true; this.render('login'); break; }
        if (route.pattern === '/register' && hash === '/register') { matched = true; this.render('register'); break; }
        if (route.pattern === '/blog' && hash === '/blog') { matched = true; this.render('blog'); break; }
        if (route.pattern === '/blog/*' && parts[0] === 'blog' && parts[1]) { matched = true; this.render('blogPost', parts[1]); break; }
        if (route.pattern === '/videos' && hash === '/videos') { matched = true; this.render('videos'); break; }
        if (route.pattern === '/forum' && hash === '/forum') { matched = true; this.render('forum'); break; }
        if (route.pattern === '/forum/*/*' && parts[0] === 'forum' && parts[1] && parts[2]) { matched = true; this.render('forumThread', parts[1], parts[2]); break; }
        if (route.pattern === '/forum/*' && parts[0] === 'forum' && parts[1]) { matched = true; this.render('forumCategory', parts[1]); break; }
        if (route.pattern === '/profile' && hash === '/profile') { matched = true; this.render('profile'); break; }
        if (route.pattern === '/profile/*' && parts[0] === 'profile' && parts[1]) { matched = true; this.render('profileView', parts[1]); break; }
        if (route.pattern === '/settings' && hash === '/settings') { matched = true; this.render('profile'); break; }
        if (route.pattern === '/admin*' && hash.startsWith('/admin')) { matched = true; this.render('admin'); break; }
      }

      if (!matched) {
        if (hash.startsWith('/admin')) this.render('admin');
        else if (hash.startsWith('/blog')) this.render('blog');
        else router.navigate('/');
      }

      qq('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.nav && hash.startsWith(l.dataset.nav)));
    },
    render(view, ...params) {
      const main = $('mainContent');
      main.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading...</p></div>';
      setTimeout(() => {
      switch(view) {
        case 'home': renderHome(main); break;
        case 'login': renderLogin(main); break;
        case 'register': renderRegister(main); break;
        case 'blog': renderBlog(main); break;
          case 'blogPost': renderBlogPost(main, params[0]); break;
          case 'videos': renderVideos(main); break;
          case 'forum': renderForum(main); break;
          case 'forumCategory': renderForumCategory(main, params[0]); break;
          case 'forumThread': renderForumThread(main, params[0], params[1]); break;
          case 'profile': renderProfile(main); break;
          case 'profileView': renderProfilePublic(main, params[0]); break;
          case 'admin': renderAdmin(main); break;
          default: renderHome(main);
        }
        window.scrollTo(0, 0);
      }, 100);
    }
  };

  function setActiveNav(path) {
    qq('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.nav && path.startsWith(l.dataset.nav)));
  }

  function renderElement(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function getCategoryColor(cat) {
    if (!cat) return 'var(--accent-cyan)';
    const colors = {
      'web-security': 'var(--accent-cyan)',
      'network': 'var(--accent-purple)',
      'malware': 'var(--accent-red)',
      'reverse': 'var(--accent-orange)',
      'cryptography': 'var(--accent-green)',
      'osint': 'var(--accent-blue)',
      'red-team': 'var(--accent-red)',
      'blue-team': 'var(--accent-blue)',
      'ctf': 'var(--accent-green)',
      'general': 'var(--accent-cyan)',
    };
    const key = cat.toLowerCase().replace(/\s+/g, '-');
    return colors[key] || 'var(--accent-cyan)';
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateFull(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    const sec = Math.floor((Date.now() - d) / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(d);
  }

  function renderMarkdown(content) {
    if (!content) return '';
    try {
      return sanitizeHtml(marked.parse(content, { breaks: true, gfm: true }));
    } catch(e) {
      return esc(content);
    }
  }

  function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
  }

  function getFallbackDisplayName(userOrEmail) {
    const email = typeof userOrEmail === 'string' ? userOrEmail : userOrEmail?.email;
    const base = (email || '').split('@')[0].trim();
    return base || 'User';
  }

  function getDisplayName(profile = currentUserProfile, user = currentUser) {
    return (profile?.displayName || '').trim() || getFallbackDisplayName(user);
  }

  function getUserInitial(profile = currentUserProfile, user = currentUser) {
    return getDisplayName(profile, user).charAt(0).toUpperCase() || 'U';
  }

  function getSafeImageUrl(url) {
    const value = (url || '').trim();
    if (!value) return '';
    return /^https?:\/\//i.test(value) ? value : '';
  }

  function renderAvatar(profile = currentUserProfile, user = currentUser, className = 'profile-avatar') {
    const avatarUrl = getSafeImageUrl(profile?.avatar);
    const initial = esc(getUserInitial(profile, user));
    if (!avatarUrl) return `<div class="${className}">${initial}</div>`;
    return `<div class="${className} profile-avatar-image-wrap"><img src="${esc(avatarUrl)}" alt="${esc(getDisplayName(profile, user))}" class="profile-avatar-image"></div>`;
  }

  function renderForumCategoryMedia(category, index) {
    const imageUrl = getSafeImageUrl(category?.imageUrl);
    if (imageUrl) {
      return `<div class="cat-icon cat-image"><img src="${esc(imageUrl)}" alt="${esc(category.name || 'Category')}" class="cat-image-img"></div>`;
    }
    const icons = ['fa-shield-halved', 'fa-bug', 'fa-network-wired', 'fa-microchip', 'fa-key', 'fa-user-secret', 'fa-lock', 'fa-code'];
    return `<div class="cat-icon"><i class="fas ${icons[index % icons.length]}"></i></div>`;
  }

  function isBootstrapAdminEmail(email) {
    return adminEmailSet.has(normalizeEmail(email));
  }

  function resolveUserRole(profile = currentUserProfile, user = currentUser) {
    const email = normalizeEmail(user?.email || profile?.email);
    const trustedByEmail = isBootstrapAdminEmail(email);
    const trustedByClaim = currentUserClaims?.admin === true;
    const trustedByConfig = adminEmailSet.has(email);

    if (trustedByClaim || trustedByEmail || trustedByConfig) return 'admin';
    if (!strictAdminMode && profile?.role === 'admin') return 'admin';
    return 'user';
  }

  function loadAdminConfig() {
    return dbx.settings.doc('admin_config').get().then(doc => {
      if (!doc.exists) return;
      const data = doc.data() || {};
      const emails = Array.isArray(data.emails) ? data.emails : [];
      if (typeof data.strictAdminMode === 'boolean') strictAdminMode = data.strictAdminMode;
      emails.map(normalizeEmail).filter(Boolean).forEach(email => adminEmailSet.add(email));
    }).catch(err => {
      console.error('adminConfig:', err);
    });
  }

  function normalizeProfileLinks(links = {}) {
    const normalized = {};
    PROFILE_LINK_KEYS.forEach(key => {
      const value = (links?.[key] || '').trim();
      if (value) normalized[key] = value;
    });
    return normalized;
  }

  function buildPublicProfileData(profile = {}) {
    return {
      displayName: (profile.displayName || '').trim() || 'User',
      bio: (profile.bio || '').trim(),
      avatar: (profile.avatar || '').trim(),
      links: normalizeProfileLinks(profile.links),
      role: profile.role === 'admin' ? 'admin' : 'user',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  function syncPublicProfile(uid, profile) {
    if (!uid) return Promise.resolve();
    return dbx.publicProfiles.doc(uid).set(buildPublicProfileData(profile), { merge: true });
  }

  function syncPublicProfileSafely(uid, profile) {
    return syncPublicProfile(uid, profile).catch(err => {
      console.error('publicProfileSync:', err);
      return null;
    });
  }

  function sanitizeHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blockedTags = new Set(['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'option', 'link', 'meta', 'style', 'base']);

    doc.body.querySelectorAll('*').forEach(node => {
      const tagName = node.tagName.toLowerCase();
      if (blockedTags.has(tagName)) {
        node.remove();
        return;
      }

      [...node.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim();
        if (name.startsWith('on')) {
          node.removeAttribute(attr.name);
          return;
        }
        if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) {
          node.removeAttribute(attr.name);
          return;
        }
        if (name === 'style') {
          node.removeAttribute(attr.name);
        }
      });

      if (tagName === 'a') {
        const href = node.getAttribute('href') || '';
        if (/^\s*javascript:/i.test(href)) {
          node.removeAttribute('href');
        } else if (/^https?:\/\//i.test(href)) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      }
    });

    return doc.body.innerHTML;
  }

  function rerenderCurrentRoute() {
    if (!window.router) return;
    router.handleRoute();
  }

  function updateAuthNav() {
    const loginLink = $('loginLink');
    const adminLink = $('adminLink');
    const registerLink = $('registerLink');
    const logoutLink = $('logoutLink');

    if (currentUser) {
      if (loginLink) {
        loginLink.innerHTML = '<i class="fas fa-user"></i> ' + esc(getDisplayName());
        loginLink.href = '#/profile';
      }
      if (registerLink) registerLink.style.display = 'none';
      if (logoutLink) logoutLink.style.display = 'flex';
      if (adminLink) adminLink.style.display = currentUserRole === 'admin' ? 'flex' : 'none';
      return;
    }

    if (loginLink) {
      loginLink.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
      loginLink.href = '#/login';
    }
    if (registerLink) registerLink.style.display = '';
    if (logoutLink) logoutLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
  }

  function ensureUserProfile(user) {
    if (!user?.uid) return Promise.resolve(null);

    return db.collection('profiles').doc(user.uid).get().then(doc => {
      const existing = doc.exists ? doc.data() : {};
      const resolvedRole = resolveUserRole(existing, user);
      const profile = {
        ...existing,
        displayName: (existing.displayName || '').trim() || getFallbackDisplayName(user),
        email: user.email || existing.email || '',
        role: resolvedRole,
        bio: existing.bio || '',
        avatar: existing.avatar || '',
        links: normalizeProfileLinks(existing.links),
        createdAt: existing.createdAt || firebase.firestore.FieldValue.serverTimestamp()
      };

      const shouldPersist = !doc.exists
        || existing.displayName !== profile.displayName
        || existing.email !== profile.email
        || existing.role !== profile.role
        || JSON.stringify(normalizeProfileLinks(existing.links)) !== JSON.stringify(profile.links)
        || !existing.createdAt;

      const privateWrite = shouldPersist
        ? db.collection('profiles').doc(user.uid).set(profile, { merge: true })
        : Promise.resolve();

      return privateWrite
        .then(() => syncPublicProfileSafely(user.uid, profile))
        .then(() => profile);
    });
  }

  function highlightCode() {
    document.querySelectorAll('.post-content pre code, .reply-content pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }

  function getEmbedUrl(url) {
    if (!url) return '';
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
    if (url.includes('odysee.com')) {
      const m = url.match(/odysee\.com\/@[\w-]+\/[\w-]+\/([\w-]+)/);
      if (m) return `https://odysee.com/$/embed/${m[1]}`;
      const m2 = url.match(/odysee\.com\/\$\/(?:embed\/)?([\w-]+)/);
      if (m2) return `https://odysee.com/$/embed/${m2[1]}`;
      return url.replace('/watch/', '/$/embed/');
    }
    return url;
  }

  function getPlatformIcon(url) {
    if (!url) return 'fa-video';
    if (url.includes('youtube') || url.includes('youtu.be')) return 'fab fa-youtube';
    if (url.includes('odysee')) return 'fas fa-globe';
    return 'fa-video';
  }

  function getPlatformColor(url) {
    if (url.includes('youtube')) return '#ff0000';
    if (url.includes('odysee')) return '#cc0066';
    return 'var(--accent-cyan)';
  }

  // === ROUTE HANDLERS ===

  function renderHome(main) {
    const html = `
      <section class="hero">
        <h1><span class="highlight">Secure.</span> <span class="typing-text" id="typingText">Research.</span> <br>Repeat.</h1>
        <p>Cybersecurity research, vulnerability analysis, and offensive security techniques. Join the community of professional security researchers.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/blog"><i class="fas fa-feather-alt"></i> Read Blog</a>
          <a class="btn btn-secondary" href="#/forum"><i class="fas fa-comments"></i> Join Forum</a>
        </div>
      </section>

      <section style="margin-bottom: 40px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <h2 style="font-family:var(--font-mono);font-size:1.3rem;"><i class="fas fa-newspaper"></i> Latest Posts</h2>
          <a class="btn btn-sm btn-outline" href="#/blog">View All <i class="fas fa-arrow-right"></i></a>
        </div>
        <div class="blog-grid" id="homePosts">${renderSkeleton(3)}</div>
      </section>

      <section>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <h2 style="font-family:var(--font-mono);font-size:1.3rem;"><i class="fas fa-video"></i> Latest Videos</h2>
          <a class="btn btn-sm btn-outline" href="#/videos">View All <i class="fas fa-arrow-right"></i></a>
        </div>
        <div class="video-grid" id="homeVideos">${renderSkeleton(2)}</div>
      </section>
    `;
    main.innerHTML = html;

    const typingText = $('typingText');
    if (typingText) {
      const words = ['Research.', 'Exploit.', 'Defend.', 'Analyze.', 'Secure.'];
      let wi = 0, ci = 0, del = false;
      setInterval(() => {
        const w = words[wi];
        if (!del) {
          if (ci < w.length) { typingText.textContent = w.slice(0, ci + 1); ci++; }
          else { setTimeout(() => del = true, 1500); }
        } else {
          if (ci > 0) { typingText.textContent = w.slice(0, ci - 1); ci--; }
          else { del = false; wi = (wi + 1) % words.length; ci = 0; }
        }
        if (del && ci === 0) del = false;
      }, 100);
    }

    loadHomePosts();
    loadHomeVideos();
  }

  function renderSkeleton(count) {
    let s = '';
    for (let i = 0; i < count; i++) {
      s += `<div class="blog-card" style="opacity:0.5;pointer-events:none;">
        <div style="height:12px;background:var(--bg-surface);border-radius:4px;width:80px;margin-bottom:12px;"></div>
        <div style="height:20px;background:var(--bg-surface);border-radius:4px;margin-bottom:8px;"></div>
        <div style="height:14px;background:var(--bg-surface);border-radius:4px;width:60%;"></div>
      </div>`;
    }
    return s;
  }

  function loadHomePosts() {
    dbx.blog.where('published', '==', true).get().then(snap => {
        const container = $('homePosts');
        if (!container) return;
        let posts = [];
        snap.forEach(doc => {
          const p = doc.data();
          posts.push({ id: doc.id, data: p });
        });
        posts.sort((a, b) => (b.data.createdAt?.seconds || 0) - (a.data.createdAt?.seconds || 0));
        posts = posts.slice(0, 3);
        if (!posts.length) {
          container.innerHTML = '<div class="no-posts"><i class="fas fa-feather-alt"></i><p>No posts yet. Check back soon.</p></div>';
          return;
        }
        let html = '';
        posts.forEach(({ id, data: p }) => {
          html += `
            <div class="blog-card" onclick="router.navigate('/blog/${id}')">
              <div class="card-category" style="color:${getCategoryColor(p.category)};border:1px solid ${getCategoryColor(p.category)}">${esc(p.category || 'General')}</div>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.excerpt || p.content?.slice(0, 150) || '')}</p>
              <div class="card-meta">
                <span>${formatDate(p.createdAt)}</span>
                <span><i class="fas fa-user"></i> ${esc(p.author || 'anonymous')}</span>
              </div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(e => { console.error('homePosts:', e); });
  }

  function loadHomeVideos() {
    dbx.videos.orderBy('createdAt', 'desc').limit(2).get()
      .then(snap => {
        const container = $('homeVideos');
        if (!container) return;
        if (snap.empty) {
          container.innerHTML = '<div class="no-posts"><i class="fas fa-video"></i><p>No videos yet.</p></div>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const v = doc.data();
          const embed = getEmbedUrl(v.url);
          html += `
            <div class="video-card">
              <div class="video-wrapper">
                <iframe src="${esc(embed)}" allowfullscreen loading="lazy"></iframe>
              </div>
              <div class="video-info">
                <h3>${esc(v.title)}</h3>
                <p>${esc(v.description || '')}</p>
                <div class="video-meta">
                  <span><i class="${getPlatformIcon(v.url)}" style="color:${getPlatformColor(v.url)}"></i> ${esc(v.category || 'General')}</span>
                  <span>${formatDate(v.createdAt)}</span>
                </div>
              </div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(() => {});
  }

  // === LOGIN ===
  function renderLogin(main) {
    if (currentUser) {
      router.navigate('/profile');
      return;
    }
    main.innerHTML = `
      <div class="auth-container">
        <div class="auth-header">
          <div class="auth-icon"><i class="fas fa-sign-in-alt"></i></div>
          <h2>Sign In</h2>
          <p>Welcome back to the forum</p>
        </div>
        <div class="auth-error" id="authError"></div>
        <form id="loginForm">
          <div class="form-group">
            <label for="loginEmail"><i class="fas fa-envelope"></i> Email</label>
            <input type="email" id="loginEmail" class="form-input" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="loginPassword"><i class="fas fa-lock"></i> Password</label>
            <input type="password" id="loginPassword" class="form-input" placeholder="Enter password" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;" id="loginBtn">
            <i class="fas fa-shield-halved"></i> Sign In
          </button>
        </form>
        <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color);">
          <p style="color:var(--text-muted);font-size:0.9rem;">Don't have an account? <a href="#/register" style="color:var(--accent-cyan);">Register here</a></p>
        </div>
      </div>
    `;

    $('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const email = $('loginEmail').value.trim();
      const password = $('loginPassword').value;
      const btn = $('loginBtn');
      const err = $('authError');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
      err.style.display = 'none';

      auth.signInWithEmailAndPassword(email, password)
        .then(() => { toast('Welcome back!', 'success'); router.navigate('/forum'); })
        .catch(e => {
          err.style.display = 'block';
          err.textContent = e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
            ? 'Invalid email or password.' : e.message;
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-shield-halved"></i> Sign In';
        });
    });
  }

  // === REGISTER ===
  function renderRegister(main) {
    if (currentUser) {
      router.navigate('/profile');
      return;
    }
    main.innerHTML = `
      <div class="auth-container">
        <div class="auth-header">
          <div class="auth-icon"><i class="fas fa-user-plus"></i></div>
          <h2>Create Account</h2>
          <p>Join the cybersecurity community</p>
        </div>
        <div class="auth-error" id="regError"></div>
        <form id="registerForm">
          <div class="form-group">
            <label for="regName"><i class="fas fa-user"></i> Display Name</label>
            <input type="text" id="regName" class="form-input" placeholder="Your forum username" required>
          </div>
          <div class="form-group">
            <label for="regEmail"><i class="fas fa-envelope"></i> Email</label>
            <input type="email" id="regEmail" class="form-input" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label for="regPassword"><i class="fas fa-lock"></i> Password</label>
            <input type="password" id="regPassword" class="form-input" placeholder="Min 6 characters" required minlength="6" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label for="regConfirm"><i class="fas fa-check"></i> Confirm Password</label>
            <input type="password" id="regConfirm" class="form-input" placeholder="Repeat password" required autocomplete="new-password">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;" id="regBtn">
            <i class="fas fa-user-plus"></i> Create Account
          </button>
        </form>
        <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color);">
          <p style="color:var(--text-muted);font-size:0.9rem;">Already have an account? <a href="#/login" style="color:var(--accent-cyan);">Sign in</a></p>
        </div>
      </div>
    `;

    $('registerForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('regName').value.trim();
      const email = $('regEmail').value.trim();
      const password = $('regPassword').value;
      const confirm = $('regConfirm').value;
      const btn = $('regBtn');
      const err = $('regError');
      err.style.display = 'none';

      if (!name) { err.textContent = 'Display name is required.'; err.style.display = 'block'; return; }
      if (password !== confirm) { err.textContent = 'Passwords do not match.'; err.style.display = 'block'; return; }
      if (password.length < 6) { err.textContent = 'Password must be at least 6 characters.'; err.style.display = 'block'; return; }

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

      auth.createUserWithEmailAndPassword(email, password)
        .then(cred => {
          const profile = {
            displayName: name,
            email: email,
            role: isBootstrapAdminEmail(email) ? 'admin' : 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };

          return db.collection('profiles').doc(cred.user.uid).set(profile).then(() => {
            return syncPublicProfileSafely(cred.user.uid, profile);
          }).catch(fsErr => {
            // Firestore writes failed (e.g., blocked by extension or offline).
            // Do not abort account creation; let user sign in and show a non-blocking toast.
            console.error('profileWriteFailed:', fsErr);
            toast('Warning: profile sync failed (Firestore). Some features may be limited until you reload or disable blockers.', 'warning');
            return Promise.resolve();
          });
        })
        .then(() => {
          toast('Account created! Welcome!', 'success');
          router.navigate('/forum');
        })
        .catch(e => {
          err.style.display = 'block';
          if (e.code === 'auth/email-already-in-use') err.textContent = 'This email is already registered.';
          else if (e.code === 'auth/weak-password') err.textContent = 'Password is too weak.';
          else err.textContent = e.message;
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        });
    });
  }

  // === BLOG ===
  function renderBlog(main) {
    const catFilter = allBlogCategories.length
      ? `<div class="category-filter" id="blogFilter">
          <button class="filter-btn active" data-cat="all">All</button>
          ${allBlogCategories.map(c => `<button class="filter-btn" data-cat="${esc(c.id)}">${esc(c.name)}</button>`).join('')}
        </div>`
      : '';

    main.innerHTML = `
      <div class="page-header">
        <div class="header-icon"><i class="fas fa-feather-alt"></i></div>
        <h1>Research Blog</h1>
        <p>Cybersecurity research, writeups, and technical deep dives</p>
      </div>
      ${catFilter}
      <div class="blog-grid" id="blogList">${renderSkeleton(6)}</div>
    `;

    const filterContainer = $('blogFilter');
    if (filterContainer && !filterContainer.dataset.bound) {
      filterContainer.dataset.bound = 'true';
      filterContainer.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadBlogPosts(btn.dataset.cat);
      });
    }

    loadBlogPosts();
  }

  function loadBlogPosts(category = 'all') {
    dbx.blog.where('published', '==', true).get().then(snap => {
        const container = $('blogList');
        if (!container) return;
        let posts = [];
        snap.forEach(doc => {
          const p = doc.data();
          if (category !== 'all' && p.category !== category) return;
          posts.push({ id: doc.id, data: p });
        });
        posts.sort((a, b) => (b.data.createdAt?.seconds || 0) - (a.data.createdAt?.seconds || 0));
        if (!posts.length) {
          container.innerHTML = '<div class="no-posts"><i class="fas fa-feather-alt"></i><p>No posts in this category yet.</p></div>';
          return;
        }
        let html = '';
        posts.forEach(({ id, data: p }) => {
          html += `
            <div class="blog-card" onclick="router.navigate('/blog/${id}')">
              <div class="card-category" style="color:${getCategoryColor(p.category)};border:1px solid ${getCategoryColor(p.category)}">${esc(p.category || 'General')}</div>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.excerpt || p.content?.slice(0, 200) || '')}</p>
              <div class="card-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(p.createdAt)}</span>
                <span><i class="fas fa-user"></i> ${esc(p.author || 'anonymous')}</span>
              </div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(e => {
        console.error('blogPosts:', e);
        const container = $('blogList');
        if (container) container.innerHTML = '<div class="no-posts"><i class="fas fa-exclamation-triangle"></i><p>Failed to load posts.</p></div>';
      });

  }

  function renderBlogPost(main, id) {
    main.innerHTML = `<div class="loading-screen"><div class="loader"></div><p>Loading post...</p></div>`;

    dbx.blog.doc(id).get()
      .then(doc => {
        if (!doc.exists) {
          main.innerHTML = `<div class="no-posts"><i class="fas fa-file-excel"></i><p>Post not found.</p></div>`;
          return;
        }
        const p = doc.data();
        if (!p.published && currentUserRole !== 'admin') {
          main.innerHTML = `<div class="no-posts"><i class="fas fa-file-excel"></i><p>Post not found.</p></div>`;
          return;
        }
        const content = renderMarkdown(p.content);

        main.innerHTML = `
          <div class="post-container">
            <article>
              <div class="post-header">
                <div class="post-category" style="color:${getCategoryColor(p.category)};border:1px solid ${getCategoryColor(p.category)};background:${getCategoryColor(p.category)}15">${esc(p.category || 'General')}</div>
                <h1>${esc(p.title)}</h1>
                <div class="post-meta">
                  <span><i class="fas fa-user"></i> ${esc(p.author || 'anonymous')}</span>
                  <span><i class="fas fa-calendar"></i> ${formatDateFull(p.createdAt)}</span>
                  ${p.updatedAt ? `<span><i class="fas fa-edit"></i> Updated ${formatDate(p.updatedAt)}</span>` : ''}
                </div>
                ${p.tags?.length ? `<div class="post-tags">${p.tags.map(t => `<span class="post-tag">#${esc(t)}</span>`).join('')}</div>` : ''}
              </div>
              <div class="post-content">${content}</div>
            </article>
            <div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;">
              <a class="btn btn-sm btn-secondary" href="#/blog"><i class="fas fa-arrow-left"></i> Back to Blog</a>
            </div>
          </div>
        `;
        highlightCode();
      })
      .catch(() => {
        main.innerHTML = `<div class="no-posts"><i class="fas fa-exclamation-triangle"></i><p>Failed to load post.</p></div>`;
      });
  }

  // === VIDEOS ===
  function renderVideos(main) {
    const catFilter = allVideoCategories.length
      ? `<div class="category-filter" id="videoFilter">
          <button class="filter-btn active" data-cat="all">All</button>
          ${allVideoCategories.map(c => `<button class="filter-btn" data-cat="${esc(c.id)}">${esc(c.name)}</button>`).join('')}
        </div>`
      : '';

    main.innerHTML = `
      <div class="page-header">
        <div class="header-icon"><i class="fas fa-video"></i></div>
        <h1>Video Library</h1>
        <p>Security talks, tutorials, and walkthroughs</p>
      </div>
      ${catFilter}
      <div class="video-grid" id="videoList">${renderSkeleton(4)}</div>
    `;

    const filterContainer = $('videoFilter');
    if (filterContainer) {
      filterContainer.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        qq('.filter-btn', filterContainer).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadVideos(btn.dataset.cat);
      });
    }

    loadVideos();
  }

  function loadVideos(category = 'all') {
    dbx.videos.get().then(snap => {
        const container = $('videoList');
        if (!container) return;
        let videos = [];
        snap.forEach(doc => {
          const v = doc.data();
          if (category !== 'all' && v.category !== category) return;
          videos.push({ id: doc.id, data: v });
        });
        videos.sort((a, b) => (b.data.createdAt?.seconds || 0) - (a.data.createdAt?.seconds || 0));
        if (!videos.length) {
          container.innerHTML = '<div class="no-posts"><i class="fas fa-video"></i><p>No videos yet.</p></div>';
          return;
        }
        let html = '';
        videos.forEach(({ data: v }) => {
          const embed = getEmbedUrl(v.url);
          html += `
            <div class="video-card">
              <div class="video-wrapper">
                <iframe src="${esc(embed)}" allowfullscreen loading="lazy" title="${esc(v.title)}"></iframe>
              </div>
              <div class="video-info">
                <h3>${esc(v.title)}</h3>
                <p>${esc(v.description || '')}</p>
                <div class="video-meta">
                  <span><i class="${getPlatformIcon(v.url)}" style="color:${getPlatformColor(v.url)}"></i> ${esc(v.category || 'General')}</span>
                  <span>${formatDate(v.createdAt)}</span>
                </div>
              </div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(e => {
        console.error('videos:', e);
        const c = $('videoList');
        if (c) c.innerHTML = '<div class="no-posts"><i class="fas fa-exclamation-triangle"></i><p>Failed to load videos.</p></div>';
      });
  }

  // === FORUM ===
  function renderForum(main) {
    main.innerHTML = `
      <div class="page-header">
        <div class="header-icon"><i class="fas fa-comments"></i></div>
        <h1>Security Forum</h1>
        <p>Professional cybersecurity discussions & community</p>
      </div>
      <div class="forum-stats" id="forumStats">
        <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Categories</div></div>
        <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Threads</div></div>
        <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Replies</div></div>
        <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Members</div></div>
      </div>
      <div class="forum-categories" id="forumCatList">
        ${renderSkeleton(4)}
      </div>
    `;
    loadForumStats();
    loadForumCategories();
  }

  function loadForumStats() {
    Promise.all([
      dbx.forumCategories.get(),
      dbx.forumThreads.get(),
      dbx.forumReplies.get(),
      dbx.publicProfiles.get().catch(() => ({ size: 0 }))
    ]).then(([cats, threads, replies, profiles]) => {
      const c = $('forumStats');
      if (!c) return;
      c.innerHTML = `
        <div class="stat-card"><div class="stat-value">${cats.size}</div><div class="stat-label">Categories</div></div>
        <div class="stat-card"><div class="stat-value">${threads.size}</div><div class="stat-label">Threads</div></div>
        <div class="stat-card"><div class="stat-value">${replies.size}</div><div class="stat-label">Replies</div></div>
        <div class="stat-card"><div class="stat-value">${profiles.size || 0}</div><div class="stat-label">Members</div></div>
      `;
    }).catch(e => console.error('forumStats:', e));
  }

  function loadForumCategories() {
    dbx.forumCategories.get()
      .then(snap => {
        const container = $('forumCatList');
        if (!container) return;
        if (snap.empty) {
          container.innerHTML = '<div class="no-posts"><i class="fas fa-comments"></i><p>No categories yet.</p></div>';
          return;
        }
        let html = '';
        snap.forEach((doc, i) => {
          const c = doc.data();
          html += `
            <div class="forum-category" onclick="router.navigate('/forum/${doc.id}')">
              ${renderForumCategoryMedia(c, i)}
              <div class="cat-info">
                <h3>${esc(c.name)}</h3>
                <p>${esc(c.description || '')}</p>
              </div>
              <div class="cat-meta">
                <div><i class="fas fa-comment"></i> ${c.threadCount || 0} threads</div>
              </div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(() => {});
  }

  function renderForumCategory(main, catId) {
    main.innerHTML = `<div class="loading-screen"><div class="loader"></div><p>Loading threads...</p></div>`;

    dbx.forumCategories.doc(catId).get()
      .then(doc => {
        if (!doc.exists) { router.navigate('/forum'); return; }
        const cat = doc.data();

        main.innerHTML = `
          <div style="margin-bottom:24px;">
            <a class="btn btn-sm btn-secondary" href="#/forum"><i class="fas fa-arrow-left"></i> Back to Categories</a>
          </div>
          <div class="page-header" style="padding:20px 0;">
            <h2 style="font-family:var(--font-mono);font-size:1.5rem;">${esc(cat.name)}</h2>
            <p>${esc(cat.description || '')}</p>
          </div>
          <div class="forum-toolbar">
            <span style="color:var(--text-muted);font-size:0.9rem;"><i class="fas fa-comment"></i> ${doc.data().threadCount || 0} threads</span>
            ${currentUser ? `<button class="btn btn-sm btn-primary" onclick="showNewThreadModal('${catId}')"><i class="fas fa-plus"></i> New Thread</button>` : `<a class="btn btn-sm btn-secondary" href="#/login"><i class="fas fa-sign-in-alt"></i> Login to Post</a>`}
          </div>
          <div class="thread-list" id="threadList">${renderSkeleton(5)}</div>
        `;
        loadThreads(catId);
      })
      .catch(() => router.navigate('/forum'));
  }

  function loadThreads(catId) {
    dbx.forumThreads.get().then(snap => {
        const container = $('threadList');
        if (!container) return;
        let threads = [];
        snap.forEach(doc => {
          const t = doc.data();
          if (t.categoryId !== catId) return;
          threads.push({ id: doc.id, data: t });
        });
        threads.sort((a, b) => {
          if (a.data.isPinned && !b.data.isPinned) return -1;
          if (!a.data.isPinned && b.data.isPinned) return 1;
          return (b.data.lastActivityAt?.seconds || 0) - (a.data.lastActivityAt?.seconds || 0);
        });
        if (!threads.length) {
          container.innerHTML = '<div class="no-posts"><i class="fas fa-comment"></i><p>No threads yet. Start the discussion!</p></div>';
          return;
        }
        let html = '';
        threads.forEach(({ id, data: t }) => {
          const cls = (t.isPinned ? 'pinned' : '') + (t.isLocked ? ' locked' : '');
          html += `
            <div class="thread-item ${cls}" onclick="router.navigate('/forum/${catId}/${id}')">
              <div class="thread-icon"><i class="fas ${t.isPinned ? 'fa-thumbtack' : t.isLocked ? 'fa-lock' : 'fa-comment'}"></i></div>
              <div class="thread-info">
                <h4>${esc(t.title)} ${t.isPinned ? '<span style="color:var(--accent-orange);font-size:0.75rem;">Pinned</span>' : ''}</h4>
                <div class="thread-meta">
                  <span><i class="fas fa-user"></i> ${esc(t.author || 'anonymous')}</span>
                  <span><i class="fas fa-clock"></i> ${timeAgo(t.createdAt)}</span>
                </div>
              </div>
              <div class="thread-stats">
                <span><i class="fas fa-reply"></i> ${t.replies || 0}</span>
                <span><i class="fas fa-eye"></i> ${t.views || 0}</span>
              </div>
              <div class="thread-last">${timeAgo(t.lastActivityAt)}</div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(e => { console.error('threads:', e); });
  }

  function renderForumThread(main, catId, threadId) {
    // Clear any previous listeners for realtime updates
    if (window._threadUnsubscribe) {
      try { window._threadUnsubscribe(); } catch(e) {}
      window._threadUnsubscribe = null;
    }

    main.innerHTML = `<div class="loading-screen"><div class="loader"></div><p>Loading thread...</p></div>`;

    // Fetch thread and a snapshot of public profiles (used for avatars/roles)
    Promise.all([
      dbx.forumThreads.doc(threadId).get(),
      dbx.publicProfiles.get().catch(() => ({ empty: true }))
    ]).then(([threadDoc, profilesSnap]) => {
      if (!threadDoc.exists) { router.navigate(`/forum/${catId}`); return; }
      const t = threadDoc.data();

      // Increment view count (best-effort)
      if (t.views !== undefined) {
        dbx.forumThreads.doc(threadId).update({ views: (t.views || 0) + 1 }).catch(() => {});
      }

      // Build profiles map for quick lookup
      const profiles = {};
      if (profilesSnap && !profilesSnap.empty) profilesSnap.forEach(d => profiles[d.id] = d.data());

      const initial = (t.author || 'A')[0].toUpperCase();

      // Render main structure with placeholders for original post and live replies
      main.innerHTML = `
        <div style="margin-bottom:24px;">
          <a class="btn btn-sm btn-secondary" href="#/forum/${catId}"><i class="fas fa-arrow-left"></i> Back to Threads</a>
        </div>
        <div class="reply-list">
          <div id="originalReply" class="reply-item original">
            <div class="reply-header">
              <div class="reply-author" id="originalAuthor">
                <div class="avatar">${esc(initial)}</div>
                <div>
                  <div class="name">${t.authorId ? `<a href="#/profile/${esc(t.authorId)}" style="color:var(--text-primary);text-decoration:none;">${esc(t.author || 'Anonymous')}</a>` : esc(t.author || 'Anonymous')}</div>
                  <div class="role" style="color:var(--accent-purple);">Thread Starter</div>
                </div>
              </div>
              <div class="reply-date">${formatDateFull(t.createdAt)}</div>
            </div>
            <div class="reply-content">${renderMarkdown(t.content)}</div>
          </div>

          <div id="repliesContainer">
            <div class="loading-screen"><div class="loader"></div><p>Loading replies...</p></div>
          </div>
        </div>
        ${currentUser && !t.isLocked ? `
          <div class="reply-form">
            <h3 style="font-family:var(--font-mono);font-size:1rem;margin-bottom:16px;"><i class="fas fa-reply"></i> Post a Reply</h3>
            <form id="replyForm">
              <div class="form-group">
                <textarea class="form-textarea" id="replyContent" placeholder="Write your reply... (Markdown supported)" style="min-height:150px;" required></textarea>
              </div>
              <button type="submit" class="btn btn-primary" id="replyBtn"><i class="fas fa-paper-plane"></i> Post Reply</button>
            </form>
          </div>` : (!t.isLocked ? `<div style="text-align:center;padding:24px;"><a class="btn btn-secondary" href="#/login"><i class="fas fa-sign-in-alt"></i> Login to Reply</a></div>` : `<div style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fas fa-lock"></i> This thread is locked.</div>`)}
      `;

      // If admin, show admin controls for this thread
      if (currentUserRole === 'admin') {
        const adminActions = document.createElement('div');
        adminActions.style = 'margin-top:12px;display:flex;gap:8px;';
        adminActions.innerHTML = `
          <button class="btn btn-sm btn-danger" id="adminDeleteThreadBtn"><i class="fas fa-trash"></i> Delete Thread</button>
          <button class="btn btn-sm btn-secondary" id="adminToggleLockBtn">${t.isLocked ? '<i class="fas fa-lock-open"></i> Unlock' : '<i class="fas fa-lock"></i> Lock'}</button>
        `;
        const orig = $('originalReply');
        if (orig) orig.querySelector('.reply-header').appendChild(adminActions);

        $('adminDeleteThreadBtn').addEventListener('click', () => {
          if (!confirm('Delete this thread permanently? This cannot be undone.')) return;
          dbx.forumThreads.doc(threadId).delete().then(() => {
            toast('Thread deleted', 'success'); router.navigate(`/forum/${catId}`);
          }).catch(e => toast('Failed to delete thread: ' + e.message, 'error'));
        });

        $('adminToggleLockBtn').addEventListener('click', () => {
          const lock = !t.isLocked;
          dbx.forumThreads.doc(threadId).update({ isLocked: lock }).then(() => {
            toast(lock ? 'Thread locked' : 'Thread unlocked', 'success');
            // update local UI
            const btn = $('adminToggleLockBtn');
            if (btn) btn.innerHTML = lock ? '<i class="fas fa-lock-open"></i> Unlock' : '<i class="fas fa-lock"></i> Lock';
            t.isLocked = lock;
          }).catch(e => toast('Failed to update thread: ' + e.message, 'error'));
        });
      }

      // Setup realtime listeners for replies (chat-like behavior)
      const repliesQuery = dbx.forumReplies.where('threadId', '==', threadId).orderBy('createdAt');
      const threadRef = dbx.forumThreads.doc(threadId);

      // Initialize flag for new-reply detection
      window._repliesInitialLoaded = false;
      let repliesUnsub = null;
      try {
        repliesUnsub = repliesQuery.onSnapshot(snap => {
          // mark realtime available
          window._realtimeRepliesAvailable = true;
          let repliesHtml = '';
          if (snap.empty) {
            repliesHtml = '<div class="no-posts" style="padding:20px;"><i class="fas fa-comment"></i><p>No replies yet. Be the first to respond.</p></div>';
          } else {
            snap.forEach(doc => {
              const r = doc.data();
              // Build avatar/role from profiles map if available
              let authorHtml = '';
              if (r.authorId && profiles[r.authorId]) {
                const p = profiles[r.authorId];
                const avatar = p.avatar ? `<div class="avatar"><img src="${esc(p.avatar)}" alt="${esc(p.displayName || r.author || 'User')}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;"/></div>` : `<div class="avatar">${esc((p.displayName||r.author||'A').charAt(0).toUpperCase())}</div>`;
                const roleLabel = p.role === 'admin' ? 'Administrator' : 'Member';
                authorHtml = `
                  <div class="reply-author">
                    ${avatar}
                    <div>
                      <div class="name">${r.authorId ? `<a href="#/profile/${esc(r.authorId)}" style="color:var(--text-primary);text-decoration:none;">${esc(r.author || p.displayName || 'Anonymous')}</a>` : esc(r.author || 'Anonymous')}</div>
                      <div class="role">${roleLabel}</div>
                    </div>
                  </div>`;
              } else {
                const initial = (r.author || 'A')[0].toUpperCase();
                authorHtml = `
                  <div class="reply-author">
                    <div class="avatar">${esc(initial)}</div>
                    <div>
                      <div class="name">${r.authorId ? `<a href="#/profile/${esc(r.authorId)}" style="color:var(--text-primary);text-decoration:none;">${esc(r.author || 'Anonymous')}</a>` : esc(r.author || 'Anonymous')}</div>
                      <div class="role">${r.authorId ? 'Member' : 'Guest'}</div>
                    </div>
                  </div>`;
              }

              repliesHtml += `
                <div class="reply-item" data-reply-id="${esc(doc.id)}">
                  <div class="reply-header">
                    ${authorHtml}
                    <div class="reply-date">${formatDateFull(r.createdAt)}</div>
                  </div>
                  <div class="reply-content">${renderMarkdown(r.content)}</div>
                  <div class="reply-actions">
                    ${currentUser ? `<button class="reply-action" onclick="window.openReply('${esc(doc.id)}')"><i class="fas fa-reply"></i> Reply</button>` : ''}
                    ${currentUser ? `<button class="reply-action" onclick="window.quoteReply('${esc(doc.id)}','${esc(r.author || 'Anonymous')}')"><i class="fas fa-quote-right"></i> Quote</button>` : ''}
                  </div>
                </div>`;
            });
          }

          const container = $('repliesContainer');
          if (container) container.innerHTML = repliesHtml;
          highlightCode();

          // Indicate new replies after initial load
          if (!snap.metadata.hasPendingWrites) {
            const changes = snap.docChanges();
            changes.forEach(c => {
              if (c.type === 'added' && window._repliesInitialLoaded) {
                toast('New reply', 'info');
              }
            });
          }

          // mark that initial load finished
          window._repliesInitialLoaded = true;
        }, err => {
          console.error('repliesListener:', err);
          // realtime failed — fall back to a one-time load
          window._realtimeRepliesAvailable = false;
          const container = $('repliesContainer');
          if (container) container.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading replies...</p></div>';
          dbx.forumReplies.where('threadId','==',threadId).get().then(fallbackSnap => {
            // collect and sort client-side to avoid requiring a composite index
            const repliesArr = [];
            fallbackSnap.forEach(doc => repliesArr.push({ id: doc.id, data: doc.data() }));
            repliesArr.sort((a, b) => (a.data.createdAt?.seconds || 0) - (b.data.createdAt?.seconds || 0));

            let repliesHtml = '';
            if (!repliesArr.length) {
              repliesHtml = '<div class="no-posts" style="padding:20px;"><i class="fas fa-comment"></i><p>No replies yet. Be the first to respond.</p></div>';
            } else {
              repliesArr.forEach(item => {
                const docId = item.id;
                const r = item.data;
                let authorHtml = '';
                if (r.authorId && profiles[r.authorId]) {
                  const p = profiles[r.authorId];
                  const avatar = p.avatar ? `<div class="avatar"><img src="${esc(p.avatar)}" alt="${esc(p.displayName || r.author || 'User')}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;"/></div>` : `<div class="avatar">${esc((p.displayName||r.author||'A').charAt(0).toUpperCase())}</div>`;
                  const roleLabel = p.role === 'admin' ? 'Administrator' : 'Member';
                  authorHtml = `
                    <div class="reply-author">
                      ${avatar}
                      <div>
                        <div class="name">${r.authorId ? `<a href="#/profile/${esc(r.authorId)}" style="color:var(--text-primary);text-decoration:none;">${esc(r.author || p.displayName || 'Anonymous')}</a>` : esc(r.author || 'Anonymous')}</div>
                        <div class="role">${roleLabel}</div>
                      </div>
                    </div>`;
                } else {
                  const initial = (r.author || 'A')[0].toUpperCase();
                  authorHtml = `
                    <div class="reply-author">
                      <div class="avatar">${esc(initial)}</div>
                      <div>
                        <div class="name">${r.authorId ? `<a href="#/profile/${esc(r.authorId)}" style="color:var(--text-primary);text-decoration:none;">${esc(r.author || 'Anonymous')}</a>` : esc(r.author || 'Anonymous')}</div>
                        <div class="role">${r.authorId ? 'Member' : 'Guest'}</div>
                      </div>
                    </div>`;
                }

                repliesHtml += `
                  <div class="reply-item" data-reply-id="${esc(docId)}">
                    <div class="reply-header">
                      ${authorHtml}
                      <div class="reply-date">${formatDateFull(r.createdAt)}</div>
                    </div>
                    <div class="reply-content">${renderMarkdown(r.content)}</div>
                    <div class="reply-actions">
                      ${currentUser ? `<button class="reply-action" onclick="window.openReply('${esc(docId)}')"><i class="fas fa-reply"></i> Reply</button>` : ''}
                      ${currentUser ? `<button class="reply-action" onclick="window.quoteReply('${esc(docId)}','${esc(r.author || 'Anonymous')}')"><i class="fas fa-quote-right"></i> Quote</button>` : ''}
                    </div>
                  </div>`;
              });
            }
            if (container) container.innerHTML = repliesHtml;
            highlightCode();
            window._repliesInitialLoaded = true;
          }).catch(ferr => {
            console.error('repliesFallback:', ferr);
            if (container) container.innerHTML = '<div class="no-posts" style="padding:20px;color:var(--text-muted);"><i class="fas fa-exclamation-triangle"></i><p>Failed to load replies.</p></div>';
            toast('Failed to load replies: ' + (ferr && ferr.message ? ferr.message : 'unknown'), 'error');
          });
        });
      } catch(e) {
        console.error('repliesListenerSetup:', e);
        const container = $('repliesContainer');
        if (container) container.innerHTML = '<div class="no-posts" style="padding:20px;color:var(--text-muted);"><i class="fas fa-exclamation-triangle"></i><p>Failed to initialize replies.</p></div>';
      }

      // store unsubscribe to allow cleanup when navigating away
      window._threadUnsubscribe = () => { try { if (repliesUnsub) repliesUnsub(); } catch(e) {} try { threadUnsub(); } catch(e) {} };

      const threadUnsub = threadRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        // update lock state of reply form
        const form = $('replyForm');
        if (form) {
          if (data.isLocked) {
            form.remove();
            const lockedNotice = document.createElement('div');
            lockedNotice.style = 'text-align:center;padding:24px;color:var(--text-muted);';
            lockedNotice.innerHTML = '<i class="fas fa-lock"></i> This thread is locked.';
            const parent = document.querySelector('.reply-list');
            if (parent) parent.appendChild(lockedNotice);
          }
        }
      }, err => console.error('threadListener:', err));

      // store unsubscribe to allow cleanup when navigating away
      window._threadUnsubscribe = () => { try { repliesUnsub(); } catch(e) {} try { threadUnsub(); } catch(e) {} };

      // Submit handler: post a reply (no longer re-render entire thread; realtime listener will pick it up)
      if (currentUser && !t.isLocked) {
        const replyForm = $('replyForm');
        if (replyForm) {
          replyForm.addEventListener('submit', e => {
            e.preventDefault();
            const contentEl = $('replyContent');
            const content = contentEl.value.trim();
            if (!content) return;
            const btn = $('replyBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

            dbx.forumReplies.add({ threadId, content, author: getDisplayName(), authorId: currentUser.uid || '', createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
              .then(() => dbx.forumThreads.doc(threadId).update({ replies: firebase.firestore.FieldValue.increment(1), lastActivityAt: firebase.firestore.FieldValue.serverTimestamp() }))
              .then(() => { toast('Reply posted!', 'success'); contentEl.value = ''; btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Reply';
                // if realtime isn't available, refresh replies once so the newly added reply becomes visible
                if (!window._realtimeRepliesAvailable) {
                  dbx.forumReplies.where('threadId','==',threadId).orderBy('createdAt','asc').get().then(snapAfter => {
                    const container = $('repliesContainer');
                    let html = '';
                    if (snapAfter.empty) html = '<div class="no-posts" style="padding:20px;"><i class="fas fa-comment"></i><p>No replies yet. Be the first to respond.</p></div>';
                    else {
                      snapAfter.forEach(doc => {
                        const r = doc.data();
                        const author = r.author || 'Anonymous';
                        const initial = (r.author || 'A')[0].toUpperCase();
                        html += `<div class="reply-item" data-reply-id="${esc(doc.id)}"><div class="reply-header"><div class="reply-author"><div class="avatar">${esc(initial)}</div><div><div class="name">${esc(author)}</div><div class="role">${r.authorId ? 'Member' : 'Guest'}</div></div></div><div class="reply-date">${formatDateFull(r.createdAt)}</div></div><div class="reply-content">${renderMarkdown(r.content)}</div></div>`;
                      });
                    }
                    if (container) container.innerHTML = html;
                    highlightCode();
                  }).catch(() => {});
                }
              })
              .catch(e => { toast('Failed to post reply: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Reply'; });
          });
        }
      }

      highlightCode();
    }).catch(() => router.navigate(`/forum/${catId}`));

    // Helper global functions for reply UI interactions
    window.openReply = function(replyId) {
      const el = document.querySelector(`[data-reply-id="${replyId}"]`);
      let authorName = '';
      if (el) {
        const nameEl = el.querySelector('.name');
        authorName = nameEl ? nameEl.textContent.trim() : '';
      }
      const contentEl = $('replyContent');
      if (contentEl) {
        const at = authorName ? `@${authorName} ` : '';
        contentEl.value = at + contentEl.value;
        contentEl.focus();
        contentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.quoteReply = function(replyId, author) {
      const contentEl = $('replyContent');
      if (!contentEl) return;
      dbx.forumReplies.doc(replyId).get().then(doc => {
        if (!doc.exists) return;
        const r = doc.data();
        const lines = (r.content || '').split('\n').map(l => `> ${l}`).join('\n');
        const quote = `> **${esc(author)} said:**\n${lines}\n\n`;
        contentEl.value = quote + contentEl.value;
        contentEl.focus();
        contentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }).catch(() => {});
    };
  }

  window.showNewThreadModal = function(catId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'newThreadModal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3><i class="fas fa-plus"></i> New Thread</h3>
          <button class="modal-close" onclick="document.getElementById('newThreadModal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="newThreadForm">
            <div class="form-group">
              <label for="threadTitle">Title</label>
              <input type="text" class="form-input" id="threadTitle" placeholder="Descriptive thread title" required>
            </div>
            <div class="form-group">
              <label for="threadContent">Content (Markdown supported)</label>
              <textarea class="form-textarea" id="threadContent" placeholder="Write your thread content..." style="min-height:200px;" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary" id="newThreadBtn"><i class="fas fa-paper-plane"></i> Create Thread</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    $('newThreadForm').addEventListener('submit', e => {
      e.preventDefault();
      const title = $('threadTitle').value.trim();
      const content = $('threadContent').value.trim();
      if (!title || !content) return;
      const btn = $('newThreadBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

      dbx.forumThreads.add({
        categoryId: catId, title, content,
        author: getDisplayName(),
        authorId: currentUser.uid || '',
        replies: 0, views: 0, isPinned: false, isLocked: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActivityAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(ref => {
        return dbx.forumCategories.doc(catId).update({ threadCount: firebase.firestore.FieldValue.increment(1) });
      }).then(() => {
        toast('Thread created!', 'success');
        overlay.remove();
        router.navigate(`/forum/${catId}`);
      }).catch(e => {
        toast('Failed: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Create Thread';
      });
    });
  };

  // === ADMIN ===
  function renderAdmin(main) {
    if (!authResolved) {
      main.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading admin access...</p></div>';
      return;
    }
    if (!currentUser) {
      main.innerHTML = `
        <div class="auth-container" style="text-align:center;">
          <div class="auth-header">
            <div class="auth-icon"><i class="fas fa-shield-halved"></i></div>
            <h2>Access Denied</h2>
            <p>Authentication required</p>
          </div>
          <a class="btn btn-primary" href="#/login"><i class="fas fa-sign-in-alt"></i> Login</a>
        </div>
      `;
      return;
    }
    if (currentUserRole !== 'admin') {
      main.innerHTML = `
        <div class="auth-container" style="text-align:center;">
          <div class="auth-header">
            <div class="auth-icon"><i class="fas fa-crown" style="color:var(--accent-orange);"></i></div>
            <h2>Admin Only</h2>
            <p style="color:var(--text-muted);">This area is restricted to administrators.</p>
          </div>
          <a class="btn btn-secondary" href="#/forum"><i class="fas fa-comments"></i> Go to Forum</a>
        </div>
      `;
      return;
    }

    const hash = window.location.hash.replace('#/admin', '') || '/dashboard';
    const section = hash.split('?')[0];

    let content = '';

    if (section === '/dashboard' || section === '' || section === '/') {
      content = adminDashboard();
    } else if (section === '/blog') {
      content = adminBlogList();
    } else if (section.startsWith('/blog/new')) {
      content = adminBlogForm(null);
    } else if (section.startsWith('/blog/edit')) {
      const id = section.split('/edit/')[1];
      content = adminBlogForm(id);
    } else if (section === '/videos') {
      content = adminVideos();
    } else if (section === '/categories') {
      content = adminCategories();
    } else if (section === '/forum') {
      content = adminForum();
    } else {
      content = adminDashboard();
    }

    main.innerHTML = `
      <div class="admin-shell">
        <div class="admin-shell-header">
          <div>
            <p class="admin-shell-kicker">Control Center</p>
            <h1>0warn Admin</h1>
            <p>Manage publishing, moderation, and taxonomy from one place.</p>
          </div>
          <div class="admin-shell-meta">
            <span class="admin-badge"><i class="fas fa-user-shield"></i> ${esc(getDisplayName())}</span>
            <span class="admin-badge admin-badge-muted"><i class="fas fa-lock"></i> Admin session</span>
          </div>
        </div>
        <div class="admin-layout">
          <aside class="admin-sidebar">
            <div class="admin-sidebar-card">
              <div class="admin-sidebar-brand">
                <div class="admin-sidebar-logo"><i class="fas fa-crown"></i></div>
                <div>
                  <strong>Operations</strong>
                  <span>Publishing and moderation</span>
                </div>
              </div>
              <nav>
                <a href="#/admin/dashboard" class="${section === '/dashboard' || section === '' || section === '/' ? 'active' : ''}"><i class="fas fa-chart-simple"></i> Dashboard</a>
                <a href="#/admin/blog" class="${section === '/blog' || section.startsWith('/blog/') ? 'active' : ''}"><i class="fas fa-feather-alt"></i> Blog Posts</a>
                <a href="#/admin/videos" class="${section === '/videos' ? 'active' : ''}"><i class="fas fa-video"></i> Videos</a>
                <a href="#/admin/categories" class="${section === '/categories' ? 'active' : ''}"><i class="fas fa-tags"></i> Categories</a>
                <a href="#/admin/forum" class="${section === '/forum' ? 'active' : ''}"><i class="fas fa-comments"></i> Forum</a>
                <hr class="admin-sidebar-separator">
                <a href="#/" class="admin-link-muted"><i class="fas fa-arrow-left"></i> Back to Site</a>
                <a href="#" onclick="logout()" class="admin-link-danger"><i class="fas fa-sign-out-alt"></i> Logout</a>
              </nav>
            </div>
          </aside>
          <div class="admin-content">
            ${content}
          </div>
        </div>
      </div>
    `;

    if (section === '/blog') attachBlogHandlers();
    else if (section.startsWith('/blog/new') || section.startsWith('/blog/edit')) attachBlogFormHandlers();
    else if (section === '/videos') attachVideoHandlers();
    else if (section === '/categories') attachCategoryHandlers();
    else if (section === '/forum') attachForumAdminHandlers();
  }

  // === ADMIN DASHBOARD ===
  function adminDashboard() {
    let html = `
      <div class="admin-panel-card admin-hero-panel">
        <div class="admin-header">
          <div>
            <h2><i class="fas fa-chart-simple"></i> Dashboard</h2>
            <p class="admin-subtitle">Welcome back, ${esc(getDisplayName())}. Here is the current platform overview.</p>
          </div>
          <span class="admin-badge"><i class="fas fa-wave-square"></i> Live snapshot</span>
        </div>
      </div>
      <div class="admin-stats" id="adminStats">
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-feather-alt"></i></div><div class="stat-number">--</div><div class="stat-desc">Blog Posts</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-video"></i></div><div class="stat-number">--</div><div class="stat-desc">Videos</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-tags"></i></div><div class="stat-number">--</div><div class="stat-desc">Blog Categories</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-film"></i></div><div class="stat-number">--</div><div class="stat-desc">Video Categories</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-comments"></i></div><div class="stat-number">--</div><div class="stat-desc">Forum Threads</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-reply"></i></div><div class="stat-number">--</div><div class="stat-desc">Forum Replies</div></div>
      </div>
      <div class="admin-panel-card">
        <div class="admin-header" style="margin-bottom:18px;"><h3 style="font-size:1.1rem;"><i class="fas fa-bolt"></i> Quick Actions</h3></div>
        <div class="admin-action-grid">
        <a class="btn btn-primary" href="#/admin/blog/new"><i class="fas fa-plus"></i> New Blog Post</a>
        <a class="btn btn-secondary" href="#/admin/videos"><i class="fas fa-plus"></i> Add Video</a>
        <a class="btn btn-secondary" href="#/admin/categories"><i class="fas fa-plus"></i> Manage Categories</a>
        </div>
      </div>
    `;

    setTimeout(() => {
      Promise.all([dbx.blog.get(), dbx.videos.get(), dbx.blogCategories.get(), dbx.videoCategories.get(), dbx.forumThreads.get(), dbx.forumReplies.get()])
        .then(([b, v, bc, vc, ft, fr]) => {
          const c = $('adminStats');
          if (!c) return;
          c.innerHTML = `
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-feather-alt"></i></div><div class="stat-number">${b.size}</div><div class="stat-desc">Blog Posts</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-video"></i></div><div class="stat-number">${v.size}</div><div class="stat-desc">Videos</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-tags"></i></div><div class="stat-number">${bc.size}</div><div class="stat-desc">Blog Categories</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-film"></i></div><div class="stat-number">${vc.size}</div><div class="stat-desc">Video Categories</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-comments"></i></div><div class="stat-number">${ft.size}</div><div class="stat-desc">Forum Threads</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-reply"></i></div><div class="stat-number">${fr.size}</div><div class="stat-desc">Forum Replies</div></div>
          `;
        }).catch(e => console.error('adminStats:', e));
    }, 200);

    return html;
  }

  // === ADMIN BLOG LIST ===
  function adminBlogList() {
    let html = `
      <div class="admin-header">
        <h2><i class="fas fa-feather-alt"></i> Blog Posts</h2>
        <a class="btn btn-primary btn-sm" href="#/admin/blog/new"><i class="fas fa-plus"></i> New Post</a>
      </div>
      <div id="adminBlogTable">
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody id="adminBlogBody"><tr><td colspan="5" class="table-empty"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
    `;
    setTimeout(() => loadAdminBlog(), 200);
    return html;
  }

  function loadAdminBlog() {
    dbx.blog.orderBy('createdAt', 'desc').get()
      .then(snap => {
        const body = $('adminBlogBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="5" class="table-empty"><i class="fas fa-feather-alt"></i><p>No posts yet. Create your first post!</p></td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const p = doc.data();
          html += `<tr>
            <td><strong>${esc(p.title)}</strong></td>
            <td><span style="color:${getCategoryColor(p.category)}">${esc(p.category || 'General')}</span></td>
            <td><span style="color:${p.published ? 'var(--accent-green)' : 'var(--accent-orange)'}">${p.published ? 'Published' : 'Draft'}</span></td>
            <td style="font-family:var(--font-mono);font-size:0.8rem;">${formatDate(p.createdAt)}</td>
            <td class="actions">
              <a class="btn btn-sm btn-secondary" href="#/blog/${doc.id}" target="_blank" title="View"><i class="fas fa-eye"></i></a>
              <a class="btn btn-sm btn-secondary" href="#/admin/blog/edit/${doc.id}" title="Edit"><i class="fas fa-edit"></i></a>
              <button class="btn btn-sm btn-danger" onclick="deleteBlogPost('${doc.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        });
        body.innerHTML = html;
      })
      .catch(e => {
        console.error('adminBlog:', e);
        const b = $('adminBlogBody');
        if (b) b.innerHTML = '<tr><td colspan="5" class="table-empty"><i class="fas fa-exclamation-triangle"></i> Failed to load.</td></tr>';
      });
  }

  window.deleteBlogPost = function(id) {
    if (!confirm('Permanently delete this blog post?')) return;
    dbx.blog.doc(id).delete()
      .then(() => { toast('Post deleted', 'success'); loadAdminBlog(); })
      .catch(e => toast('Delete failed: ' + e.message, 'error'));
  };

  // === ADMIN BLOG FORM ===
  function adminBlogForm(id) {
    const isEdit = !!id;
    return `
      <div class="admin-header">
        <h2><i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'}"></i> ${isEdit ? 'Edit Post' : 'New Post'}</h2>
        <a class="btn btn-sm btn-secondary" href="#/admin/blog"><i class="fas fa-arrow-left"></i> Back</a>
      </div>
      <form id="blogForm" ${isEdit ? `data-id="${id}"` : ''}>
        <div class="form-row">
          <div class="form-group">
            <label for="postTitle">Title</label>
            <input type="text" class="form-input" id="postTitle" placeholder="Post title" required>
          </div>
          <div class="form-group">
            <label for="postCategory">Category</label>
            <select class="form-select" id="postCategory">
              <option value="">Select category...</option>
              ${allBlogCategories.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="postExcerpt">Excerpt</label>
          <input type="text" class="form-input" id="postExcerpt" placeholder="Brief description for the card">
        </div>
        <div class="form-group">
          <label for="postContent">Content <span style="color:var(--text-muted);font-size:0.8rem;">(Markdown format)</span></label>
          <textarea class="form-textarea" id="postContent" placeholder="Write your post in Markdown..." required></textarea>
        </div>
        <div class="form-group">
          <button type="button" class="btn btn-sm btn-secondary" onclick="togglePreview()"><i class="fas fa-eye"></i> Preview</button>
          <div class="markdown-preview" id="markdownPreview"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="postTags">Tags</label>
            <div class="tags-input-container" id="tagsContainer">
              <input type="text" class="tags-input" id="postTags" placeholder="Type and press Enter to add tags...">
            </div>
          </div>
          <div class="form-group">
            <label for="postAuthor">Author</label>
            <input type="text" class="form-input" id="postAuthor" placeholder="Author name" value="${esc(getDisplayName())}">
          </div>
        </div>
        <div class="form-group">
          <label class="checkbox-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="postPublished" checked> <span>Publish immediately</span>
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="router.navigate('/admin/blog')">Cancel</button>
          <button type="submit" class="btn btn-primary" id="saveBlogBtn"><i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Save'} Post</button>
        </div>
      </form>
    `;
  }

  window.togglePreview = function() {
    const preview = $('markdownPreview');
    if (preview.classList.toggle('show')) {
      preview.innerHTML = renderMarkdown($('postContent').value) || '<p style="color:var(--text-muted);">Nothing to preview...</p>';
    }
  };

  function attachBlogFormHandlers() {
    const tags = [];
    const container = $('tagsContainer');
    const input = $('postTags');

    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = input.value.trim().replace(/,/g, '');
          if (val && !tags.includes(val)) {
            tags.push(val);
            renderTags();
          }
          input.value = '';
        }
      });
    }

    function renderTags() {
      if (!container) return;
      container.innerHTML = tags.map(t => `<span class="tag-item">${esc(t)}<button class="remove-tag" onclick="removeTag('${esc(t)}')">&times;</button></span>`).join('');
      container.appendChild(input);
      input.value = '';
    }

    window.removeTag = function(tag) {
      const idx = tags.indexOf(tag);
      if (idx > -1) { tags.splice(idx, 1); renderTags(); }
    };

    const form = $('blogForm');
    if (!form) return;

    const editId = form.dataset.id;
    if (editId) {
      dbx.blog.doc(editId).get().then(doc => {
        if (!doc.exists) { router.navigate('/admin/blog'); return; }
        const p = doc.data();
        $('postTitle').value = p.title || '';
        $('postCategory').value = p.category || '';
        $('postExcerpt').value = p.excerpt || '';
        $('postContent').value = p.content || '';
        $('postAuthor').value = p.author || '';
        $('postPublished').checked = p.published !== false;
        if (p.tags) { p.tags.forEach(t => { if (!tags.includes(t)) tags.push(t); }); renderTags(); }
      }).catch(() => router.navigate('/admin/blog'));
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const title = $('postTitle').value.trim();
      const content = $('postContent').value.trim();
      if (!title || !content) { toast('Title and content are required', 'error'); return; }

      const data = {
        title,
        content,
        category: $('postCategory').value || 'General',
        excerpt: $('postExcerpt').value.trim() || content.slice(0, 200),
        tags: [...tags],
        author: $('postAuthor').value.trim() || 'admin',
        published: $('postPublished').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const btn = $('saveBlogBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      if (editId) {
        dbx.blog.doc(editId).update(data)
          .then(() => { toast('Post updated!', 'success'); router.navigate('/admin/blog'); })
          .catch(e => { toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Update Post'; });
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        data.author = data.author || getDisplayName();
        dbx.blog.add(data)
          .then(() => { toast('Post created!', 'success'); router.navigate('/admin/blog'); })
          .catch(e => { toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Post'; });
      }
    });
  }

  function attachBlogHandlers() {
    loadAdminBlog();
  }

  // === ADMIN VIDEOS ===
  function adminVideos() {
    let html = `
      <div class="admin-header">
        <h2><i class="fas fa-video"></i> Videos</h2>
        <button class="btn btn-primary btn-sm" onclick="showAddVideoModal()"><i class="fas fa-plus"></i> Add Video</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Platform</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody id="adminVideoBody"><tr><td colspan="5" class="table-empty"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr></tbody>
        </table>
      </div>
    `;
    setTimeout(loadAdminVideos, 200);
    return html;
  }

  function loadAdminVideos() {
    dbx.videos.orderBy('createdAt', 'desc').get()
      .then(snap => {
        const body = $('adminVideoBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="5" class="table-empty"><i class="fas fa-video"></i><p>No videos yet.</p></td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const v = doc.data();
          html += `<tr>
            <td><strong>${esc(v.title)}</strong></td>
            <td><i class="${getPlatformIcon(v.url)}" style="color:${getPlatformColor(v.url)}"></i> ${v.url.includes('youtube') ? 'YouTube' : 'Odysee'}</td>
            <td>${esc(v.category || 'General')}</td>
            <td style="font-family:var(--font-mono);font-size:0.8rem;">${formatDate(v.createdAt)}</td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary" onclick="showEditVideoModal('${doc.id}')" title="Edit"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteVideo('${doc.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        });
        body.innerHTML = html;
      })
      .catch(e => { console.error('adminVideos:', e); });
  }

  window.deleteVideo = function(id) {
    if (!confirm('Delete this video?')) return;
    dbx.videos.doc(id).delete()
      .then(() => { toast('Video deleted', 'success'); loadAdminVideos(); })
      .catch(e => toast('Failed: ' + e.message, 'error'));
  };

  window.showAddVideoModal = function() {
    showVideoModal();
  };
  window.showEditVideoModal = function(id) {
    showVideoModal(id);
  };

  function showVideoModal(editId = null) {
    const isEdit = !!editId;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'videoModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h3><i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'}"></i> ${isEdit ? 'Edit Video' : 'Add Video'}</h3>
          <button class="modal-close" onclick="document.getElementById('videoModal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="videoForm" ${isEdit ? `data-id="${editId}"` : ''}>
            <div class="form-row">
              <div class="form-group">
                <label for="videoTitle">Title</label>
                <input type="text" class="form-input" id="videoTitle" placeholder="Video title" required>
              </div>
              <div class="form-group">
                <label for="videoCategory">Category</label>
                <select class="form-select" id="videoCategory">
                  <option value="">Select...</option>
                  ${allVideoCategories.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="videoUrl">Video URL <span style="color:var(--text-muted);font-size:0.8rem;">(YouTube or Odysee)</span></label>
              <input type="url" class="form-input" id="videoUrl" placeholder="https://youtube.com/watch?v=... or https://odysee.com/..." required>
            </div>
            <div class="form-group">
              <label for="videoDescription">Description</label>
              <textarea class="form-textarea" id="videoDescription" placeholder="Brief description" style="min-height:80px;"></textarea>
            </div>
            <button type="submit" class="btn btn-primary" id="saveVideoBtn"><i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Save'} Video</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    if (isEdit) {
      dbx.videos.doc(editId).get().then(doc => {
        if (!doc.exists) { overlay.remove(); return; }
        const v = doc.data();
        $('videoTitle').value = v.title || '';
        $('videoCategory').value = v.category || '';
        $('videoUrl').value = v.url || '';
        $('videoDescription').value = v.description || '';
      });
    }

    $('videoForm').addEventListener('submit', e => {
      e.preventDefault();
      const title = $('videoTitle').value.trim();
      const url = $('videoUrl').value.trim();
      if (!title || !url) { toast('Title and URL are required', 'error'); return; }

      const data = {
        title, url,
        category: $('videoCategory').value || 'General',
        description: $('videoDescription').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const btn = $('saveVideoBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      if (isEdit) {
        dbx.videos.doc(editId).update(data)
          .then(() => { toast('Video updated!', 'success'); overlay.remove(); loadAdminVideos(); })
          .catch(e => { toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Update Video'; });
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        dbx.videos.add(data)
          .then(() => { toast('Video added!', 'success'); overlay.remove(); loadAdminVideos(); })
          .catch(e => { toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Video'; });
      }
    });
  }

  function attachVideoHandlers() { loadAdminVideos(); }

  // === ADMIN CATEGORIES ===
  function adminCategories() {
    let html = `
      <div class="admin-header">
        <h2><i class="fas fa-tags"></i> Categories</h2>
        <button class="btn btn-primary btn-sm" onclick="showCategoryModal()"><i class="fas fa-plus"></i> New Blog Category</button>
        <button class="btn btn-primary btn-sm" onclick="showCategoryModal(null,'video')"><i class="fas fa-plus"></i> New Video Category</button>
        <button class="btn btn-primary btn-sm" onclick="showCategoryModal(null,'forum')"><i class="fas fa-plus"></i> New Forum Category</button>
      </div>
      <div class="admin-category-grid">
        <div>
          <h3 style="font-family:var(--font-mono);font-size:1rem;margin-bottom:16px;"><i class="fas fa-feather-alt"></i> Blog</h3>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Name</th><th>Posts</th><th>Actions</th></tr></thead>
              <tbody id="adminBlogCatBody"><tr><td colspan="3" class="table-empty"><i class="fas fa-spinner fa-spin"></i></td></tr></tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 style="font-family:var(--font-mono);font-size:1rem;margin-bottom:16px;"><i class="fas fa-video"></i> Videos</h3>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Name</th><th>Count</th><th>Actions</th></tr></thead>
              <tbody id="adminVideoCatBody"><tr><td colspan="3" class="table-empty"><i class="fas fa-spinner fa-spin"></i></td></tr></tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 style="font-family:var(--font-mono);font-size:1rem;margin-bottom:16px;"><i class="fas fa-comments"></i> Forum</h3>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Name</th><th>Threads</th><th>Actions</th></tr></thead>
              <tbody id="adminForumCatBody"><tr><td colspan="3" class="table-empty"><i class="fas fa-spinner fa-spin"></i></td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => { loadAdminBlogCategories(); loadAdminVideoCategories(); loadAdminForumCategories(); }, 200);
    return html;
  }

  function loadAdminBlogCategories() {
    dbx.blogCategories.orderBy('order', 'asc').get()
      .then(snap => {
        const body = $('adminBlogCatBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="3" class="table-empty">No categories</td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const c = doc.data();
          html += `<tr><td><span style="color:${getCategoryColor(doc.id)}">${esc(c.name)}</span></td><td>${c.postCount || 0}</td><td class="actions"><button class="btn btn-sm btn-secondary" onclick="showCategoryModal('${doc.id}','blog')" title="Edit"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="deleteCategory('${doc.id}','blog')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        body.innerHTML = html;
      });
  }

  function loadAdminVideoCategories() {
    dbx.videoCategories.orderBy('order', 'asc').get()
      .then(snap => {
        const body = $('adminVideoCatBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="3" class="table-empty">No categories</td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const c = doc.data();
          html += `<tr><td><span style="color:${getCategoryColor(doc.id)}">${esc(c.name)}</span></td><td>${c.count || 0}</td><td class="actions"><button class="btn btn-sm btn-secondary" onclick="showCategoryModal('${doc.id}','video')" title="Edit"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="deleteCategory('${doc.id}','video')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        body.innerHTML = html;
      });
  }

  function loadAdminForumCategories() {
    dbx.forumCategories.orderBy('order', 'asc').get()
      .then(snap => {
        const body = $('adminForumCatBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="3" class="table-empty">No categories</td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const c = doc.data();
          html += `<tr><td>${esc(c.name)}</td><td>${c.threadCount || 0}</td><td class="actions"><button class="btn btn-sm btn-secondary" onclick="showCategoryModal('${doc.id}','forum')" title="Edit"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-secondary" onclick="manageCategoryThreads('${doc.id}','${esc(c.name)}')" title="Manage Threads"><i class="fas fa-folder-open"></i></button><button class="btn btn-sm btn-danger" onclick="deleteCategory('${doc.id}','forum')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        body.innerHTML = html;
      });
  }

  window.showCategoryModal = function(id = null, type = 'blog') {
    const isEdit = !!id;
    const typeLabel = { blog: 'Blog', video: 'Video', forum: 'Forum' }[type] || 'Blog';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <div class="modal-header">
          <h3><i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'}"></i> ${isEdit ? 'Edit' : 'New'} ${typeLabel} Category</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="catForm" data-type="${type}" ${isEdit ? `data-id="${id}"` : ''}>
            <div class="form-group">
              <label for="catName">Name</label>
              <input type="text" class="form-input" id="catName" placeholder="Category name" required>
            </div>
            <div class="form-group">
              <label for="catDesc">Description</label>
              <textarea class="form-textarea" id="catDesc" placeholder="Brief description" style="min-height:80px;"></textarea>
            </div>
            <div class="form-group">
              <label for="catOrder">Order</label>
              <input type="number" class="form-input" id="catOrder" value="0" min="0">
            </div>
            <div class="form-group" id="forumCategoryImageField" style="${type === 'forum' ? '' : 'display:none;'}">
              <label for="catImageUrl">Forum Category Image URL</label>
              <input type="url" class="form-input" id="catImageUrl" placeholder="https://example.com/category-image.jpg">
            </div>
            <button type="submit" class="btn btn-primary" id="saveCatBtn"><i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Create'} Category</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const colMap = { blog: dbx.blogCategories, video: dbx.videoCategories, forum: dbx.forumCategories };
    const col = colMap[type] || dbx.blogCategories;

    if (isEdit) {
      col.doc(id).get().then(doc => {
        if (!doc.exists) { overlay.remove(); return; }
        const c = doc.data();
        $('catName').value = c.name || '';
        $('catDesc').value = c.description || '';
        $('catOrder').value = c.order || 0;
        const imageField = $('catImageUrl');
        if (imageField) imageField.value = c.imageUrl || '';
      });
    }

    $('catForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('catName').value.trim();
      if (!name) { toast('Name is required', 'error'); return; }
      const ctype = overlay.querySelector('#catForm').dataset.type;
      const ccol = colMap[ctype] || dbx.blogCategories;
      const data = { name, description: $('catDesc').value.trim(), order: parseInt($('catOrder').value) || 0, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (ctype === 'forum') {
        data.imageUrl = $('catImageUrl').value.trim();
      }

      const btn = $('saveCatBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      if (isEdit) {
        ccol.doc(id).update(data)
          .then(() => { toast('Category updated!', 'success'); overlay.remove(); refreshAllCategories(); loadAdminBlogCategories(); loadAdminVideoCategories(); loadAdminForumCategories(); })
          .catch(e => { toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Update Category'; });
      } else {
        ccol.add({ ...data, count: 0, postCount: 0, threadCount: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
          .then(() => { toast('Category created!', 'success'); overlay.remove(); refreshAllCategories(); loadAdminBlogCategories(); loadAdminVideoCategories(); loadAdminForumCategories(); })
          .catch(e => { toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Create Category'; });
      }
    });
  };

  window.deleteCategory = function(id, type) {
    if (!confirm(`Delete this ${type} category?`)) return;
    const colMap = { blog: dbx.blogCategories, video: dbx.videoCategories, forum: dbx.forumCategories };
    const col = colMap[type] || dbx.blogCategories;
    col.doc(id).delete()
      .then(() => { toast('Category deleted', 'success'); refreshAllCategories(); loadAdminBlogCategories(); loadAdminVideoCategories(); loadAdminForumCategories(); })
      .catch(e => toast('Failed: ' + e.message, 'error'));
  };

  function attachCategoryHandlers() { loadAdminBlogCategories(); loadAdminVideoCategories(); loadAdminForumCategories(); }

  // Open a modal for managing threads within a specific forum category (admin-only)
  window.manageCategoryThreads = function(catId, catName) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'manageThreadsModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:900px;">
        <div class="modal-header">
          <h3><i class="fas fa-folder-open"></i> Manage Threads — ${esc(catName || '')}</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn btn-sm btn-primary" id="adminNewThreadBtn"><i class="fas fa-plus"></i> New Thread</button>
            <button class="modal-close btn btn-sm btn-outline" onclick="document.getElementById('manageThreadsModal')?.remove()">Close</button>
          </div>
        </div>
        <div class="modal-body">
          <div class="admin-table-wrap">
            <table class="admin-table" id="manageThreadsTable">
              <thead><tr><th>Title</th><th>Replies</th><th>Author</th><th>Last Activity</th><th>Actions</th></tr></thead>
              <tbody id="manageThreadsBody"><tr><td colspan="5" class="table-empty"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // wire new thread button to existing modal
    const newBtn = document.getElementById('adminNewThreadBtn');
    if (newBtn) newBtn.addEventListener('click', () => showNewThreadModal(catId));

    // load threads for this category
    function refresh() {
      dbx.forumThreads.where('categoryId', '==', catId).orderBy('lastActivityAt', 'desc').get()
        .then(snap => {
          const body = $('manageThreadsBody');
          if (!body) return;
          if (snap.empty) { body.innerHTML = '<tr><td colspan="5" class="table-empty">No threads in this category</td></tr>'; return; }
          let html = '';
          snap.forEach(doc => {
            const t = doc.data();
            html += `<tr>
              <td><strong>${esc(t.title)}</strong> ${t.isPinned ? '<span style="color:var(--accent-orange);font-size:0.75rem;">PINNED</span>' : ''} ${t.isLocked ? '<span style="color:var(--accent-red);font-size:0.75rem;">LOCKED</span>' : ''}</td>
              <td>${t.replies || 0}</td>
              <td style="font-family:var(--font-mono);font-size:0.8rem;">${esc(t.author || 'anonymous')}</td>
              <td style="font-family:var(--font-mono);font-size:0.8rem;">${formatDateFull(t.lastActivityAt)}</td>
              <td class="actions">
                <a class="btn btn-sm btn-secondary" href="#/forum/${catId}/${doc.id}" target="_blank" title="View"><i class="fas fa-eye"></i></a>
                <button class="btn btn-sm ${t.isPinned ? 'btn-outline' : 'btn-secondary'}" onclick="togglePin('${doc.id}', ${!t.isPinned})" title="${t.isPinned ? 'Unpin' : 'Pin'}"><i class="fas fa-thumbtack"></i></button>
                <button class="btn btn-sm ${t.isLocked ? 'btn-outline' : 'btn-secondary'}" onclick="toggleLock('${doc.id}', ${!t.isLocked})" title="${t.isLocked ? 'Unlock' : 'Lock'}"><i class="fas ${t.isLocked ? 'fa-unlock' : 'fa-lock'}"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteThread('${doc.id}')" title="Delete"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`;
          });
          body.innerHTML = html;
        }).catch(e => {
          const body = $('manageThreadsBody'); if (body) body.innerHTML = '<tr><td colspan="5" class="table-empty"><i class="fas fa-exclamation-triangle"></i> Failed to load threads</td></tr>';
          toast('Failed to load threads: ' + (e.message || e), 'error');
        });
    }

    refresh();
  }

  // === ADMIN FORUM ===
  function adminForum() {
    let html = `
      <div class="admin-header">
        <h2><i class="fas fa-comments"></i> Forum Management</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-primary btn-sm" onclick="showCategoryModal(null, 'forum')"><i class="fas fa-plus"></i> New Category</button>
          <button class="btn btn-secondary btn-sm" onclick="refreshAllCategories()"><i class="fas fa-sync"></i> Refresh Categories</button>
        </div>
      </div>

      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
        <div style="flex:1;min-width:320px;">
          <h3 style="font-family:var(--font-mono);font-size:1rem;margin-bottom:12px;"><i class="fas fa-tags"></i> Forum Categories</h3>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Name</th><th>Threads</th><th>Actions</th></tr></thead>
              <tbody id="adminForumCatBody"><tr><td colspan="3" class="table-empty"><i class="fas fa-spinner fa-spin"></i></td></tr></tbody>
            </table>
          </div>
        </div>

        <div style="flex:2;min-width:420px;">
          <h3 style="font-family:var(--font-mono);font-size:1rem;margin-bottom:12px;"><i class="fas fa-list"></i> Recent Threads</h3>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Title</th><th>Category</th><th>Replies</th><th>Author</th><th>Actions</th></tr></thead>
              <tbody id="adminForumBody"><tr><td colspan="5" class="table-empty"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // load both categories and threads
    setTimeout(() => { loadAdminForumCategories(); loadAdminForum(); }, 200);
    return html;
  }

  function loadAdminForum() {
    dbx.forumThreads.orderBy('lastActivityAt', 'desc').limit(20).get()
      .then(snap => {
        const body = $('adminForumBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="5" class="table-empty">No threads</td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const t = doc.data();
          html += `<tr>
            <td><strong>${esc(t.title)}</strong> ${t.isPinned ? '<span style="color:var(--accent-orange);font-size:0.75rem;">PINNED</span>' : ''} ${t.isLocked ? '<span style="color:var(--accent-red);font-size:0.75rem;">LOCKED</span>' : ''}</td>
            <td>${esc(t.categoryId || 'N/A')}</td>
            <td>${t.replies || 0}</td>
            <td style="font-family:var(--font-mono);font-size:0.8rem;">${esc(t.author || 'anonymous')}</td>
            <td class="actions">
              <button class="btn btn-sm ${t.isPinned ? 'btn-outline' : 'btn-secondary'}" onclick="togglePin('${doc.id}', ${!t.isPinned})" title="${t.isPinned ? 'Unpin' : 'Pin'}"><i class="fas fa-thumbtack"></i></button>
              <button class="btn btn-sm ${t.isLocked ? 'btn-outline' : 'btn-secondary'}" onclick="toggleLock('${doc.id}', ${!t.isLocked})" title="${t.isLocked ? 'Unlock' : 'Lock'}"><i class="fas ${t.isLocked ? 'fa-unlock' : 'fa-lock'}"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteThread('${doc.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        });
        body.innerHTML = html;
      }).catch(e => console.error('adminForum:', e));
  }

  window.togglePin = function(id, pin) {
    dbx.forumThreads.doc(id).update({ isPinned: pin })
      .then(() => { toast(pin ? 'Pinned!' : 'Unpinned', 'success'); loadAdminForum(); });
  };
  window.toggleLock = function(id, lock) {
    dbx.forumThreads.doc(id).update({ isLocked: lock })
      .then(() => { toast(lock ? 'Locked!' : 'Unlocked', 'success'); loadAdminForum(); });
  };
  window.deleteThread = function(id) {
    if (!confirm('Delete this thread permanently?')) return;
    dbx.forumThreads.doc(id).get().then(doc => {
      const catId = doc.data().categoryId;
      dbx.forumThreads.doc(id).delete().then(() => {
        if (catId) dbx.forumCategories.doc(catId).update({ threadCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
        toast('Thread deleted', 'success');
        loadAdminForum();
      });
    });
  };

  function attachForumAdminHandlers() {
    // Load threads and ensure category list is available
    loadAdminForumCategories();
    loadAdminForum();

    // Create search inputs above the categories and threads tables if missing
    const catContainer = document.querySelector('#adminForumCatBody')?.closest('.admin-table-wrap');
    if (catContainer && !document.getElementById('adminCatSearch')) {
      const wrapper = document.createElement('div');
      wrapper.style = 'margin-bottom:8px;';
      wrapper.innerHTML = `<input type="search" id="adminCatSearch" class="form-input" placeholder="Search categories..." style="width:100%;max-width:380px;">`;
      catContainer.parentNode.insertBefore(wrapper, catContainer);
    }

    const threadContainer = document.querySelector('#adminForumBody')?.closest('.admin-table-wrap');
    if (threadContainer && !document.getElementById('adminThreadSearch')) {
      const wrapper = document.createElement('div');
      wrapper.style = 'margin-bottom:8px;';
      wrapper.innerHTML = `<input type="search" id="adminThreadSearch" class="form-input" placeholder="Search threads..." style="width:100%;max-width:480px;">`;
      threadContainer.parentNode.insertBefore(wrapper, threadContainer);
    }

    // Attach search handlers (debounced)
    function debounce(fn, wait = 200){ let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); }; }

    const catSearchEl = $('adminCatSearch');
    if (catSearchEl) {
      catSearchEl.addEventListener('input', debounce(() => {
        const q = (catSearchEl.value || '').trim().toLowerCase();
        document.querySelectorAll('#adminForumCatBody tr').forEach(row => {
          const text = (row.textContent || '').toLowerCase();
          row.style.display = q ? (text.includes(q) ? '' : 'none') : '';
        });
      }));
    }

    const threadSearchEl = $('adminThreadSearch');
    if (threadSearchEl) {
      threadSearchEl.addEventListener('input', debounce(() => {
        const q = (threadSearchEl.value || '').trim().toLowerCase();
        document.querySelectorAll('#adminForumBody tr').forEach(row => {
          const text = (row.textContent || '').toLowerCase();
          row.style.display = q ? (text.includes(q) ? '' : 'none') : '';
        });
      }));
    }
  }

  // === PROFILE & DASHBOARD ===
  function renderProfile(main) {
    if (!currentUser) { router.navigate('/login'); return; }
    main.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading profile...</p></div>';

    Promise.all([
      db.collection('profiles').doc(currentUser.uid).get(),
      dbx.forumThreads.where('authorId', '==', currentUser.uid).get().catch(() => ({ size: 0 })),
      dbx.forumReplies.where('authorId', '==', currentUser.uid).get().catch(() => ({ size: 0 }))
    ]).then(([profileDoc, threadsSnap, repliesSnap]) => {
      const p = profileDoc.exists ? profileDoc.data() : {};
      const threadCount = threadsSnap.size || 0;
      const replyCount = repliesSnap.size || 0;
      const initial = getUserInitial(p, currentUser);
      const normalizedLinks = normalizeProfileLinks(p.links);
      const linksHtml = Object.keys(normalizedLinks).length ? `
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          ${normalizedLinks.github ? `<a href="${esc(normalizedLinks.github)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-github"></i></a>` : ''}
          ${normalizedLinks.twitter ? `<a href="${esc(normalizedLinks.twitter)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-x-twitter"></i></a>` : ''}
          ${normalizedLinks.website ? `<a href="${esc(normalizedLinks.website)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fas fa-globe"></i></a>` : ''}
          ${normalizedLinks.youtube ? `<a href="${esc(normalizedLinks.youtube)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-youtube"></i></a>` : ''}
        </div>` : '';

      main.innerHTML = `
        <div class="page-header"><div class="header-icon"><i class="fas fa-user"></i></div><h1>My Profile</h1></div>
        <div class="profile-shell">

          <div class="profile-hero-card">
            <div class="profile-hero-bg"></div>
            ${renderAvatar(p, currentUser)}
            <h2 class="profile-name">${esc(getDisplayName(p, currentUser))}</h2>
            <p class="profile-email">${esc(p.email || '')}</p>
            <p class="profile-bio">${esc(p.bio || 'No bio yet.')}</p>
            ${p.role === 'admin' ? '<span class="admin-badge"><i class="fas fa-crown"></i> Administrator</span>' : ''}
            ${Object.keys(normalizedLinks).length ? `<div class="profile-links-wrap">${linksHtml}</div>` : ''}
          </div>

          <div class="admin-stats profile-stats">
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-comments"></i></div><div class="stat-number">${threadCount}</div><div class="stat-desc">Forum Threads</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-reply"></i></div><div class="stat-number">${replyCount}</div><div class="stat-desc">Replies</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-calendar"></i></div><div class="stat-number">${formatDate(p.createdAt)}</div><div class="stat-desc">Member Since</div></div>
          </div>

          ${currentUserRole === 'admin' ? `
          <div class="profile-section-card">
            <h3 class="profile-section-title"><i class="fas fa-crown" style="color:var(--accent-orange);"></i> Admin Panel</h3>
            <div class="admin-action-grid">
              <a class="btn btn-primary" href="#/admin/dashboard"><i class="fas fa-chart-simple"></i> Dashboard</a>
              <a class="btn btn-secondary" href="#/admin/blog"><i class="fas fa-feather-alt"></i> Blog Posts</a>
              <a class="btn btn-secondary" href="#/admin/videos"><i class="fas fa-video"></i> Videos</a>
              <a class="btn btn-secondary" href="#/admin/categories"><i class="fas fa-tags"></i> Categories</a>
              <a class="btn btn-secondary" href="#/admin/forum"><i class="fas fa-comments"></i> Forum</a>
            </div>
          </div>` : ''}

          <div class="profile-section-card">
            <h3 class="profile-section-title"><i class="fas fa-edit"></i> Edit Profile</h3>
            <form id="profileForm">
              <div class="profile-form-grid">
                <div class="form-group" style="grid-column:1/-1;">
                  <label for="pName">Display Name</label>
                  <input type="text" class="form-input" id="pName" value="${esc(p.displayName || '')}" placeholder="Your display name" required>
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                  <label for="pBio">Bio / Description</label>
                  <textarea class="form-textarea" id="pBio" placeholder="Tell us about yourself..." style="min-height:80px;">${esc(p.bio || '')}</textarea>
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                  <label for="pAvatar">Avatar URL</label>
                  <input type="url" class="form-input" id="pAvatar" value="${esc(p.avatar || '')}" placeholder="https://example.com/avatar.jpg">
                </div>
                <div class="form-group">
                  <label for="pGithub"><i class="fab fa-github"></i> GitHub</label>
                  <input type="url" class="form-input" id="pGithub" value="${esc(p.links?.github || '')}" placeholder="https://github.com/username">
                </div>
                <div class="form-group">
                  <label for="pTwitter"><i class="fab fa-x-twitter"></i> Twitter / X</label>
                  <input type="url" class="form-input" id="pTwitter" value="${esc(p.links?.twitter || '')}" placeholder="https://x.com/username">
                </div>
                <div class="form-group">
                  <label for="pYoutube"><i class="fab fa-youtube"></i> YouTube</label>
                  <input type="url" class="form-input" id="pYoutube" value="${esc(p.links?.youtube || '')}" placeholder="https://youtube.com/@channel">
                </div>
                <div class="form-group">
                  <label for="pWebsite"><i class="fas fa-globe"></i> Website</label>
                  <input type="url" class="form-input" id="pWebsite" value="${esc(p.links?.website || '')}" placeholder="https://yourwebsite.com">
                </div>
              </div>
              <button type="submit" class="btn btn-primary" id="saveProfileBtn" style="width:100%;justify-content:center;margin-top:8px;"><i class="fas fa-save"></i> Save Changes</button>
            </form>
          </div>

          <div class="profile-section-card">
            <h3 class="profile-section-title"><i class="fas fa-lock"></i> Security</h3>
            <div class="security-actions">
              <button type="button" class="btn btn-secondary" onclick="showChangePassword()"><i class="fas fa-key"></i> Change Password</button>
            </div>
          </div>

          ${currentUserRole !== 'admin' ? `
          <div class="profile-section-card danger-zone">
            <h3 class="profile-section-title"><i class="fas fa-triangle-exclamation"></i> Danger Zone</h3>
            <p class="danger-zone-text">Delete your own account permanently. Your profile will be removed and your forum posts will be anonymized to protect the rest of the discussion history.</p>
            <button type="button" class="btn btn-danger" onclick="showDeleteAccount()"><i class="fas fa-user-slash"></i> Delete My Account</button>
          </div>
          ` : ''}

        </div>`;

      $('profileForm').addEventListener('submit', e => {
        e.preventDefault();
        const btn = $('saveProfileBtn');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        const profileUpdate = {
          displayName: $('pName').value.trim(),
          bio: $('pBio').value.trim(),
          avatar: $('pAvatar').value.trim(),
          links: normalizeProfileLinks({
            github: $('pGithub').value.trim(),
            twitter: $('pTwitter').value.trim(),
            youtube: $('pYoutube').value.trim(),
            website: $('pWebsite').value.trim()
          })
        };

        if (!profileUpdate.displayName) {
          toast('Display name is required.', 'error');
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
          return;
        }

        db.collection('profiles').doc(currentUser.uid).set(profileUpdate, { merge: true }).then(() => {
          currentUserProfile = { ...(currentUserProfile || {}), ...profileUpdate };
          currentUserRole = resolveUserRole(currentUserProfile, currentUser);
          updateAuthNav();
          return syncPublicProfileSafely(currentUser.uid, currentUserProfile);
        }).then(() => {
          toast('Profile updated!', 'success');
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
          renderProfile(main);
        }).catch(e => {
          toast('Failed: ' + e.message, 'error');
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        });
      });
    }).catch(e => { main.innerHTML = '<div class="no-posts"><p>Failed to load profile.</p></div>'; console.error(e); });
  }

  function renderProfilePublic(main, uid) {
    main.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading profile...</p></div>';
    dbx.publicProfiles.doc(uid).get().then(doc => {
      if (!doc.exists) { main.innerHTML = '<div class="no-posts"><i class="fas fa-user"></i><p>User not found.</p></div>'; return; }
      const p = doc.data();
      const initial = getUserInitial(p);
      const normalizedLinks = normalizeProfileLinks(p.links);
      main.innerHTML = `
        <div class="profile-public-shell">
          <div class="profile-hero-card profile-public-card">
            <div class="profile-hero-bg"></div>
            ${renderAvatar(p)}
            <h2 class="profile-name">${esc(getDisplayName(p))}</h2>
            <p class="profile-bio">${esc(p.bio || '')}</p>
            ${p.role === 'admin' ? '<span class="admin-badge"><i class="fas fa-crown"></i> Administrator</span>' : ''}
            ${Object.keys(normalizedLinks).length ? `<div class="profile-links-wrap" style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
              ${normalizedLinks.github ? `<a href="${esc(normalizedLinks.github)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-github"></i></a>` : ''}
              ${normalizedLinks.twitter ? `<a href="${esc(normalizedLinks.twitter)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-x-twitter"></i></a>` : ''}
              ${normalizedLinks.website ? `<a href="${esc(normalizedLinks.website)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fas fa-globe"></i></a>` : ''}
              ${normalizedLinks.youtube ? `<a href="${esc(normalizedLinks.youtube)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-youtube"></i></a>` : ''}
            </div>` : ''}
          </div>
          <div style="text-align:center;margin-top:16px;">
            <a class="btn btn-sm btn-secondary" href="#/forum"><i class="fas fa-arrow-left"></i> Back to Forum</a>
          </div>
        </div>`;
    }).catch(() => { main.innerHTML = '<div class="no-posts"><p>User not found.</p></div>'; });
  }

  window.showChangePassword = function() {
    if (!currentUser) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:450px;">
        <div class="modal-header"><h3><i class="fas fa-key"></i> Change Password</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <div class="modal-body">
          <form id="pwForm">
            <div class="form-group"><label>Current Password</label><input type="password" class="form-input" id="oldPw" placeholder="Current password" required></div>
            <div class="form-group"><label>New Password</label><input type="password" class="form-input" id="newPw" placeholder="Min 6 characters" required minlength="6"></div>
            <div class="form-group"><label>Confirm New Password</label><input type="password" class="form-input" id="confirmPw" placeholder="Repeat new password" required></div>
            <button type="submit" class="btn btn-primary" id="pwBtn" style="width:100%;justify-content:center;"><i class="fas fa-save"></i> Update Password</button>
          </form>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    $('pwForm').addEventListener('submit', e => {
      e.preventDefault();
      const oldPw = $('oldPw').value, newPw = $('newPw').value, confirmPw = $('confirmPw').value;
      if (newPw !== confirmPw) { toast('Passwords do not match.', 'error'); return; }
      if (newPw.length < 6) { toast('Password too short.', 'error'); return; }
      const btn = $('pwBtn'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
      const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, oldPw);
      currentUser.reauthenticateWithCredential(cred).then(() => currentUser.updatePassword(newPw))
        .then(() => { toast('Password changed!', 'success'); overlay.remove(); })
        .catch(e => { toast(e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Update Password'; });
    });
  };

  async function anonymizeUserContent(uid) {
    const [threadSnap, replySnap] = await Promise.all([
      dbx.forumThreads.where('authorId', '==', uid).get().catch(() => null),
      dbx.forumReplies.where('authorId', '==', uid).get().catch(() => null)
    ]);

    const updates = [];

    if (threadSnap && !threadSnap.empty) {
      threadSnap.forEach(doc => {
        updates.push(doc.ref.update({
          author: 'Deleted User',
          authorId: '',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }));
      });
    }

    if (replySnap && !replySnap.empty) {
      replySnap.forEach(doc => {
        updates.push(doc.ref.update({
          author: 'Deleted User',
          authorId: '',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }));
      });
    }

    return Promise.all(updates);
  }

  window.showDeleteAccount = function() {
    if (!currentUser) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <div class="modal-header">
          <h3><i class="fas fa-user-slash"></i> Delete Account</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="danger-zone danger-zone-modal">
            <p class="danger-zone-text">This permanently deletes your login and profile. Your existing forum posts and replies will be anonymized instead of removed.</p>
          </div>
          <form id="deleteAccountForm">
            <div class="form-group">
              <label for="deleteConfirmText">Type DELETE to confirm</label>
              <input type="text" class="form-input" id="deleteConfirmText" placeholder="DELETE" required>
            </div>
            <div class="form-group">
              <label for="deletePassword">Current Password</label>
              <input type="password" class="form-input" id="deletePassword" placeholder="Current password" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-danger" id="deleteAccountBtn" style="width:100%;justify-content:center;">
              <i class="fas fa-trash"></i> Permanently Delete Account
            </button>
          </form>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    $('deleteAccountForm').addEventListener('submit', async e => {
      e.preventDefault();
      const confirmText = $('deleteConfirmText').value.trim();
      const password = $('deletePassword').value;
      const btn = $('deleteAccountBtn');

      if (confirmText !== 'DELETE') {
        toast('Type DELETE exactly to continue.', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

      try {
        const user = currentUser;
        const uid = user.uid;
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(cred);
        await anonymizeUserContent(uid);
        await Promise.allSettled([
          db.collection('profiles').doc(uid).delete(),
          dbx.publicProfiles.doc(uid).delete()
        ]);
        await user.delete();
        currentUserProfile = null;
        currentUserRole = null;
        toast('Your account has been deleted.', 'success');
        overlay.remove();
        router.navigate('/');
      } catch (err) {
        toast(err.message || 'Failed to delete account.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i> Permanently Delete Account';
      }
    });
  };

  // === LOGOUT ===
  window.logout = function() {
    auth.signOut().then(() => {
      currentUser = null;
      toast('Logged out', 'info');
      router.navigate('/');
    });
  };

  // === AUTH STATE ===
  function initAuth() {
    auth.onAuthStateChanged(user => {
      currentUser = user;
      currentUserProfile = null;
      currentUserClaims = {};

      if (user) {
        user.getIdTokenResult()
        .then(tokenResult => {
          currentUserClaims = tokenResult?.claims || {};
          return ensureUserProfile(user);
        })
        .then(profile => {
          currentUserProfile = profile;
          currentUserRole = resolveUserRole(profile, user);
          authResolved = true;
          updateAuthNav();
          if (currentRoute.startsWith('/admin') && currentUserRole !== 'admin') {
            router.navigate('/forum');
            return;
          }
          rerenderCurrentRoute();
        }).catch(e => {
          currentUserRole = 'user';
          currentUserProfile = { displayName: getFallbackDisplayName(user), email: user.email || '', role: 'user' };
          currentUserClaims = {};
          authResolved = true;
          updateAuthNav();
          rerenderCurrentRoute();
          showFirestoreBanner();
        });
      } else {
        currentUserRole = null;
        currentUserProfile = null;
        currentUserClaims = {};
        authResolved = true;
        updateAuthNav();
        rerenderCurrentRoute();
      }
    });
  }

  function refreshAllCategories() {
    dbx.blogCategories.get()
      .then(snap => { allBlogCategories = []; snap.forEach(d => allBlogCategories.push({ id: d.id, ...d.data() })); })
      .catch(e => console.error('cat blog:', e));
    dbx.videoCategories.get()
      .then(snap => { allVideoCategories = []; snap.forEach(d => allVideoCategories.push({ id: d.id, ...d.data() })); })
      .catch(e => console.error('cat video:', e));
    dbx.forumCategories.get()
      .then(snap => { allForumCategories = []; snap.forEach(d => allForumCategories.push({ id: d.id, ...d.data() })); })
      .catch(e => console.error('cat forum:', e));
  }

  // === LOAD INITIAL DATA ===
  function loadInitialData() {
    loadAdminConfig();
    refreshAllCategories();
  }

  function showFirestoreBanner() {
    const existing = $('fsBanner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'fsBanner';
    banner.style.cssText = 'background:var(--accent-red);color:#fff;text-align:center;padding:12px 24px;font-size:0.9rem;position:fixed;top:0;left:0;right:0;z-index:9999;';
    banner.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Firestore is BLOCKED by your browser. Disable ad blockers / tracking protection for this site, or use Chrome. <button onclick="this.parentElement.remove()" style="background:none;border:1px solid #fff;color:#fff;border-radius:4px;padding:4px 12px;margin-left:12px;cursor:pointer;">Dismiss</button>';
    document.body.prepend(banner);
  }

  function checkFirestoreConnection() {
    dbx.settings.get().then(() => {}).catch(e => {
      if (e.code === 'unavailable' || e.message?.includes('blocked') || e.code === 'permission-denied') {
        showFirestoreBanner();
      }
    });
  }

  // === INIT ===
  document.addEventListener('DOMContentLoaded', () => {
    $('footerYear').textContent = new Date().getFullYear();
    checkFirestoreConnection();

    const toggle = $('navToggle');
    const menu = $('navMenu');
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      menu.classList.toggle('open');
    });
    menu.addEventListener('click', e => {
      if (e.target.closest('.nav-link')) {
        toggle.classList.remove('active');
        menu.classList.remove('open');
      }
    });

    window.addEventListener('scroll', () => {
      $('navbar').classList.toggle('scrolled', window.scrollY > 50);
    });

    initAuth();
    loadInitialData();
    router.init();
  });

  // Expose markdown for admin preview
  window.renderMarkdown = renderMarkdown;

})();
