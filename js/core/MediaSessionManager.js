/**
 * MediaSessionManager - 백그라운드 재생 관리
 * Media Session API를 사용하여 모바일 백그라운드 재생 및 잠금 화면 컨트롤 지원
 */
class MediaSessionManager {
  constructor(audioManager, playlistManager) {
    this.audioManager = audioManager;
    this.playlistManager = playlistManager;
    this.currentTrack = null;
    this.isSupported = 'mediaSession' in navigator;

    if (this.isSupported) {
      console.log('🎵 Media Session API 지원됨 - 백그라운드 재생 활성화');
      this.setupMediaSession();
    } else {
      console.warn('⚠️ Media Session API 미지원 - 백그라운드 재생 제한될 수 있음');
    }
  }

  /**
   * Media Session 초기 설정
   */
  setupMediaSession() {
    if (!this.isSupported) return;

    // 재생 컨트롤 핸들러 설정
    const actionHandlers = {
      play: () => {
        console.log('🎵 Media Session: Play');
        this.audioManager.play().catch(e => console.log('재생 실패:', e));
      },
      pause: () => {
        console.log('⏸️ Media Session: Pause');
        this.audioManager.pause();
      },
      previoustrack: () => {
        console.log('⏮️ Media Session: Previous Track');
        if (window.melonyPlayer) {
          window.melonyPlayer.playPreviousTrack();
        }
      },
      nexttrack: () => {
        console.log('⏭️ Media Session: Next Track');
        if (window.melonyPlayer) {
          window.melonyPlayer.playNextTrack();
        }
      },
      seekbackward: (details) => {
        console.log('⏪ Media Session: Seek Backward');
        const skipTime = details.seekOffset || 10;
        const currentTime = this.audioManager.getCurrentTime();
        this.audioManager.setCurrentTime(Math.max(0, currentTime - skipTime));
      },
      seekforward: (details) => {
        console.log('⏩ Media Session: Seek Forward');
        const skipTime = details.seekOffset || 10;
        const currentTime = this.audioManager.getCurrentTime();
        const duration = this.audioManager.getDuration();
        this.audioManager.setCurrentTime(Math.min(duration, currentTime + skipTime));
      },
      seekto: (details) => {
        console.log('🎯 Media Session: Seek To', details.seekTime);
        if (details.seekTime !== null && details.seekTime !== undefined) {
          this.audioManager.setCurrentTime(details.seekTime);
        }
      },
      stop: () => {
        console.log('⏹️ Media Session: Stop');
        this.audioManager.pause();
        this.audioManager.setCurrentTime(0);
      }
    };

    // 각 액션 핸들러 등록
    for (const [action, handler] of Object.entries(actionHandlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.warn(`⚠️ Action handler "${action}" 등록 실패:`, error);
      }
    }

    console.log('✅ Media Session 액션 핸들러 등록 완료');
  }

  /**
   * 현재 트랙의 메타데이터 업데이트
   */
  updateMetadata(track) {
    if (!this.isSupported) return;

    this.currentTrack = track;

    try {
      // 메타데이터 설정
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || '알 수 없는 제목',
        artist: track.artist || 'Melony Player',
        album: track.album || this.getCategoryName(track.folder),
        artwork: this.getArtwork(track)
      });

      console.log('🎵 Media Session 메타데이터 업데이트:', track.title);

      // 재생 상태 업데이트
      this.updatePlaybackState();
    } catch (error) {
      console.warn('⚠️ Media Session 메타데이터 업데이트 실패:', error);
    }
  }

  /**
   * 아트워크 이미지 배열 생성
   */
  getArtwork(track) {
    const coverUrl = track.coverUrl || '/images/default-cover.jpg';

    // 다양한 크기의 아트워크 제공 (모바일 최적화)
    return [
      { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
      { src: coverUrl, sizes: '128x128', type: 'image/jpeg' },
      { src: coverUrl, sizes: '192x192', type: 'image/jpeg' },
      { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
      { src: coverUrl, sizes: '384x384', type: 'image/jpeg' },
      { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
    ];
  }

  /**
   * 카테고리 이름 변환
   */
  getCategoryName(folder) {
    const categoryNames = {
      'pc': 'My Music',
      'kpop': 'K-POP',
      'pop': 'POP',
      'lofi-inst': 'Lo-Fi',
      'ambient': 'Ambient'
    };
    return categoryNames[folder] || folder.toUpperCase();
  }

  /**
   * 재생 상태 업데이트
   */
  updatePlaybackState() {
    if (!this.isSupported) return;

    try {
      const state = this.audioManager.isPlaying ? 'playing' : 'paused';
      navigator.mediaSession.playbackState = state;
      console.log('🎵 Media Session 재생 상태:', state);
    } catch (error) {
      console.warn('⚠️ Media Session 재생 상태 업데이트 실패:', error);
    }
  }

  /**
   * 재생 위치 업데이트 (프로그레스 바)
   */
  updatePositionState() {
    if (!this.isSupported) return;
    if (!('setPositionState' in navigator.mediaSession)) return;

    try {
      const duration = this.audioManager.getDuration();
      const position = this.audioManager.getCurrentTime();

      if (isNaN(duration) || !isFinite(duration) || duration <= 0) {
        return;
      }

      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1.0,
        position: Math.min(position, duration)
      });
    } catch (error) {
      // 위치 업데이트 실패는 치명적이지 않으므로 경고만 출력
      console.warn('⚠️ Media Session 위치 업데이트 실패:', error);
    }
  }

  /**
   * 주기적으로 재생 위치 업데이트
   */
  startPositionUpdates() {
    if (!this.isSupported) return;

    // 기존 인터벌 정리
    this.stopPositionUpdates();

    // 1초마다 위치 업데이트
    this._positionUpdateInterval = setInterval(() => {
      if (this.audioManager.isPlaying) {
        this.updatePositionState();
      }
    }, 1000);

    console.log('✅ Media Session 위치 업데이트 시작');
  }

  /**
   * 위치 업데이트 중지
   */
  stopPositionUpdates() {
    if (this._positionUpdateInterval) {
      clearInterval(this._positionUpdateInterval);
      this._positionUpdateInterval = null;
      console.log('⏹️ Media Session 위치 업데이트 중지');
    }
  }

  /**
   * 재생 시작 시 호출
   */
  onPlay() {
    this.updatePlaybackState();
    this.startPositionUpdates();
  }

  /**
   * 일시정지 시 호출
   */
  onPause() {
    this.updatePlaybackState();
    this.stopPositionUpdates();
  }

  /**
   * 트랙 변경 시 호출
   */
  onTrackChange(track) {
    this.updateMetadata(track);
    this.updatePositionState();
  }

  /**
   * 정리
   */
  cleanup() {
    this.stopPositionUpdates();

    if (this.isSupported) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch (error) {
        console.warn('⚠️ Media Session 정리 실패:', error);
      }
    }

    console.log('🧹 MediaSessionManager 정리 완료');
  }

  /**
   * 백그라운드 재생 지원 여부 확인
   */
  isBackgroundPlaySupported() {
    return this.isSupported;
  }

  /**
   * 디버그 정보 출력
   */
  debugStatus() {
    console.log('🎵 MediaSessionManager 상태:', {
      supported: this.isSupported,
      currentTrack: this.currentTrack ? this.currentTrack.title : null,
      playbackState: this.isSupported ? navigator.mediaSession.playbackState : 'N/A',
      hasMetadata: this.isSupported && navigator.mediaSession.metadata !== null
    });
  }
}

// 전역으로 내보내기
window.MediaSessionManager = MediaSessionManager;
