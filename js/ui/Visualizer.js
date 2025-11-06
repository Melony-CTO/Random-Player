/**
 * Visualizer - 오디오 비주얼라이저 모듈
 * 오디오 주파수 분석 및 시각화를 담당
 */
class Visualizer {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.isRunning = false; // ✅ isActive → isRunning 으로 변경
        this.animationId = null;
        this.lastFrameTime = 0;
        this.targetFPS = 30;
        this.useFallback = false;

        this.init();
    }

    init() {
        console.log('🎨 Visualizer 초기화');
        this.initializeVisualizerBars();
    }

    /**
     * 비주얼라이저 바 초기화
     */
    initializeVisualizerBars() {
        const audioVisualizer = document.getElementById('audioVisualizer');
        if (!audioVisualizer) {
            console.error('❌ audioVisualizer 요소를 찾을 수 없습니다');
            return;
        }

        // 기존 바 제거
        const existingBars = audioVisualizer.querySelectorAll('.visualizer-bar');
        existingBars.forEach(bar => bar.remove());

        // 새로운 바 생성 (40개)
        for (let i = 0; i < 40; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            bar.style.height = '2px';
            bar.style.opacity = '1'; // 완전 불투명
            audioVisualizer.appendChild(bar);
        }

        console.log('✅ 비주얼라이저 바 40개 생성 완료');
    }

    /**
     * 비주얼라이저 시작
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ 비주얼라이저 이미 실행 중');
            return;
        }

        console.log('🎨 비주얼라이저 시작');

        // AudioContext 연결 확인
        if (!this.audioManager.sourceConnected) {
            console.warn('⚠️ AudioContext가 연결되지 않았습니다. 연결 시도...');
            this.audioManager.connectAudioSource();
        }

        this.isRunning = true;
        this.animate();
    }

    /**
     * 비주얼라이저 정지
     */
    stop() {
        if (!this.isRunning) return;

        console.log('⏹️ 비주얼라이저 정지');
        this.isRunning = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // 바 초기화
        this.resetBars();
    }

    /**
     * 애니메이션 루프
     */
    animate() {
        if (!this.isRunning) return;

        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        const frameInterval = 1000 / this.targetFPS;

        if (elapsed > frameInterval) {
            this.lastFrameTime = now - (elapsed % frameInterval);
            this.updateBars();
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * 비주얼라이저 바 업데이트 (원본 로직 적용)
     */
    updateBars() {
        const audioVisualizer = document.getElementById('audioVisualizer');
        if (!audioVisualizer) return;

        const bars = audioVisualizer.querySelectorAll('.visualizer-bar');
        if (bars.length === 0) {
            console.warn('⚠️ 비주얼라이저 바가 없습니다. 다시 생성합니다.');
            this.initializeVisualizerBars();
            return;
        }

        // 주파수 데이터 가져오기
        const frequencyData = this.audioManager.getFrequencyData();

        if (!frequencyData || frequencyData.length === 0) {
            // 데이터 없으면 폴백 애니메이션
            this.updateBarsWithFallback(bars);
            return;
        }

        // ✨ 원본 로직: 전체 활동성 체크
        let totalActivity = 0;
        for (let i = 0; i < frequencyData.length; i++) {
            totalActivity += frequencyData[i];
        }
        const avgActivity = totalActivity / frequencyData.length;

        // 실제 오디오 데이터로 업데이트
        const barCount = bars.length;

        for (let barIndex = 0; barIndex < barCount; barIndex++) {
            let value = 0;

            if (avgActivity > 2) {
                // ✨ 원본 로직: 주파수 범위 10%~72% 사용
                const startFreq = Math.floor(frequencyData.length * 0.10);
                const endFreq = Math.floor(frequencyData.length * 0.72);
                const usableRange = endFreq - startFreq;

                // ✨ 원본 로직: 오버랩 1.3배로 부드러운 연결
                const overlap = 1.3;
                const barWidth = (usableRange / barCount) * overlap;
                const myStartFreq = startFreq + Math.floor(barIndex * (usableRange / barCount));
                const myEndFreq = Math.min(myStartFreq + Math.floor(barWidth), frequencyData.length - 1);

                // ✨ 원본 로직: 최대값과 평균값 계산
                let maxVal = 0;
                let sum = 0;
                let count = 0;

                for (let i = myStartFreq; i <= myEndFreq && i < frequencyData.length; i++) {
                    const val = frequencyData[i];
                    maxVal = Math.max(maxVal, val);
                    sum += val;
                    count++;
                }

                const avgVal = count > 0 ? sum / count : 0;

                // ✨ 원본 로직: 최대값 80% + 평균값 15%
                value = (maxVal * 0.80) + (avgVal * 0.15);
                value *= 1.1; // 전체 1.1배 증폭

                // ✨ 원본 로직: 오른쪽 바 증폭 (고음역 강화)
                if (barIndex >= 30) {
                    value *= 1.5; // 오른쪽 10개 1.5배
                } else if (barIndex >= 25) {
                    value *= 1.2; // 25~29번 1.2배
                }
            }

            // ✨ 원본 로직: 높이 계산 (2px ~ 30px)
            const height = Math.max(2, Math.min(30, (value / 255) * 28 + 2));
            bars[barIndex].style.height = height + 'px';
            bars[barIndex].style.opacity = '1';
        }
    }

    /**
     * 폴백 애니메이션 (오디오 데이터 없을 때)
     */
    updateBarsWithFallback(bars) {
        const time = Date.now() / 1000;

        bars.forEach((bar, i) => {
            const wave = Math.sin(time * 2 + i * 0.5) * 0.5 + 0.5;
            const height = Math.max(2, wave * 60);

            bar.style.height = height + '%';
            bar.style.opacity = '1'; // 완전 불투명
        });
    }

    /**
     * 바 초기화
     */
    resetBars() {
        const audioVisualizer = document.getElementById('audioVisualizer');
        if (!audioVisualizer) return;

        const bars = audioVisualizer.querySelectorAll('.visualizer-bar');
        bars.forEach(bar => {
            bar.style.height = '2px';
            bar.style.opacity = '1'; // 완전 불투명
        });
    }

    /**
     * 재생 토글
     */
    async togglePlay() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    /**
     * 정리
     */
    cleanup() {
        this.stop();
        console.log('🎨 Visualizer 정리 완료');
    }
}

// 전역 등록
window.Visualizer = Visualizer;
