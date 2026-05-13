(function() {
  'use strict';

  // --- Global State ---
  window.currentUser = null;
  window.currentUserProfile = null;
  window.currentUserRole = null;
  window.currentUserClaims = {};
  window.currentRoute = '';
  window.authResolved = false;
  window.strictAdminMode = true;
  window.allBlogPosts = [];
  window.allVideos = [];
  window.allForumCategories = [];
  window.allBlogCategories = [];
  window.allVideoCategories = [];
  
  const ADMIN_EMAILS = ['official0warn@gmail.com'];
  window.adminEmailSet = new Set(ADMIN_EMAILS.map(email => email.trim().toLowerCase()));

  // --- Utilities ---
  window.$ = id => document.getElementById(id);
  window.q = sel => document.querySelector(sel);
  window.qq = sel => document.querySelectorAll(sel);
  window.esc = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
  window.PROFILE_LINK_KEYS = ['github', 'twitter', 'youtube', 'website'];

  window.toast = (msg, type = 'info') => {
    const c = window.$('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${window.esc(msg)}`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 3500);
  };

  // --- Router ---
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
      window.currentRoute = hash;
      const parts = hash.split('/').filter(Boolean);
      let matched = false;

      const routes = [
        { pattern: '/', handler: 'home' },
        { pattern: '/login', handler: 'login' },
        { pattern: '/forgot-password', handler: 'forgotPassword' },
        { pattern: '/register', handler: 'register' },
        { pattern: '/blog', handler: 'blog' },
        { pattern: '/blog/*', handler: 'blogPost' },
        { pattern: '/vlog', handler: 'vlog' }, // Renamed from /videos
        { pattern: '/forum', handler: 'forum' },
        { pattern: '/forum/search', handler: 'forumSearch' },
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
        if (route.pattern === '/vlog' && hash === '/vlog') { matched = true; this.render('vlog'); break; }
        if (route.pattern === '/forum' && hash === '/forum') { matched = true; this.render('forum'); break; }
        if (route.pattern === '/forum/search' && hash.startsWith('/forum/search')) {
          matched = true;
          const urlParams = new URLSearchParams(hash.split('?')[1] || '');
          this.render('forumSearch', urlParams.get('q') || '');
          break;
        }
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
        else window.router.navigate('/');
      }

      window.qq('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.nav && hash.startsWith(l.dataset.nav)));
    },
    render(view, ...params) {
      const main = window.$('mainContent');
      main.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading...</p></div>';
      setTimeout(() => {
      switch(view) {
        case 'home': window.renderHome(main); break;
        case 'login': window.renderLogin(main); break;
        case 'forgotPassword': window.renderForgotPassword(main); break;
        case 'register': window.renderRegister(main); break;
        case 'blog': window.renderBlog(main); break;
          case 'blogPost': window.renderBlogPost(main, params[0]); break;
          case 'vlog': window.renderVlog(main); break;
          case 'forum': window.renderForum(main); break;
          case 'forumSearch': window.renderForumSearch(main, params[0]); break;
          case 'forumCategory': window.renderForumCategory(main, params[0]); break;
          case 'forumThread': window.renderForumThread(main, params[0], params[1]); break;
          case 'profile': window.renderProfile(main); break;
          case 'profileView': window.renderProfilePublic(main, params[0]); break;
          case 'admin': window.renderAdmin(main); break;
          default: window.renderHome(main);
        }
        window.scrollTo(0, 0);
      }, 100);
    }
  };

  window.setActiveNav = function(path) {
    window.qq('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.nav && path.startsWith(l.dataset.nav)));
  }

  window.renderElement = function(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  window.getCategoryColor = function(cat) {
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

  window.formatDate = function(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  window.formatDateFull = function(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  window.timeAgo = function(ts) {
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
    return window.formatDate(d);
  }

  window.renderMarkdown = function(content) {
    if (!content) return '';
    try {
      return window.sanitizeHtml(marked.parse(content, { breaks: true, gfm: true }));
    } catch(e) {
      return window.esc(content);
    }
  }

  window.normalizeEmail = function(email) {
    return (email || '').trim().toLowerCase();
  }

  window.getFallbackDisplayName = function(userOrEmail) {
    const email = typeof userOrEmail === 'string' ? userOrEmail : userOrEmail?.email;
    const base = (email || '').split('@')[0].trim();
    return base || 'User';
  }

  window.getDisplayName = function(profile = window.currentUserProfile, user = window.currentUser) {
    return (profile?.displayName || '').trim() || window.getFallbackDisplayName(user);
  }

  window.getUserInitial = function(profile = window.currentUserProfile, user = window.currentUser) {
    return window.getDisplayName(profile, user).charAt(0).toUpperCase() || 'U';
  }

  window.getSafeImageUrl = function(url) {
    const value = (url || '').trim();
    if (!value) return '';
    return /^https?:\/\//i.test(value) ? value : '';
  }

  window.renderAvatar = function(profile = window.currentUserProfile, user = window.currentUser, className = 'profile-avatar') {
    const avatarUrl = window.getSafeImageUrl(profile?.avatar);
    const initial = window.esc(window.getUserInitial(profile, user));
    if (!avatarUrl) return `<div class="${className}">${initial}</div>`;
    return `<div class="${className} profile-avatar-image-wrap"><img src="${window.esc(avatarUrl)}" alt="${window.esc(window.getDisplayName(profile, user))}" class="profile-avatar-image"></div>`;
  }

  window.renderForumCategoryMedia = function(category, index) {
    const imageUrl = window.getSafeImageUrl(category?.imageUrl);
    if (imageUrl) {
      return `<div class="cat-icon cat-image"><img src="${window.esc(imageUrl)}" alt="${window.esc(category.name || 'Category')}" class="cat-image-img"></div>`;
    }
    const icons = ['fa-shield-halved', 'fa-bug', 'fa-network-wired', 'fa-microchip', 'fa-key', 'fa-user-secret', 'fa-lock', 'fa-code'];
    return `<div class="cat-icon"><i class="fas ${icons[index % icons.length]}"></i></div>`;
  }

  window.isBootstrapAdminEmail = function(email) {
    return window.adminEmailSet.has(window.normalizeEmail(email));
  }

  window.resolveUserRole = function(profile = window.currentUserProfile, user = window.currentUser) {
    const email = window.normalizeEmail(user?.email || profile?.email);
    const trustedByEmail = window.isBootstrapAdminEmail(email);
    const trustedByClaim = window.currentUserClaims?.admin === true;
    const trustedByConfig = window.adminEmailSet.has(email);

    if (trustedByClaim || trustedByEmail || trustedByConfig) return 'admin';
    if (!window.strictAdminMode && profile?.role === 'admin') return 'admin';
    return 'user';
  }

  window.loadAdminConfig = function() {
    return dbx.settings.doc('admin_config').get().then(doc => {
      if (!doc.exists) return;
      const data = doc.data() || {};
      const emails = Array.isArray(data.emails) ? data.emails : [];
      if (typeof data.strictAdminMode === 'boolean') window.strictAdminMode = data.strictAdminMode;
      emails.map(window.normalizeEmail).filter(Boolean).forEach(email => window.adminEmailSet.add(email));
    }).catch(err => {
      console.error('adminConfig:', err);
    });
  }

  window.normalizeProfileLinks = function(links = {}) {
    const normalized = {};
    window.PROFILE_LINK_KEYS.forEach(key => {
      const value = (links?.[key] || '').trim();
      if (value) normalized[key] = value;
    });
    return normalized;
  }

  window.buildPublicProfileData = function(profile = {}) {
    return {
      displayName: (profile.displayName || '').trim() || 'User',
      bio: (profile.bio || '').trim(),
      avatar: (profile.avatar || '').trim(),
      links: window.normalizeProfileLinks(profile.links),
      role: profile.role === 'admin' ? 'admin' : 'user',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  window.syncPublicProfile = function(uid, profile) {
    if (!uid) return Promise.resolve();
    return dbx.publicProfiles.doc(uid).set(window.buildPublicProfileData(profile), { merge: true });
  }

  window.syncPublicProfileSafely = function(uid, profile) {
    return window.syncPublicProfile(uid, profile).catch(err => {
      console.error('publicProfileSync:', err);
      return null;
    });
  }

  window.sanitizeHtml = function(html) {
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

  window.rerenderCurrentRoute = function() {
    if (!window.router) return;
    window.router.handleRoute();
  }

  window.updateAuthNav = function() {
    const loginLink = window.$('loginLink');
    const adminLink = window.$('adminLink');
    const registerLink = window.$('registerLink');
    const logoutLink = window.$('logoutLink');

    if (window.currentUser) {
      if (loginLink) {
        loginLink.innerHTML = '<i class="fas fa-user"></i> ' + window.esc(window.getDisplayName());
        loginLink.href = '#/profile';
      }
      if (registerLink) registerLink.style.display = 'none';
      if (logoutLink) logoutLink.style.display = 'flex';
      if (adminLink) adminLink.style.display = window.currentUserRole === 'admin' ? 'flex' : 'none';
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

  window.ensureUserProfile = function(user) {
    if (!user?.uid) return Promise.resolve(null);

    return db.collection('profiles').doc(user.uid).get().then(doc => {
      const existing = doc.exists ? doc.data() : {};
      const resolvedRole = window.resolveUserRole(existing, user);
      const profile = {
        ...existing,
        displayName: (existing.displayName || '').trim() || window.getFallbackDisplayName(user),
        email: user.email || existing.email || '',
        role: resolvedRole,
        bio: existing.bio || '',
        avatar: existing.avatar || '',
        links: window.normalizeProfileLinks(existing.links),
        createdAt: existing.createdAt || firebase.firestore.FieldValue.serverTimestamp()
      };

      const shouldPersist = !doc.exists
        || existing.displayName !== profile.displayName
        || existing.email !== profile.email
        || existing.role !== profile.role
        || JSON.stringify(window.normalizeProfileLinks(existing.links)) !== JSON.stringify(profile.links)
        || !existing.createdAt;

      const privateWrite = shouldPersist
        ? db.collection('profiles').doc(user.uid).set(profile, { merge: true })
        : Promise.resolve();

      return privateWrite
        .then(() => window.syncPublicProfileSafely(user.uid, profile))
        .then(() => profile);
    });
  }

  window.highlightCode = function() {
    document.querySelectorAll('.post-content pre code, .reply-content pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }

  window.getEmbedUrl = function(url) {
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

  window.getPlatformIcon = function(url) {
    if (!url) return 'fa-video';
    if (url.includes('youtube') || url.includes('youtu.be')) return 'fab fa-youtube';
    if (url.includes('odysee')) return 'fas fa-globe';
    return 'fa-video';
  }

  window.getPlatformColor = function(url) {
    if (url.includes('youtube')) return '#ff0000';
    if (url.includes('odysee')) return '#cc0066';
    return 'var(--accent-cyan)';
  }

  window.renderSkeleton = function(count) {
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

  // --- Home ---
  window.renderHome = function(main) {
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
        <div class="blog-grid" id="homePosts">${window.renderSkeleton(3)}</div>
      </section>

      <section>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <h2 style="font-family:var(--font-mono);font-size:1.3rem;"><i class="fas fa-video"></i> Latest Vlog Entries</h2>
          <a class="btn btn-sm btn-outline" href="#/vlog">View All <i class="fas fa-arrow-right"></i></a>
        </div>
        <div class="video-grid" id="homeVideos">${window.renderSkeleton(2)}</div>
      </section>
    `;
    main.innerHTML = html;

    const typingText = window.$('typingText');
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

    window.loadHomePosts();
    window.loadHomeVideos();
  }

  window.loadHomePosts = function() {
    dbx.blog.where('published', '==', true).get().then(snap => {
        const container = window.$('homePosts');
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
            <div class="blog-card" onclick="window.router.navigate('/blog/${id}')">
              <div class="card-category" style="color:${window.getCategoryColor(p.category)};border:1px solid ${window.getCategoryColor(p.category)}">${window.esc(p.category || 'General')}</div>
              <h3>${window.esc(p.title)}</h3>
              <p>${window.esc(p.excerpt || p.content?.slice(0, 150) || '')}</p>
              <div class="card-meta">
                <span>${window.formatDate(p.createdAt)}</span>
                <span><i class="fas fa-user"></i> ${window.esc(p.author || 'anonymous')}</span>
              </div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(e => { console.error('homePosts:', e); });
  }

  window.loadHomeVideos = function() {
    dbx.videos.orderBy('createdAt', 'desc').limit(2).get()
      .then(snap => {
        const container = window.$('homeVideos');
        if (!container) return;
        if (snap.empty) {
          container.innerHTML = '<div class="no-posts"><i class="fas fa-video"></i><p>No videos yet.</p></div>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const v = doc.data();
          const embed = window.getEmbedUrl(v.url);
          html += `
            <div class="video-card">
              <div class="video-wrapper">
                <iframe src="${window.esc(embed)}" allowfullscreen loading="lazy"></iframe>
              </div>
              <div class="video-info">
                <h3>${window.esc(v.title)}</h3>
                <p>${window.esc(v.description || '')}</p>
                <div class="video-meta">
                  <span><i class="${window.getPlatformIcon(v.url)}" style="color:${window.getPlatformColor(v.url)}"></i> ${window.esc(v.category || 'General')}</span>
                  <span>${window.formatDate(v.createdAt)}</span>
                </div>
              </div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(() => {});
  }

  // --- Auth & Profile ---
  window.renderLogin = function(main) {
    if (window.currentUser) {
      window.router.navigate('/profile');
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
            <label for="loginEmail"><i class="fas fa-envelope"></i> Email or Username</label>
            <input type="text" id="loginEmail" class="form-input" placeholder="you@example.com or username" required autocomplete="username">
          </div>
          <div class="form-group">
            <label for="loginPassword"><i class="fas fa-lock"></i> Password</label>
            <input type="password" id="loginPassword" class="form-input" placeholder="Enter password" required autocomplete="current-password">
          </div>
          <div style="text-align:right; margin-top:-10px; margin-bottom:20px;">
            <a href="#/forgot-password" style="font-size:0.85rem; color:var(--text-muted);">Forgot password?</a>
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

    window.$('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const loginInput = window.$('loginEmail').value.trim();
      const password = window.$('loginPassword').value;
      const btn = window.$('loginBtn');
      const err = window.$('authError');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
      err.style.display = 'none';

      // Resolve email if username was provided
      let resolveEmail = Promise.resolve(loginInput);
      if (!loginInput.includes('@')) {
        resolveEmail = db.collection('usernames').doc(loginInput.toLowerCase()).get().then(doc => {
          if (doc.exists) return doc.data().email;
          throw new Error('Username not found. Please use your email.');
        });
      }

      resolveEmail.then(email => {
        return auth.signInWithEmailAndPassword(email, password);
      })
      .then(cred => {
          if (!cred.user.emailVerified) {
            const user = cred.user;
            auth.signOut();
            err.style.display = 'block';
            err.innerHTML = `Please verify your email address. <a href="#" id="resendEmail" style="color:var(--accent-cyan); text-decoration:underline;">Resend verification email?</a>`;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-shield-halved"></i> Sign In';
            
            window.$('resendEmail').addEventListener('click', e => {
              e.preventDefault();
              user.sendEmailVerification().then(() => {
                window.toast('Verification email resent!', 'success');
              }).catch(err => {
                window.toast('Failed to resend: ' + err.message, 'error');
              });
            });
            return;
          }
          window.toast('Welcome back!', 'success'); 
          window.router.navigate('/forum'); 
        })
        .catch(e => {
          err.style.display = 'block';
          err.textContent = e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
            ? 'Invalid email or password.' : e.message;
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-shield-halved"></i> Sign In';
        });
    });
  }

  window.renderForgotPassword = function(main) {
    main.innerHTML = `
      <div class="auth-container">
        <div class="auth-header">
          <div class="auth-icon"><i class="fas fa-key"></i></div>
          <h2>Reset Password</h2>
          <p>Enter your email to receive a reset link</p>
        </div>
        <div class="auth-error" id="resetError"></div>
        <form id="resetForm">
          <div class="form-group">
            <label for="resetEmail"><i class="fas fa-envelope"></i> Email Address</label>
            <input type="email" id="resetEmail" class="form-input" placeholder="you@example.com" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;" id="resetBtn">
            <i class="fas fa-paper-plane"></i> Send Reset Link
          </button>
        </form>
        <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color);">
          <a href="#/login" style="color:var(--accent-cyan); font-size:0.9rem;"><i class="fas fa-arrow-left"></i> Back to Login</a>
        </div>
      </div>
    `;

    window.$('resetForm').addEventListener('submit', e => {
      e.preventDefault();
      const email = window.$('resetEmail').value.trim();
      const btn = window.$('resetBtn');
      const err = window.$('resetError');
      err.style.display = 'none';

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      auth.sendPasswordResetEmail(email)
        .then(() => {
          window.toast('Password reset email sent!', 'success');
          window.router.navigate('/login');
        })
        .catch(e => {
          err.style.display = 'block';
          err.textContent = e.message;
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
        });
    });
  }

  window.renderRegister = function(main) {
    if (window.currentUser) {
      window.router.navigate('/profile');
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

    window.$('registerForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = window.$('regName').value.trim();
      const email = window.$('regEmail').value.trim();
      const password = window.$('regPassword').value;
      const confirm = window.$('regConfirm').value;
      const btn = window.$('regBtn');
      const err = window.$('regError');
      err.style.display = 'none';

      if (!name) { err.textContent = 'Display name is required.'; err.style.display = 'block'; return; }
      if (password !== confirm) { err.textContent = 'Passwords do not match.'; err.style.display = 'block'; return; }
      if (password.length < 6) { err.textContent = 'Password must be at least 6 characters.'; err.style.display = 'block'; return; }

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

      auth.createUserWithEmailAndPassword(email, password)
        .then(cred => {
          const user = cred.user;
          const profile = {
            displayName: name,
            email: email,
            role: window.isBootstrapAdminEmail(email) ? 'admin' : 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };

          // 1. Always try to send verification first so we don't lose it
          const sendEmail = user.sendEmailVerification().catch(e => {
            console.error('Verification email failed:', e);
            throw new Error('Failed to send verification email. Please check your Firebase settings.');
          });

          // 2. Set up database records in parallel
          const setupDb = db.collection('profiles').doc(user.uid).set(profile)
            .then(() => window.syncPublicProfileSafely(user.uid, profile))
            .then(() => db.collection('usernames').doc(name.toLowerCase().trim()).set({ email, uid: user.uid }))
            .catch(e => {
              console.error('Database setup warning:', e);
              // We don't throw here so the user can still verify their email
            });

          return Promise.all([sendEmail, setupDb]).then(() => auth.signOut());
        })
        .then(() => {
          window.toast('Account created! A verification link has been sent to your email. Please check your inbox (and spam folder).', 'success');
          window.router.navigate('/login');
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

  window.logout = function() {
    auth.signOut().then(() => {
      window.currentUser = null;
      window.toast('Logged out', 'info');
      window.router.navigate('/');
    });
  };

  // --- Initialization Logic ---
  window.initAuth = function() {
    auth.onAuthStateChanged(user => {
      window.currentUser = user;
      window.currentUserProfile = null;
      window.currentUserClaims = {};

      if (user) {
        if (!user.emailVerified) {
          auth.signOut();
          window.authResolved = true;
          window.updateAuthNav();
          window.rerenderCurrentRoute();
          return;
        }
        user.getIdTokenResult()
        .then(tokenResult => {
          window.currentUserClaims = tokenResult?.claims || {};
          return window.ensureUserProfile(user);
        })
        .then(profile => {
          window.currentUserProfile = profile;
          window.currentUserRole = window.resolveUserRole(profile, user);
          window.authResolved = true;
          window.updateAuthNav();
          if (window.currentRoute.startsWith('/admin') && window.currentUserRole !== 'admin') {
            window.router.navigate('/forum');
            return;
          }
          window.rerenderCurrentRoute();
        }).catch(e => {
          window.currentUserRole = 'user';
          window.currentUserProfile = { displayName: window.getFallbackDisplayName(user), email: user.email || '', role: 'user' };
          window.currentUserClaims = {};
          window.authResolved = true;
          window.updateAuthNav();
          window.rerenderCurrentRoute();
          window.showFirestoreBanner();
        });
      } else {
        window.currentUserRole = null;
        window.currentUserProfile = null;
        window.currentUserClaims = {};
        window.authResolved = true;
        window.updateAuthNav();
        window.rerenderCurrentRoute();
      }
    });
  }

  window.refreshAllCategories = function() {
    dbx.blogCategories.get()
      .then(snap => { window.allBlogCategories = []; snap.forEach(d => window.allBlogCategories.push({ id: d.id, ...d.data() })); })
      .catch(e => console.error('cat blog:', e));
    dbx.videoCategories.get()
      .then(snap => { window.allVideoCategories = []; snap.forEach(d => window.allVideoCategories.push({ id: d.id, ...d.data() })); })
      .catch(e => console.error('cat video:', e));
    dbx.forumCategories.get()
      .then(snap => { window.allForumCategories = []; snap.forEach(d => window.allForumCategories.push({ id: d.id, ...d.data() })); })
      .catch(e => console.error('cat forum:', e));
  }

  window.loadInitialData = function() {
    window.loadAdminConfig();
    window.refreshAllCategories();
  }

  window.showFirestoreBanner = function() {
    const existing = window.$('fsBanner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'fsBanner';
    banner.style.cssText = 'background:var(--accent-red);color:#fff;text-align:center;padding:12px 24px;font-size:0.9rem;position:fixed;top:0;left:0;right:0;z-index:9999;';
    banner.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Firestore is BLOCKED by your browser. Please disable ad blockers or tracking protection for this site to ensure full functionality. <button onclick="this.parentElement.remove()" style="background:none;border:1px solid #fff;color:#fff;border-radius:4px;padding:4px 12px;margin-left:12px;cursor:pointer;">Dismiss</button>';
    document.body.prepend(banner);
  }

  window.checkFirestoreConnection = function() {
    dbx.blogCategories.limit(1).get().then(() => {}).catch(e => {
      if (e.code === 'unavailable' || e.message?.includes('blocked')) {
        window.showFirestoreBanner();
      }
    });
  }

  // --- Main Init ---
  document.addEventListener('DOMContentLoaded', () => {
    window.$('footerYear').textContent = new Date().getFullYear();
    window.checkFirestoreConnection();

    const toggle = window.$('navToggle');
    const menu = window.$('navMenu');
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
      window.$('navbar').classList.toggle('scrolled', window.scrollY > 50);
    });

    window.initAuth();
    window.loadInitialData();
    window.router.init();
  });

})();
