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
    
    // body에 landscape 클래스 추가
    document.body.classList.add('landscape-mode');
    document.body.classList.remove('portrait-mode');

    // UI 요소 숨기기
    this.hidePortraitElements();

    // 커버 이미지 전체화면 스타일 적용
    this.applyLandscapeCoverStyle();

    // 터치 영역은 유지 (볼륨 조절 기능 보존)
    this.adjustTouchZonesForLandscape();
  }

  /**
   * 세로 모드 적용
   */
  applyPortraitMode() {
    console.log('📱 세로 모드 전환');
    
    // body에 portrait 클래스 추가
    document.body.classList.remove('landscape-mode');
    document.body.classList.add('portrait-mode');

    // UI 요소 다시 표시
    this.showPortraitElements();

    // 커버 이미지 원래 스타일로 복원
    this.restoreCoverStyle();

    // 터치 영역 원래대로 복원
    this.restoreTouchZones();
  }

  /**
   * 세로 모드 전용 UI 요소 숨기기
   */
  hidePortraitElements() {
    // 카테고리 버튼 숨김
    const categorySwitch = document.querySelector('.category-switch');
    if (categorySwitch) {
      categorySwitch.style.display = 'none';
    }

    // Ambient 효과음 버튼 숨김
    const bgSoundSection = document.querySelector('.bg-sound-section');
    if (bgSoundSection) {
      bgSoundSection.style.display = 'none';
    }

    // 재생 컨트롤 버튼 숨김 (더블탭으로 대체)
    const controls = document.querySelector('.controls');
    if (controls) {
      controls.style.display = 'none';
    }

    // 플레이어 헤더 숨김 (선택사항)
    const playerHeader = document.querySelector('.player-header');
    if (playerHeader) {
      playerHeader.style.display = 'none';
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
    }

    if (thumbnail) {
      thumbnail.style.width = '100%';
      thumbnail.style.height = '100%';
      thumbnail.style.borderRadius = '0';
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

    // 터치 영역은 그대로 유지 (볼륨 조절 기능 보존)
    // 필요시 크기나 위치만 미세 조정
    if (leftTouchZone) {
      leftTouchZone.style.display = 'flex';
    }

    if (rightTouchZone) {
      rightTouchZone.style.display = 'flex';
    }

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
    }

    if (rightTouchZone) {
      rightTouchZone.style.display = '';
    }

    console.log('✅ 터치 영역 복원');
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
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { // Safari
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE11
      document.msExitFullscreen();
    }
    
    console.log('🖥️ 전체화면 모드 종료');
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
