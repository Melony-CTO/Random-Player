/**
 * AudioManager - 오디오 재생 및 관리 모듈 (최적화판)
 * - ✅ 메모리 누수 방지 강화
 * - ✅ 리소스 정리 개선
 * - ✅ 재생 안정성 향상
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

/**
 * AudioManager.js의 _normalizeUrl 함수 (최종 권장안)
 * 
 * 현재 상황:
 * - 플레이리스트에 R2 Direct URL이 이미 들어가 있음
 * - Utils.generateAudioUrl이 전체 URL은 그대로 반환
 * - 따라서 _normalizeUrl도 변환 없이 그대로 반환하면 됨
 */

_normalizeUrl(url) {
  if (!url) return url;
  
  // ✅ R2 Direct URL은 그대로 반환 (가장 빠름!)
  if (url.startsWith('https://pub-4ecc0eaab30e42b999c67761f4c6f549.r2.dev/')) {
    console.log('✅ R2 Direct URL 사용:', url.substring(0, 80) + '...');
    return url;
  }

  // ✅ Worker URL도 그대로 반환
  if (url.startsWith('https://melony-music-api.zepplinn25.workers.dev')) {
    console.log('⚠️ Worker URL 사용 (느림):', url.substring(0, 80) + '...');
    return url;
  }

  // ✅ 그 외 URL도 그대로 반환
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
   * ✅ 이전 audio 요소 완전히 정리 (메모리 누수 방지 강화 - 개선)
   */
  _cleanupPreviousAudio(audioElement) {
    if (!audioElement) return;

    try {
      // 1. 재생 중지
      audioElement.pause();

      // 2. src 제거
      audioElement.removeAttribute('src');
      audioElement.src = '';

      // 3. 로드 취소
      audioElement.load();

      // ✅ 4. removeEventListener를 직접 호출할 수 없으므로,
      // audio 요소 자체를 메모리에서 해제되도록 참조만 제거
      // (cloneNode 방식 제거 - 불필요하고 비효율적)

      console.log('🧹 이전 audio 요소 정리 완료 (즉시)');
    } catch (e) {
      console.warn('⚠️ audio 정리 중 오류:', e);
    }
  }

  /**
   * ✅ 현재 audio에 걸린 이벤트와 src를 싹 정리하고 새 audio로 교체 (개선)
   */
 _resetAudioElement() {
    // 1. 현재 바인딩된 리스너 제거
    if (this._boundListeners && this.audio) {
      for (const [evt, handler] of this._boundListeners) {
        try {
          this.audio.removeEventListener(evt, handler);
        } catch (_) {}
      }
      this._boundListeners = null;
    }

    // ✅ 현재 audio의 볼륨을 저장하고, musicVolume도 업데이트
    const prevVolume =
      this.audio && typeof this.audio.volume === 'number'
        ? this.audio.volume
        : this.musicVolume;

    // ✅ musicVolume 업데이트 (다음에도 이 볼륨 사용)
    this.musicVolume = prevVolume;

    // 2. ✅ 이전 audio 요소 즉시 정리 (5초 타이머 제거 → 메모리 누수 방지)
    if (this.audio) {
      const oldAudio = this.audio;

      // ✅ 즉시 정리 (배열에 저장하지 않음)
      this._cleanupPreviousAudio(oldAudio);

      console.log('🧹 이전 audio 즉시 정리 완료');
    }

    // 3. 새 Audio 객체 생성
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    a.volume = prevVolume;
    a.load();

    this.audio = a;

    // 4. ✅ AudioContext 연결은 유지 (source는 재사용)
    // sourceConnected 플래그는 유지하되, 새 audio 요소에 다시 연결 필요
    if (this.sourceConnected && this.audioContext && this.analyser) {
      // 기존 source 연결 해제
      if (this.source) {
        try {
          this.source.disconnect();
        } catch (_) {}
      }
      this.sourceConnected = false;
      console.log('🔄 AudioContext 연결 준비 (다음 재생 시 재연결)');
    }

    console.log('🔄 Audio 요소 리셋 완료');
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
    // ✅ 저장된 볼륨 적용
    this.audio.volume = this.musicVolume;
    console.log('🔊 볼륨 설정:', Math.round(this.musicVolume * 100) + '%');
    this.audio.load();

    // ✅ 타임아웃을 20초로 증가 (네트워크 지연 대응)
    const timeoutMs = Number(options.timeoutMs) || 20000;
    let resolved = false;
    let rejected = false;
    let retried = false;
    let stalledCount = 0;
    let timer = null;

    const onLoadStart = () => {
      console.log('🎵 오디오 로딩 시작:', track.title);
    };

    const onLoadedMeta = () => {
      console.log('📊 메타데이터 로드:', {
        title: track.title,
        duration: this.audio.duration,
      });
            // ✅ 메타데이터 로드되면 즉시 성공 처리 (가장 빠른 재생)
      if (myLoadId !== this.currentLoadId) return;
      if (resolved || rejected) return;
      
      console.log('✅ 메타데이터 로드 완료 - 즉시 재생 가능');
      resolved = true;
      cleanup();
      this.setLoadingState(false, track);
      
      // 300ms 후 재생 (버퍼링 최소화)
      setTimeout(() => {
        if (options.autoPlay !== false && this.hasUserInteracted) {
          this.play().catch((e) => console.log('자동재생 실패:', e?.message));
        }
      }, 300);
    
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
      
      // ✅ readyState 1 (HAVE_METADATA)만 있어도 즉시 성공 처리
      const minReadyState = 1;
      
      if (this.audio.readyState >= minReadyState && !resolved && !rejected) {
        console.log('📶 progress에서 성공 (readyState=' + this.audio.readyState + ', networkState=' + this.audio.networkState + ')');
        resolved = true;
        cleanup();
        this.setLoadingState(false, track);
        
        // ✅ readyState가 1이면 조금 더 기다렸다가 재생 시도
        const playDelay = this.audio.readyState >= 2 ? 0 : 500;
        
        setTimeout(() => {
          if (options.autoPlay !== false && this.hasUserInteracted) {
            this.play().catch((e) => console.log('자동재생 실패:', e?.message));
          }
        }, playDelay);
      }
    };

    const onStalled = () => {
      if (myLoadId !== this.currentLoadId) return;
      stalledCount++;

      console.warn('⏸️ stalled 감지 (' + stalledCount + '/5) - 복구 시도 중');

      // ✅ readyState가 충분하면 즉시 강제 성공 처리
      if (this.audio.readyState >= 1) {
        console.log('✅ stalled이지만 readyState=' + this.audio.readyState + ' 충분, 강제 성공');
        resolved = true;
        cleanup();
        this.setLoadingState(false, track);

        // readyState에 따라 재생 지연 조정
        const playDelay = this.audio.readyState >= 2 ? 0 : 500;
        setTimeout(() => {
          if (options.autoPlay !== false && this.hasUserInteracted) {
            this.play().catch((e) => console.log('자동재생 실패:', e?.message));
          }
        }, playDelay);
        return;
      }

      // ✅ 3회마다 재로드 시도 (1회, 4회, 7회에 재로드)
      if (stalledCount % 3 === 1 && stalledCount > 1) {
        console.log('🔄 stalled ' + stalledCount + '회 - 재로드 시도');
        try {
          this.audio.load();
        } catch (_) {}
      }

      // ✅ 10회 이상 stalled면 포기 (5회 → 10회로 완화)
      if (stalledCount > 10) {
        console.error('❌ stalled 10회 초과, 로딩 중단');
        if (!resolved && !rejected) {
          rejected = true;
          cleanup();
        }
        return;
      }

      // ✅ 대기 (브라우저가 자체적으로 복구 시도)
      console.log('⏳ 네트워크 복구 대기 중... (readyState=' + this.audio.readyState + ')');
    };

    const onSuspend = () => {
      if (myLoadId !== this.currentLoadId) return;
      console.warn('⏸️ suspend 감지 - 네트워크 대기 중');
      
      // ✅ readyState가 충분하면 강제 성공 처리
      if (this.audio.readyState >= 2 && !resolved && !rejected) {
        console.log('✅ suspend이지만 readyState 충분, 강제 성공');
        resolved = true;
        cleanup();
        this.setLoadingState(false, track);
        if (options.autoPlay !== false && this.hasUserInteracted) {
          this.play().catch((e) => console.log('자동재생 실패:', e?.message));
        }
      }
    };

    let errorCount = 0;
    const onError = (e) => {
      if (myLoadId !== this.currentLoadId) return;
      if (rejected || resolved) return;

      errorCount++;
      console.error('❌ 오디오 로딩 에러 (' + errorCount + '회):', {
        code: this.audio?.error?.code,
        networkState: this.audio?.networkState,
        readyState: this.audio?.readyState,
        src: this.audio?.src,
        detail: e,
      });

      // ✅ 첫 번째 에러는 재로드 시도
      if (errorCount === 1) {
        console.log('🔄 에러 발생, 재로드 시도 중...');
        setTimeout(() => {
          if (myLoadId === this.currentLoadId && !resolved && !rejected) {
            try {
              this.audio.load();
            } catch (_) {}
          }
        }, 1000);
        return;
      }

      // ✅ 2회 이상 에러면 포기
      rejected = true;
      cleanup();
      this.setLoadingState(false, track);
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
      console.log('🧹 cleanup 호출 - loadId:', myLoadId);
      clearTimeout(timer);
      
      // ✅ _boundListeners를 정리 (listeners 말고!)
      if (this._boundListeners && this.audio) {
        for (const [evt, handler] of this._boundListeners) {
          this.audio.removeEventListener(evt, handler);
        }
        this._boundListeners = null;
      }
      
      if (this.isLoading && this.currentLoadingTrack === track) {
        this.setLoadingState(false, track);
      }
      if (this.isLoading && this.currentLoadingTrack === track) {
        this.setLoadingState(false, track);
      }
    };

    // ✅ 타임아웃 20초
    timer = setTimeout(() => {
      if (myLoadId !== this.currentLoadId) return;
      if (resolved || rejected) return;

      const diag = {
        networkState: this.audio.networkState,
        readyState: this.audio.readyState,
        src: this.audio.src,
      };
      console.warn('⏰ 로딩 지연:', diag);

      // ✅ readyState가 1 이상이면 강제로 성공 처리 (더 관대하게)
      if (this.audio.readyState >= 1) {
        console.log('✅ readyState 충분 (' + this.audio.readyState + '), 강제 성공 처리');
        resolved = true;
        cleanup();
        this.setLoadingState(false, track);
        
        // readyState에 따라 재생 지연 시간 조정
        const playDelay = this.audio.readyState >= 2 ? 0 : 1000;
        
        setTimeout(() => {
          if (options.autoPlay !== false && this.hasUserInteracted) {
            this.play().catch((e) => console.log('자동재생 실패:', e?.message));
          }
        }, playDelay);
        return;
      }

      if (!retried) {
        retried = true;
        console.log('🔄 재시도 1회');
        try {
          this.audio.load();
        } catch (_) {}
      } else {
        console.error('❌ 타임아웃 최종 실패');
        rejected = true;
        cleanup();
        this.setLoadingState(false, track);
      }
    }, timeoutMs);

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (resolved) {
          clearInterval(checkInterval);
          resolve();
        } else if (rejected) {
          clearInterval(checkInterval);
          reject(new Error('오디오 로딩 실패'));
        }
      }, 100);
    });
  }

  /**
   * 재생
   */
  async play() {
    if (!this.audio || !this.audio.src) {
      console.warn('⚠️ 재생할 오디오가 없습니다');
      return;
    }

    // ✅ 이미 재생 중이면 무시
    if (this.isPlaying && !this.audio.paused) {
      console.log('⚠️ 이미 재생 중입니다');
      return;
    }

    try {
      // AudioContext resume
      this.resumeAudioContext();

      await this.audio.play();
      this.isPlaying = true;
      console.log('▶️ 재생 시작');

      // ✅ 비주얼라이저 시작
      if (window.melonyPlayer && window.melonyPlayer.visualizer) {
        window.melonyPlayer.visualizer.start();
        console.log('🎨 비주얼라이저 시작됨');
      }
    } catch (error) {
      console.error('재생 실패:', error);
      this.isPlaying = false;
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
        // ✅ 이미 연결되어 있으면 재연결하지 않음 (중복 방지)
        if (this.sourceConnected && this.source) {
          console.log('🎛️ AudioContext 이미 연결됨 (재사용)');
          return;
        }

        // ✅ 새로운 audio 요소에 대해 source 생성
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.sourceConnected = true;
        console.log('🎛️ 오디오 소스 연결 완료');
      } catch (err) {
        // ✅ 이미 연결된 경우 에러 무시
        if (err.name === 'InvalidStateError') {
          console.log('🎛️ 오디오 소스 이미 연결됨 (InvalidStateError 무시)');
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
   * 재생 토글
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
   * ✅ 오디오 완전 리셋 (개선)
   */
  resetAudio() {
    console.log('🔄 오디오 리셋 시작');

    // 1. 오디오 소스 해제
    this.disconnectAudioSource();

    // 2. Audio 요소 리셋
    this._resetAudioElement();

    // 3. AudioContext 정리 (필요시에만)
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
      currentTime: this.audio?.currentTime
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
