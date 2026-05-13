(function() {
  'use strict';

  window.renderForum = function(main) {
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
        ${window.renderSkeleton(4)}
      </div>
    `;
    window.loadForumStats();
    window.loadForumCategories();
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
            <span style="color:var(--text-muted);font-size:0.9rem;"><i class="fas fa-comment"></i> ${doc.data().threadCount || 0} threads</span>
            ${window.currentUser ? `<button class="btn btn-sm btn-primary" onclick="window.showNewThreadModal('${catId}')"><i class="fas fa-plus"></i> New Thread</button>` : `<a class="btn btn-sm btn-secondary" href="#/login"><i class="fas fa-sign-in-alt"></i> Login to Post</a>`}
          </div>
          <div class="thread-list" id="threadList">${window.renderSkeleton(5)}</div>
        `;
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
        <div style="margin-bottom:24px;">
          <a class="btn btn-sm btn-secondary" href="#/forum/${catId}"><i class="fas fa-arrow-left"></i> Back to Threads</a>
        </div>
        <div class="reply-list">
          <div id="originalReply" class="reply-item original">
            <div class="reply-header">
              <div class="reply-author" id="originalAuthor">
                <div class="avatar">${window.esc(initial)}</div>
                <div>
                  <div class="name">${t.authorId ? `<a href="#/profile/${window.esc(t.authorId)}" style="color:var(--text-primary);text-decoration:none;">${window.esc(t.author || 'Anonymous')}</a>` : window.esc(t.author || 'Anonymous')}</div>
                  <div class="role" style="color:var(--accent-purple);">Thread Starter</div>
                </div>
              </div>
              <div class="reply-date">${window.formatDateFull(t.createdAt)}</div>
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
        adminActions.style = 'margin-top:12px;display:flex;gap:8px;';
        adminActions.innerHTML = `
          <button class="btn btn-sm btn-danger" id="adminDeleteThreadBtn"><i class="fas fa-trash"></i> Delete Thread</button>
          <button class="btn btn-sm btn-secondary" id="adminToggleLockBtn">${t.isLocked ? '<i class="fas fa-lock-open"></i> Unlock' : '<i class="fas fa-lock"></i> Lock'}</button>
        `;
        const orig = window.$('originalReply');
        if (orig) orig.querySelector('.reply-header').appendChild(adminActions);

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
                    ${authorHtml}
                    <div class="reply-date">${window.formatDateFull(r.createdAt)}</div>
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
                      ${authorHtml}
                      <div class="reply-date">${window.formatDateFull(r.createdAt)}</div>
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
        const replyForm = window.$('replyForm');
        if (replyForm) {
          replyForm.addEventListener('submit', e => {
            e.preventDefault();
            const contentEl = window.$('replyContent');
            const content = contentEl.value.trim();
            if (!content) return;
            const btn = window.$('replyBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

            dbx.forumReplies.add({ threadId, content, author: window.getDisplayName(), authorId: window.currentUser.uid || '', createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
              .then(() => dbx.forumThreads.doc(threadId).update({ replies: firebase.firestore.FieldValue.increment(1), lastActivityAt: firebase.firestore.FieldValue.serverTimestamp() }))
              .then(() => { window.toast('Reply posted!', 'success'); contentEl.value = ''; btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Reply';
                if (!window._realtimeRepliesAvailable) {
                  dbx.forumReplies.where('threadId','==',threadId).orderBy('createdAt','asc').get().then(snapAfter => {
                    const container = window.$('repliesContainer');
                    let html = '';
                    if (snapAfter.empty) html = '<div class="no-posts" style="padding:20px;"><i class="fas fa-comment"></i><p>No replies yet. Be the first to respond.</p></div>';
                    else {
                      snapAfter.forEach(doc => {
                        const r = doc.data();
                        const author = r.author || 'Anonymous';
                        const initial = (r.author || 'A')[0].toUpperCase();
                        html += `<div class="reply-item" data-reply-id="${window.esc(doc.id)}"><div class="reply-header"><div class="reply-author"><div class="avatar">${window.esc(initial)}</div><div><div class="name">${window.esc(author)}</div><div class="role">${r.authorId ? 'Member' : 'Guest'}</div></div></div><div class="reply-date">${window.formatDateFull(r.createdAt)}</div></div><div class="reply-content">${window.renderMarkdown(r.content)}</div></div>`;
                      });
                    }
                    if (container) container.innerHTML = html;
                    window.highlightCode();
                  }).catch(() => {});
                }
              })
              .catch(e => { window.toast('Failed to post reply: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Reply'; });
          });
        }
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
