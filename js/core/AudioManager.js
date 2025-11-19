/**
 * AudioManager - Howler.js 기반 오디오 재생 및 관리 모듈
 * - ✅ 적극적인 프리로딩으로 즉시 재생
 * - ✅ 자동 재시도 및 에러 복구
 * - ✅ Web Audio API 지원 (비주얼라이저)
 * - ✅ 메모리 누수 방지
 */
class AudioManager {
  constructor(options = {}) {
    // 기존 Audio 객체 호환성 유지 (레거시 코드용)
    this.audio = null;
    this.isPlaying = false;

    // 볼륨
    this.musicVolume = options.musicVolume ?? 0.7;
    this.effectVolume = 1.0;

    // Howler 인스턴스 관리
    this.currentHowl = null;      // 현재 재생 중인 Howl
    this.nextHowl = null;          // 프리로드된 다음 Howl
    this.preloadQueue = new Map(); // 프리로드 큐 { trackId: Howl }

    // Web Audio API (비주얼라이저용)
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.masterGain = null;
    this.source = null; // MediaElementSourceNode (이퀄라이저용)
    this.sourceConnected = false; // Source 연결 상태

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
    this.equalizer = null; // 이퀄라이저 참조

    // 현재 트랙 정보
    this.currentTrack = null;
    this.currentTrackId = null;

    // 크로스페이드 설정
    this.crossfadeDuration = 1000; // 1초

    // 이벤트 핸들러 저장
    this.eventHandlers = {
      onplay: null,
      onpause: null,
      onend: null,
      ontimeupdate: null,
      onload: null,
      onloaderror: null
    };

    // ✅ 사용자 인터랙션 대기 플래그
    this._unlockHandlerAdded = false;

    this.init();
  }

  /**
   * 초기화
   */
  init() {
    console.log('🎵 AudioManager 초기화 (Howler.js 기반)');

    // Web Audio API 초기화
    this.initWebAudio();

    // 레거시 호환용 더미 Audio 객체 생성
    this.createDummyAudioElement();

    // Howler 전역 설정
    if (typeof Howler !== 'undefined') {
      Howler.volume(this.musicVolume);
      Howler.html5PoolSize = 10; // HTML5 Audio 풀 크기
      console.log('✅ Howler.js 준비 완료');
    } else {
      console.error('❌ Howler.js가 로드되지 않았습니다!');
    }
  }

  /**
   * 레거시 호환용 더미 Audio 객체
   */
  createDummyAudioElement() {
    this.audio = {
      src: '',
      currentTime: 0,
      duration: 0,
      volume: this.musicVolume,
      paused: true,
      readyState: 0,
      networkState: 0,
      play: () => this.play(),
      pause: () => this.pause(),
      load: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  }

  /**
   * 더미 Audio 객체 상태 업데이트
   */
  updateDummyAudio() {
    if (this.currentHowl && this.audio) {
      this.audio.src = this.currentHowl._src || '';
      this.audio.currentTime = this.currentHowl.seek() || 0;
      this.audio.duration = this.currentHowl.duration() || 0;
      this.audio.volume = this.musicVolume;
      this.audio.paused = !this.currentHowl.playing();
      this.audio.readyState = this.currentHowl.state() === 'loaded' ? 4 : 0;
    }
  }

  /**
   * URL 정규화 (R2 퍼블릭 URL을 워커로 우회)
   */
  _normalizeUrl(url) {
    if (!url) return url;

    // 이미 우리 워커면 그대로
    if (url.startsWith('https://melony-music-api.zepplinn25.workers.dev')) {
      return url;
    }

    // r2.dev로 바로 가는 건 CORS가 안 되니까 워커로 프록시
    if (url.includes('.r2.dev/')) {
      try {
        const u = new URL(url);
        const path = u.pathname.startsWith('/') ? u.pathname : '/' + u.pathname;
        return 'https://melony-music-api.zepplinn25.workers.dev/file' + path;
      } catch (e) {
        console.warn('URL 파싱 실패, 원본 사용:', url);
        return url;
      }
    }

    return url;
  }

  /**
   * 트랙 로드 (기본형) - 레거시 호환성
   */
  loadTrack(url, track) {
    return this.loadTrackEnhanced(url, track, { autoPlay: false });
  }

  /**
   * ✅ 트랙 로드 (Howler.js 기반 - 강화형)
   */
  async loadTrackEnhanced(url, track, options = {}) {
    if (!url || !track) {
      throw new Error('URL 또는 트랙 정보가 없습니다');
    }

    const myLoadId = ++this.currentLoadId;
    this.setLoadingState(true, track);

    const finalUrl = this._normalizeUrl(url);
    const trackId = this.getTrackId(track);

    console.log('🎵 Howler 트랙 로드 시작:', track.title, '| URL:', finalUrl);

    try {
      // ✅ 이전 Howl 정리
      if (this.currentHowl) {
        this.currentHowl.unload();
        this.currentHowl = null;
      }

      // ✅ 프리로드 큐에서 찾기
      if (this.preloadQueue.has(trackId)) {
        console.log('✅ 프리로드 큐에서 발견!', track.title);
        this.currentHowl = this.preloadQueue.get(trackId);
        this.preloadQueue.delete(trackId);
      } else {
        // 새로 로드
        this.currentHowl = this.createHowl(finalUrl, track);
      }

      this.currentTrack = track;
      this.currentTrackId = trackId;

      // ✅ Web Audio 연결 (비주얼라이저용)
      this.connectHowlToWebAudio();

      // ✅ 이퀄라이저 재연결 (설정 유지)
      if (this.equalizer) {
        setTimeout(() => {
          this.equalizer.reconnectFilters();
        }, 100);
      }

      // ✅ 로드 완료 대기 (최대 15초)
      await this.waitForHowlLoad(this.currentHowl, 15000);

      // ✅ 로딩 완료
      this.setLoadingState(false, track);
      this.updateDummyAudio();

      console.log('✅ Howler 트랙 로드 완료:', track.title);

      // ✅ 자동 재생
      if (options.autoPlay !== false && this.hasUserInteracted) {
        setTimeout(() => {
          this.play().catch(e => console.log('자동재생 실패:', e?.message));
        }, 100);
      }

      // ✅ 다음 곡들 프리로드 시작 (백그라운드)
      setTimeout(() => {
        this.preloadNextTracks(2);
      }, 500);

    } catch (error) {
      console.error('❌ Howler 트랙 로드 실패:', error);
      this.setLoadingState(false, track);
      throw error;
    }
  }

  /**
   * ✅ Howl 인스턴스 생성
   */
  createHowl(url, track) {
    const howl = new Howl({
      src: [url],
      html5: true,        // 스트리밍 지원
      preload: true,      // 자동 프리로드
      volume: this.musicVolume,
      format: ['mp3', 'm4a', 'webm', 'opus'], // 지원 포맷

      // ✅ 이벤트 핸들러
      onplay: () => {
        console.log('▶️ 재생 시작:', track.title);
        this.isPlaying = true;
        this.updateDummyAudio();

        // 비주얼라이저 시작
        if (window.melonyPlayer && window.melonyPlayer.visualizer) {
          window.melonyPlayer.visualizer.start();
        }

        // 외부 핸들러 호출
        if (this.eventHandlers.onplay) {
          this.eventHandlers.onplay();
        }
      },

      onpause: () => {
        console.log('⏸️ 재생 정지:', track.title);
        this.isPlaying = false;
        this.updateDummyAudio();

        // 비주얼라이저 정지
        if (window.melonyPlayer && window.melonyPlayer.visualizer) {
          window.melonyPlayer.visualizer.stop();
        }

        // 외부 핸들러 호출
        if (this.eventHandlers.onpause) {
          this.eventHandlers.onpause();
        }
      },

      onend: () => {
        console.log('🔚 재생 종료:', track.title);
        this.isPlaying = false;
        this.updateDummyAudio();

        // 외부 핸들러 호출 (main.js에서 다음 곡 재생)
        if (this.eventHandlers.onend) {
          this.eventHandlers.onend();
        }
      },

      onload: () => {
        console.log('✅ 로드 완료:', track.title);
        this.updateDummyAudio();

        // 외부 핸들러 호출
        if (this.eventHandlers.onload) {
          this.eventHandlers.onload();
        }
      },

      onloaderror: (id, error) => {
        console.error('❌ 로드 실패:', track.title, error);

        // 외부 핸들러 호출
        if (this.eventHandlers.onloaderror) {
          this.eventHandlers.onloaderror(error);
        }
      },

      onplayerror: (id, error) => {
        console.error('❌ 재생 실패:', track.title, error);

        // 자동 잠금 해제 시도
        howl.once('unlock', () => {
          howl.play();
        });
      }
    });

    // ✅ timeupdate 이벤트 시뮬레이션 (Howler에는 없음)
    this.startTimeUpdateInterval(howl);

    return howl;
  }

  /**
   * ✅ Howl 로드 완료 대기
   */
  waitForHowlLoad(howl, timeout = 15000) {
    return new Promise((resolve, reject) => {
      if (howl.state() === 'loaded') {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('로드 타임아웃'));
      }, timeout);

      howl.once('load', () => {
        clearTimeout(timer);
        resolve();
      });

      howl.once('loaderror', (id, error) => {
        clearTimeout(timer);
        reject(new Error(error || '로드 실패'));
      });
    });
  }

  /**
   * ✅ timeupdate 이벤트 시뮬레이션
   */
  startTimeUpdateInterval(howl) {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }

    this.timeUpdateInterval = setInterval(() => {
      if (howl && howl.playing()) {
        this.updateDummyAudio();

        // 외부 핸들러 호출
        if (this.eventHandlers.ontimeupdate) {
          this.eventHandlers.ontimeupdate();
        }
      }
    }, 100); // 100ms마다
  }

  /**
   * ✅ 다음 곡들 프리로드
   */
  async preloadNextTracks(count = 2) {
    if (!this.playlistManager) {
      console.warn('⚠️ PlaylistManager가 없어서 프리로드 불가');
      return;
    }

    console.log(`🔮 다음 ${count}곡 프리로드 시작...`);

    const currentIndex = this.playlistManager.currentTrackIndex;
    const playlist = this.playlistManager.currentPlaylist;

    for (let i = 1; i <= count; i++) {
      const nextIndex = (currentIndex + i) % playlist.length;
      const nextTrack = playlist[nextIndex];

      if (!nextTrack || nextTrack.isLocalFile) {
        continue; // 로컬 파일은 프리로드 불가
      }

      const trackId = this.getTrackId(nextTrack);

      // 이미 프리로드됨
      if (this.preloadQueue.has(trackId)) {
        console.log(`✅ 이미 프리로드됨: ${nextTrack.title}`);
        continue;
      }

      try {
        const baseUrl = window.melonyPlayer?.config?.get('api.baseUrl') || '';
        const folder = nextTrack.folder || 'pop';
        const filename = nextTrack.audio;

        let audioUrl = '';
        if (typeof Utils !== 'undefined' && Utils.generateAudioUrl) {
          audioUrl = Utils.generateAudioUrl(baseUrl, filename, folder);
        } else {
          audioUrl = `${baseUrl}/file/${folder}/${filename}`;
        }

        const finalUrl = this._normalizeUrl(audioUrl);

        console.log(`🔮 프리로딩: ${nextTrack.title}`);

        const howl = new Howl({
          src: [finalUrl],
          html5: true,
          preload: true,
          volume: 0, // 무음으로 프리로드
          format: ['mp3', 'm4a', 'webm', 'opus']
        });

        this.preloadQueue.set(trackId, howl);

        // 프리로드 완료 로그
        howl.once('load', () => {
          console.log(`✅ 프리로드 완료: ${nextTrack.title}`);
        });

      } catch (error) {
        console.warn(`⚠️ 프리로드 실패: ${nextTrack.title}`, error);
      }
    }

    // 프리로드 큐 크기 제한 (메모리 관리)
    if (this.preloadQueue.size > 5) {
      const firstKey = this.preloadQueue.keys().next().value;
      const firstHowl = this.preloadQueue.get(firstKey);
      firstHowl.unload();
      this.preloadQueue.delete(firstKey);
      console.log('🧹 프리로드 큐 정리:', firstKey);
    }
  }

  /**
   * 트랙 ID 생성
   */
  getTrackId(track) {
    return `${track.folder || 'unknown'}_${track.audio || track.title || 'unknown'}`;
  }

  /**
   * ✅ 재생
   */
  async play() {
    if (!this.currentHowl) {
      console.warn('⚠️ 재생할 Howl이 없습니다');
      return;
    }

    if (this.isPlaying && this.currentHowl.playing()) {
      console.log('⚠️ 이미 재생 중입니다');
      return;
    }

    try {
      // AudioContext resume (브라우저 정책)
      this.resumeAudioContext();

      this.currentHowl.play();
      this.isPlaying = true;
      console.log('▶️ 재생 시작');
    } catch (error) {
      console.error('재생 실패:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  /**
   * ✅ 일시정지
   */
  pause() {
    if (!this.currentHowl) return;

    try {
      this.currentHowl.pause();
      this.isPlaying = false;
      console.log('⏸️ 재생 정지');
    } catch (error) {
      console.error('정지 실패:', error);
    }
  }

  /**
   * ✅ 재생 토글
   */
  async togglePlay() {
    if (!this.currentHowl) {
      console.log('⚠️ Howl이 없습니다');
      return;
    }

    if (this.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  /**
   * ✅ 볼륨 설정
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.musicVolume);

    if (this.currentHowl) {
      this.currentHowl.volume(this.musicVolume);
    }

    console.log('🔊 볼륨 설정:', Math.round(this.musicVolume * 100) + '%');
  }

  /**
   * ✅ 재생 위치 이동
   */
  setCurrentTime(time) {
    if (!this.currentHowl) return;

    const duration = this.currentHowl.duration();
    if (!duration) return;

    const validTime = Math.max(0, Math.min(time, duration));
    this.currentHowl.seek(validTime);
    this.updateDummyAudio();
    console.log('🎵 재생 위치 설정:', validTime);
  }

  /**
   * ✅ 현재 재생 시간 가져오기
   */
  getCurrentTime() {
    if (!this.currentHowl) return 0;
    return this.currentHowl.seek() || 0;
  }

  /**
   * ✅ 총 재생 시간 가져오기
   */
  getDuration() {
    if (!this.currentHowl) return 0;
    return this.currentHowl.duration() || 0;
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

      // Master Gain Node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);

      // Analyser 연결
      this.analyser.connect(this.masterGain);

      console.log('🎛️ Web Audio API 초기화 완료');
    } catch (err) {
      console.error('Web Audio 초기화 실패:', err);
    }
  }

  /**
   * ✅ Howl을 Web Audio에 연결
   */
  connectHowlToWebAudio() {
    if (!this.audioContext || !this.currentHowl) {
      return;
    }

    try {
      // 기존 source 연결 해제
      if (this.source) {
        try {
          this.source.disconnect();
        } catch (e) {
          // 이미 해제됨
        }
      }

      // Howler.js는 html5: true 모드에서 HTMLAudioElement를 사용
      // _sounds 배열에서 첫 번째 사운드의 node를 가져옴
      if (this.currentHowl._sounds && this.currentHowl._sounds.length > 0) {
        const sound = this.currentHowl._sounds[0];
        const audioNode = sound._node;

        if (audioNode && audioNode.tagName === 'AUDIO') {
          // 새 트랙마다 새 MediaElementSourceNode 생성
          try {
            this.source = this.audioContext.createMediaElementSource(audioNode);
            this.sourceConnected = true;
            console.log('🎛️ MediaElementSource 생성 완료');

            // Source -> Analyser -> Destination 기본 연결
            // (이퀄라이저가 있으면 reconnectFilters()에서 체인 재구성)
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            console.log('🎛️ Howl을 Web Audio에 연결 완료');
          } catch (error) {
            // 이미 MediaElementSource가 생성된 경우
            console.warn('⚠️ MediaElementSource 생성 실패 (이미 생성됨):', error.message);
            this.sourceConnected = false;
          }
        }
      } else if (Howler.ctx) {
        // Web Audio 모드일 경우, Howler의 AudioContext 사용
        // 이 경우 equalizer는 Howler.masterGain에 연결해야 함
        console.log('🎛️ Howler Web Audio 모드 (Howler.masterGain 사용)');
      }

    } catch (err) {
      console.warn('⚠️ Web Audio 연결 실패:', err.message);
      // 연결 실패 시 sourceConnected 플래그 초기화
      this.sourceConnected = false;
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
   * AudioContext 재개
   */
  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Howler의 AudioContext도 재개
    if (typeof Howler !== 'undefined' && Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
  }

  /**
   * 로딩 상태 설정
   */
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
   * 자동재생 플래그 설정
   */
  setAutoPlay(reason = '') {
    this.shouldAutoPlay = true;
    this.autoPlayReason = reason;
    console.log('🎵 자동재생 플래그 설정:', reason);
  }

  /**
   * ✅ 자동재생 시도 (강화된 재시도 로직)
   */
  async attemptAutoPlay(retryCount = 0, maxRetries = 3) {
    if (!this.shouldAutoPlay || this.isPlaying || !this.currentHowl) {
      return false;
    }

    try {
      console.log(`🎵 자동재생 시도 (${retryCount + 1}/${maxRetries + 1})...`);

      // AudioContext unlock 시도
      this.resumeAudioContext();

      await this.play();
      this.shouldAutoPlay = false;
      console.log('✅ 자동재생 성공!');
      return true;

    } catch (error) {
      console.warn(`⚠️ 자동재생 실패 (${retryCount + 1}/${maxRetries + 1}):`, error?.message);

      // 재시도
      if (retryCount < maxRetries) {
        const delay = 2000; // 2초 대기
        console.log(`🔄 ${delay/1000}초 후 재시도...`);

        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await this.attemptAutoPlay(retryCount + 1, maxRetries);
            resolve(result);
          }, delay);
        });
      } else {
        console.error('❌ 자동재생 최종 실패 - 사용자 클릭 대기');
        // 사용자 인터랙션 대기 모드
        this.waitForUserInteraction();
        return false;
      }
    }
  }

  /**
   * ✅ 사용자 인터랙션 대기 (클릭/터치 시 자동 재생)
   */
  waitForUserInteraction() {
    if (this._unlockHandlerAdded) return;

    console.log('👆 사용자 클릭/터치를 기다리는 중...');

    const unlockHandler = async () => {
      console.log('✅ 사용자 인터랙션 감지!');

      this.hasUserInteracted = true;

      // 재생 시도
      if (this.currentHowl && !this.isPlaying) {
        try {
          await this.play();
          console.log('✅ 사용자 인터랙션 후 재생 성공!');
        } catch (e) {
          console.warn('⚠️ 재생 실패:', e?.message);
        }
      }

      // 이벤트 리스너 제거
      document.removeEventListener('click', unlockHandler);
      document.removeEventListener('touchstart', unlockHandler);
      this._unlockHandlerAdded = false;
    };

    document.addEventListener('click', unlockHandler);
    document.addEventListener('touchstart', unlockHandler);
    this._unlockHandlerAdded = true;
  }

  /**
   * ✅ 오디오 리셋
   */
  reset() {
    if (this.currentHowl) {
      this.currentHowl.unload();
      this.currentHowl = null;
    }

    this.isPlaying = false;
    this.currentTrack = null;
    this.currentTrackId = null;

    this.updateDummyAudio();
  }

  /**
   * ✅ 완전한 정리
   */
  resetAudio() {
    console.log('🔄 오디오 리셋 시작');

    // Howl 인스턴스 정리
    if (this.currentHowl) {
      this.currentHowl.unload();
      this.currentHowl = null;
    }

    // 프리로드 큐 정리
    this.preloadQueue.forEach((howl, trackId) => {
      howl.unload();
    });
    this.preloadQueue.clear();

    // timeUpdate 인터벌 정리
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }

    // AudioContext 정리
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
      this.analyser = null;
      this.dataArray = null;
      this.masterGain = null;
    }

    this.isPlaying = false;
    this.currentTrack = null;
    this.currentTrackId = null;

    console.log('🔄 오디오 리셋 완료');
  }

  /**
   * 효과음 볼륨 설정
   */
  setEffectVolume(volume) {
    this.effectVolume = Math.max(0, Math.min(1, volume));
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

  /**
   * 디버그 정보
   */
  debugAudioState() {
    console.log('🎵 오디오 상태:', {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack ? this.currentTrack.title : null,
      preloadQueueSize: this.preloadQueue.size,
      duration: this.getDuration(),
      currentTime: this.getCurrentTime(),
      volume: this.musicVolume
    });
  }

  /**
   * 볼륨 가져오기
   */
  getMusicVolume() {
    return this.musicVolume;
  }

  getEffectVolume() {
    return this.effectVolume;
  }

  /**
   * AudioContext 상태
   */
  getAudioContextState() {
    return this.audioContext ? this.audioContext.state : 'none';
  }

  /**
   * ✅ 이벤트 핸들러 등록 (레거시 호환)
   */
  addEventListener(event, handler) {
    const eventMap = {
      'play': 'onplay',
      'pause': 'onpause',
      'ended': 'onend',
      'timeupdate': 'ontimeupdate',
      'loadedmetadata': 'onload',
      'canplay': 'onload',
      'error': 'onloaderror'
    };

    const mappedEvent = eventMap[event];
    if (mappedEvent && this.eventHandlers[mappedEvent] !== undefined) {
      this.eventHandlers[mappedEvent] = handler;
      console.log(`✅ 이벤트 핸들러 등록: ${event} -> ${mappedEvent}`);
    }
  }

  /**
   * ✅ 이벤트 핸들러 제거 (레거시 호환)
   */
  removeEventListener(event, handler) {
    const eventMap = {
      'play': 'onplay',
      'pause': 'onpause',
      'ended': 'onend',
      'timeupdate': 'ontimeupdate',
      'loadedmetadata': 'onload',
      'canplay': 'onload',
      'error': 'onloaderror'
    };

    const mappedEvent = eventMap[event];
    if (mappedEvent && this.eventHandlers[mappedEvent] !== undefined) {
      this.eventHandlers[mappedEvent] = null;
      console.log(`✅ 이벤트 핸들러 제거: ${event} -> ${mappedEvent}`);
    }
  }

  /**
   * 페이드 인 (미구현 - 추후 추가)
   */
  fadeInAudio(duration = 500) {
    return Promise.resolve();
  }

  /**
   * 페이드 아웃 (미구현 - 추후 추가)
   */
  fadeOutAudio(duration = 500) {
    return Promise.resolve();
  }

  /**
   * 오디오 소스 연결 (레거시 호환 - 자동 처리)
   */
  connectAudioSource() {
    // Howler.js가 자동으로 처리
    console.log('🎛️ 오디오 소스 자동 연결 (Howler)');
  }

  /**
   * 오디오 소스 해제 (레거시 호환)
   */
  disconnectAudioSource() {
    // Howler.js가 자동으로 처리
    console.log('🎛️ 오디오 소스 자동 해제 (Howler)');
  }
}

window.AudioManager = AudioManager;
