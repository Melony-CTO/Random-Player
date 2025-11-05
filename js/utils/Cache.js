/**
 * Cache - 캐시 관리 모듈
 * 메모리 캐시, 로컬 스토리지 캐시를 관리
 */
class Cache {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemorySize = 50;
    this.storagePrefix = 'melony_cache_';
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24시간
    
    this.init();
  }

  init() {
    console.log('💾 Cache 초기화');
    this.cleanupExpiredItems();
  }

  /**
   * 메모리 캐시에 저장
   * @param {string} key - 키
   * @param {*} value - 값
   * @param {number} ttl - TTL (ms)
   */
  setMemory(key, value, ttl = this.defaultTTL) {
    // 캐시 크기 제한
    if (this.memoryCache.size >= this.maxMemorySize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    const item = {
      value: Utils.deepClone(value),
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    };

    this.memoryCache.set(key, item);
    console.log('💾 메모리 캐시 저장:', key);
  }

  /**
   * 메모리 캐시에서 가져오기
   * @param {string} key - 키
   * @returns {*} 값 또는 null
   */
  getMemory(key) {
    const item = this.memoryCache.get(key);
    
    if (!item) {
      return null;
    }

    // 만료 확인
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return Utils.deepClone(item.value);
  }

  /**
   * 메모리 캐시에서 삭제
   * @param {string} key - 키
   */
  deleteMemory(key) {
    this.memoryCache.delete(key);
    console.log('💾 메모리 캐시 삭제:', key);
  }

  /**
   * 로컬 스토리지 캐시에 저장
   * @param {string} key - 키
   * @param {*} value - 값
   * @param {number} ttl - TTL (ms)
   */
  setStorage(key, value, ttl = this.defaultTTL) {
    const item = {
      value: value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    };

    const storageKey = this.storagePrefix + key;
    Utils.setLocalStorage(storageKey, item);
    console.log('💾 스토리지 캐시 저장:', key);
  }

  /**
   * 로컬 스토리지 캐시에서 가져오기
   * @param {string} key - 키
   * @returns {*} 값 또는 null
   */
  getStorage(key) {
    const storageKey = this.storagePrefix + key;
    const item = Utils.getLocalStorage(storageKey, null);
    
    if (!item) {
      return null;
    }

    // 만료 확인
    if (Date.now() > item.expiresAt) {
      Utils.removeLocalStorage(storageKey);
      return null;
    }

    return item.value;
  }

  /**
   * 로컬 스토리지 캐시에서 삭제
   * @param {string} key - 키
   */
  deleteStorage(key) {
    const storageKey = this.storagePrefix + key;
    Utils.removeLocalStorage(storageKey);
    console.log('💾 스토리지 캐시 삭제:', key);
  }

  /**
   * 통합 캐시 저장 (메모리 + 스토리지)
   * @param {string} key - 키
   * @param {*} value - 값
   * @param {number} ttl - TTL (ms)
   * @param {boolean} useStorage - 스토리지 사용 여부
   */
  set(key, value, ttl = this.defaultTTL, useStorage = true) {
    // 메모리 캐시에 저장
    this.setMemory(key, value, ttl);
    
    // 스토리지 캐시에 저장 (선택적)
    if (useStorage) {
      this.setStorage(key, value, ttl);
    }
  }

  /**
   * 통합 캐시 가져오기 (메모리 우선)
   * @param {string} key - 키
   * @returns {*} 값 또는 null
   */
  get(key) {
    // 메모리 캐시에서 먼저 확인
    let value = this.getMemory(key);
    
    if (value !== null) {
      return value;
    }

    // 스토리지 캐시에서 확인
    value = this.getStorage(key);
    
    if (value !== null) {
      // 메모리 캐시에 다시 저장
      this.setMemory(key, value);
      return value;
    }

    return null;
  }

  /**
   * 통합 캐시 삭제
   * @param {string} key - 키
   */
  delete(key) {
    this.deleteMemory(key);
    this.deleteStorage(key);
  }

  /**
   * 만료된 항목 정리
   */
  cleanupExpiredItems() {
    const now = Date.now();
    
    // 메모리 캐시 정리
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiresAt) {
        this.memoryCache.delete(key);
      }
    }

    // 스토리지 캐시 정리
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        const item = Utils.getLocalStorage(key, null);
        if (item && now > item.expiresAt) {
          Utils.removeLocalStorage(key);
        }
      }
    }

    console.log('💾 만료된 캐시 항목 정리 완료');
  }

  /**
   * 모든 캐시 정리
   */
  clear() {
    this.memoryCache.clear();
    
    // 스토리지 캐시 정리
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        Utils.removeLocalStorage(key);
      }
    }

    console.log('💾 모든 캐시 정리 완료');
  }

  /**
   * 캐시 통계
   * @returns {Object} 캐시 통계
   */
  getStats() {
    const memoryStats = {
      size: this.memoryCache.size,
      maxSize: this.maxMemorySize,
      usage: (this.memoryCache.size / this.maxMemorySize) * 100
    };

    let storageCount = 0;
    let storageSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        storageCount++;
        const item = Utils.getLocalStorage(key, null);
        if (item) {
          storageSize += JSON.stringify(item).length;
        }
      }
    }

    const storageStats = {
      count: storageCount,
      size: storageSize
    };

    return {
      memory: memoryStats,
      storage: storageStats,
      total: {
        memoryItems: memoryStats.size,
        storageItems: storageStats.count,
        totalSize: storageStats.size
      }
    };
  }

  /**
   * 캐시 크기 설정
   * @param {number} size - 최대 크기
   */
  setMaxMemorySize(size) {
    this.maxMemorySize = Math.max(1, Math.min(1000, size));
    console.log('💾 최대 메모리 캐시 크기 설정:', this.maxMemorySize);
  }

  /**
   * TTL 설정
   * @param {number} ttl - TTL (ms)
   */
  setDefaultTTL(ttl) {
    this.defaultTTL = Math.max(1000, ttl); // 최소 1초
    console.log('💾 기본 TTL 설정:', this.defaultTTL + 'ms');
  }

  /**
   * 캐시 키 존재 확인
   * @param {string} key - 키
   * @returns {boolean} 존재 여부
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * 캐시 키 목록 가져오기
   * @returns {Array} 키 목록
   */
  keys() {
    const memoryKeys = Array.from(this.memoryCache.keys());
    const storageKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        storageKeys.push(key.substring(this.storagePrefix.length));
      }
    }

    return [...new Set([...memoryKeys, ...storageKeys])];
  }

  /**
   * 캐시 항목 정보 가져오기
   * @param {string} key - 키
   * @returns {Object} 항목 정보
   */
  getItemInfo(key) {
    const memoryItem = this.memoryCache.get(key);
    const storageKey = this.storagePrefix + key;
    const storageItem = Utils.getLocalStorage(storageKey, null);

    return {
      key,
      inMemory: !!memoryItem,
      inStorage: !!storageItem,
      memoryExpiresAt: memoryItem ? memoryItem.expiresAt : null,
      storageExpiresAt: storageItem ? storageItem.expiresAt : null,
      memoryCreatedAt: memoryItem ? memoryItem.createdAt : null,
      storageCreatedAt: storageItem ? storageItem.createdAt : null
    };
  }

  /**
   * 캐시 최적화
   */
  optimize() {
    // 메모리 사용량이 80% 이상이면 오래된 항목부터 삭제
    if (this.memoryCache.size >= this.maxMemorySize * 0.8) {
      const items = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      
      const deleteCount = Math.floor(this.memoryCache.size * 0.2);
      for (let i = 0; i < deleteCount; i++) {
        this.memoryCache.delete(items[i][0]);
      }
      
      console.log('💾 캐시 최적화 완료:', deleteCount + '개 항목 삭제');
    }
  }
}

// 전역으로 내보내기
window.Cache = Cache;