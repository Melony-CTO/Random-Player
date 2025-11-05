/**
 * TouchHandler - 터치 및 마우스 제스처 처리 모듈
 * 볼륨 조절, 터치 제스처를 담당
 */
class TouchHandler {
  constructor(uiManager, audioManager) {
    this.uiManager = uiManager;
    this.audioManager = audioManager;
    this.isAdjustingVolume = false;
    this.initialY = 0;
    this.currentZone = null;
    this.sensitivity = 0.005; // 터치 감도
    this.mouseSensitivity = 0.01; // 마우스 감도
    
    this.init();
  }

  init() {
    console.log('👆 TouchHandler 초기화');
    this.setupTouchGestures();
    this.setupMouseGestures();
  }

  /**
   * 터치 제스처 설정
   */
  setupTouchGestures() {
    const leftTouchZone = this.uiManager.getElement('leftTouchZone');
    const rightTouchZone = this.uiManager.getElement('rightTouchZone');

    if (!leftTouchZone || !rightTouchZone) {
      console.error('❌ 터치 영역 요소를 찾을 수 없습니다');
      return;
    }

    // 터치 시작
    leftTouchZone.addEventListener('touchstart', (e) => {
      this.handleTouchStart(e, 'left');
    }, { passive: false, capture: true });

    rightTouchZone.addEventListener('touchstart', (e) => {
      this.handleTouchStart(e, 'right');
    }, { passive: false, capture: true });

    // 터치 이동
    document.addEventListener('touchmove', (e) => {
      this.handleTouchMove(e);
    }, { passive: false, capture: true });

    // 터치 종료
    document.addEventListener('touchend', (e) => {
      this.handleTouchEnd(e);
    }, { passive: false, capture: true });

    console.log('👆 터치 제스처 설정 완료');
  }

  /**
   * 마우스 제스처 설정
   */
  setupMouseGestures() {
    const leftTouchZone = this.uiManager.getElement('leftTouchZone');
    const rightTouchZone = this.uiManager.getElement('rightTouchZone');

    if (!leftTouchZone || !rightTouchZone) {
      console.error('❌ 터치 영역 요소를 찾을 수 없습니다');
      return;
    }

    // 마우스 다운
    leftTouchZone.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.handleMouseStart(e, 'left');
    });

    rightTouchZone.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.handleMouseStart(e, 'right');
    });

    // 마우스 이동 (볼륨 조절 중일 때만)
    document.addEventListener('mousemove', (e) => {
      if (this.isAdjustingVolume) {
        this.handleMouseMove(e);
      }
    });

    // 마우스 업 (볼륨 조절 중일 때만)
    document.addEventListener('mouseup', (e) => {
      if (this.isAdjustingVolume) {
        this.handleMouseEnd(e);
      }
    });

    console.log('👆 마우스 제스처 설정 완료');
  }

  /**
   * 터치 시작 처리
   * @param {TouchEvent} e - 터치 이벤트
   * @param {string} zone - 터치 영역 ('left' 또는 'right')
   */
  handleTouchStart(e, zone) {
    e.preventDefault();
    this.isAdjustingVolume = true;
    this.initialY = e.touches[0].clientY;
    this.currentZone = zone;

    const touchZone = this.uiManager.getElement(zone + 'TouchZone');
    if (touchZone) {
      touchZone.classList.add('active');
    }

    console.log('👆 터치 시작:', zone, 'Y:', this.initialY);
  }

  /**
   * 터치 이동 처리
   * @param {TouchEvent} e - 터치 이벤트
   */
  handleTouchMove(e) {
    if (!this.isAdjustingVolume || !this.currentZone) return;

    e.preventDefault();
    const currentY = e.touches[0].clientY;
    const deltaY = this.initialY - currentY;

    this.adjustVolume(deltaY, this.sensitivity);
    this.initialY = currentY;
  }

  /**
   * 터치 종료 처리
   * @param {TouchEvent} e - 터치 이벤트
   */
  handleTouchEnd(e) {
    this.isAdjustingVolume = false;
    this.currentZone = null;

    const leftTouchZone = this.uiManager.getElement('leftTouchZone');
    const rightTouchZone = this.uiManager.getElement('rightTouchZone');

    if (leftTouchZone) leftTouchZone.classList.remove('active');
    if (rightTouchZone) rightTouchZone.classList.remove('active');

    console.log('👆 터치 종료');
  }

  /**
   * 마우스 시작 처리
   * @param {MouseEvent} e - 마우스 이벤트
   * @param {string} zone - 마우스 영역 ('left' 또는 'right')
   */
  handleMouseStart(e, zone) {
    this.isAdjustingVolume = true;
    this.initialY = e.clientY;
    this.currentZone = zone;

    const touchZone = this.uiManager.getElement(zone + 'TouchZone');
    if (touchZone) {
      touchZone.classList.add('active');
    }

    console.log('👆 마우스 시작:', zone, 'Y:', this.initialY);
  }

  /**
   * 마우스 이동 처리
   * @param {MouseEvent} e - 마우스 이벤트
   */
  handleMouseMove(e) {
    if (!this.isAdjustingVolume || !this.currentZone) return;

    const currentY = e.clientY;
    const deltaY = this.initialY - currentY;

    this.adjustVolume(deltaY, this.mouseSensitivity);
    this.initialY = currentY;
  }

  /**
   * 마우스 종료 처리
   * @param {MouseEvent} e - 마우스 이벤트
   */
  handleMouseEnd(e) {
    this.isAdjustingVolume = false;
    this.currentZone = null;

    const leftTouchZone = this.uiManager.getElement('leftTouchZone');
    const rightTouchZone = this.uiManager.getElement('rightTouchZone');

    if (leftTouchZone) leftTouchZone.classList.remove('active');
    if (rightTouchZone) rightTouchZone.classList.remove('active');

    console.log('👆 마우스 종료');
  }

  /**
   * 볼륨 조절
   * @param {number} deltaY - Y축 변화량
   * @param {number} sensitivity - 감도
   */
  adjustVolume(deltaY, sensitivity) {
    if (this.currentZone === 'left') {
      // 효과음 볼륨 조절
      const currentVolume = this.audioManager.getEffectVolume ? this.audioManager.getEffectVolume() : (this.audioManager.effectVolume || 0.5);
      const newVolume = Math.max(0, Math.min(1, currentVolume + (deltaY * sensitivity)));
      
      if (this.audioManager.setEffectVolume) {
        this.audioManager.setEffectVolume(newVolume);
      }
      
      this.uiManager.showVolumeOverlay('🔊 ' + Math.round(newVolume * 100) + '%');
      
      console.log('👆 효과음 볼륨 조절:', Math.round(newVolume * 100) + '%');
    } else if (this.currentZone === 'right') {
      // 음악 볼륨 조절
      const currentVolume = this.audioManager.getMusicVolume ? this.audioManager.getMusicVolume() : (this.audioManager.musicVolume || 0.5);
      const newVolume = Math.max(0, Math.min(1, currentVolume + (deltaY * sensitivity)));
      
      if (this.audioManager.setMusicVolume) {
        this.audioManager.setMusicVolume(newVolume);
      }
      
      this.uiManager.showVolumeOverlay('🎵 ' + Math.round(newVolume * 100) + '%');
      
      console.log('👆 음악 볼륨 조절:', Math.round(newVolume * 100) + '%');
    }
  }

  /**
   * 터치 감도 설정
   * @param {number} sensitivity - 감도 (0-1)
   */
  setTouchSensitivity(sensitivity) {
    this.sensitivity = Math.max(0.001, Math.min(0.1, sensitivity));
    console.log('👆 터치 감도 설정:', this.sensitivity);
  }

  /**
   * 마우스 감도 설정
   * @param {number} sensitivity - 감도 (0-1)
   */
  setMouseSensitivity(sensitivity) {
    this.mouseSensitivity = Math.max(0.001, Math.min(0.1, sensitivity));
    console.log('👆 마우스 감도 설정:', this.mouseSensitivity);
  }

  /**
   * 터치 영역 활성화
   * @param {string} zone - 영역 ('left' 또는 'right')
   */
  activateZone(zone) {
    const touchZone = this.uiManager.getElement(zone + 'TouchZone');
    if (touchZone) {
      touchZone.classList.add('active');
    }
  }

  /**
   * 터치 영역 비활성화
   * @param {string} zone - 영역 ('left' 또는 'right')
   */
  deactivateZone(zone) {
    const touchZone = this.uiManager.getElement(zone + 'TouchZone');
    if (touchZone) {
      touchZone.classList.remove('active');
    }
  }

  /**
   * 모든 터치 영역 비활성화
   */
  deactivateAllZones() {
    this.deactivateZone('left');
    this.deactivateZone('right');
  }

  /**
   * 터치 핸들러 상태 가져오기
   * @returns {Object} 상태 정보
   */
  getStatus() {
    return {
      isAdjustingVolume: this.isAdjustingVolume,
      currentZone: this.currentZone,
      touchSensitivity: this.sensitivity,
      mouseSensitivity: this.mouseSensitivity,
      initialY: this.initialY
    };
  }

  /**
   * 터치 핸들러 설정 가져오기
   * @returns {Object} 설정 정보
   */
  getSettings() {
    return {
      touchSensitivity: this.sensitivity,
      mouseSensitivity: this.mouseSensitivity
    };
  }

  /**
   * 터치 핸들러 설정 적용
   * @param {Object} settings - 설정 객체
   */
  applySettings(settings) {
    if (settings.touchSensitivity !== undefined) {
      this.setTouchSensitivity(settings.touchSensitivity);
    }

    if (settings.mouseSensitivity !== undefined) {
      this.setMouseSensitivity(settings.mouseSensitivity);
    }

    console.log('👆 터치 핸들러 설정 적용:', settings);
  }

  /**
   * 터치 핸들러 정리
   */
  cleanup() {
    this.isAdjustingVolume = false;
    this.currentZone = null;
    this.deactivateAllZones();
    console.log('👆 터치 핸들러 정리 완료');
  }
}

// 전역으로 내보내기
window.TouchHandler = TouchHandler;