(function() {
  'use strict';

  window.renderAdmin = function(main) {
    if (!window.authResolved) {
      main.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading admin access...</p></div>';
      return;
    }
    if (!window.currentUser) {
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
    if (window.currentUserRole !== 'admin') {
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
      content = window.adminDashboard();
    } else if (section === '/blog') {
      content = window.adminBlogList();
    } else if (section.startsWith('/blog/new')) {
      content = window.adminBlogForm(null);
    } else if (section.startsWith('/blog/edit')) {
      const id = section.split('/edit/')[1];
      content = window.adminBlogForm(id);
    } else if (section === '/vlog') { // Renamed from /videos
      content = window.adminVlog();
    } else if (section === '/categories') {
      content = window.adminCategories();
    } else if (section === '/forum') {
      content = window.adminForum();
    } else {
      content = window.adminDashboard();
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
            <span class="admin-badge"><i class="fas fa-user-shield"></i> ${window.esc(window.getDisplayName())}</span>
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
                <a href="#/admin/vlog" class="${section === '/vlog' ? 'active' : ''}"><i class="fas fa-video"></i> Vlog</a>
                <a href="#/admin/categories" class="${section === '/categories' ? 'active' : ''}"><i class="fas fa-tags"></i> Categories</a>
                <a href="#/admin/forum" class="${section === '/forum' ? 'active' : ''}"><i class="fas fa-comments"></i> Forum</a>
                <hr class="admin-sidebar-separator">
                <a href="#/" class="admin-link-muted"><i class="fas fa-arrow-left"></i> Back to Site</a>
                <a href="#" onclick="window.logout()" class="admin-link-danger"><i class="fas fa-sign-out-alt"></i> Logout</a>
              </nav>
            </div>
          </aside>
          <div class="admin-content">
            ${content}
          </div>
        </div>
      </div>
    `;

    if (section === '/blog') window.attachBlogHandlers();
    else if (section.startsWith('/blog/new') || section.startsWith('/blog/edit')) window.attachBlogFormHandlers();
    else if (section === '/vlog') window.attachVlogHandlers();
    else if (section === '/categories') window.attachCategoryHandlers();
    else if (section === '/forum') window.attachForumAdminHandlers();
  }

  // === ADMIN DASHBOARD ===
  window.adminDashboard = function() {
    let html = `
      <div class="admin-panel-card admin-hero-panel">
        <div class="admin-header">
          <div>
            <h2><i class="fas fa-chart-simple"></i> Dashboard</h2>
            <p class="admin-subtitle">Welcome back, ${window.esc(window.getDisplayName())}. Here is the current platform overview.</p>
          </div>
          <span class="admin-badge"><i class="fas fa-wave-square"></i> Live snapshot</span>
        </div>
      </div>
      <div class="admin-stats" id="adminStats">
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-feather-alt"></i></div><div class="stat-number">--</div><div class="stat-desc">Blog Posts</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-video"></i></div><div class="stat-number">--</div><div class="stat-desc">Vlog Entries</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-tags"></i></div><div class="stat-number">--</div><div class="stat-desc">Blog Categories</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-film"></i></div><div class="stat-number">--</div><div class="stat-desc">Vlog Categories</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-comments"></i></div><div class="stat-number">--</div><div class="stat-desc">Forum Threads</div></div>
        <div class="admin-stat"><div class="stat-icon"><i class="fas fa-reply"></i></div><div class="stat-number">--</div><div class="stat-desc">Forum Replies</div></div>
      </div>
      <div class="admin-panel-card">
        <div class="admin-header" style="margin-bottom:18px;"><h3 style="font-size:1.1rem;"><i class="fas fa-bolt"></i> Quick Actions</h3></div>
        <div class="admin-action-grid">
        <a class="btn btn-primary" href="#/admin/blog/new"><i class="fas fa-plus"></i> New Blog Post</a>
        <a class="btn btn-secondary" href="#/admin/vlog"><i class="fas fa-plus"></i> Add Vlog Entry</a>
        <a class="btn btn-secondary" href="#/admin/categories"><i class="fas fa-plus"></i> Manage Categories</a>
        </div>
      </div>
    `;

    setTimeout(() => {
      Promise.all([dbx.blog.get(), dbx.videos.get(), dbx.blogCategories.get(), dbx.videoCategories.get(), dbx.forumThreads.get(), dbx.forumReplies.get()])
        .then(([b, v, bc, vc, ft, fr]) => {
          const c = window.$('adminStats');
          if (!c) return;
          c.innerHTML = `
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-feather-alt"></i></div><div class="stat-number">${b.size}</div><div class="stat-desc">Blog Posts</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-video"></i></div><div class="stat-number">${v.size}</div><div class="stat-desc">Vlog Entries</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-tags"></i></div><div class="stat-number">${bc.size}</div><div class="stat-desc">Blog Categories</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-film"></i></div><div class="stat-number">${vc.size}</div><div class="stat-desc">Vlog Categories</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-comments"></i></div><div class="stat-number">${ft.size}</div><div class="stat-desc">Forum Threads</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-reply"></i></div><div class="stat-number">${fr.size}</div><div class="stat-desc">Forum Replies</div></div>
          `;
        }).catch(e => console.error('adminStats:', e));
    }, 200);

    return html;
  }

  // === ADMIN BLOG LIST ===
  window.adminBlogList = function() {
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
    setTimeout(() => window.loadAdminBlog(), 200);
    return html;
  }

  window.loadAdminBlog = function() {
    dbx.blog.orderBy('createdAt', 'desc').get()
      .then(snap => {
        const body = window.$('adminBlogBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="5" class="table-empty"><i class="fas fa-feather-alt"></i><p>No posts yet. Create your first post!</p></td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const p = doc.data();
          html += `<tr>
            <td><strong>${window.esc(p.title)}</strong></td>
            <td><span style="color:${window.getCategoryColor(p.category)}">${window.esc(p.category || 'General')}</span></td>
            <td><span style="color:${p.published ? 'var(--accent-green)' : 'var(--accent-orange)'}">${p.published ? 'Published' : 'Draft'}</span></td>
            <td style="font-family:var(--font-mono);font-size:0.8rem;">${window.formatDate(p.createdAt)}</td>
            <td class="actions">
              <a class="btn btn-sm btn-secondary" href="#/blog/${doc.id}" target="_blank" title="View"><i class="fas fa-eye"></i></a>
              <a class="btn btn-sm btn-secondary" href="#/admin/blog/edit/${doc.id}" title="Edit"><i class="fas fa-edit"></i></a>
              <button class="btn btn-sm btn-danger" onclick="window.deleteBlogPost('${doc.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        });
        body.innerHTML = html;
      })
      .catch(e => {
        console.error('adminBlog:', e);
        const b = window.$('adminBlogBody');
        if (b) b.innerHTML = '<tr><td colspan="5" class="table-empty"><i class="fas fa-exclamation-triangle"></i> Failed to load.</td></tr>';
      });
  }

  window.deleteBlogPost = function(id) {
    if (!confirm('Permanently delete this blog post?')) return;
    dbx.blog.doc(id).delete()
      .then(() => { window.toast('Post deleted', 'success'); window.loadAdminBlog(); })
      .catch(e => window.toast('Delete failed: ' + e.message, 'error'));
  };

  // === ADMIN BLOG FORM ===
  window.adminBlogForm = function(id) {
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
              ${window.allBlogCategories.map(c => `<option value="${window.esc(c.id)}">${window.esc(c.name)}</option>`).join('')}
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
          <button type="button" class="btn btn-sm btn-secondary" onclick="window.togglePreview()"><i class="fas fa-eye"></i> Preview</button>
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
            <input type="text" class="form-input" id="postAuthor" placeholder="Author name" value="${window.esc(window.getDisplayName())}">
          </div>
        </div>
        <div class="form-group">
          <label class="checkbox-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="postPublished" checked> <span>Publish immediately</span>
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="window.router.navigate('/admin/blog')">Cancel</button>
          <button type="submit" class="btn btn-primary" id="saveBlogBtn"><i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Save'} Post</button>
        </div>
      </form>
    `;
  }

  window.togglePreview = function() {
    const preview = window.$('markdownPreview');
    if (preview.classList.toggle('show')) {
      preview.innerHTML = window.renderMarkdown(window.$('postContent').value) || '<p style="color:var(--text-muted);">Nothing to preview...</p>';
    }
  };

  window.attachBlogFormHandlers = function() {
    const tags = [];
    const container = window.$('tagsContainer');
    const input = window.$('postTags');

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
      container.innerHTML = tags.map(t => `<span class="tag-item">${window.esc(t)}<button class="remove-tag" onclick="window.removeTag('${window.esc(t)}')">&times;</button></span>`).join('');
      container.appendChild(input);
      input.value = '';
    }

    window.removeTag = function(tag) {
      const idx = tags.indexOf(tag);
      if (idx > -1) { tags.splice(idx, 1); renderTags(); }
    };

    const form = window.$('blogForm');
    if (!form) return;

    const editId = form.dataset.id;
    if (editId) {
      dbx.blog.doc(editId).get().then(doc => {
        if (!doc.exists) { window.router.navigate('/admin/blog'); return; }
        const p = doc.data();
        window.$('postTitle').value = p.title || '';
        window.$('postCategory').value = p.category || '';
        window.$('postExcerpt').value = p.excerpt || '';
        window.$('postContent').value = p.content || '';
        window.$('postAuthor').value = p.author || '';
        window.$('postPublished').checked = p.published !== false;
        if (p.tags) { p.tags.forEach(t => { if (!tags.includes(t)) tags.push(t); }); renderTags(); }
      }).catch(() => window.router.navigate('/admin/blog'));
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const title = window.$('postTitle').value.trim();
      const content = window.$('postContent').value.trim();
      if (!title || !content) { window.toast('Title and content are required', 'error'); return; }

      const data = {
        title,
        content,
        category: window.$('postCategory').value || 'General',
        excerpt: window.$('postExcerpt').value.trim() || content.slice(0, 200),
        tags: [...tags],
        author: window.$('postAuthor').value.trim() || 'admin',
        published: window.$('postPublished').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const btn = window.$('saveBlogBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      if (editId) {
        dbx.blog.doc(editId).update(data)
          .then(() => { window.toast('Post updated!', 'success'); window.router.navigate('/admin/blog'); })
          .catch(e => { window.toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Update Post'; });
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        data.author = data.author || window.getDisplayName();
        dbx.blog.add(data)
          .then(() => { window.toast('Post created!', 'success'); window.router.navigate('/admin/blog'); })
          .catch(e => { window.toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Post'; });
      }
    });
  }

  window.attachBlogHandlers = function() {
    window.loadAdminBlog();
  }

  // === ADMIN VLOG ===
  window.adminVlog = function() {
    let html = `
      <div class="admin-header">
        <h2><i class="fas fa-video"></i> Vlog Entries</h2>
        <button class="btn btn-primary btn-sm" onclick="window.showAddVlogModal()"><i class="fas fa-plus"></i> Add Entry</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Platform</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody id="adminVlogBody"><tr><td colspan="5" class="table-empty"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr></tbody>
        </table>
      </div>
    `;
    setTimeout(window.loadAdminVlog, 200);
    return html;
  }

  window.loadAdminVlog = function() {
    dbx.videos.orderBy('createdAt', 'desc').get()
      .then(snap => {
        const body = window.$('adminVlogBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="5" class="table-empty"><i class="fas fa-video"></i><p>No vlog entries yet.</p></td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const v = doc.data();
          html += `<tr>
            <td><strong>${window.esc(v.title)}</strong></td>
            <td><i class="${window.getPlatformIcon(v.url)}" style="color:${window.getPlatformColor(v.url)}"></i> ${v.url.includes('youtube') ? 'YouTube' : 'Odysee'}</td>
            <td>${window.esc(v.category || 'General')}</td>
            <td style="font-family:var(--font-mono);font-size:0.8rem;">${window.formatDate(v.createdAt)}</td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary" onclick="window.showEditVlogModal('${doc.id}')" title="Edit"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="window.deleteVlog('${doc.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        });
        body.innerHTML = html;
      })
      .catch(e => { console.error('adminVlog:', e); });
  }

  window.deleteVlog = function(id) {
    if (!confirm('Delete this vlog entry?')) return;
    dbx.videos.doc(id).delete()
      .then(() => { window.toast('Vlog entry deleted', 'success'); window.loadAdminVlog(); })
      .catch(e => window.toast('Failed: ' + e.message, 'error'));
  };

  window.showAddVlogModal = function() {
    window.showVlogModal();
  };
  window.showEditVlogModal = function(id) {
    window.showVlogModal(id);
  };

  window.showVlogModal = function(editId = null) {
    const isEdit = !!editId;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'vlogModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h3><i class="fas ${isEdit ? 'fa-edit' : 'fa-plus'}"></i> ${isEdit ? 'Edit Vlog Entry' : 'Add Vlog Entry'}</h3>
          <button class="modal-close" onclick="document.getElementById('vlogModal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="vlogForm" ${isEdit ? `data-id="${editId}"` : ''}>
            <div class="form-row">
              <div class="form-group">
                <label for="vlogTitle">Title</label>
                <input type="text" class="form-input" id="vlogTitle" placeholder="Vlog title" required>
              </div>
              <div class="form-group">
                <label for="vlogCategory">Category</label>
                <select class="form-select" id="vlogCategory">
                  <option value="">Select...</option>
                  ${window.allVideoCategories.map(c => `<option value="${window.esc(c.id)}">${window.esc(c.name)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="vlogUrl">Video URL <span style="color:var(--text-muted);font-size:0.8rem;">(YouTube or Odysee)</span></label>
              <input type="url" class="form-input" id="vlogUrl" placeholder="https://youtube.com/watch?v=... or https://odysee.com/..." required>
            </div>
            <div class="form-group">
              <label for="vlogDescription">Description</label>
              <textarea class="form-textarea" id="vlogDescription" placeholder="Brief description" style="min-height:80px;"></textarea>
            </div>
            <button type="submit" class="btn btn-primary" id="saveVlogBtn"><i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Save'} Vlog Entry</button>
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
        window.$('vlogTitle').value = v.title || '';
        window.$('vlogCategory').value = v.category || '';
        window.$('vlogUrl').value = v.url || '';
        window.$('vlogDescription').value = v.description || '';
      });
    }

    window.$('vlogForm').addEventListener('submit', e => {
      e.preventDefault();
      const title = window.$('vlogTitle').value.trim();
      const url = window.$('vlogUrl').value.trim();
      if (!title || !url) { window.toast('Title and URL are required', 'error'); return; }

      const data = {
        title, url,
        category: window.$('vlogCategory').value || 'General',
        description: window.$('vlogDescription').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const btn = window.$('saveVlogBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      if (isEdit) {
        dbx.videos.doc(editId).update(data)
          .then(() => { window.toast('Vlog entry updated!', 'success'); overlay.remove(); window.loadAdminVlog(); })
          .catch(e => { window.toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Update Vlog Entry'; });
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        dbx.videos.add(data)
          .then(() => { window.toast('Vlog entry added!', 'success'); overlay.remove(); window.loadAdminVlog(); })
          .catch(e => { window.toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Vlog Entry'; });
      }
    });
  }

  window.attachVlogHandlers = function() { window.loadAdminVlog(); }

  // === ADMIN CATEGORIES ===
  window.adminCategories = function() {
    let html = `
      <div class="admin-header">
        <h2><i class="fas fa-tags"></i> Categories</h2>
        <button class="btn btn-primary btn-sm" onclick="window.showCategoryModal()"><i class="fas fa-plus"></i> New Blog Category</button>
        <button class="btn btn-primary btn-sm" onclick="window.showCategoryModal(null,'video')"><i class="fas fa-plus"></i> New Vlog Category</button>
        <button class="btn btn-primary btn-sm" onclick="window.showCategoryModal(null,'forum')"><i class="fas fa-plus"></i> New Forum Category</button>
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
          <h3 style="font-family:var(--font-mono);font-size:1rem;margin-bottom:16px;"><i class="fas fa-video"></i> Vlog</h3>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Name</th><th>Count</th><th>Actions</th></tr></thead>
              <tbody id="adminVlogCatBody"><tr><td colspan="3" class="table-empty"><i class="fas fa-spinner fa-spin"></i></td></tr></tbody>
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
    setTimeout(() => { window.loadAdminBlogCategories(); window.loadAdminVlogCategories(); window.loadAdminForumCategories(); }, 200);
    return html;
  }

  window.loadAdminBlogCategories = function() {
    dbx.blogCategories.orderBy('order', 'asc').get()
      .then(snap => {
        const body = window.$('adminBlogCatBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="3" class="table-empty">No categories</td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const c = doc.data();
          html += `<tr><td><span style="color:${window.getCategoryColor(doc.id)}">${window.esc(c.name)}</span></td><td>${c.postCount || 0}</td><td class="actions"><button class="btn btn-sm btn-secondary" onclick="window.showCategoryModal('${doc.id}','blog')" title="Edit"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="window.deleteCategory('${doc.id}','blog')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        body.innerHTML = html;
      });
  }

  window.loadAdminVlogCategories = function() {
    dbx.videoCategories.orderBy('order', 'asc').get()
      .then(snap => {
        const body = window.$('adminVlogCatBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="3" class="table-empty">No categories</td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const c = doc.data();
          html += `<tr><td><span style="color:${window.getCategoryColor(doc.id)}">${window.esc(c.name)}</span></td><td>${c.count || 0}</td><td class="actions"><button class="btn btn-sm btn-secondary" onclick="window.showCategoryModal('${doc.id}','video')" title="Edit"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="window.deleteCategory('${doc.id}','video')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        body.innerHTML = html;
      });
  }

  window.loadAdminForumCategories = function() {
    dbx.forumCategories.orderBy('order', 'asc').get()
      .then(snap => {
        const body = window.$('adminForumCatBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="3" class="table-empty">No categories</td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const c = doc.data();
          html += `<tr><td>${window.esc(c.name)}</td><td>${c.threadCount || 0}</td><td class="actions"><button class="btn btn-sm btn-secondary" onclick="window.showCategoryModal('${doc.id}','forum')" title="Edit"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-secondary" onclick="window.manageCategoryThreads('${doc.id}','${window.esc(c.name)}')" title="Manage Threads"><i class="fas fa-folder-open"></i></button><button class="btn btn-sm btn-danger" onclick="window.deleteCategory('${doc.id}','forum')" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        body.innerHTML = html;
      });
  }

  window.showCategoryModal = function(id = null, type = 'blog') {
    const isEdit = !!id;
    const typeLabel = { blog: 'Blog', video: 'Vlog', forum: 'Forum' }[type] || 'Blog';
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
        window.$('catName').value = c.name || '';
        window.$('catDesc').value = c.description || '';
        window.$('catOrder').value = c.order || 0;
        const imageField = window.$('catImageUrl');
        if (imageField) imageField.value = c.imageUrl || '';
      });
    }

    window.$('catForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = window.$('catName').value.trim();
      if (!name) { window.toast('Name is required', 'error'); return; }
      const ctype = overlay.querySelector('#catForm').dataset.type;
      const ccol = colMap[ctype] || dbx.blogCategories;
      const data = { name, description: window.$('catDesc').value.trim(), order: parseInt(window.$('catOrder').value) || 0, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (ctype === 'forum') {
        data.imageUrl = window.$('catImageUrl').value.trim();
      }

      const btn = window.$('saveCatBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      if (isEdit) {
        ccol.doc(id).update(data)
          .then(() => { window.toast('Category updated!', 'success'); overlay.remove(); window.refreshAllCategories(); window.loadAdminBlogCategories(); window.loadAdminVlogCategories(); window.loadAdminForumCategories(); })
          .catch(e => { window.toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Update Category'; });
      } else {
        ccol.add({ ...data, count: 0, postCount: 0, threadCount: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
          .then(() => { window.toast('Category created!', 'success'); overlay.remove(); window.refreshAllCategories(); window.loadAdminBlogCategories(); window.loadAdminVlogCategories(); window.loadAdminForumCategories(); })
          .catch(e => { window.toast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Create Category'; });
      }
    });
  };

  window.deleteCategory = function(id, type) {
    if (!confirm(`Delete this ${type} category?`)) return;
    const colMap = { blog: dbx.blogCategories, video: dbx.videoCategories, forum: dbx.forumCategories };
    const col = colMap[type] || dbx.blogCategories;
    col.doc(id).delete()
      .then(() => { window.toast('Category deleted', 'success'); window.refreshAllCategories(); window.loadAdminBlogCategories(); window.loadAdminVlogCategories(); window.loadAdminForumCategories(); })
      .catch(e => window.toast('Failed: ' + e.message, 'error'));
  };

  window.attachCategoryHandlers = function() { window.loadAdminBlogCategories(); window.loadAdminVlogCategories(); window.loadAdminForumCategories(); }

  window.manageCategoryThreads = function(catId, catName) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'manageThreadsModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:900px;">
        <div class="modal-header">
          <h3><i class="fas fa-folder-open"></i> Manage Threads — ${window.esc(catName || '')}</h3>
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

    const newBtn = document.getElementById('adminNewThreadBtn');
    if (newBtn) newBtn.addEventListener('click', () => window.showNewThreadModal(catId));

    function refresh() {
      dbx.forumThreads.where('categoryId', '==', catId).orderBy('lastActivityAt', 'desc').get()
        .then(snap => {
          const body = window.$('manageThreadsBody');
          if (!body) return;
          if (snap.empty) { body.innerHTML = '<tr><td colspan="5" class="table-empty">No threads in this category</td></tr>'; return; }
          let html = '';
          snap.forEach(doc => {
            const t = doc.data();
            html += `<tr>
              <td><strong>${window.esc(t.title)}</strong> ${t.isPinned ? '<span style="color:var(--accent-orange);font-size:0.75rem;">PINNED</span>' : ''} ${t.isLocked ? '<span style="color:var(--accent-red);font-size:0.75rem;">LOCKED</span>' : ''}</td>
              <td>${t.replies || 0}</td>
              <td style="font-family:var(--font-mono);font-size:0.8rem;">${window.esc(t.author || 'anonymous')}</td>
              <td style="font-family:var(--font-mono);font-size:0.8rem;">${window.formatDateFull(t.lastActivityAt)}</td>
              <td class="actions">
                <a class="btn btn-sm btn-secondary" href="#/forum/${catId}/${doc.id}" target="_blank" title="View"><i class="fas fa-eye"></i></a>
                <button class="btn btn-sm ${t.isPinned ? 'btn-outline' : 'btn-secondary'}" onclick="window.togglePin('${doc.id}', ${!t.isPinned})" title="${t.isPinned ? 'Unpin' : 'Pin'}"><i class="fas fa-thumbtack"></i></button>
                <button class="btn btn-sm ${t.isLocked ? 'btn-outline' : 'btn-secondary'}" onclick="window.toggleLock('${doc.id}', ${!t.isLocked})" title="${t.isLocked ? 'Unlock' : 'Lock'}"><i class="fas ${t.isLocked ? 'fa-unlock' : 'fa-lock'}"></i></button>
                <button class="btn btn-sm btn-danger" onclick="window.deleteThread('${doc.id}')" title="Delete"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`;
          });
          body.innerHTML = html;
        }).catch(e => {
          const body = window.$('manageThreadsBody'); if (body) body.innerHTML = '<tr><td colspan="5" class="table-empty"><i class="fas fa-exclamation-triangle"></i> Failed to load threads</td></tr>';
          window.toast('Failed to load threads: ' + (e.message || e), 'error');
        });
    }

    refresh();
  }

  // === ADMIN FORUM ===
  window.adminForum = function() {
    let html = `
      <div class="admin-header">
        <h2><i class="fas fa-comments"></i> Forum Management</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-primary btn-sm" onclick="window.showCategoryModal(null, 'forum')"><i class="fas fa-plus"></i> New Category</button>
          <button class="btn btn-secondary btn-sm" onclick="window.refreshAllCategories()"><i class="fas fa-sync"></i> Refresh Categories</button>
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

    setTimeout(() => { window.loadAdminForumCategories(); window.loadAdminForum(); }, 200);
    return html;
  }

  window.loadAdminForum = function() {
    dbx.forumThreads.orderBy('lastActivityAt', 'desc').limit(20).get()
      .then(snap => {
        const body = window.$('adminForumBody');
        if (!body) return;
        if (snap.empty) {
          body.innerHTML = '<tr><td colspan="5" class="table-empty">No threads</td></tr>';
          return;
        }
        let html = '';
        snap.forEach(doc => {
          const t = doc.data();
          html += `<tr>
            <td><strong>${window.esc(t.title)}</strong> ${t.isPinned ? '<span style="color:var(--accent-orange);font-size:0.75rem;">PINNED</span>' : ''} ${t.isLocked ? '<span style="color:var(--accent-red);font-size:0.75rem;">LOCKED</span>' : ''}</td>
            <td>${window.esc(t.categoryId || 'N/A')}</td>
            <td>${t.replies || 0}</td>
            <td style="font-family:var(--font-mono);font-size:0.8rem;">${window.esc(t.author || 'anonymous')}</td>
            <td class="actions">
              <button class="btn btn-sm ${t.isPinned ? 'btn-outline' : 'btn-secondary'}" onclick="window.togglePin('${doc.id}', ${!t.isPinned})" title="${t.isPinned ? 'Unpin' : 'Pin'}"><i class="fas fa-thumbtack"></i></button>
              <button class="btn btn-sm ${t.isLocked ? 'btn-outline' : 'btn-secondary'}" onclick="window.toggleLock('${doc.id}', ${!t.isLocked})" title="${t.isLocked ? 'Unlock' : 'Lock'}"><i class="fas ${t.isLocked ? 'fa-unlock' : 'fa-lock'}"></i></button>
              <button class="btn btn-sm btn-danger" onclick="window.deleteThread('${doc.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`;
        });
        body.innerHTML = html;
      }).catch(e => console.error('adminForum:', e));
  }

  window.togglePin = function(id, pin) {
    dbx.forumThreads.doc(id).update({ isPinned: pin })
      .then(() => { window.toast(pin ? 'Pinned!' : 'Unpinned', 'success'); window.loadAdminForum(); });
  };
  window.toggleLock = function(id, lock) {
    dbx.forumThreads.doc(id).update({ isLocked: lock })
      .then(() => { window.toast(lock ? 'Locked!' : 'Unlocked', 'success'); window.loadAdminForum(); });
  };
  window.deleteThread = function(id) {
    if (!confirm('Delete this thread permanently?')) return;
    dbx.forumThreads.doc(id).get().then(doc => {
      const catId = doc.data().categoryId;
      dbx.forumThreads.doc(id).delete().then(() => {
        if (catId) dbx.forumCategories.doc(catId).update({ threadCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
        window.toast('Thread deleted', 'success');
        window.loadAdminForum();
      });
    });
  };

  window.attachForumAdminHandlers = function() {
    window.loadAdminForumCategories();
    window.loadAdminForum();

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

    function debounce(fn, wait = 200){ let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); }; }

    const catSearchEl = window.$('adminCatSearch');
    if (catSearchEl) {
      catSearchEl.addEventListener('input', debounce(() => {
        const q = (catSearchEl.value || '').trim().toLowerCase();
        document.querySelectorAll('#adminForumCatBody tr').forEach(row => {
          const text = (row.textContent || '').toLowerCase();
          row.style.display = q ? (text.includes(q) ? '' : 'none') : '';
        });
      }));
    }

    const threadSearchEl = window.$('adminThreadSearch');
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
  window.renderProfile = function(main) {
    if (!window.currentUser) { window.router.navigate('/login'); return; }
    main.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading profile...</p></div>';

    Promise.all([
      db.collection('profiles').doc(window.currentUser.uid).get(),
      dbx.forumThreads.where('authorId', '==', window.currentUser.uid).get().catch(() => ({ size: 0 })),
      dbx.forumReplies.where('authorId', '==', window.currentUser.uid).get().catch(() => ({ size: 0 }))
    ]).then(([profileDoc, threadsSnap, repliesSnap]) => {
      const p = profileDoc.exists ? profileDoc.data() : {};
      const threadCount = threadsSnap.size || 0;
      const replyCount = repliesSnap.size || 0;
      const initial = window.getUserInitial(p, window.currentUser);
      const normalizedLinks = window.normalizeProfileLinks(p.links);
      const linksHtml = Object.keys(normalizedLinks).length ? `
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          ${normalizedLinks.github ? `<a href="${window.esc(normalizedLinks.github)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-github"></i></a>` : ''}
          ${normalizedLinks.twitter ? `<a href="${window.esc(normalizedLinks.twitter)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-x-twitter"></i></a>` : ''}
          ${normalizedLinks.website ? `<a href="${window.esc(normalizedLinks.website)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fas fa-globe"></i></a>` : ''}
          ${normalizedLinks.youtube ? `<a href="${window.esc(normalizedLinks.youtube)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-youtube"></i></a>` : ''}
        </div>` : '';

      main.innerHTML = `
        <div class="page-header"><div class="header-icon"><i class="fas fa-user"></i></div><h1>My Profile</h1></div>
        <div class="profile-shell">

          <div class="profile-hero-card">
            <div class="profile-hero-bg"></div>
            ${window.renderAvatar(p, window.currentUser)}
            <h2 class="profile-name">${window.esc(window.getDisplayName(p, window.currentUser))}</h2>
            <p class="profile-email">${window.esc(p.email || '')}</p>
            <p class="profile-bio">${window.esc(p.bio || 'No bio yet.')}</p>
            ${p.role === 'admin' ? '<span class="admin-badge"><i class="fas fa-crown"></i> Administrator</span>' : ''}
            ${Object.keys(normalizedLinks).length ? `<div class="profile-links-wrap">${linksHtml}</div>` : ''}
          </div>

          <div class="admin-stats profile-stats">
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-comments"></i></div><div class="stat-number">${threadCount}</div><div class="stat-desc">Forum Threads</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-reply"></i></div><div class="stat-number">${replyCount}</div><div class="stat-desc">Replies</div></div>
            <div class="admin-stat"><div class="stat-icon"><i class="fas fa-calendar"></i></div><div class="stat-number">${window.formatDate(p.createdAt)}</div><div class="stat-desc">Member Since</div></div>
          </div>

          ${window.currentUserRole === 'admin' ? `
          <div class="profile-section-card">
            <h3 class="profile-section-title"><i class="fas fa-crown" style="color:var(--accent-orange);"></i> Admin Panel</h3>
            <div class="admin-action-grid">
              <a class="btn btn-primary" href="#/admin/dashboard"><i class="fas fa-chart-simple"></i> Dashboard</a>
              <a class="btn btn-secondary" href="#/admin/blog"><i class="fas fa-feather-alt"></i> Blog Posts</a>
              <a class="btn btn-secondary" href="#/admin/vlog"><i class="fas fa-video"></i> Vlog</a>
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
                  <input type="text" class="form-input" id="pName" value="${window.esc(p.displayName || '')}" placeholder="Your display name" required>
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                  <label for="pBio">Bio / Description</label>
                  <textarea class="form-textarea" id="pBio" placeholder="Tell us about yourself..." style="min-height:80px;">${window.esc(p.bio || '')}</textarea>
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                  <label for="pAvatar">Avatar URL</label>
                  <input type="url" class="form-input" id="pAvatar" value="${window.esc(p.avatar || '')}" placeholder="https://example.com/avatar.jpg">
                </div>
                <div class="form-group">
                  <label for="pGithub"><i class="fab fa-github"></i> GitHub</label>
                  <input type="url" class="form-input" id="pGithub" value="${window.esc(p.links?.github || '')}" placeholder="https://github.com/username">
                </div>
                <div class="form-group">
                  <label for="pTwitter"><i class="fab fa-x-twitter"></i> Twitter / X</label>
                  <input type="url" class="form-input" id="pTwitter" value="${window.esc(p.links?.twitter || '')}" placeholder="https://x.com/username">
                </div>
                <div class="form-group">
                  <label for="pYoutube"><i class="fab fa-youtube"></i> YouTube</label>
                  <input type="url" class="form-input" id="pYoutube" value="${window.esc(p.links?.youtube || '')}" placeholder="https://youtube.com/@channel">
                </div>
                <div class="form-group">
                  <label for="pWebsite"><i class="fas fa-globe"></i> Website</label>
                  <input type="url" class="form-input" id="pWebsite" value="${window.esc(p.links?.website || '')}" placeholder="https://yourwebsite.com">
                </div>
              </div>
              <button type="submit" class="btn btn-primary" id="saveProfileBtn" style="width:100%;justify-content:center;margin-top:8px;"><i class="fas fa-save"></i> Save Changes</button>
            </form>
          </div>

          <div class="profile-section-card">
            <h3 class="profile-section-title"><i class="fas fa-lock"></i> Security</h3>
            <div class="security-actions">
              <button type="button" class="btn btn-secondary" onclick="window.showChangePassword()"><i class="fas fa-key"></i> Change Password</button>
            </div>
          </div>

          ${window.currentUserRole !== 'admin' ? `
          <div class="profile-section-card danger-zone">
            <h3 class="profile-section-title"><i class="fas fa-triangle-exclamation"></i> Danger Zone</h3>
            <p class="danger-zone-text">Delete your own account permanently. Your profile will be removed and your forum posts will be anonymized to protect the rest of the discussion history.</p>
            <button type="button" class="btn btn-danger" onclick="window.showDeleteAccount()"><i class="fas fa-user-slash"></i> Delete My Account</button>
          </div>
          ` : ''}

        </div>`;

      window.$('profileForm').addEventListener('submit', e => {
        e.preventDefault();
        const btn = window.$('saveProfileBtn');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        const profileUpdate = {
          displayName: window.$('pName').value.trim(),
          bio: window.$('pBio').value.trim(),
          avatar: window.$('pAvatar').value.trim(),
          links: window.normalizeProfileLinks({
            github: window.$('pGithub').value.trim(),
            twitter: window.$('pTwitter').value.trim(),
            youtube: window.$('pYoutube').value.trim(),
            website: window.$('pWebsite').value.trim()
          })
        };

        if (!profileUpdate.displayName) {
          window.toast('Display name is required.', 'error');
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
          return;
        }

        db.collection('profiles').doc(window.currentUser.uid).set(profileUpdate, { merge: true }).then(() => {
          window.currentUserProfile = { ...(window.currentUserProfile || {}), ...profileUpdate };
          window.currentUserRole = window.resolveUserRole(window.currentUserProfile, window.currentUser);
          window.updateAuthNav();
          return window.syncPublicProfileSafely(window.currentUser.uid, window.currentUserProfile);
        }).then(() => {
          window.toast('Profile updated!', 'success');
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
          window.renderProfile(main);
        }).catch(e => {
          window.toast('Failed: ' + e.message, 'error');
          btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        });
      });
    }).catch(e => { main.innerHTML = '<div class="no-posts"><p>Failed to load profile.</p></div>'; console.error(e); });
  }

  window.renderProfilePublic = function(main, uid) {
    main.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading profile...</p></div>';
    dbx.publicProfiles.doc(uid).get().then(doc => {
      if (!doc.exists) { main.innerHTML = '<div class="no-posts"><i class="fas fa-user"></i><p>User not found.</p></div>'; return; }
      const p = doc.data();
      const initial = window.getUserInitial(p);
      const normalizedLinks = window.normalizeProfileLinks(p.links);
      main.innerHTML = `
        <div class="profile-public-shell">
          <div class="profile-hero-card profile-public-card">
            <div class="profile-hero-bg"></div>
            ${window.renderAvatar(p)}
            <h2 class="profile-name">${window.esc(window.getDisplayName(p))}</h2>
            <p class="profile-bio">${window.esc(p.bio || '')}</p>
            ${p.role === 'admin' ? '<span class="admin-badge"><i class="fas fa-crown"></i> Administrator</span>' : ''}
            ${Object.keys(normalizedLinks).length ? `<div class="profile-links-wrap" style="margin-top:16px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
              ${normalizedLinks.github ? `<a href="${window.esc(normalizedLinks.github)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-github"></i></a>` : ''}
              ${normalizedLinks.twitter ? `<a href="${window.esc(normalizedLinks.twitter)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-x-twitter"></i></a>` : ''}
              ${normalizedLinks.website ? `<a href="${window.esc(normalizedLinks.website)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fas fa-globe"></i></a>` : ''}
              ${normalizedLinks.youtube ? `<a href="${window.esc(normalizedLinks.youtube)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary"><i class="fab fa-youtube"></i></a>` : ''}
            </div>` : ''}
          </div>
          <div style="text-align:center;margin-top:16px;">
            <a class="btn btn-sm btn-secondary" href="#/forum"><i class="fas fa-arrow-left"></i> Back to Forum</a>
          </div>
        </div>`;
    }).catch(() => { main.innerHTML = '<div class="no-posts"><p>User not found.</p></div>'; });
  }

  window.showChangePassword = function() {
    if (!window.currentUser) return;
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
    window.$('pwForm').addEventListener('submit', e => {
      e.preventDefault();
      const oldPw = window.$('oldPw').value, newPw = window.$('newPw').value, confirmPw = window.$('confirmPw').value;
      if (newPw !== confirmPw) { window.toast('Passwords do not match.', 'error'); return; }
      if (newPw.length < 6) { window.toast('Password too short.', 'error'); return; }
      const btn = window.$('pwBtn'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
      const cred = firebase.auth.EmailAuthProvider.credential(window.currentUser.email, oldPw);
      window.currentUser.reauthenticateWithCredential(cred).then(() => window.currentUser.updatePassword(newPw))
        .then(() => { window.toast('Password changed!', 'success'); overlay.remove(); })
        .catch(e => { window.toast(e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Update Password'; });
    });
  };

  window.anonymizeUserContent = async function(uid) {
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
    if (!window.currentUser) return;
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

    window.$('deleteAccountForm').addEventListener('submit', async e => {
      e.preventDefault();
      const confirmText = window.$('deleteConfirmText').value.trim();
      const password = window.$('deletePassword').value;
      const btn = window.$('deleteAccountBtn');

      if (confirmText !== 'DELETE') {
        window.toast('Type DELETE exactly to continue.', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

      try {
        const user = window.currentUser;
        const uid = user.uid;
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(cred);
        await window.anonymizeUserContent(uid);
        await Promise.allSettled([
          db.collection('profiles').doc(uid).delete(),
          dbx.publicProfiles.doc(uid).delete()
        ]);
        await user.delete();
        window.currentUserProfile = null;
        window.currentUserRole = null;
        window.toast('Your account has been deleted.', 'success');
        overlay.remove();
        window.router.navigate('/');
      } catch (err) {
        window.toast(err.message || 'Failed to delete account.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i> Permanently Delete Account';
      }
    });
  };

})();
