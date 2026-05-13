(function() {
  'use strict';

  window.renderForum = function(main) {
    main.innerHTML = `
      <div class="page-header">
        <div class="header-icon"><i class="fas fa-comments"></i></div>
        <h1>Security Forum</h1>
        <p>Professional cybersecurity discussions & community</p>
      </div>

      <div class="forum-search-container" style="margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">
        <div style="position:relative;">
          <input type="text" id="forumSearchInput" class="form-input" placeholder="Search threads, topics, or authors..." style="padding-left:44px; border-radius:30px;">
          <i class="fas fa-search" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
          <button id="forumSearchBtn" class="btn btn-sm btn-primary" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); border-radius:24px; padding:6px 16px;">Search</button>
        </div>
      </div>

      <div class="forum-stats" id="forumStats">
        <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Categories</div></div>
        <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Threads</div></div>
        <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Replies</div></div>
        <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Members</div></div>
      </div>
      <div class="forum-categories" id="forumCatList">
        ${window.renderSkeleton(4)}
      </div>
    `;

    const searchInput = window.$('forumSearchInput');
    const searchBtn = window.$('forumSearchBtn');

    const doSearch = () => {
      const q = searchInput.value.trim();
      if (q) window.router.navigate('/forum/search?q=' + encodeURIComponent(q));
    };

    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchInput) searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });

    window.loadForumStats();
    window.loadForumCategories();
  }

  window.renderForumSearch = function(main, query = '') {
    const q = (query || '').trim().toLowerCase();
    main.innerHTML = `
      <div style="margin-bottom:24px;">
        <a class="btn btn-sm btn-secondary" href="#/forum"><i class="fas fa-arrow-left"></i> Back to Forum</a>
      </div>
      <div class="page-header" style="padding:20px 0; text-align: left;">
        <h2 style="font-family:var(--font-mono);font-size:1.5rem;"><i class="fas fa-search"></i> Search Results</h2>
        <p>Showing threads matching: <span style="color:var(--accent-cyan); font-weight:bold;">"${window.esc(q)}"</span></p>
      </div>
      <div class="thread-list" id="searchResults">${window.renderSkeleton(5)}</div>
    `;

    if (!q) {
      window.$('searchResults').innerHTML = '<div class="no-posts"><i class="fas fa-search"></i><p>Please enter a search term.</p></div>';
      return;
    }

    // Client-side search for simplicity as Firestore doesn't support full-text natively
    Promise.all([
      dbx.forumThreads.get(),
      dbx.forumReplies.get()
    ]).then(([threadsSnap, repliesSnap]) => {
      const container = window.$('searchResults');
      if (!container) return;
      
      const matchedThreadIds = new Set();
      const results = [];

      // Check threads (titles, content, author)
      threadsSnap.forEach(doc => {
        const t = doc.data();
        if (t.title.toLowerCase().includes(q) || (t.author && t.author.toLowerCase().includes(q)) || (t.content && t.content.toLowerCase().includes(q))) {
          matchedThreadIds.add(doc.id);
          results.push({ id: doc.id, data: t, matchType: 'thread' });
        }
      });

      // Check replies
      repliesSnap.forEach(doc => {
        const r = doc.data();
        if (!matchedThreadIds.has(r.threadId) && (r.content && r.content.toLowerCase().includes(q))) {
          matchedThreadIds.add(r.threadId);
          // Need to find the thread data for this reply
          const threadDoc = threadsSnap.docs.find(d => d.id === r.threadId);
          if (threadDoc) {
            results.push({ id: threadDoc.id, data: threadDoc.data(), matchType: 'reply' });
          }
        }
      });

      results.sort((a, b) => (b.data.lastActivityAt?.seconds || 0) - (a.data.lastActivityAt?.seconds || 0));

      if (!results.length) {
        container.innerHTML = `<div class="no-posts"><i class="fas fa-search-minus"></i><p>No results found for "${window.esc(q)}".</p></div>`;
        return;
      }

      let html = '';
      results.forEach(({ id, data: t }) => {
        const cat = window.allForumCategories.find(c => c.id === t.categoryId);
        const catName = cat ? cat.name : 'General';
        
        html += `
          <div class="thread-item" onclick="window.router.navigate('/forum/${t.categoryId}/${id}')">
            <div class="thread-icon"><i class="fas fa-comment"></i></div>
            <div class="thread-info">
              <h4>${window.esc(t.title)} ${t.matchType === 'reply' ? '<span style="font-size:0.7rem; background:var(--bg-surface); padding:2px 8px; border-radius:10px; color:var(--accent-purple); border:1px solid var(--accent-purple); margin-left:8px;">Match in chat</span>' : ''}</h4>
              <div class="thread-meta">
                <span><i class="fas fa-folder"></i> ${window.esc(catName)}</span>
                <span><i class="fas fa-user"></i> ${window.esc(t.author || 'anonymous')}</span>
                <span><i class="fas fa-clock"></i> ${window.timeAgo(t.createdAt)}</span>
              </div>
            </div>
            <div class="thread-stats">
              <span><i class="fas fa-reply"></i> ${t.replies || 0}</span>
            </div>
          </div>`;
      });
      container.innerHTML = html;
    }).catch(e => {
      console.error('searchError:', e);
      const c = window.$('searchResults');
      if (c) c.innerHTML = '<div class="no-posts"><i class="fas fa-exclamation-triangle"></i><p>Search failed.</p></div>';
    });
  }

  window.loadForumStats = function() {
    Promise.all([
      dbx.forumCategories.get(),
      dbx.forumThreads.get(),
      dbx.forumReplies.get(),
      dbx.publicProfiles.get().catch(() => ({ size: 0 }))
    ]).then(([cats, threads, replies, profiles]) => {
      const c = window.$('forumStats');
      if (!c) return;
      c.innerHTML = `
        <div class="stat-card"><div class="stat-value">${cats.size}</div><div class="stat-label">Categories</div></div>
        <div class="stat-card"><div class="stat-value">${threads.size}</div><div class="stat-label">Threads</div></div>
        <div class="stat-card"><div class="stat-value">${replies.size}</div><div class="stat-label">Replies</div></div>
        <div class="stat-card"><div class="stat-value">${profiles.size || 0}</div><div class="stat-label">Members</div></div>
      `;
    }).catch(e => console.error('forumStats:', e));
  }

  window.loadForumCategories = function() {
    dbx.forumCategories.get()
      .then(snap => {
        const container = window.$('forumCatList');
        if (!container) return;
        if (snap.empty) {
          container.innerHTML = '<div class="no-posts"><i class="fas fa-comments"></i><p>No categories yet.</p></div>';
          return;
        }
        let html = '';
        snap.forEach((doc, i) => {
          const c = doc.data();
          html += `
            <div class="forum-category" onclick="window.router.navigate('/forum/${doc.id}')">
              ${window.renderForumCategoryMedia(c, i)}
              <div class="cat-info">
                <h3>${window.esc(c.name)}</h3>
                <p>${window.esc(c.description || '')}</p>
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

  window.renderForumCategory = function(main, catId) {
    main.innerHTML = `<div class="loading-screen"><div class="loader"></div><p>Loading threads...</p></div>`;

    dbx.forumCategories.doc(catId).get()
      .then(doc => {
        if (!doc.exists) { window.router.navigate('/forum'); return; }
        const cat = doc.data();

        main.innerHTML = `
          <div style="margin-bottom:24px;">
            <a class="btn btn-sm btn-secondary" href="#/forum"><i class="fas fa-arrow-left"></i> Back to Categories</a>
          </div>
          <div class="page-header" style="padding:20px 0;">
            <h2 style="font-family:var(--font-mono);font-size:1.5rem;">${window.esc(cat.name)}</h2>
            <p>${window.esc(cat.description || '')}</p>
          </div>
          <div class="forum-toolbar">
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
              <span style="color:var(--text-muted);font-size:0.9rem; white-space:nowrap;"><i class="fas fa-comment"></i> ${doc.data().threadCount || 0} threads</span>
              <div style="position:relative; flex:1; max-width:300px;">
                <input type="text" id="categorySearchInput" class="form-input" placeholder="Filter threads..." style="padding: 6px 12px 6px 32px; font-size: 0.85rem; border-radius: 20px;">
                <i class="fas fa-filter" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:0.8rem; color:var(--text-muted);"></i>
              </div>
            </div>
            ${window.currentUser ? `<button class="btn btn-sm btn-primary" onclick="window.showNewThreadModal('${catId}')"><i class="fas fa-plus"></i> New Thread</button>` : `<a class="btn btn-sm btn-secondary" href="#/login"><i class="fas fa-sign-in-alt"></i> Login to Post</a>`}
          </div>
          <div class="thread-list" id="threadList">${window.renderSkeleton(5)}</div>
        `;

        const filterInput = window.$('categorySearchInput');
        if (filterInput) {
          filterInput.addEventListener('input', () => {
            const q = filterInput.value.trim().toLowerCase();
            document.querySelectorAll('#threadList .thread-item').forEach(item => {
              const text = item.textContent.toLowerCase();
              item.style.display = text.includes(q) ? 'flex' : 'none';
            });
            
            const visibleCount = document.querySelectorAll('#threadList .thread-item[style="display: flex"]').length || document.querySelectorAll('#threadList .thread-item:not([style*="display: none"])').length;
            const noResults = window.$('noResultsMsg');
            if (visibleCount === 0) {
              if (!noResults) {
                const msg = document.createElement('div');
                msg.id = 'noResultsMsg';
                msg.className = 'no-posts';
                msg.innerHTML = '<i class="fas fa-search-minus"></i><p>No matching threads found.</p>';
                window.$('threadList').appendChild(msg);
              }
            } else if (noResults) {
              noResults.remove();
            }
          });
        }

        window.loadThreads(catId);
      })
      .catch(() => window.router.navigate('/forum'));
  }

  window.loadThreads = function(catId) {
    dbx.forumThreads.get().then(snap => {
        const container = window.$('threadList');
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
            <div class="thread-item ${cls}" onclick="window.router.navigate('/forum/${catId}/${id}')">
              <div class="thread-icon"><i class="fas ${t.isPinned ? 'fa-thumbtack' : t.isLocked ? 'fa-lock' : 'fa-comment'}"></i></div>
              <div class="thread-info">
                <h4>${window.esc(t.title)} ${t.isPinned ? '<span style="color:var(--accent-orange);font-size:0.75rem;">Pinned</span>' : ''}</h4>
                <div class="thread-meta">
                  <span><i class="fas fa-user"></i> ${window.esc(t.author || 'anonymous')}</span>
                  <span><i class="fas fa-clock"></i> ${window.timeAgo(t.createdAt)}</span>
                </div>
              </div>
              <div class="thread-stats">
                <span><i class="fas fa-reply"></i> ${t.replies || 0}</span>
                <span><i class="fas fa-eye"></i> ${t.views || 0}</span>
              </div>
              <div class="thread-last">${window.timeAgo(t.lastActivityAt)}</div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(e => { console.error('threads:', e); });
  }

  window.renderForumThread = function(main, catId, threadId) {
    if (window._threadUnsubscribe) {
      try { window._threadUnsubscribe(); } catch(e) {}
      window._threadUnsubscribe = null;
    }

    main.innerHTML = `<div class="loading-screen"><div class="loader"></div><p>Loading thread...</p></div>`;

    Promise.all([
      dbx.forumThreads.doc(threadId).get(),
      dbx.publicProfiles.get().catch(() => ({ empty: true }))
    ]).then(([threadDoc, profilesSnap]) => {
      if (!threadDoc.exists) { window.router.navigate(`/forum/${catId}`); return; }
      const t = threadDoc.data();

      if (t.views !== undefined) {
        dbx.forumThreads.doc(threadId).update({ views: (t.views || 0) + 1 }).catch(() => {});
      }

      const profiles = {};
      if (profilesSnap && !profilesSnap.empty) profilesSnap.forEach(d => profiles[d.id] = d.data());

      const initial = (t.author || 'A')[0].toUpperCase();

      main.innerHTML = `
        <div style="margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <a class="btn btn-sm btn-secondary" href="#/forum/${catId}"><i class="fas fa-arrow-left"></i> Back to Threads</a>
          <div style="position:relative; flex:1; max-width:400px;">
            <input type="text" id="threadSearchInput" class="form-input" placeholder="Search in this thread..." style="padding: 8px 12px 8px 40px; font-size: 0.9rem; border-radius: 30px;">
            <i class="fas fa-search" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
          </div>
        </div>
        <div class="reply-list">
          <div id="originalReply" class="reply-item original">
            <div class="reply-header">
              <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                <div class="reply-author" id="originalAuthor">
                  <div class="avatar">${window.esc(initial)}</div>
                  <div>
                    <div class="name">${t.authorId ? `<a href="#/profile/${window.esc(t.authorId)}" style="color:var(--text-primary);text-decoration:none;">${window.esc(t.author || 'Anonymous')}</a>` : window.esc(t.author || 'Anonymous')}</div>
                    <div class="role" style="color:var(--accent-purple);">Thread Starter</div>
                  </div>
                </div>
                <div class="reply-date" style="opacity:0.7;font-size:0.75rem;">${window.formatDateFull(t.createdAt)}</div>
              </div>
            </div>
            <div class="reply-content">${window.renderMarkdown(t.content)}</div>
          </div>

          <div id="repliesContainer">
            <div class="loading-screen"><div class="loader"></div><p>Loading replies...</p></div>
          </div>
        </div>
        ${window.currentUser && !t.isLocked ? `
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

      if (window.currentUserRole === 'admin') {
        const adminActions = document.createElement('div');
        adminActions.style = 'display:flex;gap:8px;align-items:center;';
        adminActions.innerHTML = `
          <button class="btn btn-sm btn-danger" id="adminDeleteThreadBtn" style="padding:6px 12px;"><i class="fas fa-trash"></i> Delete</button>
          <button class="btn btn-sm btn-secondary" id="adminToggleLockBtn" style="padding:6px 12px;">${t.isLocked ? '<i class="fas fa-lock-open"></i> Unlock' : '<i class="fas fa-lock"></i> Lock'}</button>
        `;
        const orig = window.$('originalReply');
        if (orig) {
          const header = orig.querySelector('.reply-header');
          header.appendChild(adminActions);
        }

        window.$('adminDeleteThreadBtn').addEventListener('click', () => {
          if (!confirm('Delete this thread permanently? This cannot be undone.')) return;
          dbx.forumThreads.doc(threadId).delete().then(() => {
            window.toast('Thread deleted', 'success'); window.router.navigate(`/forum/${catId}`);
          }).catch(e => window.toast('Failed to delete thread: ' + e.message, 'error'));
        });

        window.$('adminToggleLockBtn').addEventListener('click', () => {
          const lock = !t.isLocked;
          dbx.forumThreads.doc(threadId).update({ isLocked: lock }).then(() => {
            window.toast(lock ? 'Thread locked' : 'Thread unlocked', 'success');
            const btn = window.$('adminToggleLockBtn');
            if (btn) btn.innerHTML = lock ? '<i class="fas fa-lock-open"></i> Unlock' : '<i class="fas fa-lock"></i> Lock';
            t.isLocked = lock;
          }).catch(e => window.toast('Failed to update thread: ' + e.message, 'error'));
        });
      }

      const repliesQuery = dbx.forumReplies.where('threadId', '==', threadId).orderBy('createdAt');
      const threadRef = dbx.forumThreads.doc(threadId);

      window._repliesInitialLoaded = false;
      let repliesUnsub = null;
      try {
        repliesUnsub = repliesQuery.onSnapshot(snap => {
          window._realtimeRepliesAvailable = true;
          let repliesHtml = '';
          if (snap.empty) {
            repliesHtml = '<div class="no-posts" style="padding:20px;"><i class="fas fa-comment"></i><p>No replies yet. Be the first to respond.</p></div>';
          } else {
            snap.forEach(doc => {
              const r = doc.data();
              let authorHtml = '';
              if (r.authorId && profiles[r.authorId]) {
                const p = profiles[r.authorId];
                const avatar = p.avatar ? `<div class="avatar"><img src="${window.esc(p.avatar)}" alt="${window.esc(p.displayName || r.author || 'User')}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;"/></div>` : `<div class="avatar">${window.esc((p.displayName||r.author||'A').charAt(0).toUpperCase())}</div>`;
                const roleLabel = p.role === 'admin' ? 'Administrator' : 'Member';
                authorHtml = `
                  <div class="reply-author">
                    ${avatar}
                    <div>
                      <div class="name">${r.authorId ? `<a href="#/profile/${window.esc(r.authorId)}" style="color:var(--text-primary);text-decoration:none;">${window.esc(r.author || p.displayName || 'Anonymous')}</a>` : window.esc(r.author || 'Anonymous')}</div>
                      <div class="role">${roleLabel}</div>
                    </div>
                  </div>`;
              } else {
                const initial = (r.author || 'A')[0].toUpperCase();
                authorHtml = `
                  <div class="reply-author">
                    <div class="avatar">${window.esc(initial)}</div>
                    <div>
                      <div class="name">${r.authorId ? `<a href="#/profile/${window.esc(r.authorId)}" style="color:var(--text-primary);text-decoration:none;">${window.esc(r.author || 'Anonymous')}</a>` : window.esc(r.author || 'Anonymous')}</div>
                      <div class="role">${r.authorId ? 'Member' : 'Guest'}</div>
                    </div>
                  </div>`;
              }

              repliesHtml += `
                <div class="reply-item" data-reply-id="${window.esc(doc.id)}">
                  <div class="reply-header">
                    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                      ${authorHtml}
                      <div class="reply-date" style="opacity:0.7;font-size:0.75rem;">${window.formatDateFull(r.createdAt)}</div>
                    </div>
                  </div>
                  <div class="reply-content">${window.renderMarkdown(r.content)}</div>
                  <div class="reply-actions">
                    ${window.currentUser ? `<button class="reply-action" onclick="window.openReply('${window.esc(doc.id)}')"><i class="fas fa-reply"></i> Reply</button>` : ''}
                    ${window.currentUser ? `<button class="reply-action" onclick="window.quoteReply('${window.esc(doc.id)}','${window.esc(r.author || 'Anonymous')}')"><i class="fas fa-quote-right"></i> Quote</button>` : ''}
                  </div>
                </div>`;
            });
          }

          const container = window.$('repliesContainer');
          if (container) container.innerHTML = repliesHtml;
          window.highlightCode();

          if (!snap.metadata.hasPendingWrites) {
            const changes = snap.docChanges();
            changes.forEach(c => {
              if (c.type === 'added' && window._repliesInitialLoaded) {
                window.toast('New reply', 'info');
              }
            });
          }

          window._repliesInitialLoaded = true;
        }, err => {
          console.error('repliesListener:', err);
          window._realtimeRepliesAvailable = false;
          const container = window.$('repliesContainer');
          if (container) container.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading replies...</p></div>';
          dbx.forumReplies.where('threadId','==',threadId).get().then(fallbackSnap => {
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
                  const avatar = p.avatar ? `<div class="avatar"><img src="${window.esc(p.avatar)}" alt="${window.esc(p.displayName || r.author || 'User')}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;"/></div>` : `<div class="avatar">${window.esc((p.displayName||r.author||'A').charAt(0).toUpperCase())}</div>`;
                  const roleLabel = p.role === 'admin' ? 'Administrator' : 'Member';
                  authorHtml = `
                    <div class="reply-author">
                      ${avatar}
                      <div>
                        <div class="name">${r.authorId ? `<a href="#/profile/${window.esc(r.authorId)}" style="color:var(--text-primary);text-decoration:none;">${window.esc(r.author || p.displayName || 'Anonymous')}</a>` : window.esc(r.author || 'Anonymous')}</div>
                        <div class="role">${roleLabel}</div>
                      </div>
                    </div>`;
                } else {
                  const initial = (r.author || 'A')[0].toUpperCase();
                  authorHtml = `
                    <div class="reply-author">
                      <div class="avatar">${window.esc(initial)}</div>
                      <div>
                        <div class="name">${r.authorId ? `<a href="#/profile/${window.esc(r.authorId)}" style="color:var(--text-primary);text-decoration:none;">${window.esc(r.author || 'Anonymous')}</a>` : window.esc(r.author || 'Anonymous')}</div>
                        <div class="role">${r.authorId ? 'Member' : 'Guest'}</div>
                      </div>
                    </div>`;
                }

                repliesHtml += `
                  <div class="reply-item" data-reply-id="${window.esc(docId)}">
                    <div class="reply-header">
                      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                        ${authorHtml}
                        <div class="reply-date" style="opacity:0.7;font-size:0.75rem;">${window.formatDateFull(r.createdAt)}</div>
                      </div>
                    </div>
                    <div class="reply-content">${window.renderMarkdown(r.content)}</div>
                    <div class="reply-actions">
                      ${window.currentUser ? `<button class="reply-action" onclick="window.openReply('${window.esc(docId)}')"><i class="fas fa-reply"></i> Reply</button>` : ''}
                      ${window.currentUser ? `<button class="reply-action" onclick="window.quoteReply('${window.esc(docId)}','${window.esc(r.author || 'Anonymous')}')"><i class="fas fa-quote-right"></i> Quote</button>` : ''}
                    </div>
                  </div>`;
              });
            }
            if (container) container.innerHTML = repliesHtml;
            window.highlightCode();
            window._repliesInitialLoaded = true;
          }).catch(ferr => {
            console.error('repliesFallback:', ferr);
            if (container) container.innerHTML = '<div class="no-posts" style="padding:20px;color:var(--text-muted);"><i class="fas fa-exclamation-triangle"></i><p>Failed to load replies.</p></div>';
            window.toast('Failed to load replies: ' + (ferr && ferr.message ? ferr.message : 'unknown'), 'error');
          });
        });
      } catch(e) {
        console.error('repliesListenerSetup:', e);
        const container = window.$('repliesContainer');
        if (container) container.innerHTML = '<div class="no-posts" style="padding:20px;color:var(--text-muted);"><i class="fas fa-exclamation-triangle"></i><p>Failed to initialize replies.</p></div>';
      }

      window._threadUnsubscribe = () => { try { if (repliesUnsub) repliesUnsub(); } catch(e) {} try { threadUnsub(); } catch(e) {} };

      const threadUnsub = threadRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        const form = window.$('replyForm');
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

      if (window.currentUser && !t.isLocked) {
        // ... (existing reply form logic)
      }

      const threadSearch = window.$('threadSearchInput');
      if (threadSearch) {
        threadSearch.addEventListener('input', () => {
          const q = threadSearch.value.trim().toLowerCase();
          const items = document.querySelectorAll('.reply-item');
          let visibleCount = 0;
          
          items.forEach(item => {
            const text = item.textContent.toLowerCase();
            const isMatch = text.includes(q);
            item.style.display = isMatch ? 'block' : 'none';
            if (isMatch) visibleCount++;
          });

          const container = window.$('repliesContainer');
          const existingMsg = window.$('noThreadResultsMsg');
          if (visibleCount === 0) {
            if (!existingMsg) {
              const msg = document.createElement('div');
              msg.id = 'noThreadResultsMsg';
              msg.className = 'no-posts';
              msg.innerHTML = '<i class="fas fa-search-minus"></i><p>No matching messages found in this thread.</p>';
              container.appendChild(msg);
            }
          } else if (existingMsg) {
            existingMsg.remove();
          }
        });
      }

      window.highlightCode();
    }).catch(() => window.router.navigate(`/forum/${catId}`));

    window.openReply = function(replyId) {
      const el = document.querySelector(`[data-reply-id="${replyId}"]`);
      let authorName = '';
      if (el) {
        const nameEl = el.querySelector('.name');
        authorName = nameEl ? nameEl.textContent.trim() : '';
      }
      const contentEl = window.$('replyContent');
      if (contentEl) {
        const at = authorName ? `@${authorName} ` : '';
        contentEl.value = at + contentEl.value;
        contentEl.focus();
        contentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.quoteReply = function(replyId, author) {
      const contentEl = window.$('replyContent');
      if (!contentEl) return;
      dbx.forumReplies.doc(replyId).get().then(doc => {
        if (!doc.exists) return;
        const r = doc.data();
        const lines = (r.content || '').split('\n').map(l => `> ${l}`).join('\n');
        const quote = `> **${window.esc(author)} said:**\n${lines}\n\n`;
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

    window.$('newThreadForm').addEventListener('submit', e => {
      e.preventDefault();
      const title = window.$('threadTitle').value.trim();
      const content = window.$('threadContent').value.trim();
      if (!title || !content) return;
      const btn = window.$('newThreadBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

      dbx.forumThreads.add({
        categoryId: catId, title, content,
        author: window.getDisplayName(),
        authorId: window.currentUser.uid || '',
        replies: 0, views: 0, isPinned: false, isLocked: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActivityAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(ref => {
        return dbx.forumCategories.doc(catId).update({ threadCount: firebase.firestore.FieldValue.increment(1) });
      }).then(() => {
        window.toast('Thread created!', 'success');
        overlay.remove();
        window.router.navigate(`/forum/${catId}`);
      }).catch(e => {
        window.toast('Failed: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Create Thread';
      });
    });
  };

})();
