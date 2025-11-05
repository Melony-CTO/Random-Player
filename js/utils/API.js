/**
 * API - API 통신 관리 모듈
 * 외부 API와의 통신을 담당
 */
class API {
  constructor(config, cache) {
    this.config = config;
    this.cache = cache;
    this.baseUrl = config.get('api.baseUrl');
    this.timeout = config.get('api.timeout', 8000);
    this.retryCount = config.get('api.retryCount', 3);
    this.cacheEnabled = config.get('api.cacheEnabled', true);
    this.cacheTTL = config.get('api.cacheTTL', 24 * 60 * 60 * 1000);
    
    this.init();
  }

  init() {
    console.log('🌐 API 초기화');
    this.setupRequestInterceptors();
  }

  /**
   * 요청 인터셉터 설정
   */
  setupRequestInterceptors() {
    // 요청 전 처리
    this.beforeRequest = (config) => {
      // 로그 마스킹
      if (config.url) {
        config.url = this.maskUrlForLog(config.url);
      }
      return config;
    };

    // 응답 후 처리
    this.afterResponse = (response) => {
      return response;
    };

    // 오류 처리
    this.onError = (error) => {
      console.error('API 오류:', error);
      return error;
    };
  }

  /**
   * URL 마스킹 (로그용)
   * @param {string} url - 원본 URL
   * @returns {string} 마스킹된 URL
   */
  maskUrlForLog(url) {
    if (!url) return url;
    return url.replace(/https:\/\/melony-music-api\.zepplinn25\.workers\.dev/g, 'melony');
  }

  /**
   * 타임아웃이 있는 fetch 요청
   * @param {string} url - 요청 URL
   * @param {Object} options - 요청 옵션
   * @param {number} timeout - 타임아웃 (ms)
   * @returns {Promise} fetch Promise
   */
  fetchWithTimeout(url, options = {}, timeout = this.timeout) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }

  /**
   * 재시도가 있는 요청
   * @param {Function} requestFn - 요청 함수
   * @param {number} retries - 재시도 횟수
   * @returns {Promise} 요청 Promise
   */
  async requestWithRetry(requestFn, retries = this.retryCount) {
    let lastError;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        console.log(`API 요청 실패 (${i + 1}/${retries + 1}):`, error.message);
        
        if (i < retries) {
          // 지수 백오프
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * GET 요청
   * @param {string} endpoint - 엔드포인트
   * @param {Object} options - 요청 옵션
   * @returns {Promise} 응답 Promise
   */
  async get(endpoint, options = {}) {
    const url = this.buildUrl(endpoint);
    const cacheKey = `api_get_${endpoint}_${JSON.stringify(options)}`;
    
    // 캐시 확인
    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('🌐 캐시된 응답 사용:', endpoint);
        return cached;
      }
    }

    const requestOptions = {
      method: 'GET',
      cache: 'default',
      ...options
    };

    const response = await this.requestWithRetry(async () => {
      return await this.fetchWithTimeout(url, requestOptions);
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 캐시 저장
    if (this.cacheEnabled) {
      this.cache.set(cacheKey, data, this.cacheTTL);
    }

    return data;
  }

  /**
   * POST 요청
   * @param {string} endpoint - 엔드포인트
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 요청 옵션
   * @returns {Promise} 응답 Promise
   */
  async post(endpoint, data = {}, options = {}) {
    const url = this.buildUrl(endpoint);
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    };

    const response = await this.requestWithRetry(async () => {
      return await this.fetchWithTimeout(url, requestOptions);
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * PUT 요청
   * @param {string} endpoint - 엔드포인트
   * @param {Object} data - 요청 데이터
   * @param {Object} options - 요청 옵션
   * @returns {Promise} 응답 Promise
   */
  async put(endpoint, data = {}, options = {}) {
    const url = this.buildUrl(endpoint);
    
    const requestOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    };

    const response = await this.requestWithRetry(async () => {
      return await this.fetchWithTimeout(url, requestOptions);
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * DELETE 요청
   * @param {string} endpoint - 엔드포인트
   * @param {Object} options - 요청 옵션
   * @returns {Promise} 응답 Promise
   */
  async delete(endpoint, options = {}) {
    const url = this.buildUrl(endpoint);
    
    const requestOptions = {
      method: 'DELETE',
      ...options
    };

    const response = await this.requestWithRetry(async () => {
      return await this.fetchWithTimeout(url, requestOptions);
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * URL 빌드
   * @param {string} endpoint - 엔드포인트
   * @returns {string} 완전한 URL
   */
  buildUrl(endpoint) {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    const baseUrl = this.baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    
    return `${baseUrl}/${cleanEndpoint}`;
  }

  /**
   * 플레이리스트 데이터 가져오기
   * @param {string} category - 카테고리
   * @returns {Promise} 플레이리스트 데이터
   */
  async getPlaylist(category) {
    const endpoint = `/playlist-${category}.json`;
    return await this.get(endpoint);
  }

  /**
   * 커버 목록 가져오기
   * @param {string} category - 카테고리
   * @returns {Promise} 커버 목록 데이터
   */
  async getCoverList(category) {
    const endpoint = `/coverlist-${category}.json`;
    return await this.get(endpoint);
  }

  /**
   * 파일 목록 가져오기
   * @returns {Promise} 파일 목록 데이터
   */
  async getFileList() {
    const endpoint = '/list';
    return await this.get(endpoint);
  }

  /**
   * 병렬 요청
   * @param {Array} requests - 요청 배열
   * @returns {Promise} 응답 배열
   */
  async parallel(requests) {
    try {
      const responses = await Promise.all(requests);
      return responses;
    } catch (error) {
      console.error('병렬 요청 실패:', error);
      throw error;
    }
  }

  /**
   * 순차 요청
   * @param {Array} requests - 요청 배열
   * @returns {Promise} 응답 배열
   */
  async sequential(requests) {
    const responses = [];
    
    for (const request of requests) {
      try {
        const response = await request();
        responses.push(response);
      } catch (error) {
        console.error('순차 요청 실패:', error);
        responses.push(null);
      }
    }
    
    return responses;
  }

  /**
   * 캐시 무효화
   * @param {string} pattern - 패턴
   */
  invalidateCache(pattern) {
    const keys = this.cache.keys();
    const regex = new RegExp(pattern);
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
    
    console.log('🌐 캐시 무효화:', pattern);
  }

  /**
   * API 상태 확인
   * @returns {Promise} 상태 정보
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.get('/health', { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * API 통계
   * @returns {Object} 통계 정보
   */
  getStats() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryCount: this.retryCount,
      cacheEnabled: this.cacheEnabled,
      cacheTTL: this.cacheTTL
    };
  }

  /**
   * API 설정 업데이트
   * @param {Object} settings - 설정 객체
   */
  updateSettings(settings) {
    if (settings.timeout) {
      this.timeout = settings.timeout;
    }
    
    if (settings.retryCount) {
      this.retryCount = settings.retryCount;
    }
    
    if (settings.cacheEnabled !== undefined) {
      this.cacheEnabled = settings.cacheEnabled;
    }
    
    if (settings.cacheTTL) {
      this.cacheTTL = settings.cacheTTL;
    }
    
    console.log('🌐 API 설정 업데이트:', settings);
  }
}

// 전역으로 내보내기
window.API = API;