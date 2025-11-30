/**
 * OrientationManager - 화면 방향 관리 모듈
 * 가로/세로 모드 전환 및 레이아웃 조정을 담당
 */
class OrientationManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.isLandscape = false;
    this.orientationChangeDelay = 100; // 방향 전환 딜레이 (ms)
    this.orientationTimeout = null;
    
    this.init();
  }

  init() {
    console.log('🔄 OrientationManager 초기화');
    this.detectOrientation();
    this.setupOrientationListener();
  }

  /**
   * 화면 방향 감지
   */
  detectOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (isLandscape !== this.isLandscape) {
      this.isLandscape = isLandscape;
      
      if (this.isLandscape) {
        this.applyLandscapeMode();
      } else {
        this.applyPortraitMode();
      }
      
      console.log('🔄 화면 방향:', this.isLandscape ? '가로' : '세로');
    }
  }

  /**
   * 화면 방향 변경 리스너 설정
   */
  setupOrientationListener() {
    // orientationchange 이벤트 (모바일)
    window.addEventListener('orientationchange', () => {
      this.handleOrientationChange();
    });

    // resize 이벤트 (PC 및 모바일 보완)
    window.addEventListener('resize', () => {
      this.handleOrientationChange();
    });

    // matchMedia 사용 (더 정확한 감지)
    const landscapeQuery = window.matchMedia('(orientation: landscape)');
    landscapeQuery.addEventListener('change', (e) => {
      this.handleOrientationChange();
    });

    console.log('🔄 화면 방향 리스너 설정 완료');
  }

  /**
   * 화면 방향 변경 처리 (디바운스 적용)
   */
  handleOrientationChange() {
    // 기존 타이머 제거
    if (this.orientationTimeout) {
      clearTimeout(this.orientationTimeout);
    }

    // 딜레이 후 방향 감지 (화면 회전 애니메이션 완료 대기)
    this.orientationTimeout = setTimeout(() => {
      this.detectOrientation();
    }, this.orientationChangeDelay);
  }

  /**
   * 가로 모드 적용
   */
  applyLandscapeMode() {
    console.log('📱 가로 모드 전환');
    
    // body 스타일 조정
    document.body.style.backgroundColor = '#000';
    document.body.style.overflow = 'hidden';
    
    // body에 landscape 클래스 추가
    document.body.classList.add('landscape-mode');
    document.body.classList.remove('portrait-mode');

    // UI 요소 숨기기
    this.hidePortraitElements();

    // 커버 이미지 전체화면 스타일 적용
    this.applyLandscapeCoverStyle();

    // 터치 영역은 유지 (볼륨 조절 기능 보존)
    this.adjustTouchZonesForLandscape();

    // 전체화면 모드 진입
    this.requestFullscreen();

    // 세로 전환 버튼 표시
    this.showOrientationToggleButton();
  }

  /**
   * 세로 모드 적용
   */
  applyPortraitMode() {
    console.log('📱 세로 모드 전환');
    
    // body 스타일 복원
    document.body.style.backgroundColor = '';
    document.body.style.overflow = '';
    
    // body에 portrait 클래스 추가
    document.body.classList.remove('landscape-mode');
    document.body.classList.add('portrait-mode');

    // UI 요소 다시 표시
    this.showPortraitElements();

    // 커버 이미지 원래 스타일로 복원
    this.restoreCoverStyle();

    // 터치 영역 원래대로 복원
    this.restoreTouchZones();

    // 전체화면 모드 종료
    this.exitFullscreen();

    // 세로 전환 버튼 숨김
    this.hideOrientationToggleButton();
  }

  /**
   * 세로 모드 전용 UI 요소 숨기기
   */
  hidePortraitElements() {
    // 플레이어 헤더 숨김
    const playerHeader = document.querySelector('.player-header');
    if (playerHeader) {
      playerHeader.style.display = 'none';
    }

    // 방문 통계 숨김
    const visitStats = document.getElementById('visitStats');
    if (visitStats) {
      visitStats.style.display = 'none';
    }

    // 에러/로딩 메시지 숨김
    const errorMessages = document.querySelectorAll('.error-message, .loading-message, [class*="error"], [class*="loading"]');
    errorMessages.forEach(msg => {
      msg.style.display = 'none';
    });

    // 곡 정보, 진행바 숨김
    const songInfo = document.querySelector('.song-info');
    const progressContainer = document.querySelector('.progress-container');
    if (songInfo) songInfo.style.display = 'none';
    if (progressContainer) progressContainer.style.display = 'none';

    // 기본 재생 컨트롤은 숨김 (가로모드 전용 컨트롤로 대체)
    const controls = document.querySelector('.controls');
    if (controls) {
      controls.style.display = 'none';
    }

    console.log('✅ 세로 모드 UI 요소 숨김');
  }

  /**
   * 세로 모드 전용 UI 요소 다시 표시
   */
  showPortraitElements() {
    // 카테고리 버튼 표시
    const categorySwitch = document.querySelector('.category-switch');
    if (categorySwitch) {
      categorySwitch.style.display = '';
    }

    // Ambient 효과음 버튼 표시
    const bgSoundSection = document.querySelector('.bg-sound-section');
    if (bgSoundSection) {
      bgSoundSection.style.display = '';
    }

    // 재생 컨트롤 버튼 표시
    const controls = document.querySelector('.controls');
    if (controls) {
      controls.style.display = '';
    }

    // 플레이어 헤더 표시
    const playerHeader = document.querySelector('.player-header');
    if (playerHeader) {
      playerHeader.style.display = '';
    }

    // 방문 통계 표시
    const visitStats = document.getElementById('visitStats');
    if (visitStats) {
      visitStats.style.display = '';
    }

    // 곡 정보, 진행바 표시
    const songInfo = document.querySelector('.song-info');
    const progressContainer = document.querySelector('.progress-container');
    if (songInfo) songInfo.style.display = '';
    if (progressContainer) progressContainer.style.display = '';

    console.log('✅ 세로 모드 UI 요소 표시');
  }

  /**
   * 가로 모드 커버 이미지 스타일 적용
   */
  applyLandscapeCoverStyle() {
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    const thumbnail = document.querySelector('.thumbnail');

    if (thumbnailContainer) {
      thumbnailContainer.style.width = '100vw';
      thumbnailContainer.style.height = '100vh';
      thumbnailContainer.style.position = 'fixed';
      thumbnailContainer.style.top = '0';
      thumbnailContainer.style.left = '0';
      thumbnailContainer.style.zIndex = '1000';
      thumbnailContainer.style.backgroundColor = '#000';
    }

    if (thumbnail) {
      thumbnail.style.width = '100%';
      thumbnail.style.height = '100%';
      thumbnail.style.borderRadius = '0';
      
      // 커버 이미지 요소 찾기
      const coverImg = thumbnail.querySelector('img') || thumbnail.querySelector('.cover-image');
      if (coverImg) {
        coverImg.style.objectFit = 'cover';
        coverImg.style.width = '100%';
        coverImg.style.height = '100%';
      }
    }

    console.log('✅ 가로 모드 커버 스타일 적용');
  }

  /**
   * 커버 이미지 스타일 복원
   */
  restoreCoverStyle() {
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    const thumbnail = document.querySelector('.thumbnail');

    if (thumbnailContainer) {
      thumbnailContainer.style.width = '';
      thumbnailContainer.style.height = '';
      thumbnailContainer.style.position = '';
      thumbnailContainer.style.top = '';
      thumbnailContainer.style.left = '';
      thumbnailContainer.style.zIndex = '';
    }

    if (thumbnail) {
      thumbnail.style.width = '';
      thumbnail.style.height = '';
      thumbnail.style.borderRadius = '';
    }

    console.log('✅ 커버 스타일 복원');
  }

  /**
   * 가로 모드용 터치 영역 조정
   */
  adjustTouchZonesForLandscape() {
    const leftTouchZone = document.getElementById('leftTouchZone');
    const rightTouchZone = document.getElementById('rightTouchZone');

    // 터치 영역 크기 축소 (좌우 15%씩만 차지)
    if (leftTouchZone) {
      leftTouchZone.style.display = 'flex';
      leftTouchZone.style.width = '15%';
      leftTouchZone.style.zIndex = '1001';
    }

    if (rightTouchZone) {
      rightTouchZone.style.display = 'flex';
      rightTouchZone.style.width = '15%';
      rightTouchZone.style.zIndex = '1001';
    }

    // 비주얼라이저 위치 조정
    const visualizer = document.getElementById('audioVisualizer');
    if (visualizer) {
      // 하단에서 5% 위로 이동
      visualizer.style.bottom = '5%';  // ← 이 값을 조정 (0%~20%)
      
      // 비주얼라이저 바 간격 및 크기 조정
      const bars = visualizer.querySelectorAll('.visualizer-bar');
      bars.forEach(bar => {
        bar.style.margin = '0 3px';      // ← 간격 조정 (1px~10px)
        bar.style.width = '4px';         // ← 바 두께 조정 (2px~10px)
        bar.style.maxHeight = '150px';   // ← 최대 높이 조정 (50px~200px)
        bar.style.minHeight = '2px';     // ← 최소 높이 (소리 없을 때)
      });
    }

    // 좌측에 효과음 버튼 배치
    this.createLandscapeAmbientButtons();

    // 중앙 상단에 카테고리 버튼 배치
    this.createLandscapeCategoryButtons();

    // 우측에 재생 컨트롤 버튼 배치
    this.createLandscapePlaybackControls();

    console.log('✅ 가로 모드 터치 영역 조정');
  }

  /**
   * 터치 영역 복원
   */
  restoreTouchZones() {
    const leftTouchZone = document.getElementById('leftTouchZone');
    const rightTouchZone = document.getElementById('rightTouchZone');

    if (leftTouchZone) {
      leftTouchZone.style.display = '';
      leftTouchZone.style.width = '';
      leftTouchZone.style.zIndex = '';
    }

    if (rightTouchZone) {
      rightTouchZone.style.display = '';
      rightTouchZone.style.width = '';
      rightTouchZone.style.zIndex = '';
    }

    // 비주얼라이저 원래대로 복원
    const visualizer = document.getElementById('audioVisualizer');
    if (visualizer) {
      visualizer.style.bottom = '';
      visualizer.style.top = '';
      visualizer.style.height = '';
      
      // 바 스타일도 복원
      const bars = visualizer.querySelectorAll('.visualizer-bar');
      bars.forEach(bar => {
        bar.style.margin = '';
        bar.style.width = '';
        bar.style.maxHeight = '';
        bar.style.minHeight = '';
      });
    }

    // 가로모드 UI 요소 제거
    this.removeLandscapeUI();

    console.log('✅ 터치 영역 복원');
  }

  /**
   * 가로모드 전용 효과음 버튼 생성 (좌측)
   */
  createLandscapeAmbientButtons() {
    // 기존 버튼이 있으면 제거
    const existing = document.getElementById('landscapeAmbientContainer');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'landscapeAmbientContainer';
    container.style.cssText = `
      position: fixed;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      z-index: 10002;
    `;

    const ambientSounds = ['Rain', 'Bird', 'Forest', 'Neighbor', 'Amazon', 'Ocean', 'Crackle', 'Rain2'];
    
    ambientSounds.forEach(sound => {
      const btn = document.createElement('button');
      btn.textContent = sound;
      btn.className = 'landscape-ambient-btn';
      btn.dataset.sound = sound;
      btn.style.cssText = `
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        font-size: 12px;
        cursor: pointer;
        backdrop-filter: blur(10px);
        transition: all 0.2s;
      `;

      // 원본 버튼 찾아서 클릭 이벤트 복사
      const originalBtn = document.querySelector(`[data-sound="${sound}"]`);
      if (originalBtn) {
        btn.addEventListener('click', () => {
          originalBtn.click();
          // 활성화 상태 표시
          if (originalBtn.classList.contains('active')) {
            btn.style.background = 'rgba(102, 126, 234, 0.8)';
          } else {
            btn.style.background = 'rgba(0, 0, 0, 0.5)';
          }
        });
      }

      container.appendChild(btn);
    });

    document.body.appendChild(container);
  }

  /**
   * 가로모드 전용 카테고리 버튼 생성 (중앙 상단)
   */
  createLandscapeCategoryButtons() {
    // 기존 버튼이 있으면 제거
    const existing = document.getElementById('landscapeCategoryContainer');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'landscapeCategoryContainer';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      z-index: 10002;
    `;

    const categories = [
      { folder: 'pc', label: 'PC' },
      { folder: 'kpop', label: 'KPOP' },
      { folder: 'pop', label: 'POP' },
      { folder: 'lofi-inst', label: 'LOFI' },
      { folder: 'ambient', label: 'Ambient' }
    ];

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.textContent = cat.label;
      btn.className = 'landscape-category-btn';
      btn.dataset.folder = cat.folder;
      btn.style.cssText = `
        padding: 10px 16px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        backdrop-filter: blur(10px);
        transition: all 0.2s;
      `;

      // 원본 카테고리 버튼 찾아서 클릭 이벤트 복사
      const originalBtn = document.querySelector(`.category[data-folder="${cat.folder}"]`);
      if (originalBtn) {
        // 초기 활성화 상태 반영
        if (originalBtn.classList.contains('active')) {
          btn.style.background = 'rgba(102, 126, 234, 0.8)';
        }

        btn.addEventListener('click', () => {
          originalBtn.click();
          // 모든 카테고리 버튼 스타일 초기화
          document.querySelectorAll('.landscape-category-btn').forEach(b => {
            b.style.background = 'rgba(0, 0, 0, 0.5)';
          });
          // 클릭된 버튼 활성화
          btn.style.background = 'rgba(102, 126, 234, 0.8)';
        });
      }

      container.appendChild(btn);
    });

    document.body.appendChild(container);
  }

  /**
   * 가로모드 전용 재생 컨트롤 버튼 생성 (우측 세로)
   */
  createLandscapePlaybackControls() {
    // 기존 버튼이 있으면 제거
    const existing = document.getElementById('landscapeControlsContainer');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'landscapeControlsContainer';
    container.style.cssText = `
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 15px;
      z-index: 10002;
    `;

    const controls = [
      { id: 'previousButton', icon: '⏮', label: '이전곡' },
      { id: 'playButton', icon: '▶', label: '재생' },
      { id: 'nextButton', icon: '⏭', label: '다음곡' }
    ];

    controls.forEach(ctrl => {
      const btn = document.createElement('button');
      btn.innerHTML = ctrl.icon;
      btn.className = 'landscape-control-btn';
      btn.style.cssText = `
        width: 50px;
        height: 50px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        transition: all 0.2s;
      `;

      // 원본 버튼 찾아서 클릭 이벤트 복사
      const originalBtn = document.getElementById(ctrl.id);
      if (originalBtn) {
        btn.addEventListener('click', () => {
          originalBtn.click();
        });

        // Play 버튼은 상태에 따라 아이콘 변경
        if (ctrl.id === 'playButton') {
          btn.id = 'landscapePlayButton';
          // 음악 재생 상태 감지하여 아이콘 변경
          const updatePlayIcon = () => {
            const audio = document.getElementById('player');
            if (audio && !audio.paused) {
              btn.innerHTML = '⏸';
            } else {
              btn.innerHTML = '▶';
            }
          };
          updatePlayIcon();
          setInterval(updatePlayIcon, 500);
        }
      }

      container.appendChild(btn);
    });

    document.body.appendChild(container);
  }

  /**
   * 가로모드 UI 요소 제거
   */
  removeLandscapeUI() {
    const ambient = document.getElementById('landscapeAmbientContainer');
    const category = document.getElementById('landscapeCategoryContainer');
    const controls = document.getElementById('landscapeControlsContainer');

    if (ambient) ambient.remove();
    if (category) category.remove();
    if (controls) controls.remove();
  }

  /**
   * 전체화면 모드 진입 (선택사항)
   */
  enterFullscreen() {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
      elem.msRequestFullscreen();
    }
    
    console.log('🖥️ 전체화면 모드 진입 시도');
  }

  /**
   * 전체화면 모드 종료 (선택사항)
   */
  exitFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      console.log('🖥️ 전체화면 모드 아님');
      return;
    }

    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { // Safari
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) { // IE11
        document.msExitFullscreen();
      }
      
      console.log('🖥️ 전체화면 모드 종료');
    } catch (error) {
      console.warn('⚠️ 전체화면 종료 실패:', error);
    }
  }

  /**
   * 전체화면 모드 요청
   */
  requestFullscreen() {
    const elem = document.documentElement;
    
    // 이미 전체화면이면 실행 안 함
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      console.log('🖥️ 이미 전체화면 모드');
      return;
    }
    
    try {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) { // Safari, iOS
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
      }
      
      console.log('🖥️ 전체화면 모드 요청');
    } catch (error) {
      console.warn('⚠️ 전체화면 모드 실패:', error);
    }
  }

  /**
   * 세로 전환 버튼 표시
   */
  showOrientationToggleButton() {
    // 기존 버튼이 있으면 제거
    const existingBtn = document.getElementById('orientationToggleBtn');
    if (existingBtn) {
      existingBtn.remove();
    }

    // 버튼 생성
    const button = document.createElement('button');
    button.id = 'orientationToggleBtn';
    button.innerHTML = '🔄';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(0, 0, 0, 0.2);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      opacity: 0.6;
    `;

    // 호버/터치 효과
    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1';
      button.style.background = 'rgba(0, 0, 0, 0.5)';
      button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.6';
      button.style.background = 'rgba(0, 0, 0, 0.2)';
      button.style.transform = 'scale(1)';
    });

    // 터치 이벤트 (모바일)
    button.addEventListener('touchstart', () => {
      button.style.opacity = '1';
      button.style.background = 'rgba(0, 0, 0, 0.5)';
    });

    button.addEventListener('touchend', () => {
      setTimeout(() => {
        button.style.opacity = '0.6';
        button.style.background = 'rgba(0, 0, 0, 0.2)';
      }, 200);
    });

    // 클릭 이벤트 - 강제로 세로모드 전환
    button.addEventListener('click', () => {
      console.log('🔄 수동으로 세로 모드 전환');
      this.forcePortraitMode();
    });

    document.body.appendChild(button);
    console.log('✅ 세로 전환 버튼 표시');
  }

  /**
   * 세로 전환 버튼 숨김
   */
  hideOrientationToggleButton() {
    const button = document.getElementById('orientationToggleBtn');
    if (button) {
      button.remove();
      console.log('✅ 세로 전환 버튼 숨김');
    }
  }

  /**
   * 강제로 세로 모드 전환 (버튼 클릭 시)
   */
  forcePortraitMode() {
    // 전체화면 종료
    this.exitFullscreen();
    
    // 세로 모드 UI 적용
    this.applyPortraitMode();
    
    // 사용자에게 기기를 세로로 돌리라는 메시지 표시 (선택사항)
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-size: 18px;
      z-index: 10001;
      text-align: center;
    `;
    message.textContent = '📱 기기를 세로로 돌려주세요';
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.remove();
    }, 2000);
  }

  /**
   * 현재 방향 가져오기
   * @returns {string} 'landscape' 또는 'portrait'
   */
  getCurrentOrientation() {
    return this.isLandscape ? 'landscape' : 'portrait';
  }

  /**
   * 가로 모드 여부 확인
   * @returns {boolean}
   */
  isInLandscapeMode() {
    return this.isLandscape;
  }

  /**
   * OrientationManager 정리
   */
  cleanup() {
    if (this.orientationTimeout) {
      clearTimeout(this.orientationTimeout);
    }
    this.applyPortraitMode();
    console.log('🔄 OrientationManager 정리 완료');
  }
}

// 전역으로 내보내기
window.OrientationManager = OrientationManager;
