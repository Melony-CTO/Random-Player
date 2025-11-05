/**
 * PlaylistManager - 플레이리스트 관리 모듈
 * 트랙 목록, 카테고리, 셔플 등을 담당
 */
class PlaylistManager {
  constructor() {
    this.allTracks = [];
    this.currentPlaylist = [];
    this.currentTrackIndex = 0;
    this.shuffledTracks = {
      all: [],
      pop: [],
      'kpop': [],
      'lofi-inst': [],
      pc: []
    };
    this.currentCategory = 'pop';
    this.isCategorySwitching = false;
    this.isTrackSwitching = false;
    
    this.init();
  }

  init() {
    console.log('📋 PlaylistManager 초기화');
  }

  /**
   * 모든 트랙 데이터 설정
   * @param {Array} tracks - 트랙 배열
   */
  setAllTracks(tracks) {
    this.allTracks = tracks || [];
    console.log('📋 전체 트랙 설정:', this.allTracks.length + '곡');
  }

  /**
   * 카테고리별 트랙 분리 및 셔플
   */
  generateShuffledPlaylists() {
    console.log('🔄 셔플된 플레이리스트 생성 시작...');
    console.log('  - 전체 트랙 수:', this.allTracks.length);
    
    // 첫 번째 트랙의 구조 확인
    if (this.allTracks.length > 0) {
      console.log('🔍 첫 번째 트랙 구조:', this.allTracks[0]);
    }
    
    // 카테고리별 트랙 분리 (audio 경로에서 카테고리 추출)
    const kpopTracks = this.allTracks.filter(t => {
      const audioPath = t.audio || '';
      return audioPath.includes('kpop/') || t.folder === 'kpop' || t.category === 'kpop' || t.type === 'kpop';
    });
    const popTracks = this.allTracks.filter(t => {
      const audioPath = t.audio || '';
      return audioPath.includes('pop/') || t.folder === 'pop' || t.category === 'pop' || t.type === 'pop';
    });
    const lofiTracks = this.allTracks.filter(t => {
      const audioPath = t.audio || '';
      return audioPath.includes('lofi-inst/') || t.folder === 'lofi-inst' || t.category === 'lofi-inst' || t.type === 'lofi-inst';
    });
    const pcTracks = this.allTracks.filter(t => {
      const audioPath = t.audio || '';
      return audioPath.includes('pc/') || t.folder === 'pc' || t.category === 'pc' || t.type === 'pc';
    });
    
    console.log('📊 카테고리별 트랙 분리 결과:');
    console.log('  - kpop:', kpopTracks.length + '곡');
    console.log('  - pop:', popTracks.length + '곡');
    console.log('  - lofi-inst:', lofiTracks.length + '곡');
    console.log('  - pc:', pcTracks.length + '곡');
    
    // 셔플된 플레이리스트 생성
    this.shuffledTracks.all = this.shuffleArray([...this.allTracks]);
    this.shuffledTracks['kpop'] = this.shuffleArray([...kpopTracks]);
    this.shuffledTracks.pop = this.shuffleArray([...popTracks]);
    this.shuffledTracks['lofi-inst'] = this.shuffleArray([...lofiTracks]);
    this.shuffledTracks.pc = this.shuffleArray([...pcTracks]);
    
    // 모든 트랙이 특정 카테고리에 속하지 않는 경우, 전체를 pop으로 분류
    if (kpopTracks.length === 0 && popTracks.length === 0 && 
        lofiTracks.length === 0 && pcTracks.length === 0 && this.allTracks.length > 0) {
      console.log('⚠️ 카테고리 분류 실패, 모든 트랙을 pop으로 분류');
      this.shuffledTracks.pop = this.shuffleArray([...this.allTracks]);
    }
    
    console.log('📄 셔플된 플레이리스트 생성 완료');
  }

  /**
   * 배열 셔플
   * @param {Array} array - 셔플할 배열
   * @returns {Array} 셔플된 배열
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 선택된 카테고리 가져오기
   * @returns {Array} 선택된 카테고리 배열
   */
  getSelectedCategories() {
    const categories = document.querySelectorAll('.category');
    const selected = [];
    
    categories.forEach(cat => {
      if (cat.classList.contains('active')) {
        const folder = cat.getAttribute('data-folder');
        if (folder) {
          selected.push(folder);
        }
      }
    });
    
    return selected.length > 0 ? selected : ['pop']; // 기본값
  }

  /**
   * 현재 플레이리스트 업데이트
   */
  updateCurrentPlaylist() {
    console.log('🎯 현재 플레이리스트 업데이트:', this.currentCategory);
    
    // 현재 카테고리에 맞는 플레이리스트만 설정 (2025-09-22.html 방식)
    if (this.shuffledTracks[this.currentCategory] && this.shuffledTracks[this.currentCategory].length > 0) {
      this.currentPlaylist = [...this.shuffledTracks[this.currentCategory]];
      console.log('✅ ' + this.currentCategory + ' 플레이리스트 설정:', this.currentPlaylist.length + '곡');
      
      // 첫 번째 트랙 정보 로그
      if (this.currentPlaylist.length > 0) {
        console.log('  - 첫 번째 트랙:', this.currentPlaylist[0].title);
        console.log('  - 트랙 폴더:', this.currentPlaylist[0].folder);
      }
    } else {
      console.error('❌ shuffledTracks[' + this.currentCategory + ']가 비어있거나 없음');
      this.currentPlaylist = [];
    }
    
    console.log('🎯 현재 플레이리스트 업데이트 완료:', this.currentPlaylist.length + '곡');
  }

  /**
   * 현재 트랙 가져오기
   * @returns {Object|null} 현재 트랙 정보
   */
  getCurrentTrack() {
    if (this.currentTrackIndex >= 0 && this.currentTrackIndex < this.currentPlaylist.length) {
      return this.currentPlaylist[this.currentTrackIndex];
    }
    return null;
  }

  /**
   * 다음 트랙으로 이동
   * @returns {Object|null} 다음 트랙 정보
   */
  getNextTrack() {
    const newIndex = this.currentTrackIndex + 1;
    if (newIndex >= this.currentPlaylist.length) {
      this.currentTrackIndex = 0; // 처음으로 돌아가기
    } else {
      this.currentTrackIndex = newIndex;
    }
    return this.getCurrentTrack();
  }

  /**
   * 이전 트랙으로 이동
   * @returns {Object|null} 이전 트랙 정보
   */
  getPreviousTrack() {
    const newIndex = this.currentTrackIndex - 1;
    if (newIndex < 0) {
      this.currentTrackIndex = this.currentPlaylist.length - 1; // 마지막으로 이동
    } else {
      this.currentTrackIndex = newIndex;
    }
    return this.getCurrentTrack();
  }

  /**
   * 특정 인덱스의 트랙으로 이동
   * @param {number} index - 트랙 인덱스
   * @returns {Object|null} 트랙 정보
   */
  getTrackByIndex(index) {
    if (index >= 0 && index < this.currentPlaylist.length) {
      this.currentTrackIndex = index;
      return this.getCurrentTrack();
    }
    return null;
  }

  /**
   * 카테고리 전환
   * @param {string} categoryName - 카테고리 이름
   */
  switchCategory(categoryName) {
    console.log('🔄 카테고리 전환 시작:', categoryName);
    
    // 카테고리 이름이 문자열인지 확인
    if (typeof categoryName !== 'string') {
      console.error('❌ 카테고리 이름이 문자열이 아님:', categoryName);
      return;
    }
    
    this.isCategorySwitching = true;
    
    // UIManager에서 이미 올바른 카테고리 이름을 보내므로 그대로 사용
    this.currentCategory = categoryName;
    
    console.log('🎯 카테고리 매핑:', categoryName, '→', this.currentCategory);
    
    // 해당 카테고리 데이터가 없으면 로드 필요
    if (!this.shuffledTracks[this.currentCategory] || this.shuffledTracks[this.currentCategory].length === 0) {
      console.log('📡 카테고리 데이터 로드 필요:', this.currentCategory);
      // 여기서 API 호출을 통해 해당 카테고리 데이터를 로드해야 함
      // 현재는 빈 배열로 설정
      this.shuffledTracks[this.currentCategory] = [];
    }
    
    // 플레이리스트 업데이트
    this.updateCurrentPlaylist();
    this.currentTrackIndex = 0;
    
    // 카테고리 전환 플래그 해제
    setTimeout(() => {
      this.isCategorySwitching = false;
      console.log('🔄 카테고리 전환 플래그 해제');
    }, 2000);
  }

  /**
   * 로컬 파일 플레이리스트 설정
   * @param {Array} files - 파일 배열
   */
  setLocalPlaylist(files) {
    console.log('📁 로컬 파일 플레이리스트 설정:', files.length + '개 파일');
    
    this.currentPlaylist = files.map((file, index) => {
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      let cleanTitle = null;
      
      const bracketMatch = fileName.match(/\[(.*?)\]/);
      if (bracketMatch && bracketMatch[1]) {
        cleanTitle = bracketMatch[1].trim();
      } else {
        cleanTitle = fileName
          .replace(/\([^)]*\)/g, '')
          .replace(/_M$|^M$|-M$|\s+M$/g, '')
          .replace(/[_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      cleanTitle = cleanTitle || 'Unknown Track';
      
      return {
        title: cleanTitle,
        folder: 'pc',
        fileReference: file,
        fileName: file.name,
        fileSize: file.size,
        isLocalFile: true,
        blobUrl: null
      };
    });
    
    // 셔플
    this.currentPlaylist = this.shuffleArray(this.currentPlaylist);
    this.currentCategory = 'pc';
    this.currentTrackIndex = 0;
    
    console.log('📋 PC 플레이리스트 생성 완료:', this.currentPlaylist.length + '곡');
  }

  /**
   * 플레이리스트 검증
   * @returns {boolean} 검증 결과
   */
  validatePlaylist() {
    if (this.currentPlaylist.length === 0) {
      console.error('❌ 플레이리스트가 비어있습니다');
      return false;
    }
    
    const categories = [...new Set(this.currentPlaylist.map(t => t.folder))];
    console.log('🔍 플레이리스트 검증:');
    console.log('  - 트랙 수:', this.currentPlaylist.length);
    console.log('  - 포함된 폴더:', categories);
    
    return true;
  }

  /**
   * 트랙 검색
   * @param {string} query - 검색어
   * @returns {Array} 검색 결과
   */
  searchTracks(query) {
    if (!query || query.trim() === '') {
      return this.currentPlaylist;
    }
    
    const searchTerm = query.toLowerCase().trim();
    return this.currentPlaylist.filter(track => 
      track.title.toLowerCase().includes(searchTerm) ||
      track.folder.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * 플레이리스트 통계
   * @returns {Object} 통계 정보
   */
  getPlaylistStats() {
    const stats = {
      total: this.currentPlaylist.length,
      current: this.currentTrackIndex + 1,
      categories: {}
    };
    
    this.currentPlaylist.forEach(track => {
      if (!stats.categories[track.folder]) {
        stats.categories[track.folder] = 0;
      }
      stats.categories[track.folder]++;
    });
    
    return stats;
  }

  /**
   * 카테고리 데이터 적용 (2025-09-22.html 호환)
   * @param {string} category - 카테고리명
   * @param {Object} data - 카테고리 데이터
   */
  applyCategoryData(category, data) {
    console.log('📁 카테고리 데이터 적용:', category);
    
    const tracks = data.tracks || data || [];
    const categoryTracks = [];
    
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      let cleanTitle = track.title || track.audio.split('/').pop().replace(/\.[^/.]+$/, '');
      
      // 제목 정제 (2025-09-22.html 로직)
      if (category === 'pop') {
        const bracketMatch = track.title ? track.title.match(/\[(.*?)\]/) : null;
        if (bracketMatch && bracketMatch[1]) {
          cleanTitle = bracketMatch[1].trim();
        } else if (track.title) {
          cleanTitle = track.title.replace(/\([^)]*\)/g, '').replace(/_M$/, '').replace(/\s+/g, ' ').trim();
        }
      } else if (category === 'lofi-inst') {
        const bracketMatch = track.title ? track.title.match(/\[(.*?)\]/) : null;
        if (bracketMatch && bracketMatch[1]) {
          cleanTitle = bracketMatch[1].trim();
        } else if (track.title) {
          cleanTitle = track.title.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        }
      } else if (category === 'kpop') {
        if (track.title) {
          cleanTitle = track.title.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        }
      }
      
      // 트랙 객체 생성
      const processedTrack = {
        ...track,
        title: cleanTitle,
        folder: category
      };
      
      categoryTracks.push(processedTrack);
    }
    
    // 카테고리별 셔플된 트랙 저장
    this.shuffledTracks[category] = this.shuffleArray([...categoryTracks]);
    
    console.log(`✅ ${category} 카테고리 데이터 적용 완료: ${categoryTracks.length}곡`);
    console.log(`  - 셔플된 트랙 수: ${this.shuffledTracks[category].length}곡`);
  }

  /**
   * 플레이리스트 초기화
   */
  reset() {
    this.currentPlaylist = [];
    this.currentTrackIndex = 0;
    this.isCategorySwitching = false;
    this.isTrackSwitching = false;
    console.log('📋 플레이리스트 초기화');
  }
}

// 전역으로 내보내기
window.PlaylistManager = PlaylistManager;