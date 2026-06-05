class KinoBox {
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.options = {
      title: options.title || "Неизвестный фильм",
      tmdbId: options.tmdbId || "",
      sources: options.sources || ['Collaps', 'Alloha', 'Kodik', 'VideoCDN', 'HDVB', 'Bazon', 'Ashdi']
    };
    this.currentSource = this.options.sources[0];
    this.init();
  }

  init() {
    if (!this.container) return;
    this.renderLayout();
    this.loadSource(this.currentSource);
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="kinobox-container">
        <div class="movie-info">
          <h1 id="kb-title">${this.options.title}</h1>
          <p>Выберите источник трансляции для начала просмотра</p>
        </div>
        <div class="player-wrapper shadow-lg">
          <iframe id="kinobox-iframe" allowfullscreen></iframe>
        </div>
        <div class="controls-panel" id="kb-controls">
          ${this.options.sources.map(src => `<button class="source-btn" data-source="${src}">${src}</button>`).join('')}
        </div>
      </div>
    `;

    const buttons = this.container.querySelectorAll('.source-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        buttons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.loadSource(e.target.dataset.source);
      });
    });
    
    if (buttons[0]) buttons[0].classList.add('active');
  }

  loadSource(name) {
    const iframe = document.getElementById('kinobox-iframe');
    const urls = {
      'Collaps': `https://api.collaps.org/embed/movie/${this.options.tmdbId}`,
      'Alloha': `https://api.alloha.tv/?id=${this.options.tmdbId}`,
      'Kodik': `https://kodik.info/find?tmdb_id=${this.options.tmdbId}`,
      'VideoCDN': `https://videocdn.tv/api/short?api_token=TOKEN&tmdb_id=${this.options.tmdbId}`,
      'HDVB': `https://api.hdvbx.top/embed/movie/${this.options.tmdbId}`,
      'Bazon': `https://bazon.cc/search?tmdb=${this.options.tmdbId}`,
      'Ashdi': `https://ashdi.vip/api/video/${this.options.tmdbId}`
    };

    if (iframe) {
      iframe.src = urls[name] || '';
    }
  }
}

// Инициализация при готовности DOM
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tmdb = urlParams.get('tmdb') || '550';
  const title = urlParams.get('title') || 'Бойцовский клуб';

  window.kb = new KinoBox('#player', {
    tmdbId: tmdb,
    title: title
  });
});