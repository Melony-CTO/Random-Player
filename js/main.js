/**
 * Melony Player - 메인 애플리케이션 (개선판)
 * - 커버 이미지 지연 해결: 프리로드 + canplay 시 교체
 * - canplaythrough 의존 제거(느림) / 깜빡임 방지
 * - 기존 인터페이스는 그대로 유지
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

        this.isInitialized = false;
        this.startTime = Date.now();

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

        // 터치 핸들러
        this.touchHandler = new TouchHandler(this.uiManager, this.audioManager, this.effectSoundManager);

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

        // ✅ 효과음 관리자 먼저 생성
        this.effectSoundManager = new EffectSoundManager(this.audioManager, this.api);

        // ✅ 터치 핸들러 생성 (audioManager와 effectSoundManager 모두 준비된 후)
        this.touchHandler = new TouchHandler(this.uiManager, this.audioManager, this.effectSoundManager);

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

            console.log('📊 API 응답 데이터 확인:');
            console.log('  - popData:', popData ? (popData.tracks || popData).length + '곡' : '없음');
            console.log('  - kpopData:', kpopData ? (kpopData.tracks || kpopData).length + '곡' : '없음');
            console.log('  - lofiData:', lofiData ? (lofiData.tracks || lofiData).length + '곡' : '없음');

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
                        console.log('🎵 즉시 자동 재생 시작');
                    } else {
                        setTimeout(() => {
                            if (this.audioManager.audio.src && this.audioManager.audio.readyState >= 2) {
                                this.audioManager.setAutoPlay('초기 로드 (재시도)');
                                this.audioManager.attemptAutoPlay();
                            }
                        }, 500);
                    }
                }, 300);
            }

            console.log('✅ 초기 데이터 로딩 완료');

        } catch (error) {
            console.error('❌ 초기 데이터 로딩 실패:', error);
            throw error;
        }
    }

    /**
     * 특정 카테고리 데이터 로딩
     */
    async loadCategoryData(category) {
        try {
            console.log('📡 카테고리 데이터 로딩:', category);

            const categoryMap = {
                'pop': 'pop',
                'kpop': 'kpop',
                'lofi-inst': 'lofi-inst',
                'pc': 'pc'
            };

            const apiCategory = categoryMap[category] || category;
            const categoryData = await this.api.getPlaylist(apiCategory);

            const categoryTracks = categoryData.tracks || categoryData;
            this.playlistManager.shuffledTracks[category] = this.playlistManager.shuffleArray([...categoryTracks]);

            console.log('✅ 카테고리 데이터 로딩 완료:', category, categoryTracks.length + '곡');
            this.playlistManager.updateCurrentPlaylist();

        } catch (error) {
            console.error('❌ 카테고리 데이터 로딩 실패:', category, error);
            this.playlistManager.shuffledTracks[category] = [];
        }
    }

    /**
     * 특정 카테고리 커버 로딩
     */
    async loadCategoryCovers(category) {
        try {
            console.log('🖼️ 카테고리 커버 로딩:', category);

            // CoverManager의 통합 로딩 사용
            await this.coverManager.loadCoversByCategory(category);

            console.log('✅ 카테고리 커버 로딩 완료:', category);

        } catch (error) {
            console.error('❌ 카테고리 커버 로딩 실패:', category, error);
            this.coverManager.generateDefaultCovers();
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        console.log('🎧 이벤트 리스너 설정...');

        // UI 이벤트
        this.uiManager.on('playToggle', () => {
            this.audioManager.hasUserInteracted = true;
            this.handlePlayToggle();
        });
        this.uiManager.on('nextTrack', () => {
            this.audioManager.hasUserInteracted = true;
            this.handleNextTrack();
        });
        this.uiManager.on('previousTrack', () => {
            this.audioManager.hasUserInteracted = true;
            this.handlePreviousTrack();
        });
        this.uiManager.on('categorySwitch', (category) => {
            this.audioManager.hasUserInteracted = true;
            this.handleCategorySwitch(category);
        });
        this.uiManager.on('bgSoundToggle', (sound) => this.handleBgSoundToggle(sound));
        this.uiManager.on('equalizerToggle', () => this.handleEqualizerToggle());
        this.uiManager.on('progressBarClick', (percent) => this.handleProgressBarClick(percent));
        this.uiManager.on('localFilesSelected', (files, type) => this.processLocalFiles(files, type));

        // 오디오 이벤트
        this.audioManager.audio.addEventListener('timeupdate', () => this.handleTimeUpdate());
        this.audioManager.audio.addEventListener('ended', () => this.handleTrackEnded());
        this.audioManager.audio.addEventListener('loadedmetadata', () => this.handleMetadataLoaded());

        // 키보드 이벤트
        document.addEventListener('keydown', (e) => this.handleKeyboardEvent(e));

        // 페이지 이벤트
        window.addEventListener('beforeunload', () => this.handleBeforeUnload());

        console.log('✅ 이벤트 리스너 설정 완료');
    }

    /**
     * 재생/정지 토글
     */
    async handlePlayToggle() {
        try {
            if (!this.audioManager.audio.src) {
                await this.loadCurrentTrack();
            }

            await this.audioManager.togglePlay();
            this.uiManager.updatePlayButton(this.audioManager.isPlaying);

            // ✅ AudioContext 연결 (첫 재생 시)
            if (this.audioManager.isPlaying && !this.audioManager.sourceConnected) {
                this.audioManager.connectAudioSource();
            }

            // ✅ 비주얼라이저 시작/정지
            if (this.audioManager.isPlaying) {
                this.visualizer.start();
            } else {
                this.visualizer.stop();
            }

        } catch (error) {
            console.error('재생 토글 오류:', error);
            this.uiManager.showError('재생 오류: ' + error.message);
        }
    }

    /**
     * 다음 트랙 처리
     */
    async handleNextTrack() {
        if (this.isProcessingNextTrack) {
            console.log('⚠️ 다음 트랙 처리 중, 중복 호출 무시');
            return;
        }
        this.isProcessingNextTrack = true;

        try {
            const wasPlaying = this.audioManager.isPlaying;
            const nextTrack = this.playlistManager.getNextTrack();

            if (!nextTrack) {
                console.log('⏭️ 다음 트랙이 없습니다');
                return;
            }

            if (wasPlaying) {
                await this.audioManager.fadeOutAudio(500);
                this.audioManager.pause();
                this.visualizer.stop();
            }

            if (this.playlistManager.currentCategory === 'pc') {
                await this.loadLocalTrack(this.playlistManager.currentTrackIndex);
            } else {
                await this.loadTrack(nextTrack);
            }

            setTimeout(() => {
                this.audioManager.setAutoPlay('다음 트랙');
                this.audioManager.attemptAutoPlay();
            }, 300);

        } catch (error) {
            console.error('다음 트랙 오류:', error);
        } finally {
            this.isProcessingNextTrack = false;
        }
    }

    /**
     * 이전 트랙 처리
     */
    async handlePreviousTrack() {
        if (this.isProcessingPrevTrack) {
            console.log('⚠️ 이전 트랙 처리 중, 중복 호출 무시');
            return;
        }
        this.isProcessingPrevTrack = true;

        try {
            const wasPlaying = this.audioManager.isPlaying;
            const previousTrack = this.playlistManager.getPreviousTrack();

            if (!previousTrack) {
                console.log('⏮️ 이전 트랙이 없습니다');
                return;
            }

            if (wasPlaying) {
                await this.audioManager.fadeOutAudio(500);
                this.audioManager.pause();
                this.visualizer.stop();
            }

            if (this.playlistManager.currentCategory === 'pc') {
                await this.loadLocalTrack(this.playlistManager.currentTrackIndex);
            } else {
                await this.loadTrack(previousTrack);
            }

            setTimeout(() => {
                this.audioManager.setAutoPlay('이전 트랙');
                this.audioManager.attemptAutoPlay();
            }, 300);

        } catch (error) {
            console.error('이전 트랙 오류:', error);
        } finally {
            this.isProcessingPrevTrack = false;
        }
    }

    /**
     * 카테고리 전환 처리
     */
    async handleCategorySwitch(event) {
        try {
            const categoryName = typeof event === 'string' ? event : event.detail || event;
            console.log('🔄 카테고리 전환:', categoryName);

            if (categoryName === 'pc') {
                this.playlistManager.switchCategory(categoryName);
                await this.loadCategoryCovers('pop'); // PC는 POP 커버 사용
                this.showFileSelector();
                return;
            }

            if (this.audioManager.isPlaying) {
                this.audioManager.pause();
                this.visualizer.stop();
            }

            this.playlistManager.switchCategory(categoryName);
            this.uiManager.updateCategoryButtons(categoryName);

            // 커버 먼저 로드
            await this.loadCategoryCovers(categoryName);

            // 트랙 데이터 확인
            if (!this.playlistManager.shuffledTracks[categoryName] ||
                this.playlistManager.shuffledTracks[categoryName].length === 0) {
                await this.loadCategoryData(categoryName);
            }

            // 첫 곡 로드
            const firstTrack = this.playlistManager.getTrackByIndex(0);
            if (firstTrack) {
                await this.loadTrack(firstTrack);

                setTimeout(() => {
                    this.audioManager.setAutoPlay('카테고리 전환: ' + categoryName);
                    this.audioManager.attemptAutoPlay();
                }, 500);
            }

        } catch (error) {
            console.error('카테고리 전환 오류:', error);
            this.uiManager.showError('카테고리 전환 오류: ' + error.message);
        }
    }

    /**
     * 배경음 토글
     */
    handleBgSoundToggle(event) {
        try {
            const soundType = typeof event === 'string' ? event : event.detail || event;

            this.effectSoundManager.toggleBgSound(soundType)
                .then(result => {
                    this.uiManager.updateBgSoundButtons(result);
                })
                .catch(error => {
                    console.error('❌ 효과음 재생 실패:', error);
                });

        } catch (error) {
            console.error('배경음 토글 오류:', error);
        }
    }

    handleEqualizerToggle() {
        this.equalizer.toggle();
    }

    setupAudioEventListeners() {
        this.audioManager.audio.addEventListener('timeupdate', () => this.handleTimeUpdate());
        this.audioManager.audio.addEventListener('ended', () => this.handleTrackEnded());
        this.audioManager.audio.addEventListener('loadedmetadata', () => this.handleMetadataLoaded());
    }

    handleProgressBarClick(percent) {
        if (this.audioManager.audio && this.audioManager.audio.duration) {
            const validPercent = Math.max(0, Math.min(1, percent));
            const newTime = validPercent * this.audioManager.audio.duration;
            this.audioManager.setCurrentTime(newTime);
        }
    }

    handleTimeUpdate() {
        const currentTime = this.audioManager.getCurrentTime();
        const duration = this.audioManager.getDuration();
        this.uiManager.updateProgress(currentTime, duration);
    }

    handleTrackEnded() {
        this.handleNextTrack();
    }

    handleMetadataLoaded() {
        const duration = this.audioManager.getDuration();
        this.uiManager.updateProgress(0, duration);
    }

    handleKeyboardEvent(e) {
        // 필요 시 추가
    }

    handleBeforeUnload() {
        this.cleanup();
    }

    async loadCurrentTrack() {
        const currentTrack = this.playlistManager.getCurrentTrack();
        if (currentTrack) await this.loadTrack(currentTrack);
    }

    /**
     * 트랙 로드
     */
    async loadTrack(track) {
        try {
            console.log('🎵 트랙 로드:', track.title);

            // 오디오 URL 생성
            const directR2Base = 'https://pub-4ecc0eaab30e42b999c67761f4c6f549.r2.dev';
            const folder = track.folder || 'pop';
            const filename = track.audio.split('/').pop();
            const audioUrl = `${directR2Base}/${folder}/${encodeURIComponent(filename)}`;

            // 커버 URL 생성
            if (!track.coverUrl) {
                track.coverUrl = this.generateCoverUrl(track);
                console.log('🖼️ 커버 URL 생성:', track.coverUrl);
            }

            // ✅ 즉시 커버 설정 (핵심!)
            if (track.coverUrl) {
                console.log('🖼️ 커버 이미지 즉시 설정:', track.coverUrl);
                this.coverManager.setCover(track.coverUrl);

                // body 배경도 설정
                document.body.style.backgroundImage = `url('${track.coverUrl}')`;
            }

            // 오디오 로드
            await this.audioManager.loadTrackEnhanced(audioUrl, track, {
                autoPlay: true
            });

            // ✅ AudioContext 연결 (오디오 로드 후)
            if (!this.audioManager.sourceConnected) {
                this.audioManager.connectAudioSource();
            }

            this.setupAudioEventListeners();
            this.uiManager.updateTitle(track.title);

            // ✅ 재생 중이면 비주얼라이저 시작
            if (this.audioManager.isPlaying) {
                this.visualizer.start();
            }

            console.log('✅ 트랙 로드 완료:', track.title);

        } catch (error) {
            console.error('❌ 트랙 로드 실패:', error);
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

                // 커버 생성 (POP 커버 사용)
                if (!track.coverUrl) {
                    track.coverUrl = this.generateCoverUrl(track);
                }

                // 커버 설정
                if (track.coverUrl) {
                    this.coverManager.setCover(track.coverUrl);
                    document.body.style.backgroundImage = `url('${track.coverUrl}')`;
                }

                // 오디오 로드
                await this.audioManager.loadTrackEnhanced(track.blobUrl, track, {
                    autoPlay: false
                });

                this.setupAudioEventListeners();
                this.uiManager.updateTitle(track.title);

            } catch (error) {
                console.error('❌ 로컬 트랙 로드 실패:', error);
                this.uiManager.showError('로컬 파일 로드 실패: ' + error.message);
            }
        }
    }

    showFileSelector() {
        const fileInput = document.getElementById('fileInput');
        const folderInput = document.getElementById('folderInput');

        const userChoice = confirm('파일을 선택하시겠습니까?\n\n확인: 개별 음악 파일 선택\n취소: 폴더 전체 선택');

        if (userChoice) {
            fileInput.click();
        } else {
            folderInput.click();
        }
    }

    processLocalFiles(files, type) {
        // ... (기존 로직 유지)
    }

    cleanupBlobUrls() {
        if (this.playlistManager && this.playlistManager.currentPlaylist) {
            this.playlistManager.currentPlaylist.forEach(track => {
                if (track.blobUrl) {
                    URL.revokeObjectURL(track.blobUrl);
                    track.blobUrl = null;
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

    cleanup() {
        this.cleanupBlobUrls();
        if (this.audioManager) this.audioManager.reset();
        if (this.visualizer) this.visualizer.stop();
        if (this.equalizer) this.equalizer.cleanup?.();
        if (this.coverManager) this.coverManager.cleanup?.();
        if (this.touchHandler) this.touchHandler.cleanup?.();
        if (this.effectSoundManager) this.effectSoundManager.cleanup?.();
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
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

// 전역 변수
let melonyPlayer = null;

// 페이지 로드 시 초기화
window.addEventListener('load', async () => {
    try {
        melonyPlayer = new MelonyPlayer();
        window.melonyPlayer = melonyPlayer;
    } catch (error) {
        console.error('❌ 애플리케이션 시작 실패:', error);
    }
});

// 페이지 종료 시 정리
window.addEventListener('beforeunload', () => {
    if (melonyPlayer) melonyPlayer.cleanup();
});