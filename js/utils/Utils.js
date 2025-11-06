/**
 * Utils - 유틸리티 함수 모듈
 * 공통으로 사용되는 유틸리티 함수들을 제공
 */
class Utils {
  /**
   * 시간 포맷팅
   * @param {number} seconds - 초
   * @returns {string} 포맷된 시간 (mm:ss)
   */
  static formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
  }

  /**
   * 배열 셔플
   * @param {Array} array - 셔플할 배열
   * @returns {Array} 셔플된 배열
   */
  static shuffleArray(array) {
    if (!Array.isArray(array)) return [];
    
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * URL 정규화
   * @param {string} baseUrl - 기본 URL
   * @param {string} path - 경로
   * @returns {string} 정규화된 URL
   */
  static normalizeUrl(baseUrl, path) {
    if (!path) return '';
    if (typeof path !== 'string') path = String(path);
    
    // 이미 완전한 URL인 경우
    if (/^https?:\/\//i.test(path)) return path;
    
    // baseUrl 정리 (끝의 슬래시 제거)
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // path 정리 - 앞의 슬래시 제거
    path = path.replace(/^\/+/, '');
    
    // /file/로 시작하는 경우 제거
    if (path.startsWith('file/')) {
      path = path.substring(5);
    }
    
    return baseUrl + '/file/' + path;
  }

  /**
   * 오디오 URL 생성
   * @param {string} baseUrl - 기본 URL
   * @param {string} audioPath - 오디오 경로
   * @param {string} folder - 폴더명
   * @returns {string} 완전한 오디오 URL
   */
  static generateAudioUrl(baseUrl, audioPath, folder) {
    // audioPath가 이미 "folder/filename.ext" 형태라면 그대로 사용
    if (audioPath.includes('/')) {
      return (baseUrl + '/file/' + audioPath).replace(
        'https://melony-music-api.zepplinn25.workers.dev/file/',
        'https://pub-4ecc0eaab30e42b999c67761f4c6f549.r2.dev/'
      );
    }
    
    // 파일명만 있다면 폴더 추가
    // ✅ Worker URL을 R2 직접 URL로 변환
    return (baseUrl + '/file/' + folder + '/' + audioPath).replace(
      'https://melony-music-api.zepplinn25.workers.dev/file/',
      'https://pub-4ecc0eaab30e42b999c67761f4c6f549.r2.dev/'
    );
  }

  /**
   * 제목 정제
   * @param {string} rawTitle - 원본 제목
   * @param {string} category - 카테고리
   * @returns {string} 정제된 제목
   */
  static cleanTitle(rawTitle, category = '') {
    if (!rawTitle || typeof rawTitle !== 'string') return 'Unknown Track';
    
    let cleanTitle = rawTitle.trim();
    
    // 대괄호 내용 추출
    const bracketMatch = cleanTitle.match(/\[(.*?)\]/);
    if (bracketMatch && bracketMatch[1]) {
      cleanTitle = bracketMatch[1].trim();
    } else {
      // 대괄호가 없으면 전체 title 정제
      cleanTitle = cleanTitle
        .replace(/\([^)]*\)/g, '') // (내용) 제거
        .replace(/_M$|^M$|-M$|\s+M$/g, '') // _M, -M, 공백+M 접미사 제거
        .replace(/_remake$/i, '') // _remake 접미사 제거
        .replace(/good$/i, '') // good 접미사 제거
        .replace(/\([0-9]+\)/g, '') // (1), (2) 등 제거
        .replace(/[_-]/g, ' ') // 언더스코어, 하이픈을 공백으로
        .replace(/\s+/g, ' ') // 연속된 공백을 하나로
        .trim();
    }
    
    return cleanTitle || 'Unknown Track';
  }

  /**
   * 파일명에서 제목 추출
   * @param {string} fileName - 파일명
   * @returns {string} 추출된 제목
   */
  static extractTitleFromFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') return 'Unknown Track';
    
    return fileName
      .replace(/\.(m4a|mp3|wav|ogg|flac)$/i, '') // 확장자 제거
      .replace(/^\[(.*?)\]\s*/, '$1') // [태그] 제거
      .replace(/_M$|^M$|-M$|\s+M$/g, '') // _M, -M, 공백+M 접미사 제거
      .replace(/_remake$/i, '') // _remake 접미사 제거
      .replace(/good$/i, '') // good 접미사 제거
      .replace(/\([0-9]+\)/g, '') // (1), (2) 등 제거
      .replace(/\([^)]*\)/g, '') // (내용) 제거
      .replace(/[_-]/g, ' ') // 언더스코어, 하이픈을 공백으로
      .replace(/\s+/g, ' ') // 연속된 공백을 하나로
      .trim() || 'Unknown Track';
  }

  /**
   * 디바운스 함수
   * @param {Function} func - 실행할 함수
   * @param {number} wait - 대기 시간 (ms)
   * @returns {Function} 디바운스된 함수
   */
  static debounce(func, wait) {
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

  /**
   * 스로틀 함수
   * @param {Function} func - 실행할 함수
   * @param {number} limit - 제한 시간 (ms)
   * @returns {Function} 스로틀된 함수
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * 딥 클론
   * @param {*} obj - 클론할 객체
   * @returns {*} 클론된 객체
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = Utils.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  /**
   * 객체 병합
   * @param {Object} target - 대상 객체
   * @param {Object} source - 소스 객체
   * @returns {Object} 병합된 객체
   */
  static mergeObjects(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = Utils.mergeObjects(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }

  /**
   * 로컬 스토리지에 안전하게 저장
   * @param {string} key - 키
   * @param {*} value - 값
   * @returns {boolean} 저장 성공 여부
   */
  static setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('로컬 스토리지 저장 실패:', error);
      return false;
    }
  }

  /**
   * 로컬 스토리지에서 안전하게 가져오기
   * @param {string} key - 키
   * @param {*} defaultValue - 기본값
   * @returns {*} 저장된 값 또는 기본값
   */
  static getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('로컬 스토리지 읽기 실패:', error);
      return defaultValue;
    }
  }

  /**
   * 로컬 스토리지에서 안전하게 삭제
   * @param {string} key - 키
   * @returns {boolean} 삭제 성공 여부
   */
  static removeLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('로컬 스토리지 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 랜덤 ID 생성
   * @param {number} length - ID 길이
   * @returns {string} 랜덤 ID
   */
  static generateRandomId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 숫자 범위 제한
   * @param {number} value - 값
   * @param {number} min - 최소값
   * @param {number} max - 최대값
   * @returns {number} 제한된 값
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 선형 보간
   * @param {number} start - 시작값
   * @param {number} end - 끝값
   * @param {number} factor - 보간 계수 (0-1)
   * @returns {number} 보간된 값
   */
  static lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  /**
   * 두 점 사이의 거리 계산
   * @param {number} x1 - 첫 번째 점의 X 좌표
   * @param {number} y1 - 첫 번째 점의 Y 좌표
   * @param {number} x2 - 두 번째 점의 X 좌표
   * @param {number} y2 - 두 번째 점의 Y 좌표
   * @returns {number} 거리
   */
  static distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 각도를 라디안으로 변환
   * @param {number} degrees - 각도
   * @returns {number} 라디안
   */
  static degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * 라디안을 각도로 변환
   * @param {number} radians - 라디안
   * @returns {number} 각도
   */
  static radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  /**
   * 성능 측정 시작
   * @param {string} name - 측정 이름
   */
  static performanceStart(name) {
    if (performance && performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * 성능 측정 종료
   * @param {string} name - 측정 이름
   * @returns {number} 소요 시간 (ms)
   */
  static performanceEnd(name) {
    if (performance && performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name)[0];
      return measure ? measure.duration : 0;
    }
    return 0;
  }

  /**
   * 브라우저 정보 가져오기
   * @returns {Object} 브라우저 정보
   */
  static getBrowserInfo() {
    const ua = navigator.userAgent;
    const browsers = {
      chrome: /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor),
      firefox: /Firefox/.test(ua),
      safari: /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor),
      edge: /Edge/.test(ua),
      ie: /Trident/.test(ua)
    };

    const browser = Object.keys(browsers).find(key => browsers[key]) || 'unknown';
    
    return {
      name: browser,
      userAgent: ua,
      isMobile: /Mobile|Android|iPhone|iPad/.test(ua),
      isTouch: 'ontouchstart' in window
    };
  }

  /**
   * 디바이스 정보 가져오기
   * @returns {Object} 디바이스 정보
   */
  static getDeviceInfo() {
    return {
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: window.screen.orientation ? window.screen.orientation.type : 'unknown'
    };
  }
}

// 전역으로 내보내기
window.Utils = Utils;
