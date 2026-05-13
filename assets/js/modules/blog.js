(function() {
  'use strict';

  window.renderBlog = function(main) {
    const catFilter = window.allBlogCategories.length
      ? `<div class="category-filter" id="blogFilter">
          <button class="filter-btn active" data-cat="all">All</button>
          ${window.allBlogCategories.map(c => `<button class="filter-btn" data-cat="${window.esc(c.id)}">${window.esc(c.name)}</button>`).join('')}
        </div>`
      : '';

    main.innerHTML = `
      <div class="page-header">
        <div class="header-icon"><i class="fas fa-feather-alt"></i></div>
        <h1>Research Blog</h1>
        <p>Cybersecurity research, writeups, and technical deep dives</p>
      </div>
      ${catFilter}
      <div class="blog-grid" id="blogList">${window.renderSkeleton(6)}</div>
    `;

    const filterContainer = window.$('blogFilter');
    if (filterContainer && !filterContainer.dataset.bound) {
      filterContainer.dataset.bound = 'true';
      filterContainer.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.loadBlogPosts(btn.dataset.cat);
      });
    }

    window.loadBlogPosts();
  }

  window.loadBlogPosts = function(category = 'all') {
    dbx.blog.where('published', '==', true).get().then(snap => {
        const container = window.$('blogList');
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
            <div class="blog-card" onclick="window.router.navigate('/blog/${id}')">
              <div class="card-category" style="color:${window.getCategoryColor(p.category)};border:1px solid ${window.getCategoryColor(p.category)}">${window.esc(p.category || 'General')}</div>
              <h3>${window.esc(p.title)}</h3>
              <p>${window.esc(p.excerpt || p.content?.slice(0, 200) || '')}</p>
              <div class="card-meta">
                <span><i class="fas fa-calendar"></i> ${window.formatDate(p.createdAt)}</span>
                <span><i class="fas fa-user"></i> ${window.esc(p.author || 'anonymous')}</span>
              </div>
            </div>`;
        });
        container.innerHTML = html;
      })
      .catch(e => {
        console.error('blogPosts:', e);
        const container = window.$('blogList');
        if (container) container.innerHTML = '<div class="no-posts"><i class="fas fa-exclamation-triangle"></i><p>Failed to load posts.</p></div>';
      });

  }

  window.renderBlogPost = function(main, id) {
    main.innerHTML = `<div class="loading-screen"><div class="loader"></div><p>Loading post...</p></div>`;

    dbx.blog.doc(id).get()
      .then(doc => {
        if (!doc.exists) {
          main.innerHTML = `<div class="no-posts"><i class="fas fa-file-excel"></i><p>Post not found.</p></div>`;
          return;
        }
        const p = doc.data();
        if (!p.published && window.currentUserRole !== 'admin') {
          main.innerHTML = `<div class="no-posts"><i class="fas fa-file-excel"></i><p>Post not found.</p></div>`;
          return;
        }
        const content = window.renderMarkdown(p.content);

        main.innerHTML = `
          <div class="post-container">
            <article>
              <div class="post-header">
                <div class="post-category" style="color:${window.getCategoryColor(p.category)};border:1px solid ${window.getCategoryColor(p.category)};background:${window.getCategoryColor(p.category)}15">${window.esc(p.category || 'General')}</div>
                <h1>${window.esc(p.title)}</h1>
                <div class="post-meta">
                  <span><i class="fas fa-user"></i> ${window.esc(p.author || 'anonymous')}</span>
                  <span><i class="fas fa-calendar"></i> ${window.formatDateFull(p.createdAt)}</span>
                  ${p.updatedAt ? `<span><i class="fas fa-edit"></i> Updated ${window.formatDate(p.updatedAt)}</span>` : ''}
                </div>
                ${p.tags?.length ? `<div class="post-tags">${p.tags.map(t => `<span class="post-tag">#${window.esc(t)}</span>`).join('')}</div>` : ''}
              </div>
              <div class="post-content">${content}</div>
            </article>
            <div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;">
              <a class="btn btn-sm btn-secondary" href="#/blog"><i class="fas fa-arrow-left"></i> Back to Blog</a>
            </div>
          </div>
        `;
        window.highlightCode();
      })
      .catch(() => {
        main.innerHTML = `<div class="no-posts"><i class="fas fa-exclamation-triangle"></i><p>Failed to load post.</p></div>`;
      });
  }

})();
