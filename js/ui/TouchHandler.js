/**
 * TouchHandler - 터치 및 마우스 제스처 처리 모듈
 * 볼륨 조절, 터치 제스처를 담당
 */
class TouchHandler {
  constructor(uiManager, audioManager, effectSoundManager) {
    this.uiManager = uiManager;
    this.audioManager = audioManager;
    this.effectSoundManager = effectSoundManager;
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

    // ✅ 마우스가 터치 영역을 벗어나면 중단
    leftTouchZone.addEventListener('mouseleave', (e) => {
      if (this.isAdjustingVolume && this.currentZone === 'left') {
        this.handleMouseEnd(e);
        console.log('👆 마우스 영역 벗어남 (left)');
      }
    });

    rightTouchZone.addEventListener('mouseleave', (e) => {
      if (this.isAdjustingVolume && this.currentZone === 'right') {
        this.handleMouseEnd(e);
        console.log('👆 마우스 영역 벗어남 (right)');
      }
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

        // ✅ adjustVolume 호출 (성공 여부 상관없이 Y 좌표는 항상 업데이트)
        this.adjustVolume(deltaY, this.sensitivity);
        
        // ✅ 볼륨이 한계에 도달해도 Y 좌표는 계속 업데이트
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
    }

      /**
       * 마우스 이동 처리
       * @param {MouseEvent} e - 마우스 이벤트
       */
    /**
     * 마우스 이동 처리
     * @param {MouseEvent} e - 마우스 이벤트
     */
    handleMouseMove(e) {
        if (!this.isAdjustingVolume || !this.currentZone) return;

        // 1) 지금 마우스가 still zone 안에 있는지부터 확인
        const zoneEl = this.uiManager.getElement(this.currentZone + 'TouchZone');
        if (zoneEl) {
            const rect = zoneEl.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;

            // 영역 밖으로 나갔으면 바로 종료
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                this.handleMouseEnd(e);
                return;
            }
        }

        // 2) 여기까지 왔으면 실제 볼륨 조절
        const currentY = e.clientY;
        const deltaY = this.initialY - currentY;

        // 실제로 바뀌었는지만 보고 초기 기준점 갱신
        const changed = this.adjustVolume(deltaY, this.mouseSensitivity);
        if (changed) {
            this.initialY = currentY;
        }
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
    }

      /**
       * 볼륨 조절
       * @param {number} deltaY - Y축 변화량
       * @param {number} sensitivity - 감도
       * @returns {boolean} 볼륨이 실제로 변경되었는지 여부
       */
adjustVolume(deltaY, sensitivity) {
        if (this.currentZone === 'left') {
          // 효과음 볼륨 조절
          // ✅ 재생 중인 모든 효과음을 찾아서 볼륨 조절
          const effectAudios = document.querySelectorAll('audio[id^="effect-"]');
          let adjusted = false;
          
          // ✅ EffectSoundManager에서 현재 재생 중인 효과음 확인
          const currentSound = this.effectSoundManager?.getCurrentSound();
          
          if (currentSound) {
            const effectAudio = document.getElementById('effect-' + currentSound);
            
            if (effectAudio && !effectAudio.paused) {
              const currentVolume = effectAudio.volume ?? 1.0;
              const newVolume = Math.max(0, Math.min(1, currentVolume + (deltaY * sensitivity)));

              if (Math.abs(newVolume - currentVolume) >= 0.001) {
                effectAudio.volume = newVolume;
                
                // effectSoundManager에도 저장
                if (this.effectSoundManager && this.effectSoundManager.setVolume) {
                  this.effectSoundManager.setVolume(newVolume);
                }
                  
                this.uiManager.showVolumeOverlay('🔊 ' + Math.round(newVolume * 100) + '%');
                return true;
              }
              return false;
            } else {
              console.warn('⚠️ 효과음 요소를 찾을 수 없음');
              this.uiManager.showVolumeOverlay('🔊 효과음 먼저 재생');
              return false;
            }
          } else {
            console.warn('⚠️ 재생 중인 효과음 없음');
            this.uiManager.showVolumeOverlay('🔊 효과음 먼저 재생');
            return false;
          }
        }
        else if (this.currentZone === 'right') {
          // 음악 볼륨 조절
          if (!this.audioManager || !this.audioManager.audio) {
            console.warn('⚠️ AudioManager 또는 audio 요소가 없습니다');
            return false;
          }

            // volume이 undefined/null일 때만 0.5, 0일 때는 그대로 0 유지
            const currentVolume = (this.audioManager.audio.volume ?? 0.5);

            const newVolume = Math.max(0, Math.min(1, currentVolume + (deltaY * sensitivity)));

       // ✅ 볼륨이 실제로 변경된 경우에만 업데이트
          if (Math.abs(newVolume - currentVolume) >= 0.001) {
            this.audioManager.audio.volume = newVolume;
            // ✅ musicVolume도 함께 업데이트 (다음 곡에도 적용)
            this.audioManager.musicVolume = newVolume;
            this.uiManager.showVolumeOverlay('🎵 ' + Math.round(newVolume * 100) + '%');
            return true;
          }
          return false;
        }
    
        return false;
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
