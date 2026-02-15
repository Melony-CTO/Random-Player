/**
 * UIManager - UI 관리 모듈
 * DOM 요소 관리, UI 업데이트, 이벤트 처리를 담당
 */
class UIManager {
  constructor() {
    this.elements = {};
    this.isInitialized = false;
    
    this.init();
  }

  init() {
    console.log('🎨 UIManager 초기화');
    this.initializeElements();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  /**
   * DOM 요소 초기화
   */
  initializeElements() {
    this.elements = {
      // 오디오 관련
      audio: document.getElementById('player'),

      // UI 요소
      title: document.getElementById('title'),
      thumbnail: document.getElementById('thumbnail'),
      thumbnailContainer: document.querySelector('.thumbnail-container'),

      // 진행바 관련
      progressBar: document.getElementById('progressBar'),
      progressFill: document.getElementById('progressFill'),
      currentTime: document.getElementById('currentTime'),
      duration: document.getElementById('duration'),

      // 터치 영역
      leftTouchZone: document.getElementById('leftTouchZone'),
      rightTouchZone: document.getElementById('rightTouchZone'),
      volumeOverlay: document.getElementById('volumeOverlay'),

      // 비주얼라이저
      audioVisualizer: document.getElementById('audioVisualizer'),

      // 이퀄라이저
      equalizerButton: document.getElementById('titleEqualizerButton'),
      equalizerPanel: document.getElementById('equalizerPanel'),

      // 컨트롤 버튼
      playButton: document.getElementById('playButton'),
      previousButton: document.getElementById('previousButton'),
      nextButton: document.getElementById('nextButton'),
      
      // 카테고리
      categories: document.querySelectorAll('.category'),
      
      // 효과음 버튼
      bgButtons: document.querySelectorAll('.bg-button'),
      
      // 파일 입력
      fileInput: document.getElementById('fileInput'),
      folderInput: document.getElementById('folderInput'),
      
      // 디버그
      debugInfo: document.getElementById('debugInfo'),
      restartSection: document.getElementById('restartSection')
    };
    
    console.log('🎨 DOM 요소 초기화 완료');
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 재생 버튼
    if (this.elements.playButton) {
      this.elements.playButton.addEventListener('click', () => {
        this.emit('playToggle');
      });
    }

    // 이전 곡 버튼
    if (this.elements.previousButton) {
      this.elements.previousButton.addEventListener('click', () => {
        console.log('⏮️ 이전 곡 버튼 클릭');
        this.emit('previousTrack');
      });
    }

    // 다음 곡 버튼
    if (this.elements.nextButton) {
      this.elements.nextButton.addEventListener('click', () => {
        console.log('⏭️ 다음 곡 버튼 클릭');
        this.emit('nextTrack');
      });
    }

    // 진행바 클릭
    if (this.elements.progressBar) {
      this.elements.progressBar.addEventListener('click', (e) => {
        this.handleProgressBarClick(e);
      });
    }

  

    // 카테고리 버튼
    this.elements.categories.forEach(category => {
      category.addEventListener('click', () => {
        const buttonText = category.textContent.trim();
        const categoryName = category.dataset.folder;
        console.log('🎯 카테고리 클릭:', buttonText, '->', categoryName);
        
        // ✅ 즉시 active 클래스 업데이트
        this.elements.categories.forEach(cat => cat.classList.remove('active'));
        category.classList.add('active');
        
        this.emit('categorySwitch', categoryName);
      });
    });

    // 효과음 버튼
    this.elements.bgButtons.forEach(button => {
      button.addEventListener('click', () => {
        const soundType = button.textContent.trim();
        this.emit('bgSoundToggle', soundType);
      });
    });

    // 파일 입력 이벤트
    if (this.elements.fileInput) {
      console.log('✅ fileInput 이벤트 리스너 설정');
      this.elements.fileInput.addEventListener('change', (e) => {
        console.log('📁 파일 선택 이벤트 발생:', e.target.files ? e.target.files.length + '개 파일' : 'null');
        console.log('📁 파일 선택 이벤트 상세:', {
          target: e.target,
          files: e.target.files,
          fileCount: e.target.files ? e.target.files.length : 0
        });
        this.emit('localFilesSelected', e.target.files, 'files');
      });
    } else {
      console.warn('⚠️ fileInput 요소를 찾을 수 없습니다');
    }

    if (this.elements.folderInput) {
      console.log('✅ folderInput 이벤트 리스너 설정');
      this.elements.folderInput.addEventListener('change', (e) => {
        console.log('📁 폴더 선택 이벤트 발생:', e.target.files ? e.target.files.length + '개 파일' : 'null');
        console.log('📁 폴더 선택 이벤트 상세:', {
          target: e.target,
          files: e.target.files,
          fileCount: e.target.files ? e.target.files.length : 0
        });
        this.emit('localFilesSelected', e.target.files, 'folder');
      });
    } else {
      console.warn('⚠️ folderInput 요소를 찾을 수 없습니다');
    }

    // 키보드 이벤트
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardEvent(e);
    });

    console.log('🎨 이벤트 리스너 설정 완료');
  }

  /**
   * 카테고리 이름 매핑 (2025-09-22.html 호환)
   * @param {string} buttonText - 버튼 텍스트
   * @returns {string} 실제 카테고리 이름
   */
  mapCategoryName(buttonText) {
    const categoryMap = {
      'POP': 'pop',
      'KPOP': 'kpop',
      'LOFI-INST': 'lofi-inst',
      'PC': 'pc'
    };
    
    return categoryMap[buttonText] || buttonText.toLowerCase();
  }

  /**
   * 진행바 클릭 처리 (원본과 동일한 로직)
   * @param {Event} e - 클릭 이벤트
   */
  handleProgressBarClick(e) {
    const rect = this.elements.progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    // 🔥 원본과 동일: 유효한 percent 값인지 확인
    if (typeof percent !== 'number' || !isFinite(percent) || isNaN(percent)) {
      console.warn('⚠️ 유효하지 않은 percent 값:', percent);
      return;
    }
    
    // 0-1 범위로 제한
    const validPercent = Math.max(0, Math.min(1, percent));
    
    console.log('🎯 progressBar 클릭:', {
      percent: Math.round(validPercent * 100) + '%',
      validPercent: validPercent
    });
    
    this.emit('progressBarClick', validPercent);
  }

  /**
   * 키보드 이벤트 처리
   * @param {KeyboardEvent} e - 키보드 이벤트
   */
  handleKeyboardEvent(e) {
    // 효과음 단축키 (1~8번 키)
    const soundMapping = {
      '1': 'Rain', '2': 'Bird', '3': 'Forest', '4': 'Neighborhood',
      '5': 'Amazon', '6': 'Ocean', '7': 'Crackle', '8': 'Rain2'
    };
    
    if (soundMapping[e.key]) {
      e.preventDefault();
      this.emit('bgSoundToggle', soundMapping[e.key]);
      return;
    }

    // 0번 키로 다음곡
    if (e.key === '0') {
      e.preventDefault();
      this.emit('nextTrack');
      return;
    }

    // 스페이스바로 재생/정지
    if (e.key === ' ') {
      e.preventDefault();
      this.emit('playToggle');
      return;
    }

    // F12 또는 d로 디버그 토글
    if (e.key === 'F12' || e.key === 'd') {
      e.preventDefault();
      this.toggleDebugInfo();
      return;
    }
  }

  /**
   * 제목 업데이트
   * @param {string} title - 제목
   */
  updateTitle(title) {
    if (this.elements.title) {
      this.elements.title.textContent = title;
      this.elements.title.innerHTML = title;
      console.log('🎵 제목 업데이트:', title);
    }
  }

  /**
   * 재생 버튼 상태 업데이트
   * @param {boolean} isPlaying - 재생 상태
   */
  updatePlayButton(isPlaying) {
    if (this.elements.playButton) {
      if (isPlaying) {
        this.elements.playButton.innerHTML = '<span style="transform: translate(-2px, 0px); display: inline-block; -webkit-tap-highlight-color: transparent; background: none;">l l</span>';
      } else {
        this.elements.playButton.textContent = '▶';
      }
    }
  }

  /**
   * 진행바 업데이트
   * @param {number} currentTime - 현재 시간
   * @param {number} duration - 총 시간
   */
  updateProgress(currentTime, duration) {
    if (duration && duration > 0) {
      const progress = (currentTime / duration) * 100;
      
      if (this.elements.progressFill) {
        this.elements.progressFill.style.width = Math.min(100, Math.max(0, progress)) + '%';
      }
      
      if (this.elements.currentTime) {
        this.elements.currentTime.textContent = this.formatTime(currentTime);
      }
      
      if (this.elements.duration) {
        this.elements.duration.textContent = this.formatTime(duration);
      }
    }
  }

  /**
   * 시간 포맷팅
   * @param {number} seconds - 초
   * @returns {string} 포맷된 시간
   */
  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
  }

  /**
   * 썸네일 상태 업데이트
   * @param {string} state - 상태 ('playing', 'paused', 'loading')
   */
  updateThumbnailState(state) {
    if (!this.elements.thumbnail) return;

    switch (state) {
      case 'playing':
        // ✅ 클래스 추가 (없으면)
        this.elements.thumbnail.classList.add('playing', 'slow-zoom');
        this.elements.thumbnail.classList.remove('blur-hidden');
        // ✅ 애니메이션 재생
        this.elements.thumbnail.style.animationPlayState = 'running';
        break;
      case 'paused':
        // ✅ 클래스는 유지하되 애니메이션만 현재 상태에서 일시정지
        this.elements.thumbnail.style.animationPlayState = 'paused';
        break;
      case 'loading':
        // 로딩 상태 - 클래스 초기화
        this.elements.thumbnail.classList.remove('playing', 'slow-zoom', 'blur-start');
        this.elements.thumbnail.classList.add('blur-hidden');
        this.elements.thumbnail.style.animationPlayState = '';
        break;
    }
  }

  /**
   * 커버 이미지 설정
   * @param {string} imageUrl - 이미지 URL
   */
  setCoverImage(imageUrl) {
    if (this.elements.thumbnail && imageUrl) {
      this.elements.thumbnail.style.backgroundImage = `url('${imageUrl}')`;
      this.elements.thumbnail.style.backgroundSize = '100%';
      this.elements.thumbnail.style.backgroundPosition = 'center 10%';
      
      // body 배경도 같은 이미지로 설정
      document.body.style.backgroundImage = `url('${imageUrl}')`;
      
      console.log('🖼️ 커버 이미지 설정:', imageUrl);
    }
  }

  /**
   * 볼륨 오버레이 표시
   * @param {string} text - 표시할 텍스트
   */
  showVolumeOverlay(text) {
    if (this.elements.volumeOverlay) {
      this.elements.volumeOverlay.textContent = text;
      this.elements.volumeOverlay.classList.add('show');
      
      setTimeout(() => {
        this.elements.volumeOverlay.classList.remove('show');
      }, 1000);
    }
  }

  /**
   * 카테고리 버튼 상태 업데이트
   * @param {string} activeCategory - 활성 카테고리
   */
  updateCategoryButtons(activeCategory) {
    console.log('🎯 카테고리 버튼 상태 업데이트:', activeCategory);
    
    this.elements.categories.forEach(category => {
      category.classList.remove('active');
      
      const buttonText = category.textContent.trim();
      const mappedCategory = this.mapCategoryName(buttonText);
      
      console.log(`  - 버튼: "${buttonText}" → 카테고리: "${mappedCategory}"`);
      
      if (mappedCategory === activeCategory) {
        category.classList.add('active');
        console.log(`  ✅ "${buttonText}" 버튼 활성화`);
      }
    });
  }

  /**
   * 효과음 버튼 상태 업데이트
   * @param {string} activeSound - 활성 효과음
   */
  updateBgSoundButtons(activeSound) {
    this.elements.bgButtons.forEach(button => {
      button.classList.remove('active');
      
      const soundType = button.textContent.trim();
      if (soundType === activeSound) {
        button.classList.add('active');
      }
    });
  }

  /**
   * 이퀄라이저 패널 토글
   * @param {boolean} show - 표시 여부
   */
  toggleEqualizerPanel(show) {
    if (this.elements.equalizerPanel) {
      if (show) {
        this.elements.equalizerPanel.classList.add('show');
      } else {
        this.elements.equalizerPanel.classList.remove('show');
      }
    }
  }

  /**
   * 디버그 정보 토글
   */
  toggleDebugInfo() {
    if (this.elements.debugInfo) {
      const isVisible = this.elements.debugInfo.style.display === 'block';
      this.elements.debugInfo.style.display = isVisible ? 'none' : 'block';
      
      if (!isVisible) {
        this.updateDebugInfo('디버그 모드 활성화');
      }
    }
  }

  /**
   * 디버그 정보 업데이트
   * @param {string} info - 디버그 정보
   */
  updateDebugInfo(info) {
    if (this.elements.debugInfo) {
      this.elements.debugInfo.innerHTML = info;
      this.elements.debugInfo.classList.add('show');
      
      setTimeout(() => {
        this.elements.debugInfo.classList.remove('show');
      }, 3000);
    }
  }

  /**
   * 재시작 버튼 표시
   * @param {boolean} show - 표시 여부
   */
  showRestartButton(show) {
    if (this.elements.restartSection) {
      this.elements.restartSection.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * 로딩 상태 표시
   * @param {string} message - 로딩 메시지
   */
  showLoading(message = 'Loading...') {
    if (this.elements.title) {
      this.elements.title.innerHTML = `<div class="loading"></div>${message}`;
    }
  }

  /**
   * 오류 메시지 표시
   * @param {string} message - 오류 메시지
   */
  showError(message) {
    if (this.elements.title) {
      this.elements.title.textContent = message;
    }
    this.updateDebugInfo('오류 발생<br>' + message);
  }

  /**
   * 이벤트 발생
   * @param {string} eventName - 이벤트 이름
   * @param {*} data - 이벤트 데이터
   */
  emit(eventName, ...args) {
    const event = new CustomEvent(eventName, { detail: args });
    document.dispatchEvent(event);
}

  /**
   * 이벤트 리스너 추가
   * @param {string} eventName - 이벤트 이름
   * @param {Function} callback - 콜백 함수
   */
  on(eventName, callback) {
    document.addEventListener(eventName, (event) => {
        if (event.detail && Array.isArray(event.detail)) {
            // 배열을 펼쳐서 전달
            callback(...event.detail);
        } else {
            callback(event.detail);
        }
    });
}

  /**
   * 이벤트 리스너 제거
   * @param {string} eventName - 이벤트 이름
   * @param {Function} callback - 콜백 함수
   */
  off(eventName, callback) {
    document.removeEventListener(eventName, callback);
  }

  /**
   * DOM 요소 가져오기
   * @param {string} key - 요소 키
   * @returns {Element|null} DOM 요소
   */
  getElement(key) {
    return this.elements[key] || null;
  }

  /**
   * 모든 DOM 요소 가져오기
   * @returns {Object} DOM 요소 객체
   */
  getElements() {
    return this.elements;
  }
}

// 전역으로 내보내기
window.UIManager = UIManager;
