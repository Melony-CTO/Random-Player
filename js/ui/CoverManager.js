/**
 * CoverManager - 커버 이미지 관리 모듈 (통합 관리 버전)
 * 커버 이미지 로딩, 캐싱, 전환, JSON 파일 관리를 담당
 */
class CoverManager {
    constructor(api = null) {
        this.api = api;
        this.coverCache = new Map();
        this.maxCacheSize = 20;
        this.isSettingCover = false;
        this.currentCoverUrl = null;

        // 카테고리별 커버 데이터
        this.coverData = {
            'pop': { covers: [], shuffled: [], index: 0 },
            'kpop': { covers: [], shuffled: [], index: 0 },
            'lofi-inst': { covers: [], shuffled: [], index: 0 },
            '8090gayo': { covers: [], shuffled: [], index: 0 }
        };

        // 로드된 카테고리 추적
        this.loadedCategories = new Set();

        // JSON 파일 매핑
        this.coverFiles = {
            'pop': 'coverlist-pop.json',
            'kpop': 'coverlist-pop.json',  // POP 커버 공유
            'lofi-inst': 'coverlist-lofi.json',
            '8090gayo': 'coverlist-8090.json'  // 추후 확장
        }; 

        // 폴더 매핑
        this.coverFolders = {
            'pop': 'pop-covers',
            'kpop': 'pop-covers',  // POP 폴더 공유
            'lofi-inst': 'covers',
            '8090gayo': 'covers-8090'
        };

        this.randomCovers = [];
        this.useRandomCover = true;

        this.init();
    }

    init() {
        console.log('🖼️ CoverManager 초기화 (통합 관리 모드)');
    }

    /**
     * API 설정 (외부에서 주입)
     */
    setAPI(api) {
        this.api = api;
        console.log('🖼️ API 연결 완료');
    }


    /**
     * 카테고리별 커버 로딩 (Lazy Loading)
     */
    async loadCoversByCategory(category) {
        try {
            // 이미 로드했으면 스킵
            if (this.loadedCategories.has(category)) {
                console.log('✅ 커버 캐시 히트:', category);
                return true;
            }

            const file = this.coverFiles[category];
            if (!file) {
                console.warn('⚠️ 지원하지 않는 카테고리:', category);
                return false;
            }

            console.log('📡 커버 데이터 로딩 시작:', category, '파일:', file);

            if (!this.api) {
                console.error('❌ API가 설정되지 않았습니다');
                return false;
            }

            // ✅ JSON 파일 로드 - 수정된 부분
            console.log('🔍 API.get 호출 - file:', file);
        
            const coverData = await this.api.get('/' + file);
        
            console.log('🔍 API 응답 받음:', coverData);

            if (!coverData || !coverData.covers || !Array.isArray(coverData.covers)) {
                console.warn('⚠️ 유효하지 않은 커버 데이터:', category, 'coverData:', coverData);
                return false;
            }

            console.log('🔍 커버 데이터 유효성 확인 통과:', coverData.covers.length, '개');

            // 카테고리별 데이터 저장
            this.coverData[category].covers = coverData.covers;
            this.coverData[category].shuffled = this.shuffleArray([...coverData.covers]);
            this.coverData[category].index = 0;

            console.log('🔍 저장 완료 확인:', {
                category,
                coversLength: this.coverData[category].covers.length,
                shuffledLength: this.coverData[category].shuffled.length,
                index: this.coverData[category].index
            });

            // 로드 완료 표시
            this.loadedCategories.add(category);

            console.log('✅ 커버 로딩 완료:', category, coverData.covers.length + '개');
            return true;

        } catch (error) {
            console.error('❌ 커버 로딩 실패:', category, error);
            return false;
        }
    }

    /**
     * 카테고리별 랜덤 커버 선택
     */
    pickRandomCoverUrl(fallbackUrl, folderType) {
        console.log('🔍 pickRandomCoverUrl 호출 - folderType:', folderType);
            
        // ✅ 디버그: 전체 상태 출력
        console.log('🔍 현재 coverData 상태:', {
            pop: this.coverData['pop']?.shuffled?.length || 0,
            kpop: this.coverData['kpop']?.shuffled?.length || 0,
            'lofi-inst': this.coverData['lofi-inst']?.shuffled?.length || 0,
            loadedCategories: Array.from(this.loadedCategories)
        });

        if (!this.useRandomCover) return fallbackUrl;

        // 카테고리 정규화
        const normalizedCategory = this.normalizeCategory(folderType);
        console.log('🔍 정규화된 카테고리:', normalizedCategory);

        // 해당 카테고리 데이터 확인
        const categoryData = this.coverData[normalizedCategory];
        console.log('🔍 categoryData:', categoryData);

        if (!categoryData || !categoryData.shuffled || categoryData.shuffled.length === 0) {
            console.warn('⚠️ 커버 데이터 없음:', normalizedCategory);
            console.warn('🔍 categoryData 상세:', {
                exists: !!categoryData,
                hasShuffled: categoryData?.shuffled !== undefined,
                shuffledLength: categoryData?.shuffled?.length || 0
            });

            // 기본 랜덤 커버 사용
            if (Array.isArray(this.randomCovers) && this.randomCovers.length > 0) {
                const idx = Math.floor(Math.random() * this.randomCovers.length);
                return this.randomCovers[idx];
            }

            return fallbackUrl;
        }

        // 순환 방식으로 커버 선택
        const cover = categoryData.shuffled[categoryData.index % categoryData.shuffled.length];
        categoryData.index++;

        console.log('🖼️ 커버 선택:', normalizedCategory, '인덱스:', categoryData.index - 1, 'cover:', cover);

        // 커버 URL 생성
        return this.buildCoverUrl(cover, normalizedCategory);
    }

    /**
     * 카테고리 정규화
     */
    normalizeCategory(category) {
        if (!category) return 'pop';

        const normalized = category.toLowerCase();

        // PC 로컬 파일은 POP 커버 사용
        if (normalized === 'pc') return 'pop';

        // 등록된 카테고리인지 확인
        if (this.coverData[normalized]) return normalized;

        // 기본값은 POP
        return 'pop';
    }

    /**
     * 커버 URL 생성
     */
    buildCoverUrl(cover, category) {
        const baseUrl = this.getBaseUrl();
        const folder = this.coverFolders[category] || 'pop-covers';

        if (typeof cover === 'string') {
            return `${baseUrl}/file/${folder}/${cover}`;
        } else if (cover && cover.filename) {
            return `${baseUrl}/file/${folder}/${cover.filename}`;
        } else if (cover && cover.url) {
            return `${baseUrl}/file/${cover.url}`;
        }

        return '';
    }

    /**
     * 커버 이미지 설정 (즉시 표시 모드)
     */
    setCover(urlOrUrls, options = {}) {
        const thumbnail = document.getElementById('thumbnail');
        if (!thumbnail) {
            this.isSettingCover = false;
            return;
        }

        const candidates = Array.isArray(urlOrUrls) ? urlOrUrls.slice() : [urlOrUrls];

        // URL 정규화
        const normalizedCandidates = candidates.map(url => this.normalizeUrl(url)).filter(Boolean);

        if (normalizedCandidates.length === 0) {
            this.isSettingCover = false;
            return;
        }

        const getCurrentNormalizedUrl = () => {
            const currentBg = thumbnail.style.backgroundImage;
            if (!currentBg) return '';
            const matched = currentBg.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
            return matched.split('?')[0].trim();
        };

        const currentNormalizedUrl = getCurrentNormalizedUrl();
        const nextNormalizedUrl = normalizedCandidates[0];

        // 같은 이미지면 다시 안 바꿈
        if (currentNormalizedUrl === nextNormalizedUrl) {
            console.log('🖼️ 동일한 커버 이미지 - 중복 로딩 방지');
            this.isSettingCover = false;
            return;
        }

        // 다른 요청이 들어온 상태면 교체
        if (this.isSettingCover) {
            const currentSettingUrlNormalized = this.currentCoverUrl ? this.normalizeUrl(this.currentCoverUrl) : '';
            if (currentSettingUrlNormalized === nextNormalizedUrl) {
                console.log('🖼️ 이미 동일 커버 설정 중:', nextNormalizedUrl);
                return;
            }
            console.log('🔄 다른 커버 요청 감지 - 기존 작업 중단');
        }

        this.isSettingCover = true;

        const container = document.querySelector('.thumbnail-container');
        if (container) container.classList.remove('cover-ready');

        const next = normalizedCandidates[0];

        // ✅ 즉시 표시
        console.log('🖼️ 커버 즉시 설정:', next);
        this.applyCoverImage(next, thumbnail, container);

        // 백그라운드에서 캐싱
        this.cacheImage(next);
    }

    /**
     * URL 정규화
     */
    normalizeUrl(url) {
        if (!url) return '';

        // 이미 절대경로면 그대로
        if (/^https?:\/\//i.test(url)) {
            return url.split('?')[0];
        }

        const baseUrl = this.getBaseUrl();

        // "pop-covers/xxx.webp" 같이 하위폴더가 있으면 /file/ 붙여줌
        if (url.includes('/')) {
            if (url.startsWith('/file/')) {
                return `${baseUrl}${url}`.split('?')[0];
            }
            return `${baseUrl}/file/${url}`.split('?')[0];
        }

        // 파일명만 있으면 기본 /file/ 로
        return `${baseUrl}/file/${url}`.split('?')[0];
    }

    /**
     * 커버 이미지 적용
     */
    applyCoverImage(src, thumbnail, container) {
        this.isSettingCover = false;

        if (!src) {
            this.currentCoverUrl = null;
            return;
        }

        if (!thumbnail) thumbnail = document.getElementById('thumbnail');
        if (!container) container = document.querySelector('.thumbnail-container');

        this.currentCoverUrl = src;

        thumbnail.style.transition = 'background-image 0.3s ease-in-out';
        thumbnail.style.backgroundImage = `url('${src}')`;
        thumbnail.style.backgroundSize = '100%';
        thumbnail.style.backgroundPosition = 'center 10%';

        if (container) container.classList.add('cover-ready');

        setTimeout(() => {
            thumbnail.classList.remove('blur-hidden');
            thumbnail.classList.add('blur-start', 'playing');
        }, 100);

        console.log('✅ 커버 이미지 적용 완료:', src);
    }

    /**
     * 이미지 캐싱
     */
    cacheImage(url) {
        if (!url || this.coverCache.has(url)) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            if (this.coverCache.size >= this.maxCacheSize) {
                const firstKey = this.coverCache.keys().next().value;
                this.coverCache.delete(firstKey);
            }
            this.coverCache.set(url, img);
            console.log('🖼️ 커버 캐싱 완료:', url);
        };
        img.onerror = () => {
            console.log('🖼️ 커버 캐싱 실패:', url);
        };
        img.src = url;
    }

    /**
     * 프리로드 (백그라운드 전용)
     */
    async preloadCover(url) {
        if (!url) return;

        if (this.coverCache.has(url)) {
            console.log('🖼️ 커버 이미지 캐시 히트:', url);
            return;
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.loading = 'eager';

            img.onload = () => {
                if (this.coverCache.size >= this.maxCacheSize) {
                    const firstKey = this.coverCache.keys().next().value;
                    this.coverCache.delete(firstKey);
                }
                this.coverCache.set(url, img);
                console.log('🖼️ 커버 이미지 프리로드 완료:', url);
                resolve();
            };

            img.onerror = () => {
                console.log('🖼️ 커버 이미지 프리로드 실패:', url);
                resolve();
            };

            img.src = url;
        });
    }

    /**
     * 기존 호환성을 위한 메서드 (Deprecated)
     */
    setCoverList(coverData, category = 'lofi-inst') {
        console.warn('⚠️ setCoverList는 deprecated되었습니다. loadCoversByCategory를 사용하세요.');

        if (!coverData || !coverData.covers || !Array.isArray(coverData.covers)) {
            console.warn('🖼️ 유효하지 않은 커버 데이터:', category);
            return;
        }

        const normalizedCategory = this.normalizeCategory(category);

        this.coverData[normalizedCategory].covers = coverData.covers;
        this.coverData[normalizedCategory].shuffled = this.shuffleArray([...coverData.covers]);
        this.coverData[normalizedCategory].index = 0;

        this.loadedCategories.add(normalizedCategory);

        console.log('🖼️ 커버 로드 (레거시):', normalizedCategory, coverData.covers.length + '개');
    }

    /**
     * Base URL 가져오기
     */
    getBaseUrl() {
        const encodedAPI = 'aHR0cHM6Ly9tZWxvbnktbXVzaWMtYXBpLnplcHBsaW5uMjUud29ya2Vycy5kZXY=';
        return atob(encodedAPI);
    }

    /**
     * 배열 셔플
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
     * 기본 커버 생성
     */
    generateDefaultCovers() {
        console.log('⚠️ 기본 커버 생성 - 커버리스트 로딩 실패');

        // ✅ POP 카테고리에 기본 커버 추가
        const popDefaultCovers = [];
        for (let i = 1; i <= 5; i++) {
            popDefaultCovers.push({
                id: `default-pop-${i}`,
                folder: 'pop-covers',
                filename: `default-${i}.webp`,
                category: 'pop'
            });
        }

        // ✅ LOFI 카테고리에 기본 커버 추가
        const lofiDefaultCovers = [];
        for (let i = 1; i <= 10; i++) {
            const num = String(i).padStart(5, '0');
            lofiDefaultCovers.push({
                id: `lofi-${num}`,
                folder: 'covers',
                filename: `lofi-${num}.jpeg`,
                category: 'lofi-inst'
            });
        }

        // ✅ 카테고리별 데이터 설정
        this.coverData['pop'].covers = popDefaultCovers;
        this.coverData['pop'].shuffled = this.shuffleArray([...popDefaultCovers]);
        this.coverData['pop'].index = 0;

        this.coverData['kpop'].covers = popDefaultCovers; // KPOP은 POP과 공유
        this.coverData['kpop'].shuffled = this.shuffleArray([...popDefaultCovers]);
        this.coverData['kpop'].index = 0;

        this.coverData['lofi-inst'].covers = lofiDefaultCovers;
        this.coverData['lofi-inst'].shuffled = this.shuffleArray([...lofiDefaultCovers]);
        this.coverData['lofi-inst'].index = 0;

        // ✅ 로드 완료 표시
        this.loadedCategories.add('pop');
        this.loadedCategories.add('kpop');
        this.loadedCategories.add('lofi-inst');

        // ✅ 레거시 랜덤 커버 (하위 호환성)
        this.randomCovers = lofiDefaultCovers.map(cover => {
            return `${this.getBaseUrl()}/file/${cover.folder}/${cover.filename}`;
        });

        console.log('✅ 기본 커버 설정 완료 (POP/KPOP/LOFI)');
    }

    /**
     * 캐시 정리
     */
    clearCache() {
        this.coverCache.clear();
        console.log('🖼️ 커버 캐시 정리');
    }

    /**
     * 캐시 크기 설정
     */
    setCacheSize(size) {
        this.maxCacheSize = Math.max(1, Math.min(100, size));
        console.log('🖼️ 캐시 크기 설정:', this.maxCacheSize);
    }

    /**
     * 랜덤 커버 사용 설정
     */
    setUseRandomCover(use) {
        this.useRandomCover = use;
        console.log('🖼️ 랜덤 커버 사용:', this.useRandomCover);
    }

    /**
     * 현재 커버 URL 가져오기
     */
    getCurrentCoverUrl() {
        return this.currentCoverUrl;
    }

    /**
     * 상태 정보 가져오기
     */
    getStatus() {
        return {
            isSettingCover: this.isSettingCover,
            currentCoverUrl: this.currentCoverUrl,
            cacheSize: this.coverCache.size,
            maxCacheSize: this.maxCacheSize,
            useRandomCover: this.useRandomCover,
            loadedCategories: Array.from(this.loadedCategories),
            categoryStats: Object.fromEntries(
                Object.entries(this.coverData).map(([cat, data]) => [
                    cat,
                    { total: data.covers.length, currentIndex: data.index }
                ])
            )
        };
    }

    /**
     * 설정 적용
     */
    applySettings(settings) {
        if (settings.maxCacheSize !== undefined) {
            this.setCacheSize(settings.maxCacheSize);
        }
        if (settings.useRandomCover !== undefined) {
            this.setUseRandomCover(settings.useRandomCover);
        }
        console.log('🖼️ 커버 매니저 설정 적용:', settings);
    }

    /**
     * 정리
     */
    cleanup() {
        this.clearCache();
        this.isSettingCover = false;
        this.currentCoverUrl = null;
        this.loadedCategories.clear();
        console.log('🖼️ 커버 매니저 정리 완료');
    }

       /**
     * 모든 애니메이션 정지
     */
    stopAnimations() {
        const thumbnail = document.getElementById('thumbnail');
        if (thumbnail) {
            thumbnail.style.animation = 'none';
        }
        console.log('🎬 커버 애니메이션 정지');
    }

    /**
     * 애니메이션 재시작
     */
    resumeAnimations() {
        const thumbnail = document.getElementById('thumbnail');
        if (thumbnail) {
            thumbnail.style.animation = '';
        }
        console.log('🎬 커버 애니메이션 재시작');
    }
}

// 전역 등록
window.CoverManager = CoverManager;
