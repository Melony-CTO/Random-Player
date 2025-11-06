/**
 * AudioManager - 오디오 재생 및 관리 모듈 (모듈화 대응판)
 * - 단일 <audio>만 유지
 * - 로딩 중 다른 트랙이 오면 이전 로딩 무시
 * - 이벤트 누수 방지
 * - 자동재생 조건 명확화
 */
class AudioManager {
  constructor(options = {}) {
    this.audio = null;
    this.isPlaying = false;

    // 볼륨
    this.musicVolume = options.musicVolume ?? 0.7;
    this.effectVolume = 1.0;

    // 시각화용
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    this.sourceConnected = false;

    // 상태 플래그
    this.hasUserInteracted = false;
    this.shouldAutoPlay = false;
    this.autoPlayReason = '';
    this.isLoading = false;
    this.currentLoadingTrack = null;

    // 로딩 경쟁 제어
    this.currentLoadId = 0;

    // 외부에서 꽂아줄 수도 있는 매니저
    this.playlistManager = options.playlistManager || null;

    // 바인딩된 이벤트 목록
    this._boundListeners = null;

    this.init();
  }

  // ✅ R2 퍼블릭 URL을 워커로 우회시키는 함수
_normalizeUrl(url) {
  if (!url) return url;

  // 이미 우리 워커면 그대로 둔다
  if (url.startsWith('https://melony-music-api.zepplinn25.workers.dev')) {
    return url;
  }

  // r2.dev로 바로 가는 건 CORS가 안 되니까 워커로 프록시
  if (url.includes('.r2.dev/')) {
    try {
      const u = new URL(url);
      const path = u.pathname.startsWith('/') ? u.pathname : '/' + u.pathname;
      // 👉 워커의 /file/ 밑으로 붙여서 요청
      return 'https://melony-music-api.zepplinn25.workers.dev/file' + path;
    } catch (e) {
      console.warn('URL 파싱 실패, 원본 사용:', url);
      return url;
    }
  }

  return url;
}


  /**
   * 초기 <audio> 생성
   */
  init() {
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    a.volume = this.musicVolume;
    a.load();

    this.audio = a;
  }

  /**
  /**
   * 현재 audio에 걸린 이벤트와 src를 싹 정리하고
   * 새 audio로 교체
   */
  _resetAudioElement() {
    if (this._boundListeners && this.audio) {
      for (const [evt, handler] of this._boundListeners) {
        try {
          this.audio.removeEventListener(evt, handler);
        } catch (_) {}
      }
      this._boundListeners = null;
    }

    const prevVolume =
      this.audio && typeof this.audio.volume === 'number'
        ? this.audio.volume
        : this.musicVolume;

    // ✅ 이전 audio 정리 (메모리 누수 방지)
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.src = '';
        this.audio.load();
      } catch (_) {}
    }

    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    a.volume = prevVolume;
    a.load();

    this.audio = a;
    
    // ✅ source는 null로 만들되, 다음 재생 시 재연결되도록 플래그만 해제
    this.source = null;
    this.sourceConnected = false;
  }

  /**
   * 공용 이벤트 바인딩
   */
  _bindListeners(entries) {
    this._boundListeners = entries;
    for (const [evt, handler] of entries) {
      this.audio.addEventListener(evt, handler);
    }
  }

  _cleanupListeners(entries) {
    if (!entries) return;
    for (const [evt, handler] of entries) {
      try {
        this.audio.removeEventListener(evt, handler);
      } catch (_) {}
    }
    if (this._boundListeners === entries) {
      this._boundListeners = null;
    }
  }

  /**
   * 트랙 로드 (기본형)
   * - 모듈화해서 다른 곳에서 부를 때는 이 함수를 먼저 호출하고
   *   성공하면 play()를 부르는 식으로 사용
   */
  loadTrack(url, track) {
    return this.loadTrackEnhanced(url, track, { autoPlay: false });
  }

  /**
   * 트랙 로드 (강화형)
   * - stalled / suspend / timeout 재시도
   * - 로딩 중 다른 트랙 오면 이전 거 무시
   */
  async loadTrackEnhanced(url, track, options = {}) {
    if (!url || !track) {
      throw new Error('URL 또는 트랙 정보가 없습니다');
    }

    // 로딩 경쟁 제어용 id
    const myLoadId = ++this.currentLoadId;

    // 이전 audio와 이벤트 정리
    this._resetAudioElement();

    // 상태 표시
    this.setLoadingState(true, track);

    // audio 구성
    const finalUrl = this._normalizeUrl(url);
    this.audio.src = finalUrl;

    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.musicVolume;
    this.audio.load();

    const timeoutMs = Number(options.timeoutMs) || 15000;
    let resolved = false;
    let rejected = false;
    let retried = false;
    let stalledCount = 0; // ✅ stalled 카운터
    let timer = null;

    const onLoadStart = () => {
      console.log('🎵 오디오 로딩 시작:', track.title);
    };

    const onLoadedMeta = () => {
      console.log('📊 메타데이터 로드:', {
        title: track.title,
        duration: this.audio.duration,
      });
    };

    const onCanPlay = () => {
      // 내 로딩이 아니면 무시
      if (myLoadId !== this.currentLoadId) return;
      if (resolved || rejected) return;
      resolved = true;
      cleanup();
      this.setLoadingState(false, track);

      console.log('✅ 오디오 로딩 완료 - 자동재생 시도');

      // autoPlay 옵션
      const wantAutoPlay = options.autoPlay !== false;
      const canAutoPlay =
        this.hasUserInteracted || (this.playlistManager && this.playlistManager.allowAutoPlay);

      if (wantAutoPlay && canAutoPlay) {
        this.play().catch((e) => {
          console.log('자동재생 실패:', e?.message);
        });
      }
    };

    const onProgress = () => {
      if (myLoadId !== this.currentLoadId) return;
      const minReadyState = options.minReadyState ?? 2;
      if (
        this.audio.readyState >= minReadyState &&
        !resolved &&
        !rejected
      ) {
        console.log('📶 progress에서 강제 성공 (readyState=', this.audio.readyState, ')');
        resolved = true;
        cleanup();
        this.setLoadingState(false, track);
        if (options.autoPlay !== false && this.hasUserInteracted) {
          this.play().catch((e) => console.log('자동재생 실패:', e?.message));
        }
      }
    };

    const onStalled = () => {
      if (myLoadId !== this.currentLoadId) return;
      stalledCount++;
      
      // ✅ 5번 이상 stalled면 포기 (3 → 5로 증가)
      if (stalledCount > 5) {
        console.error('❌ stalled 5회 초과, 로딩 중단');
        if (!resolved && !rejected) {
          rejected = true;
          cleanup();
        }
        return;
      }
      
      console.warn('⏸️ stalled 감지 (' + stalledCount + '/5) - 복구 대기 중');
    };

    const onSuspend = () => {
      if (myLoadId !== this.currentLoadId) return;
      console.warn('⏸️ suspend 감지 - 네트워크 대기 중');
    };

    const onError = (e) => {
      if (myLoadId !== this.currentLoadId) return;
      if (rejected || resolved) return;
      rejected = true;
      cleanup();
      this.setLoadingState(false, track);
      console.error('❌ 오디오 로딩 실패:', {
        code: this.audio?.error?.code,
        networkState: this.audio?.networkState,
        readyState: this.audio?.readyState,
        src: this.audio?.src,
        detail: e,
      });
    };

    const listeners = [
      ['loadstart', onLoadStart],
      ['loadedmetadata', onLoadedMeta],
      ['canplay', onCanPlay],
      ['progress', onProgress],
      ['stalled', onStalled],
      ['suspend', onSuspend],
      ['error', onError],
    ];
    this._bindListeners(listeners);

    const cleanup = () => {
      clearTimeout(timer);
      this._cleanupListeners(listeners);
      if (this.isLoading && this.currentLoadingTrack === track) {
        this.setLoadingState(false, track);
      }
    };

    // ✅ 타임아웃을 30초로 늘림 (네트워크가 느릴 수 있음)
    timer = setTimeout(() => {
      if (myLoadId !== this.currentLoadId) return;
      if (resolved || rejected) return;

      const diag = {
        networkState: this.audio.networkState,
        readyState: this.audio.readyState,
        src: this.audio.src,
      };
      console.warn('⏰ 로딩 지연:', diag);

      // ✅ readyState가 2 이상이면 강제로 성공 처리
      if (this.audio.readyState >= 2) {
        console.log('✅ readyState 충분, 강제 성공 처리');
        resolved = true;
        cleanup();
        this.setLoadingState(false, track);
        if (options.autoPlay !== false && this.hasUserInteracted) {
          this.play().catch((e) => console.log('자동재생 실패:', e?.message));
        }
        return;
      }

      if (!retried) {
        retried = true;
        console.log('🔄 재시도 1회');
        try {
          this.audio.load();
        } catch (_) {}
        // 두 번째 타이머 (10초 더 대기)
        setTimeout(() => {
          if (myLoadId !== this.currentLoadId) return;
          if (!resolved && !rejected) {
            // ✅ readyState 다시 확인
            if (this.audio.readyState >= 2) {
              console.log('✅ 재시도 후 readyState 충분, 강제 성공');
              resolved = true;
              cleanup();
              this.setLoadingState(false, track);
              return;
            }
            
            console.error('❌ 오디오 로딩 타임아웃(재시도 실패)');
            rejected = true;
            cleanup();
          }
        }, 10000);
        return;
      }

      console.error('❌ 오디오 로딩 타임아웃');
      rejected = true;
      cleanup();
    }, 30000);
      }

      /**
       * 재생
       */
      async play() {
        if (!this.audio?.src) return;
        try {
          // readyState가 0이면 다시 로딩
          if (this.audio.readyState === 0) {
            this.audio.load();
          }

          this.hasUserInteracted = true;

          // ✅ AudioContext 연결 (재생 전 - 핵심!)
          if (!this.sourceConnected) {
            this.connectAudioSource();
          }

          // ✅ AudioContext Resume (iOS/Safari 대응)
          if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('🎛️ AudioContext 재개됨');
          }

          // 소리 키우기 전 무음 재생 → 페이드인
          this.audio.volume = 0;
          await this.audio.play();
          this.isPlaying = true;

          await this.fadeInAudio(400);
          console.log('🎵 재생 시작');
          
          // ✅ 비주얼라이저 시작 (전역 melonyPlayer를 통해)
          if (window.melonyPlayer && window.melonyPlayer.visualizer) {
            window.melonyPlayer.visualizer.start();
            console.log('🎨 비주얼라이저 시작됨');
          }
          
          // ✅ 이퀄라이저 재연결 (트랙 변경 시)
          if (window.melonyPlayer && window.melonyPlayer.equalizer && window.melonyPlayer.equalizer.filters.length > 0) {
            window.melonyPlayer.equalizer.setupEqualizer();
            console.log('🎛️ 이퀄라이저 재연결됨');
          }
        } catch (error) {
          if (error.name === 'NotAllowedError') {
            console.log('🔇 자동재생 정책으로 인해 재생 차단');
            this.hasUserInteracted = false;
            return;
          }
          console.error('재생 실패:', error);
          throw error;
        }
      }

  /**
   * 일시정지
   */
  pause() {
    if (!this.audio) return;
    try {
      this.audio.pause();
    } catch (_) {}
    this.isPlaying = false;
    console.log('⏸️ 재생 정지');
    
    // ✅ 비주얼라이저 정지
    if (window.melonyPlayer && window.melonyPlayer.visualizer) {
      window.melonyPlayer.visualizer.stop();
      console.log('🎨 비주얼라이저 정지됨');
    }
  }

  /**
   * 페이드인
   */
  fadeInAudio(duration = 500) {
    return new Promise((resolve) => {
      const targetVolume = this.musicVolume;
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = targetVolume / steps;

      let currentStep = 0;
      const fadeInterval = setInterval(() => {
        currentStep++;
        this.audio.volume = Math.min(volumeStep * currentStep, targetVolume);

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          this.audio.volume = targetVolume;
          resolve();
        }
      }, stepDuration);
    });
  }

  fadeOutAudio(duration = 500) {
    return new Promise((resolve) => {
      const startVolume = this.audio.volume;
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = startVolume / steps;

      let currentStep = 0;
      const fadeInterval = setInterval(() => {
        currentStep++;
        this.audio.volume = Math.max(startVolume - volumeStep * currentStep, 0);

        if (currentStep >= steps || this.audio.volume <= 0) {
          clearInterval(fadeInterval);
          this.audio.volume = 0;
          resolve();
        }
      }, stepDuration);
    });
  }

  /**
   * 볼륨 설정
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.audio && this.isPlaying) {
      this.audio.volume = this.musicVolume;
    }
  }

  /**
   * 재생 위치 이동
   */
  setCurrentTime(time) {
    if (!this.audio || !this.audio.duration) return;
    if (typeof time !== 'number' || !isFinite(time) || isNaN(time)) {
      console.warn('⚠️ 유효하지 않은 시간:', time);
      return;
    }
    const valid = Math.max(0, Math.min(time, this.audio.duration));
    this.audio.currentTime = valid;
    console.log('🎵 재생 위치 설정:', valid);
  }

  /**
   * Web Audio 초기화
   */
  initWebAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.3;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      console.log('🎛️ Web Audio API 초기화 완료');
    } catch (err) {
      console.error('Web Audio 초기화 실패:', err);
    }
  }

  connectAudioSource() {
    if (!this.audioContext || !this.analyser) {
      this.initWebAudio();
    }
    if (this.audioContext && this.analyser && this.audio) {
      try {
        if (this.sourceConnected) {
          console.log('🎛️ 이미 오디오 소스 연결됨');
          return;
        }
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.sourceConnected = true;
        console.log('🎛️ 오디오 소스 연결 완료');
      } catch (err) {
        // ✅ 이미 연결된 경우 에러 무시
        if (err.name === 'InvalidStateError') {
          console.log('🎛️ 오디오 소스 이미 연결됨 (무시)');
          this.sourceConnected = true;
        } else {
          console.error('오디오 소스 연결 실패:', err);
        }
      }
    }
  }

  setAutoPlay(reason = '') {
    this.shouldAutoPlay = true;
    this.autoPlayReason = reason;
    console.log('🎵 자동재생 플래그 설정:', reason);
  }

  attemptAutoPlay() {
    if (
      this.shouldAutoPlay &&
      !this.isPlaying &&
      this.audio?.src &&
      this.audio.readyState >= 2
    ) {
      this.shouldAutoPlay = false;
      this.play().catch((e) => console.log('자동재생 실패:', e?.message));
      return true;
    }
    return false;
  }

  setLoadingState(loading, track = null) {
    this.isLoading = loading;
    this.currentLoadingTrack = track;
    if (loading) {
      console.log('🔄 로딩 시작:', track ? track.title : 'unknown');
    } else {
      console.log('✅ 로딩 완료:', track ? track.title : 'unknown');
    }
  }
    /**
     * 재생 토글 (추가!)
     */
    async togglePlay() {
        if (!this.audio?.src) {
            console.log('⚠️ 오디오 소스가 없습니다');
            return;
        }

        if (this.isPlaying) {
            this.pause();
        } else {
            await this.play();
        }
    }
  /**
   * 현재 재생 시간 가져오기
   */
  getCurrentTime() {
    return this.audio ? this.audio.currentTime : 0;
  }

  /**
   * 총 재생 시간 가져오기
   */
  getDuration() {
    return this.audio ? this.audio.duration : 0;
  }

  /**
   * 오디오 리셋
   */
  reset() {
    if (this.audio) {
      try {
        this.audio.pause();
      } catch (_) {}
      this.audio.currentTime = 0;
      try {
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch (_) {}
    }
    this.isPlaying = false;
  }

  /**
   * 오디오 소스 연결 해제
   */
  disconnectAudioSource() {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (_) {}
      this.source = null;
      this.sourceConnected = false;
      console.log('🎛️ 오디오 소스 해제 완료');
    }
  }

  /**
   * 주파수 데이터 가져오기
   */
  getFrequencyData() {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return null;
  }

  /**
   * AudioContext 상태 가져오기
   */
  getAudioContextState() {
    return this.audioContext ? this.audioContext.state : 'none';
  }

  /**
   * AudioContext 재개
   */
  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * 오디오 완전 리셋
   */
  resetAudio() {
    console.log('🔄 오디오 리셋 시작');
    this.disconnectAudioSource();
    this._resetAudioElement();

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
      this.analyser = null;
      this.dataArray = null;
    }

    this.sourceConnected = false;
    console.log('🔄 오디오 리셋 완료');
  }

  /**
   * 효과음 볼륨 설정
   */
  setEffectVolume(volume) {
    this.effectVolume = Math.max(0, Math.min(1, volume));
    // 현재 재생 중인 효과음에 적용
    if (this.currentBgSound) {
      const effectAudio = document.getElementById('effect-' + this.currentBgSound);
      if (effectAudio) {
        effectAudio.volume = this.effectVolume;
      }
    }
  }

  /**
   * 배경음 상태 저장용
   */
  get currentBgSound() {
    return this._currentBgSound || null;
  }

  set currentBgSound(value) {
    this._currentBgSound = value;
  }

  debugAudioState() {
    console.log('🎵 오디오 상태:', {
      src: this.audio?.src,
      readyState: this.audio?.readyState,
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentLoadingTrack: this.currentLoadingTrack
        ? this.currentLoadingTrack.title
        : null,
      shouldAutoPlay: this.shouldAutoPlay,
      autoPlayReason: this.autoPlayReason,
      duration: this.audio?.duration,
      currentTime: this.audio?.currentTime,
    });
  }

  /**
   * 음악 볼륨 가져오기
   */
  getMusicVolume() {
    return this.musicVolume;
  }

  /**
   * 효과음 볼륨 가져오기
   */
  getEffectVolume() {
    return this.effectVolume;
  }
}

window.AudioManager = AudioManager;
