/**
 * Melony Player - 메인 애플리케이션 (최적화판)
 * - ✅ 트랙 전환 디바운스 추가 (중복 요청 방지)
 * - ✅ 메모리 관리 개선
 * - ✅ 재생 안정성 향상
 */
class MelonyPlayer {
    constructor() {
        this.config = null;
        this.cache = null;
        this.api = null;
        this.audioManager = null;
        this.playlistManager = null;
        this.uiManager = null;
        this.visualizer = null;
        this.equalizer = null;
        this.touchHandler = null;
        this.coverManager = null;
        this.effectSoundManager = null;
        this.titleFormatter = null;

        this.isInitialized = false;
        this.startTime = Date.now();

        // ✅ 트랙 전환 제어 플래그
        this.isTrackSwitching = false;
        this.trackSwitchTimeout = null;
        
        // ✅ 디바운스 타이머
        this.nextTrackDebounceTimer = null;
        this.prevTrackDebounceTimer = null;

        // ✅ 로딩 실패 시 자동 스킵 플래그
        this._skipFailedTrack = false;

        // 내부 유틸 캐시
        this._imgCache = new Map();

        this.init();
    }

    /**
     * 애플리케이션 초기화
     */
    async init() {
        try {
            console.log('🚀 Melony Player 초기화 시작...');

            // 1. 설정 및 유틸리티 초기화
            await this.initializeCore();

            // 2. UI 및 이벤트 초기화
            await this.initializeUI();

            // 3. 오디오 시스템 초기화
            await this.initializeAudio();

            // 4. 데이터 로딩
            await this.loadInitialData();

            // 5. 이벤트 리스너 설정
            this.setupEventListeners();

            // 6. 초기화 완료
            this.isInitialized = true;

            const loadTime = Date.now() - this.startTime;
            console.log('✅ Melony Player 초기화 완료!', loadTime + 'ms');

            // 방문 통계 업데이트
            this.updateVisitStats();

        } catch (error) {
            console.error('❌ 초기화 실패:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * 핵심 모듈 초기화
     */
    async initializeCore() {
        console.log('🔧 핵심 모듈 초기화...');

        // 설정 관리자
        this.config = new Config();

        // 캐시 관리자
        this.cache = new Cache();

        // API 관리자
        this.api = new API(this.config, this.cache);

        // 제목 포맷터
        this.titleFormatter = new TitleFormatter({ debug: false });

        console.log('✅ 핵심 모듈 초기화 완료');
    }

    /**
     * UI 시스템 초기화
     */
    async initializeUI() {
        console.log('🎨 UI 시스템 초기화...');

        // UI 관리자
        this.uiManager = new UIManager();

        // 커버 관리자 (API 주입)
        if (typeof CoverManager === 'undefined') {
            throw new Error('CoverManager가 로드되지 않았습니다. 스크립트 로딩 순서를 확인하세요.');
        }
        this.coverManager = new CoverManager(this.api);

        console.log('✅ UI 시스템 초기화 완료');
    }

    /**
     * 오디오 시스템 초기화
     */
    async initializeAudio() {
        console.log('🎵 오디오 시스템 초기화...');

        // 오디오 관리자
        this.audioManager = new AudioManager();

        // 플레이리스트 관리자
        this.playlistManager = new PlaylistManager();

        // 비주얼라이저
        this.visualizer = new Visualizer(this.audioManager);

        // 이퀄라이저
        this.equalizer = new Equalizer(this.audioManager);

this.youtubeManager = new YouTubeManager();

        // ✅ 효과음 관리자 먼저 생성
        this.effectSoundManager = new EffectSoundManager(this.audioManager, this.api);

        // ✅ 터치 핸들러 생성 (audioManager와 effectSoundManager 모두 준비된 후)
        this.touchHandler = new TouchHandler(this.uiManager, this.audioManager, this.effectSoundManager);

        // 🔒 보안 관리자 초기화
        // ⚠️ 배포 시: enabled를 true로 변경하세요!
        this.securityManager = new SecurityManager({
            enabled: true,               // 🔴 개발: false, 🟢 배포: true
            blockRightClick: true,       // 우클릭 차단
            blockF12Key: true,           // F12 키만 차단 (Ctrl+Shift+I는 사용 가능)
            blockConsoleLog: false,      // 콘솔 로그 완전 차단 (개발 중: false)
            obfuscateConsoleLog: true,   // 콘솔 URL 난독화 (권장: true) ✨
            blockSelection: true,        // 텍스트 선택 차단
            blockDragDrop: true,         // 드래그 앤 드롭 차단
            blockScreenshot: false,      // 스크린샷 차단 (실험적, 권장: false)
            showWarning: true            // 경고 메시지 표시
        });

        console.log('✅ 오디오 시스템 초기화 완료');
    }

    /**
     * 초기 데이터 로딩
     */
    async loadInitialData() {
        console.log('📊 초기 데이터 로딩...');

        try {
            // ✅ 1. 커버 데이터 먼저 로딩 (트랙보다 우선)
            try {
                console.log('🖼️ 커버 데이터 로딩 시작 (우선)');

                // POP 커버 먼저 로드 (동기 - 반드시 기다림)
                const popCoverSuccess = await this.coverManager.loadCoversByCategory('pop');
                
                if (!popCoverSuccess) {
                    console.error('❌ POP 커버 로딩 실패, 기본 커버 사용');
                    this.coverManager.generateDefaultCovers();
                } else {
                    console.log('✅ POP 커버 로드 성공');
                }

                // KPOP 커버도 로드 (POP 커버 공유)
                await this.coverManager.loadCoversByCategory('kpop');

                // LOFI 커버 백그라운드 로드 (비동기)
                this.coverManager.loadCoversByCategory('lofi-inst').catch(() => {
                    console.log('⚠️ LOFI 커버 로드 실패');
                });

                // Ambient 커버 백그라운드 로드 (비동기)
                this.coverManager.loadCoversByCategory('ambient').catch(() => {
                    console.log('⚠️ Ambient 커버 로드 실패');
                });

                console.log('✅ 커버 데이터 초기 로딩 완료');

            } catch (error) {
                console.error('❌ 커버 데이터 로딩 실패:', error);
                this.coverManager.generateDefaultCovers();
            }

            // ✅ 2. 플레이리스트 데이터 로드
            const popData = await this.api.get('/playlist-pop.json').catch(() => {
                console.warn('POP 플레이리스트 로드 실패 → 기본값 사용');
                return { tracks: [] };
            });

            const kpopData = await this.api.get('/playlist-kpop.json').catch(() => {
                console.warn('KPOP 플레이리스트 로드 실패 → 기본값 사용');
                return { tracks: [] };
            });

           const lofiData = await this.api.get('/playlist-lofi-inst.json').catch(() => {
                console.warn('LOFI-INST 플레이리스트 로드 실패 → 기본값 사용');
                return { tracks: [] };
            });

            const ambientData = await this.api.get('/playlist-ambient.json').catch(() => {
                console.warn('Ambient 플레이리스트 로드 실패 → 기본값 사용');
                return { tracks: [] };
            });

            console.log('📊 API 응답 데이터 확인:');
            console.log('  - popData:', popData ? (popData.tracks || popData).length + '곡' : '없음');
            console.log('  - kpopData:', kpopData ? (kpopData.tracks || kpopData).length + '곡' : '없음');
            console.log('  - lofiData:', lofiData ? (lofiData.tracks || lofiData).length + '곡' : '없음');
            console.log('  - ambientData:', ambientData ? (ambientData.tracks || ambientData).length + '곡' : '없음');

            // POP
            if (popData && (popData.tracks || popData).length > 0) {
                const tracks = popData.tracks || popData;
                const processedTracks = tracks.map(track => ({
                    ...track,
                    folder: 'pop'
                }));
                this.playlistManager.shuffledTracks.pop = this.playlistManager.shuffleArray([...processedTracks]);
                console.log('✅ POP 카테고리 데이터 설정 완료:', processedTracks.length + '곡');
            }

            // KPOP
            if (kpopData && (kpopData.tracks || kpopData).length > 0) {
                const tracks = kpopData.tracks || kpopData;
                const processedTracks = tracks.map(track => {
                    const { coverUrl, cover, image, ...cleanTrack } = track;
                    return {
                        ...cleanTrack,
                        folder: 'kpop'
                    };
                });
                this.playlistManager.shuffledTracks['kpop'] = this.playlistManager.shuffleArray([...processedTracks]);
                console.log('✅ KPOP 카테고리 데이터 설정 완료:', processedTracks.length + '곡');
            }

            // LOFI
            if (lofiData && (lofiData.tracks || lofiData).length > 0) {
                const tracks = lofiData.tracks || lofiData;
                const processedTracks = tracks.map(track => ({
                    ...track,
                    folder: 'lofi-inst'
                }));
                this.playlistManager.shuffledTracks['lofi-inst'] = this.playlistManager.shuffleArray([...processedTracks]);
                console.log('✅ LOFI-INST 카테고리 데이터 설정 완료:', processedTracks.length + '곡');
            }

            // Ambient
            if (ambientData && (ambientData.tracks || ambientData).length > 0) {
                const tracks = ambientData.tracks || ambientData;
                const processedTracks = tracks.map(track => ({
                    ...track,
                    folder: 'ambient'
                }));
                this.playlistManager.shuffledTracks['ambient'] = this.playlistManager.shuffleArray([...processedTracks]);
                console.log('✅ Ambient 카테고리 데이터 설정 완료:', processedTracks.length + '곡');
            }

            // 초기 플레이리스트 설정 (POP)
            this.playlistManager.currentCategory = 'pop';
            this.playlistManager.updateCurrentPlaylist();

            // ✅ 3. 첫 곡 로드 + 자동재생 (커버가 이미 로드된 상태)
            const firstTrack = this.playlistManager.getTrackByIndex(0);
            if (firstTrack) {
                console.log('🔥 즉시 첫 곡 로드:', firstTrack.title);
                await this.loadTrack(firstTrack);

                this.audioManager.hasUserInteracted = true;

                setTimeout(() => {
                    if (this.audioManager.audio.src && this.audioManager.audio.readyState >= 2) {
                        this.audioManager.setAutoPlay('초기 로드');
                        this.audioManager.attemptAutoPlay();
                        console.log('✅ 첫 곡 자동재생 시도');
                    }
                }, 300);
            }

            console.log('✅ 초기 데이터 로딩 완료');

        } catch (error) {
            console.error('❌ 데이터 로딩 실패:', error);
            throw error;
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        console.log('🎧 이벤트 리스너 설정...');

        // ✅ 재생/일시정지 토글
        this.uiManager.on('playToggle', () => {
            console.log('🎵 재생/일시정지 토글');
            this.audioManager.togglePlay();
        });

        // ✅ 다음 곡 (디바운스 적용)
        this.uiManager.on('nextTrack', () => {
            this.handleNextTrackDebounced();
        });

        // ✅ 이전 곡 (디바운스 적용)
        this.uiManager.on('previousTrack', () => {
            this.handlePreviousTrackDebounced();
        });

        // 진행바 클릭
        this.uiManager.on('progressBarClick', (percent) => {
            if (this.audioManager.audio && this.audioManager.audio.duration) {
                const newTime = percent * this.audioManager.audio.duration;
                this.audioManager.setCurrentTime(newTime);
                console.log('🎯 재생 위치 변경:', this.formatTime(newTime));
            }
        });

        // 카테고리 전환
        this.uiManager.on('categorySwitch', (categoryName) => {
            this.switchCategory(categoryName);
        });

        // 배경음 토글
        this.uiManager.on('bgSoundToggle', (soundType) => {
            if (this.effectSoundManager && this.effectSoundManager.toggleBgSound) {
                this.effectSoundManager.toggleBgSound(soundType);
            }
        });

        // 로컬 파일 선택
        this.uiManager.on('localFilesSelected', (files, type) => {
            this.processLocalFiles(files, type);
        });

        console.log('✅ 이벤트 리스너 설정 완료');
    }

    /**
     * ✅ 다음 곡 (디바운스 적용) - 중복 요청 방지, stalled 상태 감지
     */
    handleNextTrackDebounced() {
        // ✅ stalled 상태면 즉시 전환 (디바운스 없이)
        const audio = this.audioManager.audio;
        if (audio) {
            const isStalled = audio.networkState === 2 && audio.readyState === 0;
            const hasError = audio.error;

            if (isStalled || hasError) {
                console.warn('⚠️ stalled/error 상태 감지, 즉시 다음 곡 전환');
                this.isTrackSwitching = false; // 플래그 해제하고 강제 전환
                this.playNextTrack();
                return;
            }
        }

        // 이미 처리 중이면 무시
        if (this.isTrackSwitching) {
            console.log('⏭️ 트랙 전환 중... 대기');
            return;
        }

        // 기존 타이머 취소
        if (this.nextTrackDebounceTimer) {
            clearTimeout(this.nextTrackDebounceTimer);
        }

        // 200ms 디바운스 (더 빠른 반응)
        this.nextTrackDebounceTimer = setTimeout(() => {
            this.playNextTrack();
        }, 200);
    }

    /**
     * ✅ 이전 곡 (디바운스 적용) - 중복 요청 방지
     */
    handlePreviousTrackDebounced() {
        // 이미 처리 중이면 무시
        if (this.isTrackSwitching) {
            console.log('⏮️ 트랙 전환 중... 대기');
            return;
        }

        // 기존 타이머 취소
        if (this.prevTrackDebounceTimer) {
            clearTimeout(this.prevTrackDebounceTimer);
        }

        // 200ms 디바운스 (더 빠른 반응)
        this.prevTrackDebounceTimer = setTimeout(() => {
            this.playPreviousTrack();
        }, 200);
    }

    /**
     * ✅ 오디오 이벤트 리스너 설정 (개선)
     */
    setupAudioEventListeners() {
        if (!this.audioManager.audio) return;

        const audio = this.audioManager.audio;

        // ✅ 기존 이벤트 리스너 제거 (중복 방지)
        if (this._audioEventHandlers) {
            Object.entries(this._audioEventHandlers).forEach(([event, handler]) => {
                audio.removeEventListener(event, handler);
            });
        }

        // 새 이벤트 핸들러 정의
        this._audioEventHandlers = {
            play: () => {
                console.log('▶️ 재생 시작');
                this.audioManager.isPlaying = true;
                this.uiManager.updatePlayButton(true);
                this.uiManager.updateThumbnailState('playing');
                
                if (this.visualizer) {
                    this.visualizer.start();
                }
            },

            pause: () => {
                console.log('⏸️ 재생 정지');
                this.audioManager.isPlaying = false;
                this.uiManager.updatePlayButton(false);
                this.uiManager.updateThumbnailState('paused');
                
                if (this.visualizer) {
                    this.visualizer.stop();
                }
            },

            ended: () => {
                console.log('🔚 트랙 종료 - 자동으로 다음 곡 재생');
                this.playNextTrack();
            },

            timeupdate: () => {
                if (audio.duration) {
                    this.uiManager.updateProgress(audio.currentTime, audio.duration);
                }
            },

            loadstart: () => {
                console.log('⏳ 로딩 시작');
                this.uiManager.updateThumbnailState('loading');
            },

            canplay: () => {
                console.log('✅ 재생 가능');
                this.uiManager.updateThumbnailState(this.audioManager.isPlaying ? 'playing' : 'paused');

                // ✅ stalled 타이머 취소 (정상 재생 가능)
                if (this._stalledTimer) {
                    clearTimeout(this._stalledTimer);
                    this._stalledTimer = null;
                }
            },

            stalled: () => {
                console.warn('⏸️ stalled 이벤트 - 10초 후 자동 복구 시도');

                // ✅ 기존 타이머 취소
                if (this._stalledTimer) {
                    clearTimeout(this._stalledTimer);
                }

                // ✅ 10초 후에도 stalled면 다음 곡으로
                this._stalledTimer = setTimeout(() => {
                    const audio = this.audioManager.audio;
                    if (!audio) return;

                    const isStillStalled = audio.networkState === 2 && audio.readyState === 0;

                    if (isStillStalled) {
                        console.error('❌ 10초 경과, stalled 상태 지속 - 다음 곡으로 전환');
                        this.playNextTrack();
                    }
                }, 10000);
            },

error: (e) => {
                const currentSrc = audio.currentSrc || audio.src;
                const errorCode = audio.error?.code;

                // ✅ stalled 타이머 취소
                if (this._stalledTimer) {
                    clearTimeout(this._stalledTimer);
                    this._stalledTimer = null;
                }

                console.log('🔍 오디오 에러 감지:', {
                    code: errorCode,
                    src: currentSrc,
                    readyState: audio.readyState,
                    isTrackSwitching: this.isTrackSwitching
                });

                // ✅ src가 비어있으면 무시
                if (!currentSrc || currentSrc === '' || currentSrc === 'about:blank') {
                    console.log('⚠️ 빈 src 에러 무시');
                    return;
                }

                // ✅ 트랙 전환 중 발생하는 에러는 무시
                if (this.isTrackSwitching) {
                    console.log('⚠️ 트랙 전환 중 에러 무시');
                    return;
                }

                // ✅ PC 카테고리: blob URL + readyState >= 1이면 무시
                if (currentSrc.startsWith('blob:') && audio.readyState >= 1) {
                    console.log('⚠️ PC 카테고리 - 메타데이터 로드 후 에러 무시 (재생 가능)');
                    return;
                }

                // ✅ 실제 로딩 실패만 처리
                console.error('❌ 실제 오디오 오류:', {
                    code: errorCode,
                    message: audio.error?.message,
                    src: currentSrc
                });

                setTimeout(() => {
                    console.log('🔄 오류로 인한 다음 곡 자동 전환');
                    this.playNextTrack();
                }, 1000);
            }
        };

        // 이벤트 리스너 등록
        Object.entries(this._audioEventHandlers).forEach(([event, handler]) => {
            audio.addEventListener(event, handler);
        });
    }

    /**
     * 다음 트랙 재생
     */
    async playNextTrack() {
        console.log('⏭️ 다음 트랙 재생');

        // ✅ 트랙 전환 중 플래그 설정
        if (this.isTrackSwitching) {
            console.log('⚠️ 이미 트랙 전환 중입니다');
            return;
        }

        this.isTrackSwitching = true;

        try {
            const nextTrack = this.playlistManager.getNextTrack();
            
            if (!nextTrack) {
                console.error('❌ 다음 트랙이 없습니다');
                this.isTrackSwitching = false;
                return;
            }

            console.log('🎵 다음 트랙:', nextTrack.title);

            // 로컬 파일인 경우
            if (nextTrack.isLocalFile) {
                await this.loadLocalTrack(this.playlistManager.currentTrackIndex);
            } else {
                await this.loadTrack(nextTrack);
            }

            // ✅ 로드 성공하면 즉시 플래그 해제
            this.isTrackSwitching = false;
            console.log('✅ 트랙 로드 완료, 플래그 해제');

            // ✅ 자동 재생 (더 확실하게)
            setTimeout(() => {
                this.audioManager.play().catch(e => {
                    console.log('재생 실패:', e?.message);
                });
            }, 100);

        } catch (error) {
            console.error('❌ 다음 트랙 재생 실패:', error);
            // 에러 시에도 플래그 해제
            this.isTrackSwitching = false;
        }
    }

    /**
     * 이전 트랙 재생
     */
    async playPreviousTrack() {
        console.log('⏮️ 이전 트랙 재생');

        // ✅ 트랙 전환 중 플래그 설정
        if (this.isTrackSwitching) {
            console.log('⚠️ 이미 트랙 전환 중입니다');
            return;
        }

        this.isTrackSwitching = true;

        try {
            const prevTrack = this.playlistManager.getPreviousTrack();
            
            if (!prevTrack) {
                console.error('❌ 이전 트랙이 없습니다');
                this.isTrackSwitching = false;
                return;
            }

            console.log('🎵 이전 트랙:', prevTrack.title);

            // 로컬 파일인 경우
            if (prevTrack.isLocalFile) {
                await this.loadLocalTrack(this.playlistManager.currentTrackIndex);
            } else {
                await this.loadTrack(prevTrack);
            }

            // ✅ 로드 성공하면 즉시 플래그 해제
            this.isTrackSwitching = false;
            console.log('✅ 트랙 로드 완료, 플래그 해제');

            // ✅ 자동 재생 (더 확실하게)
            setTimeout(() => {
                this.audioManager.play().catch(e => {
                    console.log('재생 실패:', e?.message);
                });
            }, 100);

        } catch (error) {
            console.error('❌ 이전 트랙 재생 실패:', error);
            // 에러 시에도 플래그 해제
            this.isTrackSwitching = false;
        }
    }

    /**
     * 카테고리 전환
     */
    async switchCategory(categoryName) {
        console.log('🔄 카테고리 전환:', categoryName);

        try {
            // PC 카테고리인 경우 파일 선택 다이얼로그 표시
            if (categoryName === 'pc') {
                this.showFileSelector();
                return;
            }

            // ✅ PC에서 다른 카테고리로 전환 시 유튜브 숨기기
            if (this.playlistManager.currentCategory === 'pc' && this.youtubeManager) {
                this.youtubeManager.hide();
                console.log('📺 PC → 다른 카테고리: 유튜브 숨김');
            }

            // 플레이리스트 매니저 카테고리 전환
            this.playlistManager.switchCategory(categoryName);

            // UI 업데이트
            this.uiManager.updateCategoryButtons(categoryName);

            // 첫 번째 트랙 로드
            const firstTrack = this.playlistManager.getTrackByIndex(0);
            if (firstTrack) {
                await this.loadTrack(firstTrack);
                this.audioManager.setAutoPlay('카테고리 전환');
                this.audioManager.attemptAutoPlay();
            }

        } catch (error) {
            console.error('❌ 카테고리 전환 실패:', error);
        }
    }

    /**
     * 트랙 로드
     */
    async loadTrack(track) {
        if (!track || !track.audio) {
            console.error('❌ 유효하지 않은 트랙:', track);
            return;
        }

        try {
            console.log('🎵 트랙 로드:', track.title);

            const folder = track.folder || 'pop';
            const filename = track.audio;

            // 오디오 URL 생성
            const baseUrl = this.config.get('api.baseUrl');
            let audioUrl = Utils.generateAudioUrl(baseUrl, filename, folder);

            console.log('🎵 오디오 URL:', audioUrl);

            // 커버 URL 설정
            if (!track.coverUrl) {
                track.coverUrl = this.generateCoverUrl(track);
            }

            // ✅ 커버 먼저 설정 (깜빡임 방지)
            if (track.coverUrl) {
                this.coverManager.setCover(track.coverUrl);
                document.body.style.backgroundImage = `url('${track.coverUrl}')`;
            }

            // ✅ 오디오 로드
            await this.audioManager.loadTrackEnhanced(audioUrl, track, {
                autoPlay: false
            });

            // ✅ AudioContext 연결 (오디오 로드 후)
            if (!this.audioManager.sourceConnected) {
                this.audioManager.connectAudioSource();
            }

            this.setupAudioEventListeners();

            // ✅ 제목 포맷 적용
            const formattedTitle = this.titleFormatter.format(track.title || filename, { 
                category: folder 
            });
            this.uiManager.updateTitle(formattedTitle);

            // ✅ PC가 아닌 카테고리에서는 비주얼라이저 보이기
            const visualizerElement = document.getElementById('audioVisualizer');
            if (visualizerElement && folder !== 'pc') {
                visualizerElement.style.opacity = '1';
                visualizerElement.style.pointerEvents = 'auto';
            }

            // ✅ 재생 중이면 비주얼라이저 시작
            if (this.audioManager.isPlaying) {
                this.visualizer.start();
            }

            console.log('✅ 트랙 로드 완료:', track.title);

        } catch (error) {
            console.error('❌ 트랙 로드 실패:', error);
            
            // ✅ 로딩 실패 시 자동으로 다음 곡 시도 (무한 루프 방지)
            if (!this._skipFailedTrack) {
                console.log('🔄 로딩 실패, 다음 곡으로 자동 전환...');
                this._skipFailedTrack = true;
                
                setTimeout(() => {
                    this.playNextTrack().finally(() => {
                        // 다음 트랙 로드 후 플래그 해제
                        setTimeout(() => {
                            this._skipFailedTrack = false;
                        }, 2000);
                    });
                }, 1000);
            } else {
                console.error('❌ 연속 로딩 실패, 자동 전환 중단');
                this.uiManager.showError('트랙 로드 실패: ' + track.title);
            }
            
            throw error;
        }
    }

    /**
     * 커버 URL 생성
     */
    generateCoverUrl(track) {
        const folder = track.folder || 'pop';
        console.log('🖼️ 커버 URL 생성 - folder:', folder);

        return this.coverManager.pickRandomCoverUrl(null, folder) || '';
    }

    /**
     * 로컬 트랙 로드
     */
    async loadLocalTrack(index) {
        if (index < 0 || index >= this.playlistManager.currentPlaylist.length) return;

        const track = this.playlistManager.currentPlaylist[index];

        if (track.isLocalFile && track.fileReference instanceof File) {
            try {
                // Blob URL 생성
                track.blobUrl = URL.createObjectURL(track.fileReference);

 // 🔽 PC 모드에서는 커버/배경/비주얼라이저 숨기고 유튜브 표시
            if (this.playlistManager.currentCategory === 'pc') {
                const thumb = document.getElementById('thumbnail');
                if (thumb) thumb.style.backgroundImage = 'none';
                document.body.style.backgroundImage = 'none';
                
                // 비주얼라이저 숨김
                const visualizerElement = document.getElementById('audioVisualizer');
                if (visualizerElement) {
                    visualizerElement.style.opacity = '0';
                    visualizerElement.style.pointerEvents = 'none';
                }
                
                // ✅ PC 카테고리에서 유튜브 영상 표시
                if (this.youtubeManager) {
                    this.youtubeManager.show();
                    console.log('📺 PC 카테고리 - 유튜브 영상 표시');
                }
            } else {
                // PC가 아닐 때는 커버 표시 + 유튜브 숨김
                if (!track.coverUrl) {
                    track.coverUrl = this.generateCoverUrl(track);
                }
                if (track.coverUrl) {
                    this.coverManager.setCover(track.coverUrl);
                    document.body.style.backgroundImage = `url('${track.coverUrl}')`;
                }
                
                // 비주얼라이저 보이기
                const visualizerElement = document.getElementById('audioVisualizer');
                if (visualizerElement) {
                    visualizerElement.style.opacity = '1';
                    visualizerElement.style.pointerEvents = 'auto';
                }
                
                // ✅ 유튜브 숨김
                if (this.youtubeManager) {
                    this.youtubeManager.hide();
                }
            }

            // 오디오 로드
            await this.audioManager.loadTrackEnhanced(track.blobUrl, track, {
                autoPlay: false
            });

            this.setupAudioEventListeners();
        
            // ✅ 제목 포맷 적용
            const formattedTitle = this.titleFormatter.format(track.title, { 
                category: track.folder || 'pop' 
            });
            this.uiManager.updateTitle(formattedTitle);

        } catch (error) {
            console.error('❌ 로컬 트랙 로드 실패:', error);
            this.uiManager.showError('로컬 파일 로드 실패: ' + error.message);
        }
    }
}

    showFileSelector() {
        const fileInput = document.getElementById('fileInput');
        const folderInput = document.getElementById('folderInput');

        // ✅ localStorage에서 저장된 설정 확인
        const savedChoice = localStorage.getItem('pcFileChoice');
        if (savedChoice === 'folder') {
            folderInput.click();
            return;
        } else if (savedChoice === 'files') {
            fileInput.click();
            return;
        }

        // ✅ 커스텀 다이얼로그 생성
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            min-width: 320px;
        `;

        dialog.innerHTML = `
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #333;">
                음악 파일 선택
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px;">
                <button id="selectFolder" style="
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">📁 폴더</button>
                <button id="selectFiles" style="
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">🎵 개별파일</button>
                <button id="cancelSelect" style="
                    padding: 12px 24px;
                    background: #e0e0e0;
                    color: #666;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">취소</button>
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; color: #666;">
                <input type="checkbox" id="rememberChoice" style="width: 18px; height: 18px; cursor: pointer;">
                <label for="rememberChoice" style="cursor: pointer; user-select: none;">다음부터 자동으로 열기</label>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        const checkbox = document.getElementById('rememberChoice');

        // 버튼 이벤트
        document.getElementById('selectFolder').onclick = () => {
            if (checkbox.checked) {
                localStorage.setItem('pcFileChoice', 'folder');
            }
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
            folderInput.click();
        };

        document.getElementById('selectFiles').onclick = () => {
            if (checkbox.checked) {
                localStorage.setItem('pcFileChoice', 'files');
            }
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
            fileInput.click();
        };

        document.getElementById('cancelSelect').onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
        };

        // 오버레이 클릭 시 닫기
        overlay.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
        };

        // 호버 효과
        const buttons = dialog.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.id !== 'cancelSelect') {
                btn.onmouseenter = () => {
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                };
                btn.onmouseleave = () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = 'none';
                };
            }
        });
    }

processLocalFiles(files, type) {
    // files가 이벤트 객체인 경우 처리
    if (files && files.target && files.target.files) {
        files = files.target.files;
    }
    
    console.log('📁 로컬 파일 처리 시작:', files?.length || 0, '개 파일, 타입:', type);
        
        if (!files || files.length === 0) {
            console.error('❌ 선택된 파일이 없습니다');
            return;
        }

// 디버깅: files 확인
console.log('📊 files 타입:', typeof files);
console.log('📊 files 내용:', files);
console.log('📊 files[0] 샘플:', files && files[0]);

// 오디오 파일만 필터링
const audioFiles = Array.from(files).filter(file => {
    console.log('🔍 파일 체크:', file.name, 'type:', file.type);
    const isAudio = file.type.startsWith('audio/') || 
                   /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(file.name);

    return isAudio;
});

        console.log('🎵 오디오 파일:', audioFiles.length, '개');

        if (audioFiles.length === 0) {
            console.error('❌ 오디오 파일이 없습니다');
            this.uiManager.showError('오디오 파일을 찾을 수 없습니다');
            return;
        }

        // PlaylistManager에 로컬 플레이리스트 설정
        this.playlistManager.setLocalPlaylist(audioFiles);
        
        // PC 카테고리로 전환
        this.playlistManager.currentCategory = 'pc';
        
        // UI 업데이트
        this.uiManager.updateCategoryButtons('pc');
        
        // 첫 번째 트랙 로드 및 재생
        this.loadLocalTrack(0)
            .then(() => {
                console.log('✅ 로컬 파일 로드 완료');
                this.audioManager.setAutoPlay('로컬 파일 선택');
                this.audioManager.attemptAutoPlay();
            })
            .catch(error => {
                console.error('❌ 로컬 파일 로드 실패:', error);
                this.uiManager.showError('파일 로드 실패: ' + error.message);
            });
    }

    /**
     * ✅ Blob URL 정리 (메모리 누수 방지)
     */
    cleanupBlobUrls() {
        if (this.playlistManager && this.playlistManager.currentPlaylist) {
            this.playlistManager.currentPlaylist.forEach(track => {
                if (track.blobUrl) {
                    try {
                        URL.revokeObjectURL(track.blobUrl);
                        track.blobUrl = null;
                    } catch (e) {
                        console.warn('⚠️ Blob URL 정리 실패:', e);
                    }
                }
            });
        }
    }

    updateVisitStats() {
        const visitStats = document.getElementById('visitStats');
        if (visitStats) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            visitStats.textContent = `방문: ${timeString}`;
        }
    }

    handleInitializationError(error) {
        this.uiManager.showError('초기화 실패: ' + error.message);
    }

    /**
     * ✅ 완전한 정리 함수
     */
    cleanup() {
        console.log('🧹 리소스 정리 시작...');

        // Blob URL 정리
        this.cleanupBlobUrls();

        // 오디오 이벤트 리스너 제거
        if (this._audioEventHandlers && this.audioManager?.audio) {
            Object.entries(this._audioEventHandlers).forEach(([event, handler]) => {
                this.audioManager.audio.removeEventListener(event, handler);
            });
            this._audioEventHandlers = null;
        }

        // 각 매니저 정리
        if (this.audioManager) this.audioManager.reset();
        if (this.visualizer) this.visualizer.stop();
        if (this.equalizer) this.equalizer.cleanup?.();
        if (this.coverManager) this.coverManager.cleanup?.();
        if (this.touchHandler) this.touchHandler.cleanup?.();
        if (this.effectSoundManager) this.effectSoundManager.cleanup?.();

        // 타이머 정리
        if (this.nextTrackDebounceTimer) {
            clearTimeout(this.nextTrackDebounceTimer);
            this.nextTrackDebounceTimer = null;
        }
        if (this.prevTrackDebounceTimer) {
            clearTimeout(this.prevTrackDebounceTimer);
            this.prevTrackDebounceTimer = null;
        }
        if (this.trackSwitchTimeout) {
            clearTimeout(this.trackSwitchTimeout);
            this.trackSwitchTimeout = null;
        }

        console.log('✅ 리소스 정리 완료');
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isTrackSwitching: this.isTrackSwitching,
            audioManager: this.audioManager?.getStatus?.() || null,
            playlistManager: this.playlistManager?.getStatus?.() || null,
            coverManager: this.coverManager?.getStatus?.() || null,
            effectSoundManager: this.effectSoundManager?.getStatus?.() || null
        };
    }

    formatTime(sec) {
        if (!isFinite(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }
}

// 페이지 로드 시 초기화
window.addEventListener('load', async () => {
    try {
        melonyPlayer = new MelonyPlayer();
        window.melonyPlayer = melonyPlayer;
    } catch (error) {
        console.error('❌ 애플리케이션 시작 실패:', error);
    }
});

// ✅ 페이지 종료 시 정리 (메모리 누수 방지)
window.addEventListener('beforeunload', () => {
    if (melonyPlayer) {
        melonyPlayer.cleanup();
    }
});

// 147줄             enabled: true,               // 🔴 개발: false, 🟢 배포: true
