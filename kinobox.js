(function (window, document) {
  'use strict';

  var VERSION = '3.1.0';
  var INSTANCE_KEY = '__kinoboxInstance';

  var DEFAULT_PROVIDERS = [
    { id: 'collaps', title: 'Collaps', accent: '#8b5cf6' },
    { id: 'alloha', title: 'Alloha', accent: '#06b6d4' },
    { id: 'hdvb', title: 'HDVB', accent: '#22c55e' },
    { id: 'kodik', title: 'Kodik', accent: '#f97316' },
    { id: 'videocdn', title: 'VideoCDN', accent: '#ec4899' },
    { id: 'bazon', title: 'Bazon', accent: '#facc15' },
    { id: 'ashdi', title: 'Ashdi', accent: '#38bdf8' }
  ];

  var DEFAULT_OPTIONS = {
    selector: '[data-kinobox], #kinobox, .kinobox',
    title: 'KinoFlex',
    subtitle: 'Выберите доступный источник для просмотра',
    poster: '',
    theme: 'aurora',
    autoplay: false,
    startSource: '',
    sources: [],
    providers: DEFAULT_PROVIDERS,
    allowFullscreen: true,
    allowPictureInPicture: true,
    referrerPolicy: 'origin',
    sandbox: 'allow-forms allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts',
    emptyTitle: 'Источник не подключён',
    emptyText: 'Передайте ссылку на iframe через data-source-collaps, data-source-kodik, параметр sources или window.KinoboxConfig.',
    openLabel: 'Открыть',
    copyLabel: 'Ссылка',
    fullscreenLabel: 'Во весь экран'
  };

  function assign(target) {
    var i;
    var key;
    var source;

    for (i = 1; i < arguments.length; i += 1) {
      source = arguments[i];
      if (!source) {
        continue;
      }

      for (key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  }

  function toArray(value) {
    return Array.prototype.slice.call(value || []);
  }

  function normalizeId(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isSafeUrl(value) {
    var url = String(value || '').trim();

    if (!url) {
      return false;
    }

    if (/^(https?:)?\/\//i.test(url)) {
      return true;
    }

    if (/^\//.test(url) && !/^\/\//.test(url)) {
      return true;
    }

    return false;
  }

  function safeJsonParse(value, fallback) {
    if (!value) {
      return fallback;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function readQuery() {
    var result = {};
    var search = window.location && window.location.search ? window.location.search.slice(1) : '';
    var parts;
    var i;
    var pair;
    var key;
    var value;

    if (!search) {
      return result;
    }

    parts = search.split('&');
    for (i = 0; i < parts.length; i += 1) {
      if (!parts[i]) {
        continue;
      }

      pair = parts[i].split('=');
      key = decodeURIComponent(pair[0] || '').trim();
      value = decodeURIComponent((pair.slice(1).join('=') || '').replace(/\+/g, ' ')).trim();

      if (key) {
        result[key] = value;
      }
    }

    return result;
  }

  function datasetValue(element, name) {
    if (!element || !element.dataset) {
      return '';
    }

    return element.dataset[name] || '';
  }

  function kebabToDatasetKey(value) {
    return String(value || '').replace(/-([a-z])/g, function (_, letter) {
      return letter.toUpperCase();
    });
  }

  function interpolate(template, data) {
    return String(template || '').replace(/\{([a-zA-Z0-9_-]+)\}/g, function (_, key) {
      return encodeURIComponent(data[key] || '');
    });
  }

  function mergeProvider(provider, override) {
    var merged = assign({}, provider || {}, override || {});
    merged.id = normalizeId(merged.id || merged.title);
    merged.title = merged.title || merged.id;
    merged.accent = merged.accent || '#8b5cf6';
    return merged;
  }

  function collectSources(root, options) {
    var query = readQuery();
    var identity = {
      kinopoisk: options.kinopoisk || datasetValue(root, 'kinopoisk') || datasetValue(root, 'kp') || query.kinopoisk || query.kp || '',
      kp: options.kp || datasetValue(root, 'kp') || datasetValue(root, 'kinopoisk') || query.kp || query.kinopoisk || '',
      imdb: options.imdb || datasetValue(root, 'imdb') || query.imdb || '',
      title: options.movieTitle || options.contentTitle || datasetValue(root, 'movieTitle') || datasetValue(root, 'contentTitle') || query.title || ''
    };
    var providerMap = {};
    var sources = [];
    var rawSources = [];
    var providers = options.providers && options.providers.length ? options.providers : DEFAULT_PROVIDERS;
    var jsonSources = safeJsonParse(datasetValue(root, 'sources'), null);
    var i;
    var provider;
    var item;
    var id;
    var key;
    var template;
    var src;
    var singleSource;

    for (i = 0; i < providers.length; i += 1) {
      provider = mergeProvider(providers[i]);
      if (provider.id) {
        providerMap[provider.id] = provider;
      }
    }

    if (options.sources && options.sources.length) {
      rawSources = rawSources.concat(options.sources);
    }

    if (jsonSources && jsonSources.length) {
      rawSources = rawSources.concat(jsonSources);
    }

    singleSource = options.source || options.src || datasetValue(root, 'source') || datasetValue(root, 'src') || query.src || '';
    if (singleSource) {
      rawSources.push({ id: 'custom', title: 'Custom', src: singleSource, accent: '#8b5cf6' });
    }

    for (i = 0; i < providers.length; i += 1) {
      provider = mergeProvider(providers[i]);
      key = 'source' + provider.id.charAt(0).toUpperCase() + provider.id.slice(1);
      src = datasetValue(root, kebabToDatasetKey(key));

      if (!src) {
        src = datasetValue(root, provider.id);
      }

      if (!src && options[provider.id]) {
        src = options[provider.id];
      }

      template = provider.template || provider.urlTemplate || '';
      if (!src && template) {
        src = interpolate(template, identity);
      }

      if (src) {
        rawSources.push(assign({}, provider, { src: src }));
      }
    }

    for (i = 0; i < rawSources.length; i += 1) {
      item = rawSources[i];
      if (typeof item === 'string') {
        item = { id: 'source-' + (i + 1), title: 'Источник ' + (i + 1), src: item };
      }

      id = normalizeId(item.id || item.name || item.title || 'source-' + (i + 1));
      provider = providerMap[id] || {};
      src = item.src || item.url || item.iframe || item.embed || '';

      sources.push(mergeProvider(provider, assign({}, item, {
        id: id,
        src: isSafeUrl(src) ? src : '',
        enabled: isSafeUrl(src),
        title: item.title || item.name || provider.title || id
      })));
    }

    if (!sources.length) {
      for (i = 0; i < providers.length; i += 1) {
        provider = mergeProvider(providers[i]);
        provider.enabled = false;
        provider.src = '';
        sources.push(provider);
      }
    }

    return sources;
  }

  function requestFullscreen(element) {
    if (!element) {
      return;
    }

    if (element.requestFullscreen) {
      element.requestFullscreen();
      return;
    }

    if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
      return;
    }

    if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }

    return new Promise(function (resolve, reject) {
      var input = document.createElement('textarea');
      input.value = value;
      input.setAttribute('readonly', 'readonly');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();

      try {
        document.execCommand('copy');
        document.body.removeChild(input);
        resolve();
      } catch (error) {
        document.body.removeChild(input);
        reject(error);
      }
    });
  }

  function KinoboxInstance(root, options) {
    this.root = root;
    this.options = assign({}, DEFAULT_OPTIONS, options || {});
    this.sources = collectSources(root, this.options);
    this.activeSource = null;
    this.elements = {};
    this.destroyed = false;
    this.handleKeydown = this.handleKeydown.bind(this);
    this.render();
    this.bind();
    this.selectInitialSource();
  }

  KinoboxInstance.prototype.render = function () {
    var options = this.options;
    var posterStyle = options.poster ? ' style="--kb-poster: url(' + escapeHtml(options.poster) + ')"' : '';
    var html = '';

    this.root.classList.add('kinobox');
    this.root.setAttribute('data-theme', options.theme || 'aurora');

    html += '<section class="kb-shell"' + posterStyle + '>';
    html += '<div class="kb-ambient" aria-hidden="true"></div>';
    html += '<header class="kb-header">';
    html += '<div class="kb-brand">';
    html += '<span class="kb-logo" aria-hidden="true"><span></span></span>';
    html += '<div class="kb-heading">';
    html += '<strong class="kb-title">' + escapeHtml(options.title) + '</strong>';
    html += '<span class="kb-subtitle">' + escapeHtml(options.subtitle) + '</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="kb-badges">';
    html += '<span class="kb-badge">HD</span>';
    html += '<span class="kb-badge kb-badge-live">Online</span>';
    html += '</div>';
    html += '</header>';
    html += '<div class="kb-stage" data-state="idle">';
    html += '<div class="kb-frame-wrap">';
    html += '<iframe class="kb-frame" title="KinoFlex player" loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    html += '<div class="kb-loader" aria-hidden="true"><span></span><span></span><span></span></div>';
    html += '<div class="kb-empty" role="status">';
    html += '<div class="kb-empty-icon" aria-hidden="true">▶</div>';
    html += '<strong>' + escapeHtml(options.emptyTitle) + '</strong>';
    html += '<p>' + escapeHtml(options.emptyText) + '</p>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '<footer class="kb-controls">';
    html += '<div class="kb-source-panel">';
    html += '<span class="kb-label">Источники</span>';
    html += '<div class="kb-sources" role="tablist" aria-label="Источники видео"></div>';
    html += '</div>';
    html += '<div class="kb-actions">';
    html += '<button class="kb-action" type="button" data-action="copy">' + escapeHtml(options.copyLabel) + '</button>';
    html += '<button class="kb-action" type="button" data-action="open">' + escapeHtml(options.openLabel) + '</button>';
    html += '<button class="kb-action kb-action-primary" type="button" data-action="fullscreen">' + escapeHtml(options.fullscreenLabel) + '</button>';
    html += '</div>';
    html += '</footer>';
    html += '<div class="kb-status" aria-live="polite"></div>';
    html += '</section>';

    this.root.innerHTML = html;
    this.elements.shell = this.root.querySelector('.kb-shell');
    this.elements.stage = this.root.querySelector('.kb-stage');
    this.elements.frame = this.root.querySelector('.kb-frame');
    this.elements.sources = this.root.querySelector('.kb-sources');
    this.elements.status = this.root.querySelector('.kb-status');
    this.elements.empty = this.root.querySelector('.kb-empty');
    this.elements.loader = this.root.querySelector('.kb-loader');
    this.renderSources();
  };

  KinoboxInstance.prototype.renderSources = function () {
    var html = '';
    var i;
    var source;

    for (i = 0; i < this.sources.length; i += 1) {
      source = this.sources[i];
      html += '<button class="kb-source" type="button" role="tab" data-source="' + escapeHtml(source.id) + '" style="--kb-accent: ' + escapeHtml(source.accent || '#8b5cf6') + '" aria-selected="false"';
      if (!source.enabled) {
        html += ' disabled aria-disabled="true"';
      }
      html += '>';
      html += '<span class="kb-source-dot" aria-hidden="true"></span>';
      html += '<span class="kb-source-name">' + escapeHtml(source.title) + '</span>';
      if (!source.enabled) {
        html += '<span class="kb-source-state">нет ссылки</span>';
      }
      html += '</button>';
    }

    this.elements.sources.innerHTML = html;
  };

  KinoboxInstance.prototype.bind = function () {
    var self = this;

    this.elements.sources.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.kb-source') : null;
      if (!button || button.disabled) {
        return;
      }
      self.selectSource(button.getAttribute('data-source'));
    });

    this.root.addEventListener('click', function (event) {
      var action = event.target.closest ? event.target.closest('[data-action]') : null;
      if (!action) {
        return;
      }
      self.runAction(action.getAttribute('data-action'));
    });

    this.elements.frame.addEventListener('load', function () {
      if (self.activeSource && self.activeSource.enabled) {
        self.setState('ready');
      }
    });

    document.addEventListener('keydown', this.handleKeydown);
  };

  KinoboxInstance.prototype.handleKeydown = function (event) {
    var enabled = this.getEnabledSources();
    var currentIndex;

    if (this.destroyed || !this.root.contains(document.activeElement)) {
      return;
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    if (!enabled.length) {
      return;
    }

    currentIndex = enabled.indexOf(this.activeSource);
    if (event.key === 'ArrowRight') {
      currentIndex = currentIndex + 1;
      if (currentIndex >= enabled.length) {
        currentIndex = 0;
      }
    } else {
      currentIndex = currentIndex - 1;
      if (currentIndex < 0) {
        currentIndex = enabled.length - 1;
      }
    }

    event.preventDefault();
    this.selectSource(enabled[currentIndex].id);
  };

  KinoboxInstance.prototype.getEnabledSources = function () {
    var result = [];
    var i;

    for (i = 0; i < this.sources.length; i += 1) {
      if (this.sources[i].enabled) {
        result.push(this.sources[i]);
      }
    }

    return result;
  };

  KinoboxInstance.prototype.findSource = function (id) {
    var normalized = normalizeId(id);
    var i;

    for (i = 0; i < this.sources.length; i += 1) {
      if (this.sources[i].id === normalized) {
        return this.sources[i];
      }
    }

    return null;
  };

  KinoboxInstance.prototype.selectInitialSource = function () {
    var query = readQuery();
    var requested = this.options.startSource || datasetValue(this.root, 'startSource') || query.source || '';
    var source = requested ? this.findSource(requested) : null;
    var enabled = this.getEnabledSources();

    if (!source || !source.enabled) {
      source = enabled.length ? enabled[0] : null;
    }

    if (source) {
      this.selectSource(source.id);
    } else {
      this.setState('empty');
      this.updateButtons('');
    }
  };

  KinoboxInstance.prototype.selectSource = function (id) {
    var source = this.findSource(id);

    if (!source || !source.enabled) {
      this.setState('empty');
      return;
    }

    this.activeSource = source;
    this.updateButtons(source.id);
    this.setState('loading');
    this.elements.frame.removeAttribute('src');
    this.elements.frame.setAttribute('referrerpolicy', this.options.referrerPolicy);
    this.elements.frame.setAttribute('sandbox', this.options.sandbox);
    this.elements.frame.src = source.src;
    this.showStatus('Открыт источник ' + source.title);
  };

  KinoboxInstance.prototype.updateButtons = function (id) {
    var buttons = toArray(this.root.querySelectorAll('.kb-source'));
    var i;
    var active;

    for (i = 0; i < buttons.length; i += 1) {
      active = buttons[i].getAttribute('data-source') === id;
      buttons[i].classList.toggle('is-active', active);
      buttons[i].setAttribute('aria-selected', active ? 'true' : 'false');
    }
  };

  KinoboxInstance.prototype.setState = function (state) {
    this.elements.stage.setAttribute('data-state', state);
  };

  KinoboxInstance.prototype.showStatus = function (message) {
    var status = this.elements.status;
    status.textContent = message;
    status.classList.add('is-visible');
    window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(function () {
      status.classList.remove('is-visible');
    }, 2200);
  };

  KinoboxInstance.prototype.runAction = function (action) {
    var source = this.activeSource;
    var self = this;

    if (action === 'fullscreen') {
      requestFullscreen(this.elements.shell);
      return;
    }

    if (!source || !source.src) {
      this.showStatus('Сначала выберите источник');
      return;
    }

    if (action === 'open') {
      window.open(source.src, '_blank', 'noopener,noreferrer');
      return;
    }

    if (action === 'copy') {
      copyText(source.src).then(function () {
        self.showStatus('Ссылка скопирована');
      }).catch(function () {
        self.showStatus('Не удалось скопировать ссылку');
      });
    }
  };

  KinoboxInstance.prototype.update = function (options) {
    this.options = assign({}, this.options, options || {});
    this.sources = collectSources(this.root, this.options);
    this.render();
    this.bind();
    this.selectInitialSource();
    return this;
  };

  KinoboxInstance.prototype.destroy = function () {
    document.removeEventListener('keydown', this.handleKeydown);
    window.clearTimeout(this.statusTimer);
    this.elements.frame.removeAttribute('src');
    this.root.innerHTML = '';
    this.root.classList.remove('kinobox');
    this.destroyed = true;
    this.root[INSTANCE_KEY] = null;
  };

  function createInstance(root, options) {
    if (!root) {
      throw new Error('Kinobox: mount element not found');
    }

    if (root[INSTANCE_KEY]) {
      return root[INSTANCE_KEY].update(options || {});
    }

    root[INSTANCE_KEY] = new KinoboxInstance(root, options || {});
    return root[INSTANCE_KEY];
  }

  function init(selectorOrOptions, maybeOptions) {
    var selector = DEFAULT_OPTIONS.selector;
    var options = {};
    var nodes;
    var instances = [];
    var i;

    if (typeof selectorOrOptions === 'string') {
      selector = selectorOrOptions;
      options = maybeOptions || {};
    } else if (selectorOrOptions && selectorOrOptions.nodeType === 1) {
      return createInstance(selectorOrOptions, maybeOptions || {});
    } else if (selectorOrOptions) {
      options = selectorOrOptions;
      selector = options.selector || selector;
    }

    nodes = toArray(document.querySelectorAll(selector));
    for (i = 0; i < nodes.length; i += 1) {
      instances.push(createInstance(nodes[i], options));
    }

    return instances.length === 1 ? instances[0] : instances;
  }

  function autoInit() {
    var config = window.KinoboxConfig || {};
    var nodes = document.querySelectorAll(config.selector || DEFAULT_OPTIONS.selector);

    if (!nodes.length) {
      return;
    }

    init(config);
  }

  window.Kinobox = {
    version: VERSION,
    init: init,
    create: createInstance,
    defaults: DEFAULT_OPTIONS,
    providers: DEFAULT_PROVIDERS
  };

  window.kinobox = function (selectorOrOptions, maybeOptions) {
    return init(selectorOrOptions, maybeOptions);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})(window, document);
