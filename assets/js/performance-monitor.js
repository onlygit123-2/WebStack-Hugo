/**
 * 性能监控系统
 * 监控Core Web Vitals和其他关键性能指标
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = new Map();
    this.init();
  }

  init() {
    this.setupCoreWebVitals();
    this.setupCustomMetrics();
    this.setupErrorTracking();
    
    // 页面加载完成后报告指标
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.reportMetrics();
      });
    } else {
      this.reportMetrics();
    }
  }

  setupCoreWebVitals() {
    // 监控LCP (Largest Contentful Paint)
    this.observeLCP();
    
    // 监控FID (First Input Delay)
    this.observeFID();
    
    // 监控CLS (Cumulative Layout Shift)
    this.observeCLS();
    
    // 监控FCP (First Contentful Paint)
    this.observeFCP();
  }

  observeLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.metrics.lcp = lastEntry.startTime;
        
        // 性能警告
        if (lastEntry.startTime > 2500) {
          console.warn('⚠️ LCP性能警告:', lastEntry.startTime + 'ms');
          this.optimizeLCP();
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    }
  }

  observeFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          const fid = entry.processingStart - entry.startTime;
          this.metrics.fid = fid;
          
          if (fid > 100) {
            console.warn('⚠️ FID性能警告:', fid + 'ms');
          }
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    }
  }

  observeCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
            
            if (clsValue > 0.1) {
              console.warn('⚠️ CLS性能警告:', clsValue);
            }
          }
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);
    }
  }

  observeFCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries[entries.length - 1];
        this.metrics.fcp = fcp.startTime;
        
        if (fcp.startTime > 1800) {
          console.warn('⚠️ FCP性能警告:', fcp.startTime + 'ms');
        }
      });
      
      observer.observe({ entryTypes: ['first-contentful-paint'] });
      this.observers.set('fcp', observer);
    }
  }

  setupCustomMetrics() {
    // 监控DOM加载时间
    this.metrics.domLoadTime = performance.timing.domContentLoadedEventEnd - performance.timing.domContentLoadedEventStart;
    
    // 监控页面完全加载时间
    this.metrics.pageLoadTime = performance.timing.loadEventEnd - performance.timing.loadEventStart;
    
    // 监控资源加载
    this.observeResourceTiming();
    
    // 监控长任务
    this.observeLongTasks();
  }

  observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 1000) {
            console.warn('⚠️ 慢资源加载:', entry.name, entry.duration + 'ms');
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    }
  }

  observeLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 50) {
            console.warn('⚠️ 长任务检测:', entry.duration + 'ms');
          }
        });
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    }
  }

  setupErrorTracking() {
    // 监控JavaScript错误
    window.addEventListener('error', (event) => {
      this.logError('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // 监控Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', {
        reason: event.reason
      });
    });

    // 监控资源加载失败
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.logError('Resource Load Error', {
          src: event.target.src || event.target.href,
          tagName: event.target.tagName
        });
      }
    }, true);
  }

  optimizeLCP() {
    // 优化LCP的具体措施
    const criticalImages = document.querySelectorAll('img[data-critical]');
    criticalImages.forEach(img => {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    });
    
    // 预加载关键资源
    const criticalLinks = document.querySelectorAll('link[rel="preload"]');
    criticalLinks.forEach(link => {
      if (link.as === 'style') {
        link.rel = 'stylesheet';
      }
    });
  }

  reportMetrics() {
    // 获取导航时间指标
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      this.metrics.navigation = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        firstByte: navigation.responseStart - navigation.requestStart
      };
    }

    // 计算性能分数
    this.calculatePerformanceScore();
    
    // 发送到分析服务
    this.sendToAnalytics();
    
    // 控制台输出
    this.logMetrics();
  }

  calculatePerformanceScore() {
    let score = 100;
    
    // LCP评分
    if (this.metrics.lcp) {
      if (this.metrics.lcp > 2500) score -= 30;
      else if (this.metrics.lcp > 4000) score -= 50;
    }
    
    // FID评分
    if (this.metrics.fid) {
      if (this.metrics.fid > 100) score -= 20;
      else if (this.metrics.fid > 300) score -= 40;
    }
    
    // CLS评分
    if (this.metrics.cls) {
      if (this.metrics.cls > 0.1) score -= 20;
      else if (this.metrics.cls > 0.25) score -= 40;
    }
    
    this.metrics.performanceScore = Math.max(0, score);
  }

  sendToAnalytics() {
    // 发送到Google Analytics
    if (window.gtag) {
      window.gtag('event', 'performance_metrics', {
        event_category: 'Performance',
        event_label: 'Core Web Vitals',
        value: this.metrics.performanceScore,
        custom_map: {
          'lcp': this.metrics.lcp,
          'fid': this.metrics.fid,
          'cls': this.metrics.cls,
          'fcp': this.metrics.fcp
        }
      });
    }
    
    // 发送到百度统计
    if (window._hmt) {
      window._hmt.push(['_trackEvent', 'Performance', 'Core Web Vitals', 
        `Score: ${this.metrics.performanceScore}, LCP: ${this.metrics.lcp}, FID: ${this.metrics.fid}, CLS: ${this.metrics.cls}`]);
    }
  }

  logMetrics() {
    console.group('📊 性能监控报告');
    console.log('🎯 性能分数:', this.metrics.performanceScore + '/100');
    console.log('⚡ LCP:', this.metrics.lcp + 'ms');
    console.log('🎮 FID:', this.metrics.fid + 'ms');
    console.log('📐 CLS:', this.metrics.cls);
    console.log('🎨 FCP:', this.metrics.fcp + 'ms');
    console.log('📄 DOM加载:', this.metrics.domLoadTime + 'ms');
    console.log('🌐 页面加载:', this.metrics.pageLoadTime + 'ms');
    console.groupEnd();
  }

  logError(type, details) {
    console.error(`❌ ${type}:`, details);
    
    // 发送错误到分析服务
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: `${type}: ${details.message || details.reason}`,
        fatal: false
      });
    }
  }

  disconnect() {
    // 清理所有观察器
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

// 初始化性能监控
window.addEventListener('load', () => {
  window.performanceMonitor = new PerformanceMonitor();
});
