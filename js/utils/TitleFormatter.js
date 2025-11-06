/**
 * TitleFormatter - 파일명/제목 정제 모듈
 * 음악 파일명을 보기 좋은 제목으로 변환
 */
class TitleFormatter {
  constructor(options = {}) {
    this.debug = options.debug || false;
  }

  /**
   * 파일명 또는 제목을 정제하여 표시용 제목 반환
   * @param {string} input - 원본 파일명 또는 제목
   * @param {Object} options - 옵션 (category 등)
   * @returns {string} 정제된 제목
   */
  format(input, options = {}) {
    if (!input || typeof input !== 'string') {
      return 'Unknown Title';
    }

    const category = options.category || '';
    let result = input;

    // 1단계: 확장자 제거 (파일명인 경우)
    result = this._removeExtension(result);

    // 2단계: 대괄호 [] 우선 처리
    const bracketContent = this._extractBracketContent(result);
    if (bracketContent) {
      result = bracketContent;
      if (this.debug) {
        console.log(`📝 [대괄호 추출] ${input} → ${result}`);
      }
      return result.trim();
    }

    // 3단계: 마스터링 표시 'M' 제거
    result = this._removeMasteringMarker(result);

    // 4단계: 카테고리별 추가 정제
    if (category === 'pop') {
      result = this._cleanPopTitle(result);
    } else if (category === 'lofi-inst') {
      result = this._cleanLofiTitle(result);
    } else {
      result = this._cleanGenericTitle(result);
    }

    // 5단계: 최종 정리
    result = this._finalCleanup(result);

    if (this.debug) {
      console.log(`📝 [제목 변환] ${input} → ${result}`);
    }

    return result.trim() || 'Unknown Title';
  }

  /**
   * 확장자 제거
   * @private
   */
  _removeExtension(str) {
    return str.replace(/\.[^/.]+$/, '');
  }

  /**
   * 대괄호 [] 안의 내용 추출
   * @private
   */
  _extractBracketContent(str) {
    const match = str.match(/\[(.*?)\]/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }

  /**
   * 마스터링 표시 'M' 제거
   * 패턴: _M, -M, 공백M, 단독M (파일명 끝에 있을 때)
   * @private
   */
  _removeMasteringMarker(str) {
    // 끝에 있는 M 패턴들 제거
    return str
      .replace(/[_\-\s]M$/gi, '')  // _M, -M, 공백M
      .replace(/\sM\s*$/gi, '')    // 공백M (여러 공백 포함)
      .replace(/^M$/gi, '');        // 단독 M
  }

  /**
   * POP 카테고리 제목 정제
   * @private
   */
  _cleanPopTitle(str) {
    return str
      .replace(/\([^)]*\)/g, '')    // (feat. 등) 괄호 제거
      .replace(/\s+/g, ' ');         // 연속 공백 제거
  }

  /**
   * LOFI-INST 카테고리 제목 정제
   * @private
   */
  _cleanLofiTitle(str) {
    return str
      .replace(/\s+/g, ' ');         // 연속 공백 제거
  }

  /**
   * 일반 카테고리 제목 정제
   * @private
   */
  _cleanGenericTitle(str) {
    return str
      .replace(/\([^)]*\)/g, '')    // 괄호 제거
      .replace(/\s+/g, ' ');         // 연속 공백 제거
  }

  /**
   * 최종 정리
   * @private
   */
  _finalCleanup(str) {
    return str
      .replace(/\s+/g, ' ')          // 연속 공백 하나로
      .replace(/^[\s\-_]+/, '')      // 시작 부분 공백/특수문자 제거
      .replace(/[\s\-_]+$/, '')      // 끝 부분 공백/특수문자 제거
      .trim();
  }

  /**
   * 배치 처리 - 여러 제목을 한 번에 정제
   * @param {Array} tracks - 트랙 배열 [{title: '...', audio: '...'}, ...]
   * @param {Object} options - 옵션
   * @returns {Array} 정제된 제목을 포함한 트랙 배열
   */
  formatBatch(tracks, options = {}) {
    if (!Array.isArray(tracks)) {
      console.error('❌ TitleFormatter.formatBatch: tracks는 배열이어야 합니다');
      return [];
    }

    return tracks.map(track => {
      const input = track.title || (track.audio ? track.audio.split('/').pop() : '');
      const formattedTitle = this.format(input, options);
      
      return {
        ...track,
        displayTitle: formattedTitle,
        originalTitle: track.title || input
      };
    });
  }

  /**
   * 파일명에서 직접 제목 추출
   * @param {string} filePath - 파일 경로 또는 파일명
   * @param {Object} options - 옵션
   * @returns {string} 정제된 제목
   */
  formatFromPath(filePath, options = {}) {
    if (!filePath) return 'Unknown Title';
    
    const fileName = filePath.split('/').pop().split('\\').pop();
    return this.format(fileName, options);
  }

  /**
   * 디버그 모드 토글
   * @param {boolean} enabled - true면 디버그 로그 출력
   */
  setDebug(enabled) {
    this.debug = !!enabled;
    console.log(`📝 TitleFormatter 디버그 모드: ${this.debug ? 'ON' : 'OFF'}`);
  }

  /**
   * 테스트 함수 - 여러 샘플로 변환 결과 확인
   */
  test() {
    const samples = [
      { input: 'Golden Light, Morning Haze [A dream in memory].mp3', expected: 'A dream in memory' },
      { input: 'Beautiful Song_M.mp3', expected: 'Beautiful Song' },
      { input: 'Artist - Title-M.mp3', expected: 'Artist - Title' },
      { input: 'Song Name M.mp3', expected: 'Song Name' },
      { input: 'Track (feat. Someone) M.mp3', expected: 'Track' },
      { input: '01. Morning Jazz [Sunrise].mp3', expected: 'Sunrise' },
      { input: 'Simple Title.mp3', expected: 'Simple Title' },
      { input: 'M.mp3', expected: 'Unknown Title' }
    ];

    console.log('🧪 TitleFormatter 테스트 시작');
    console.log('='.repeat(60));

    samples.forEach((sample, idx) => {
      const result = this.format(sample.input);
      const passed = result === sample.expected;
      
      console.log(`${idx + 1}. ${passed ? '✅' : '❌'} ${sample.input}`);
      console.log(`   결과: "${result}"`);
      console.log(`   예상: "${sample.expected}"`);
      console.log('');
    });

    console.log('='.repeat(60));
  }
}

// 전역으로 내보내기
window.TitleFormatter = TitleFormatter;
