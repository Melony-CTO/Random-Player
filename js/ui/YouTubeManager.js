/**
 * YouTubeManager - YouTube 배경 비디오 관리 (셔플+크롭 대응)
 */
class YouTubeManager {
    constructor() {
        // 1. 재생할 유튜브 영상 목록
        this.videoIds = [
           // 'gFeqvZQkRCw',
          //  '3VyOuCtcnCI',
         //   '-e_AhQ3m7U8',
          //    '415VKYjJaZ4',
         //     'lZraRbkxY_A',
          //    'ops7dOC8byk',
          //    'BD_DeonFdLk',
          //    'vKuB3qh-bAU',
           //   'qgMeZfcIYto',
           //   'Iri6dhnzzb8',
          //    '-u58otR9o3o',
          //    'TxcGu25vzjw',
          //    'CaEtbvNUxYI',
            //여기서부터는 Melony_Library

            'aVQijucnlO4',
            'PYdAmdYqTAU',
            'whHNA2SWVD4',
            'RVFhFq9ZNJI',
            '1tyFpd2i-ig',
            'mkThb6ExXHo',
            'NBcrwhA03OU',
            'vsKjy9pR5gk',
            'jtxHK3Du24o',
            'E9BAvTfj4T8',
            'Ko6YbSqDJrI',
            'qQGtIKYLf5w',
            'kBGalXqcLps',
            'H0i3wPhxSkw',
            'vB4pQ0kBBlI',
            '5Oo7tMyofu4',
            'SC-6Z-P-uAg',
            'yfhBDT-7f3g',
            '0Tnh94IgF2o',
            'ijOgowzwG_Q', //Oh My Pooky Bear
            'QvsLshWGnhw',  //너의 봄
            'cxT8MeWW1IE',
            'avJfCWG_9qY'
            
            

        ];

        // 셔플 관련 상태
        this.shuffledList = [];
        this.currentIndex = 0;

        // DOM 참조
        this.container = null;
        this.iframe = null;
        this.isVisible = false;

        this.init();
    }

    init() {
        this.container = document.getElementById('youtubeContainer');
        this.iframe = document.getElementById('youtubePlayer');

        // 시작할 때 한 번 섞어둠
        this.shuffleVideos();

        console.log('📺 YouTubeManager 초기화');
    }

    // 🔀 셔플 함수 (Fisher–Yates)
    shuffleVideos() {
        this.shuffledList = [...this.videoIds];
        for (let i = this.shuffledList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffledList[i], this.shuffledList[j]] = [this.shuffledList[j], this.shuffledList[i]];
        }
        this.currentIndex = 0;
    }

    // 다음 영상 ID 가져오기 (끝나면 다시 셔플)
    getNextVideoId() {
        if (this.currentIndex >= this.shuffledList.length) {
            this.shuffleVideos();
        }
        return this.shuffledList[this.currentIndex++];
    }

    /**
     * YouTube 비디오 표시
     */
    show() {
        if (!this.container || !this.iframe) return;

        // 👉 랜덤 말고 셔플 순서대로
        this.currentVideoId = this.getNextVideoId();

        const embedUrl =
            `https://www.youtube.com/embed/${this.currentVideoId}` +
            `?autoplay=1&mute=1&controls=0&loop=1&playlist=${this.currentVideoId}&modestbranding=1&showinfo=0&rel=0`;

        this.iframe.src = embedUrl;
        this.container.style.display = 'block';
            // 👇 이 줄 추가: 유튜브가 떠 있어도 터치/클릭은 뒤로 통과
         this.container.style.pointerEvents = 'none';

         this.container.style.pointerEvents = 'none'; // 터치는 뒤로 보내고
         this.container.style.zIndex = '0';          // 볼륨 오버레이(10)보다 아래로


        this.isVisible = true;

        console.log('📺 YouTube 비디오 표시:', this.currentVideoId);
    }

    /**
     * 비디오 변경
     */
    changeVideo() {
        if (this.isVisible) {
            this.show(); // 다음 셔플된 영상으로
        }
    }

    /**
     * YouTube 비디오 숨김
     */
    hide() {
        if (!this.container || !this.iframe) return;

        this.iframe.src = '';
        this.container.style.display = 'none';
        this.isVisible = false;

        console.log('📺 YouTube 비디오 숨김');
    }

    /**
     * 백그라운드 재생 시 YouTube 일시정지
     */
    pause() {
        if (!this.iframe || !this.isVisible) return;

        try {
            // YouTube iframe API를 사용하여 일시정지
            this.iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            console.log('⏸️ YouTube 비디오 일시정지 (백그라운드)');
        } catch (error) {
            console.warn('⚠️ YouTube 일시정지 실패:', error);
        }
    }

    /**
     * 포그라운드 복귀 시 YouTube 재개 (선택적)
     */
    resume() {
        // YouTube는 사용자가 명시적으로 재생해야 하므로 자동 재개하지 않음
        console.log('▶️ YouTube 준비 (수동 재생 필요)');
    }
}

window.YouTubeManager = YouTubeManager;











