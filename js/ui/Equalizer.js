/**
 * Equalizer - 이퀄라이저 모듈
 * 오디오 이퀄라이저 및 프리셋 관리를 담당
 */
class Equalizer {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.isVisible = false;
    this.filters = [];
    this.gains = [0, 0, 0, 0, 0, 0]; // 6개 밴드
    this.frequencies = [60, 170, 350, 1000, 3000, 6000];
    this.currentPreset = 'flat';
    
    this.presets = {
      flat: [0, 0, 0, 0, 0, 0],
      rock: [3, 2, -1, -2, 2, 4],
      pop: [1, 3, 2, 0, -1, -2],
      jazz: [2, 1, 0, 1, 2, 3],
      classical: [3, 2, -1, -2, 1, 2],
      electronic: [4, 2, 0, -1, 2, 4]
    };
    
    this.init();
  }

  init() {
    console.log('🎛️ Equalizer 초기화');
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
setupEventListeners() {
    // 이퀄라이저 버튼 (헤더)
    const equalizerButton = document.getElementById('titleEqualizerButton');
    if (equalizerButton) {
      equalizerButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
    }

    // 닫기 버튼
    const closeButton = document.querySelector('.close-eq');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
      });
    }

    // 프리셋 버튼들
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const presetName = e.target.getAttribute('data-preset');
        if (presetName) {
          this.applyPreset(presetName);
        }
      });
    });

    // 슬라이더들
    this.frequencies.forEach(freq => {
      const slider = document.getElementById('eq' + freq);
      if (slider) {
        slider.addEventListener('input', () => {
          this.updateEqualizer();
        });
      }
    });

    // 패널 클릭 시 이벤트 전파 방지
    const panel = document.getElementById('equalizerPanel');
    if (panel) {
      panel.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    console.log('🎛️ 이퀄라이저 이벤트 리스너 설정 완료');
  }

  /**
   * 이퀄라이저 표시/숨김 토글
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 이퀄라이저 표시
   */
  show() {
    const panel = document.getElementById('equalizerPanel');
    if (panel) {
      panel.classList.add('show');
      this.isVisible = true;
      this.setupEqualizer();
      console.log('🎛️ 이퀄라이저 표시');
    }
  }

  /**
   * 이퀄라이저 숨김
   */
  hide() {
    const panel = document.getElementById('equalizerPanel');
    if (panel) {
      panel.classList.remove('show');
      this.isVisible = false;
      console.log('🎛️ 이퀄라이저 숨김');
    }
  }


  /**
   * 이퀄라이저 설정
   */
  setupEqualizer() {
    // AudioContext 초기화
    if (!this.audioManager.audioContext) {
      this.audioManager.initWebAudio();
    }

    if (!this.audioManager.audioContext) {
      console.error('❌ Web Audio API를 사용할 수 없습니다');
      return;
    }

    // AudioContext Resume (필요한 경우)
    if (this.audioManager.audioContext.state === 'suspended') {
      this.audioManager.audioContext.resume()
        .then(() => console.log('🎛️ AudioContext 재개됨'))
        .catch(err => console.error('AudioContext 재개 실패:', err));
    }

    // AudioSource 연결 확인
    if (!this.audioManager.sourceConnected) {
      this.audioManager.connectAudioSource();
    }

    // 기존 필터들 초기화
    this.filters = [];

    // 6개 밴드 필터 생성
    for (let i = 0; i < 6; i++) {
      const filter = this.audioManager.audioContext.createBiquadFilter();
      filter.type = i === 0 ? 'lowshelf' : i === 5 ? 'highshelf' : 'peaking';
      filter.frequency.value = this.frequencies[i];
      filter.Q.value = 1;
      filter.gain.value = this.gains[i];
      this.filters.push(filter);
    }

    console.log('🎛️ 이퀄라이저 필터 생성 완료:', this.filters.length, '개');

    // 필터들을 체인으로 연결
    if (this.filters.length > 0 && this.audioManager.source) {
      try {
        this.audioManager.source.disconnect();

        // 필터 체인 연결
        let input = this.audioManager.source;
        for (let i = 0; i < this.filters.length; i++) {
          input.connect(this.filters[i]);
          input = this.filters[i];
        }

        // 마지막 필터를 analyser와 destination에 연결
        if (this.audioManager.analyser) {
          input.connect(this.audioManager.analyser);
          this.audioManager.analyser.connect(this.audioManager.audioContext.destination);
        } else {
          input.connect(this.audioManager.audioContext.destination);
        }

        console.log('🎛️ 이퀄라이저 오디오 체인 연결 완료');
      } catch (error) {
        console.error('이퀄라이저 연결 오류:', error);
        console.log('⚠️ 음악을 재생한 후 다시 시도하세요');
      }
    } else {
      console.log('⚠️ 오디오 소스가 없습니다. 음악 재생 후 이퀄라이저가 활성화됩니다.');
    }
  }

  /**
   * 이퀄라이저 업데이트
   */
  updateEqualizer() {
    for (let i = 0; i < 6; i++) {
      const slider = document.getElementById('eq' + this.frequencies[i]);
      if (slider && this.filters[i]) {
        const value = parseFloat(slider.value);
        this.gains[i] = value;
        this.filters[i].gain.value = value;

        // 값 표시 업데이트
        const valueDisplay = slider.parentElement.querySelector('.eq-value');
        if (valueDisplay) {
          valueDisplay.textContent = (value >= 0 ? '+' : '') + value.toFixed(1) + 'dB';
        }
      }
    }

    console.log('🎛️ 이퀄라이저 업데이트:', this.gains);
  }

  /**
   * 프리셋 적용
   * @param {string} presetName - 프리셋 이름
   */
  applyPreset(presetName) {
    if (!this.presets[presetName]) {
      console.error('❌ 알 수 없는 프리셋:', presetName);
      return;
    }

    const preset = this.presets[presetName];
    this.currentPreset = presetName;

    // 슬라이더 값 업데이트
    for (let i = 0; i < 6; i++) {
      const slider = document.getElementById('eq' + this.frequencies[i]);
      if (slider) {
        slider.value = preset[i];
        this.gains[i] = preset[i];

        if (this.filters[i]) {
          this.filters[i].gain.value = preset[i];
        }

        // 값 표시 업데이트
        const valueDisplay = slider.parentElement.querySelector('.eq-value');
        if (valueDisplay) {
          valueDisplay.textContent = (preset[i] >= 0 ? '+' : '') + preset[i].toFixed(1) + 'dB';
        }
      }
    }

    // 프리셋 버튼 활성화 상태 업데이트
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-preset') === presetName) {
        btn.classList.add('active');
      }
    });

    console.log('🎛️ 프리셋 적용:', presetName, preset);
  }

  /**
   * 커스텀 프리셋 저장
   * @param {string} name - 프리셋 이름
   * @param {Array} gains - 게인 값 배열
   */
  saveCustomPreset(name, gains) {
    if (gains.length !== 6) {
      console.error('❌ 게인 값은 6개여야 합니다');
      return;
    }

    this.presets[name] = [...gains];
    console.log('🎛️ 커스텀 프리셋 저장:', name, gains);
  }

  /**
   * 프리셋 삭제
   * @param {string} name - 프리셋 이름
   */
  deletePreset(name) {
    if (this.presets[name] && !['flat', 'rock', 'pop', 'jazz', 'classical', 'electronic'].includes(name)) {
      delete this.presets[name];
      console.log('🎛️ 프리셋 삭제:', name);
    } else {
      console.error('❌ 기본 프리셋은 삭제할 수 없습니다');
    }
  }

  /**
   * 모든 밴드 리셋
   */
  reset() {
    this.applyPreset('flat');
    console.log('🎛️ 이퀄라이저 리셋');
  }

  /**
   * 이퀄라이저 상태 가져오기
   * @returns {Object} 상태 정보
   */
  getStatus() {
    return {
      isVisible: this.isVisible,
      currentPreset: this.currentPreset,
      gains: [...this.gains],
      frequencies: [...this.frequencies],
      availablePresets: Object.keys(this.presets)
    };
  }

  /**
   * 이퀄라이저 설정 가져오기
   * @returns {Object} 설정 정보
   */
  getSettings() {
    return {
      gains: [...this.gains],
      currentPreset: this.currentPreset,
      presets: { ...this.presets }
    };
  }

  /**
   * 이퀄라이저 설정 적용
   * @param {Object} settings - 설정 객체
   */
  applySettings(settings) {
    if (settings.gains && Array.isArray(settings.gains) && settings.gains.length === 6) {
      this.gains = [...settings.gains];
      this.updateEqualizer();
    }

    if (settings.currentPreset && this.presets[settings.currentPreset]) {
      this.applyPreset(settings.currentPreset);
    }

    console.log('🎛️ 이퀄라이저 설정 적용:', settings);
  }

  /**
   * 이퀄라이저 필터 해제
   */
  disconnect() {
    if (this.filters.length > 0) {
      this.filters.forEach(filter => {
        try {
          filter.disconnect();
        } catch (error) {
          console.log('필터 해제 중 오류 (무시됨):', error);
        }
      });
      this.filters = [];
    }

    console.log('🎛️ 이퀄라이저 필터 해제');
  }

  /**
   * 이퀄라이저 정리
   */
  cleanup() {
    this.disconnect();
    this.hide();
    this.reset();
    console.log('🎛️ 이퀄라이저 정리 완료');
  }
}

// 전역으로 내보내기
window.Equalizer = Equalizer;
