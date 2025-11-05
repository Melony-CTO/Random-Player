/**
 * Config - 설정 관리 모듈
 * 애플리케이션 설정을 중앙에서 관리
 */
class Config {
  constructor() {
    this.settings = {
      // 오디오 설정
      audio: {
        defaultVolume: 0.7,
        effectVolume: 1.0,
        fadeDuration: 500,
        preload: 'auto',
        crossOrigin: 'anonymous'
      },

      // UI 설정
      ui: {
        targetFPS: 30,
        animationDuration: 300,
        transitionDuration: 0.3,
        debugMode: false
      },

      // 비주얼라이저 설정
      visualizer: {
        barCount: 40,
        targetFPS: 30,
        useFallback: false,
        smoothingTimeConstant: 0.3,
        fftSize: 1024
      },

      // 이퀄라이저 설정
      equalizer: {
        frequencies: [60, 170, 350, 1000, 3000, 6000],
        defaultGains: [0, 0, 0, 0, 0, 0],
        currentPreset: 'flat'
      },

      // 터치 설정
      touch: {
        touchSensitivity: 0.005,
        mouseSensitivity: 0.01,
        enableTouch: true,
        enableMouse: true
      },

      // 커버 설정
      cover: {
        maxCacheSize: 20,
        useRandomCover: true,
        transitionDuration: 0.3
      },

      // 플레이리스트 설정
      playlist: {
        defaultCategory: 'pop',
        enableShuffle: true,
        autoPlay: true,
        loopPlaylist: true
      },

      // API 설정
      api: {
        baseUrl: this.getBaseUrl(),
        timeout: 8000,
        retryCount: 3,
        cacheEnabled: true,
        cacheTTL: 24 * 60 * 60 * 1000 // 24시간
      },

      // 성능 설정
      performance: {
        enableOptimizations: true,
        maxConcurrentRequests: 5,
        enableLazyLoading: true,
        enableMemoryManagement: true
      }
    };

    this.init();
  }

  init() {
    console.log('⚙️ Config 초기화');
    this.loadFromStorage();
    this.setupStorageSync();
  }

  /**
   * 기본 URL 가져오기
   * @returns {string} 기본 URL
   */
  getBaseUrl() {
    // Base64 인코딩된 API 주소 디코딩
    const encodedAPI = "aHR0cHM6Ly9tZWxvbnktbXVzaWMtYXBpLnplcHBsaW5uMjUud29ya2Vycy5kZXY=";
    return atob(encodedAPI);
  }

  /**
   * 설정 가져오기
   * @param {string} path - 설정 경로 (예: 'audio.volume')
   * @param {*} defaultValue - 기본값
   * @returns {*} 설정 값
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.settings;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * 설정 저장
   * @param {string} path - 설정 경로
   * @param {*} value - 설정 값
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.settings;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    this.saveToStorage();
    console.log('⚙️ 설정 저장:', path, '=', value);
  }

  /**
   * 설정 업데이트
   * @param {Object} updates - 업데이트할 설정 객체
   */
  update(updates) {
    this.settings = Utils.mergeObjects(this.settings, updates);
    this.saveToStorage();
    console.log('⚙️ 설정 업데이트:', updates);
  }

  /**
   * 설정 초기화
   */
  reset() {
    this.settings = {
      audio: {
        defaultVolume: 0.7,
        effectVolume: 1.0,
        fadeDuration: 500,
        preload: 'auto',
        crossOrigin: 'anonymous'
      },
      ui: {
        targetFPS: 30,
        animationDuration: 300,
        transitionDuration: 0.3,
        debugMode: false
      },
      visualizer: {
        barCount: 40,
        targetFPS: 30,
        useFallback: false,
        smoothingTimeConstant: 0.3,
        fftSize: 1024
      },
      equalizer: {
        frequencies: [60, 170, 350, 1000, 3000, 6000],
        defaultGains: [0, 0, 0, 0, 0, 0],
        currentPreset: 'flat'
      },
      touch: {
        touchSensitivity: 0.005,
        mouseSensitivity: 0.01,
        enableTouch: true,
        enableMouse: true
      },
      cover: {
        maxCacheSize: 20,
        useRandomCover: true,
        transitionDuration: 0.3
      },
      playlist: {
        defaultCategory: 'pop',
        enableShuffle: true,
        autoPlay: true,
        loopPlaylist: true
      },
      api: {
        baseUrl: this.getBaseUrl(),
        timeout: 8000,
        retryCount: 3,
        cacheEnabled: true,
        cacheTTL: 24 * 60 * 60 * 1000
      },
      performance: {
        enableOptimizations: true,
        maxConcurrentRequests: 5,
        enableLazyLoading: true,
        enableMemoryManagement: true
      }
    };

    this.saveToStorage();
    console.log('⚙️ 설정 초기화 완료');
  }

  /**
   * 로컬 스토리지에서 설정 로드
   */
  loadFromStorage() {
    const stored = Utils.getLocalStorage('melony_config', null);
    if (stored) {
      this.settings = Utils.mergeObjects(this.settings, stored);
      console.log('⚙️ 설정 로드 완료');
    }
  }

  /**
   * 로컬 스토리지에 설정 저장
   */
  saveToStorage() {
    Utils.setLocalStorage('melony_config', this.settings);
  }

  /**
   * 스토리지 동기화 설정
   */
  setupStorageSync() {
    // 스토리지 변경 감지
    window.addEventListener('storage', (e) => {
      if (e.key === 'melony_config' && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          this.settings = Utils.mergeObjects(this.settings, newSettings);
          console.log('⚙️ 설정 동기화 완료');
        } catch (error) {
          console.error('설정 동기화 오류:', error);
        }
      }
    });
  }

  /**
   * 오디오 설정 가져오기
   * @returns {Object} 오디오 설정
   */
  getAudioConfig() {
    return this.get('audio', {});
  }

  /**
   * UI 설정 가져오기
   * @returns {Object} UI 설정
   */
  getUIConfig() {
    return this.get('ui', {});
  }

  /**
   * 비주얼라이저 설정 가져오기
   * @returns {Object} 비주얼라이저 설정
   */
  getVisualizerConfig() {
    return this.get('visualizer', {});
  }

  /**
   * 이퀄라이저 설정 가져오기
   * @returns {Object} 이퀄라이저 설정
   */
  getEqualizerConfig() {
    return this.get('equalizer', {});
  }

  /**
   * 터치 설정 가져오기
   * @returns {Object} 터치 설정
   */
  getTouchConfig() {
    return this.get('touch', {});
  }

  /**
   * 커버 설정 가져오기
   * @returns {Object} 커버 설정
   */
  getCoverConfig() {
    return this.get('cover', {});
  }

  /**
   * 플레이리스트 설정 가져오기
   * @returns {Object} 플레이리스트 설정
   */
  getPlaylistConfig() {
    return this.get('playlist', {});
  }

  /**
   * API 설정 가져오기
   * @returns {Object} API 설정
   */
  getAPIConfig() {
    return this.get('api', {});
  }

  /**
   * 성능 설정 가져오기
   * @returns {Object} 성능 설정
   */
  getPerformanceConfig() {
    return this.get('performance', {});
  }

  /**
   * 디버그 모드 설정
   * @param {boolean} enabled - 활성화 여부
   */
  setDebugMode(enabled) {
    this.set('ui.debugMode', enabled);
  }

  /**
   * 디버그 모드 확인
   * @returns {boolean} 디버그 모드 여부
   */
  isDebugMode() {
    return this.get('ui.debugMode', false);
  }

  /**
   * 모든 설정 가져오기
   * @returns {Object} 모든 설정
   */
  getAllSettings() {
    return Utils.deepClone(this.settings);
  }

  /**
   * 설정 검증
   * @param {Object} settings - 검증할 설정
   * @returns {Object} 검증 결과
   */
  validateSettings(settings) {
    const errors = [];
    const warnings = [];

    // 오디오 설정 검증
    if (settings.audio) {
      if (settings.audio.defaultVolume < 0 || settings.audio.defaultVolume > 1) {
        errors.push('오디오 기본 볼륨은 0-1 사이여야 합니다');
      }
      if (settings.audio.effectVolume < 0 || settings.audio.effectVolume > 1) {
        errors.push('효과음 볼륨은 0-1 사이여야 합니다');
      }
    }

    // UI 설정 검증
    if (settings.ui) {
      if (settings.ui.targetFPS < 1 || settings.ui.targetFPS > 120) {
        warnings.push('FPS는 1-120 사이를 권장합니다');
      }
    }

    // 비주얼라이저 설정 검증
    if (settings.visualizer) {
      if (settings.visualizer.barCount < 1 || settings.visualizer.barCount > 100) {
        warnings.push('비주얼라이저 바 개수는 1-100 사이를 권장합니다');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 설정 내보내기
   * @returns {string} JSON 문자열
   */
  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * 설정 가져오기
   * @param {string} jsonString - JSON 문자열
   * @returns {boolean} 성공 여부
   */
  importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      const validation = this.validateSettings(imported);
      
      if (validation.isValid) {
        this.settings = Utils.mergeObjects(this.settings, imported);
        this.saveToStorage();
        console.log('⚙️ 설정 가져오기 완료');
        return true;
      } else {
        console.error('설정 검증 실패:', validation.errors);
        return false;
      }
    } catch (error) {
      console.error('설정 가져오기 오류:', error);
      return false;
    }
  }
}

// 전역으로 내보내기
window.Config = Config;