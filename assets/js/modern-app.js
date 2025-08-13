/**
 * 现代化WebStack应用核心模块
 */

class ModernWebStackApp {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    this.setupSearchSystem();
    this.setupImageOptimization();
    
    this.isInitialized = true;
    console.log('🚀 ModernWebStackApp 初始化完成');
  }

  setupEventListeners() {
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    document.addEventListener('scroll', this.debounce(this.handleScroll.bind(this), 16));
    
    const searchInput = document.getElementById('search-text');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(this.handleSearchInput.bind(this), 300));
    }
  }

  handleGlobalClick(event) {
    const target = event.target;
    
    if (target.matches('.sidebar-toggle, .sidebar-toggle *')) {
      this.toggleSidebar();
    }
    
    if (target.matches('.night-mode-toggle, .night-mode-toggle *')) {
      this.toggleNightMode();
    }
  }

  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar-menu');
    if (sidebar) {
      sidebar.classList.toggle('show');
    }
  }

  toggleNightMode() {
    const body = document.body;
    const isNightMode = body.classList.contains('io-black-mode');
    
    if (isNightMode) {
      body.classList.remove('io-black-mode');
      body.classList.add('io-grey-mode');
      localStorage.setItem('theme', 'light');
    } else {
      body.classList.remove('io-grey-mode');
      body.classList.add('io-black-mode');
      localStorage.setItem('theme', 'dark');
    }
  }

  setupSearchSystem() {
    this.searchIndex = null;
    this.initSearchIndex();
  }

  async initSearchIndex() {
    try {
      const webstackData = window.webstackData || [];
      this.searchIndex = this.buildSearchIndex(webstackData);
    } catch (error) {
      console.warn('搜索索引初始化失败:', error);
    }
  }

  buildSearchIndex(data) {
    const index = [];
    data.forEach(category => {
      if (category.list) {
        category.list.forEach(subCategory => {
          subCategory.links.forEach(link => {
            index.push({
              title: link.title,
              description: link.description,
              url: link.url,
              category: subCategory.term,
              searchText: `${link.title} ${link.description} ${subCategory.term}`.toLowerCase()
            });
          });
        });
      }
    });
    return index;
  }

  handleSearchInput(event) {
    const query = event.target.value.trim();
    if (query.length < 2) {
      this.hideSearchResults();
      return;
    }
    
    const results = this.search(query);
    this.showSearchResults(results);
  }

  search(query) {
    if (!this.searchIndex) return [];
    
    const searchTerm = query.toLowerCase();
    return this.searchIndex.filter(item => 
      item.searchText.includes(searchTerm) ||
      item.title.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
  }

  showSearchResults(results) {
    this.hideSearchResults();
    
    if (results.length === 0) return;
    
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;
    
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results';
    resultsContainer.innerHTML = results.map((result, index) => `
      <div class="search-result-item" data-index="${index}" data-url="${result.url}">
        <div class="result-title">${result.title}</div>
        <div class="result-description">${result.description}</div>
      </div>
    `).join('');
    
    searchContainer.appendChild(resultsContainer);
  }

  hideSearchResults() {
    const existingResults = document.querySelector('.search-results');
    if (existingResults) {
      existingResults.remove();
    }
  }

  setupImageOptimization() {
    if ('IntersectionObserver' in window) {
      this.imageObserver = new IntersectionObserver(
        this.handleImageIntersection.bind(this),
        { rootMargin: '50px' }
      );
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        this.imageObserver.observe(img);
      });
    }
  }

  handleImageIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        this.loadImage(img);
        this.imageObserver.unobserve(img);
      }
    });
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;
    
    if (this.supportsWebP()) {
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      this.loadImageWithFallback(img, webpSrc, src);
    } else {
      img.src = src;
    }
  }

  loadImageWithFallback(img, primarySrc, fallbackSrc) {
    const testImg = new Image();
    testImg.onload = () => { img.src = primarySrc; };
    testImg.onerror = () => { img.src = fallbackSrc; };
    testImg.src = primarySrc;
  }

  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  handleScroll() {
    const scrollTop = window.pageYOffset;
    const header = document.querySelector('.page-header');
    
    if (header) {
      if (scrollTop > 100) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.webstackApp = new ModernWebStackApp();
});
