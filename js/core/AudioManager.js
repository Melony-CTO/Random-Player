/**
 * AudioManager - Howler.js 기반 오디오 관리자
 * - 음악 재생, 일시정지, 정지, 볼륨 제어
 * - 프리로딩 및 크로스페이드 지원
 * - 재생 상태 추적 및 이벤트 처리
 */
class AudioManager {
    constructor() {
        this.currentSound = null;
        this.preloadedSound = null;
        this.playlistManager = null; // 외부에서 주입받음
        
        this.volume = 0.7;
        this.isMuted = false;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTrackUrl = null;
        this.currentTrackIndex = null;
        
        // 페이드 효과 설정
        this.fadeInDuration = 500;    // 페이드 인 500ms
        this.fadeOutDuration = 300;   // 페이드 아웃 300ms
        this.crossfadeDuration = 500; // 크로스페이드 500ms
        
        // 재생 이벤트 콜백
        this.onPlay = null;
        this.onPause = null;
        this.onStop = null;
        this.onEnd = null;
        this.onError = null;
        this.onTimeUpdate = null;
        this.onLoad = null;
        
        // 오디오 컨텍스트 (Web Audio API)
        this.audioContext = null;
        this.analyser = null;
        
        // 프리로딩 관리
        this.preloadQueue = [];
        this.maxPreloadSize = 3; // 최대 3곡까지 프리로드
        
        console.log('🎵 AudioManager 초기화 완료');
    }
    
    /**
     * Web Audio API 컨텍스트 초기화 (비주얼라이저용)
     */
    initAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 2048;
                
                // Howler의 마스터 게인을 AudioContext에 연결
                if (Howler.ctx) {
                    Howler.masterGain.connect(this.analyser);
                    this.analyser.connect(this.audioContext.destination);
                }
                
                console.log('✅ AudioContext 초기화 완료');
            } catch (error) {
                console.error('❌ AudioContext 초기화 실패:', error);
            }
        }
        return this.analyser;
    }
    
    /**
     * 오디오 로드 및 재생
     * @param {string} url - 오디오 파일 URL
     * @param {boolean} autoplay - 자동 재생 여부
     * @param {number} trackIndex - 트랙 인덱스 (선택사항)
     */
    async load(url, autoplay = true, trackIndex = null) {
        console.log('🎵 AudioManager.load():', url);
        
        // 이전 사운드 정리
        if (this.currentSound) {
            this.currentSound.fade(this.currentSound.volume(), 0, this.fadeOutDuration);
            setTimeout(() => {
                if (this.currentSound) {
                    this.currentSound.unload();
                }
            }, this.fadeOutDuration);
        }
        
        // 프리로드된 사운드가 있으면 사용
        if (this.preloadedSound && this.preloadedSound._src === url) {
            console.log('✅ 프리로드된 사운드 사용:', url);
            this.currentSound = this.preloadedSound;
            this.preloadedSound = null;
            
            if (autoplay) {
                this.play();
            }
            
            this.currentTrackUrl = url;
            this.currentTrackIndex = trackIndex;
            
            // 다음 곡 프리로드
            this.preloadNextTrack();
            
            return;
        }
        
        // 새로운 사운드 생성
        return new Promise((resolve, reject) => {
            try {
                const sound = new Howl({
                    src: [url],
                    html5: true,
                    volume: this.isMuted ? 0 : this.volume,
                    onload: () => {
                        console.log('✅ 오디오 로드 완료:', url);
                        
                        this.currentSound = sound;
                        this.currentTrackUrl = url;
                        this.currentTrackIndex = trackIndex;
                        
                        if (this.onLoad) {
                            this.onLoad({
                                duration: sound.duration()
                            });
                        }
                        
                        if (autoplay) {
                            this.play();
                        }
                        
                        // 다음 곡 프리로드
                        this.preloadNextTrack();
                        
                        resolve(sound);
                    },
                    onplay: () => {
                        this.isPlaying = true;
                        this.isPaused = false;
                        
                        if (this.onPlay) {
                            this.onPlay();
                        }
                        
                        // 시간 업데이트 시작
                        this.startTimeUpdate();
                    },
                    onpause: () => {
                        this.isPlaying = false;
                        this.isPaused = true;
                        
                        if (this.onPause) {
                            this.onPause();
                        }
                        
                        this.stopTimeUpdate();
                    },
                    onstop: () => {
                        this.isPlaying = false;
                        this.isPaused = false;
                        
                        if (this.onStop) {
                            this.onStop();
                        }
                        
                        this.stopTimeUpdate();
                    },
                    onend: () => {
                        this.isPlaying = false;
                        this.isPaused = false;
                        
                        if (this.onEnd) {
                            this.onEnd();
                        }
                        
                        this.stopTimeUpdate();
                    },
                    onloaderror: (id, error) => {
                        console.error('❌ 오디오 로드 에러:', error);
                        
                        if (this.onError) {
                            this.onError({ type: 'load', error });
                        }
                        
                        reject(error);
                    },
                    onplayerror: (id, error) => {
                        console.error('❌ 오디오 재생 에러:', error);
                        
                        if (this.onError) {
                            this.onError({ type: 'play', error });
                        }
                    }
                });
                
            } catch (error) {
                console.error('❌ Howl 생성 실패:', error);
                reject(error);
            }
        });
    }
    
    /**
     * 재생
     */
    play() {
        if (!this.currentSound) {
            console.warn('⚠️ 재생할 사운드가 없습니다');
            return;
        }
        
        // AudioContext resume (브라우저 정책)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.currentSound.play();
        
        // 페이드 인 효과
        this.currentSound.fade(0, this.isMuted ? 0 : this.volume, this.fadeInDuration);
    }
    
    /**
     * 일시정지
     */
    pause() {
        if (this.currentSound) {
            this.currentSound.pause();
        }
    }
    
    /**
     * 정지
     */
    stop() {
        if (this.currentSound) {
            this.currentSound.stop();
        }
    }
    
    /**
     * 재생/일시정지 토글
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    /**
     * 볼륨 설정
     * @param {number} value - 0.0 ~ 1.0
     */
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        
        if (this.currentSound && !this.isMuted) {
            this.currentSound.volume(this.volume);
        }
    }
    
    /**
     * 음소거 토글
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.currentSound) {
            this.currentSound.volume(this.isMuted ? 0 : this.volume);
        }
        
        return this.isMuted;
    }
    
    /**
     * 재생 위치 이동 (초 단위)
     * @param {number} time - 이동할 시간 (초)
     */
    seek(time) {
        if (this.currentSound) {
            this.currentSound.seek(time);
        }
    }
    
    /**
     * 현재 재생 위치 가져오기 (초)
     */
    getCurrentTime() {
        if (this.currentSound) {
            return this.currentSound.seek() || 0;
        }
        return 0;
    }
    
    /**
     * 총 재생 시간 가져오기 (초)
     */
    getDuration() {
        if (this.currentSound) {
            return this.currentSound.duration() || 0;
        }
        return 0;
    }
    
    /**
     * 현재 볼륨 가져오기
     */
    getVolume() {
        return this.volume;
    }
    
    /**
     * 음소거 상태 가져오기
     */
    isMutedState() {
        return this.isMuted;
    }
    
    /**
     * 재생 상태 가져오기
     */
    getPlayingState() {
        return this.isPlaying;
    }
    
    /**
     * 시간 업데이트 시작
     */
    startTimeUpdate() {
        this.stopTimeUpdate();
        
        this.timeUpdateInterval = setInterval(() => {
            if (this.isPlaying && this.onTimeUpdate) {
                this.onTimeUpdate({
                    currentTime: this.getCurrentTime(),
                    duration: this.getDuration()
                });
            }
        }, 100); // 100ms마다 업데이트
    }
    
    /**
     * 시간 업데이트 정지
     */
    stopTimeUpdate() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
    }
    
    /**
     * 다음 곡 프리로드
     */
    preloadNextTrack() {
        if (!this.playlistManager) {
            return;
        }
        
        try {
            const nextTrack = this.playlistManager.peekNext();
            
            if (nextTrack && nextTrack.url) {
                this.preload(nextTrack.url);
            }
        } catch (error) {
            console.error('❌ 다음 곡 프리로드 실패:', error);
        }
    }
    
    /**
     * 오디오 프리로드
     * @param {string} url - 프리로드할 오디오 URL
     */
    preload(url) {
        // 이미 프리로드 중이거나 현재 재생 중인 URL이면 스킵
        if (this.preloadedSound && this.preloadedSound._src === url) {
            return;
        }
        
        if (this.currentSound && this.currentSound._src === url) {
            return;
        }
        
        console.log('⏳ 오디오 프리로드 시작:', url);
        
        // 이전 프리로드 정리
        if (this.preloadedSound) {
            this.preloadedSound.unload();
            this.preloadedSound = null;
        }
        
        try {
            this.preloadedSound = new Howl({
                src: [url],
                html5: true,
                preload: true,
                volume: 0,
                onload: () => {
                    console.log('✅ 프리로드 완료:', url);
                },
                onloaderror: (id, error) => {
                    console.error('❌ 프리로드 실패:', error);
                    this.preloadedSound = null;
                }
            });
        } catch (error) {
            console.error('❌ 프리로드 생성 실패:', error);
        }
    }
    
    /**
     * 모든 리소스 정리
     */
    cleanup() {
        console.log('🧹 AudioManager 리소스 정리...');
        
        this.stopTimeUpdate();
        
        if (this.currentSound) {
            this.currentSound.unload();
            this.currentSound = null;
        }
        
        if (this.preloadedSound) {
            this.preloadedSound.unload();
            this.preloadedSound = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTrackUrl = null;
        this.currentTrackIndex = null;
        
        console.log('✅ AudioManager 리소스 정리 완료');
    }
    
    /**
     * 현재 트랙 URL 가져오기
     */
    getCurrentTrackUrl() {
        return this.currentTrackUrl;
    }
    
    /**
     * 현재 트랙 인덱스 가져오기
     */
    getCurrentTrackIndex() {
        return this.currentTrackIndex;
    }
}


