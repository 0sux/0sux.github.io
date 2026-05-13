(function() {
  'use strict';

  window.renderVlog = function(main) {
    const catFilter = window.allVideoCategories.length
      ? `<div class="category-filter" id="vlogFilter">
          <button class="filter-btn active" data-cat="all">All</button>
          ${window.allVideoCategories.map(c => `<button class="filter-btn" data-cat="${window.esc(c.id)}">${window.esc(c.name)}</button>`).join('')}
        </div>`
      : '';

    main.innerHTML = `
      <div class="page-header">
        <div class="header-icon"><i class="fas fa-video"></i></div>
        <h1>Vlog Library</h1>
        <p>Security talks, tutorials, and walkthroughs</p>
      </div>
      ${catFilter}
      <div class="video-grid" id="vlogList">${window.renderSkeleton(4)}</div>
    `;

    const filterContainer = window.$('vlogFilter');
    if (filterContainer) {
      filterContainer.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        window.qq('.filter-btn', filterContainer).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.loadVlog(btn.dataset.cat);
      });
    }

    window.loadVlog();
  }

  window.loadVlog = function(category = 'all') {
    dbx.videos.get().then(snap => {
        const container = window.$('vlogList');
        if (!container) return;
        let videos = [];
        snap.forEach(doc => {
          const v = doc.data();
          if (category !== 'all' && v.category !== category) return;
          videos.push({ id: doc.id, data: v });
        });
        videos.sort((a, b) => (b.data.createdAt?.seconds || 0) - (a.data.createdAt?.seconds || 0));
        if (!videos.length) {
          container.innerHTML = '<div class="no-posts"><i class="fas fa-video"></i><p>No vlog entries yet.</p></div>';
          return;
        }
        let html = '';
        videos.forEach(({ data: v }) => {
          const embed = window.getEmbedUrl(v.url);
          html += `
            <div class="video-card">
              <div class="video-wrapper">
                <iframe src="${window.esc(embed)}" allowfullscreen loading="lazy" title="${window.esc(v.title)}"></iframe>
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
      .catch(e => {
        console.error('vlog:', e);
        const c = window.$('vlogList');
        if (c) c.innerHTML = '<div class="no-posts"><i class="fas fa-exclamation-triangle"></i><p>Failed to load videos.</p></div>';
      });
  }

})();
