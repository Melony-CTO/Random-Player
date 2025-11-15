
/**
 * EffectSoundManager - 효과음 관리 모듈 (백업 파일 기반)
 * - 간단하고 안정적인 효과음 재생
 * - 중복 재생 방지
 */
class EffectSoundManager {
    constructor(audioManager, api) {
        this.audioManager = audioManager;
        this.api = api;
        this.currentBgSound = null;
        this.effectVolume = 0.5;

        // 효과음 파일명 매핑
        this.soundFileMap = {
            'Rain': 'effect_Rain.m4a',
            'Bird': 'effect_Bird.m4a',
            'Forest': 'effect_Forest Water_Free.m4a',
            'Neighborhood': 'effect_Neighborhood_free.m4a',
            'Amazon': 'effect_Amazonia Jungle_Free.m4a',
            'Ocean': 'effect_Ocean.m4a',
            'Crackle': 'effect_Crackle.m4a',
            'Rain2': 'effect_Rain_Free.m4a'
        };

        this.init();
    }

    init() {
        console.log('🔊 EffectSoundManager 초기화');
        this.setupEventListeners();
    }

/**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // ✅ 이벤트 리스너 설정하지 않음 (UIManager에서 이미 처리)
        // main.js의 bgSoundToggle 이벤트를 통해 호출됨
        console.log('🔊 EffectSoundManager - 이벤트는 UIManager에서 처리');
    }

/**
     * 효과음 토글
     */
    toggleBgSound(soundType) {
        console.log('🔊 효과음 토글:', soundType);

        const actualFileName = this.soundFileMap[soundType] || (soundType + '.m4a');
        let effectAudio = document.getElementById('effect-' + soundType);

        // 같은 효과음이면 정지
        if (this.currentBgSound === soundType) {
            if (effectAudio) {
                effectAudio.pause();
                effectAudio.currentTime = 0;
            }
            this.currentBgSound = null;
            // ✅ audioManager에도 동기화
            if (this.audioManager) {
                this.audioManager.currentBgSound = null;
            }

            const clickedButton = document.querySelector(`[data-sound="${soundType}"]`);
            if (clickedButton) {
                clickedButton.classList.remove('active');
            }
            console.log('🔇 효과음 정지:', soundType);
            return;
        }

        // 현재 재생 중인 다른 효과음 정지
        if (this.currentBgSound && this.currentBgSound !== soundType) {
            const currentAudio = document.getElementById('effect-' + this.currentBgSound);
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }

            // 모든 버튼 비활성화
            const buttons = document.querySelectorAll('.bg-button');
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // ✅ 상태 초기화
            this.currentBgSound = null;
            if (this.audioManager) {
                this.audioManager.currentBgSound = null;
            }
        }

       // Audio 요소가 없으면 생성
        if (!effectAudio) {
            effectAudio = document.createElement('audio');
            effectAudio.id = 'effect-' + soundType;
            effectAudio.loop = true;
            effectAudio.preload = 'auto';
            effectAudio.crossOrigin = 'anonymous';

            // 효과음 경로
            const effectPath = 'https://melony-music-api.zepplinn25.workers.dev/file/effects/' + encodeURIComponent(actualFileName);
            effectAudio.src = effectPath;
            document.body.appendChild(effectAudio);

            // 오류 처리
            effectAudio.addEventListener('error', () => {
                console.error('❌ 효과음 파일 로딩 실패:', effectPath);
            });
        }

        // 새 효과음 재생
        effectAudio.volume = this.effectVolume;
        effectAudio.loop = true;

        // ✅ 즉시 상태 업데이트 (audioManager에도 동기화)
        this.currentBgSound = soundType;
        if (this.audioManager) {
            this.audioManager.currentBgSound = soundType;
        }
            const clickedButton = document.querySelector(`[data-sound="${soundType}"]`);
        if (clickedButton) {
            clickedButton.classList.add('active');
        }

                // ✅ 간단하게 재생
        effectAudio.play()
            .then(() => {
                console.log('✅ 효과음 재생:', soundType);
            })
            .catch(() => {
                console.log('⏳ 효과음 로딩 중...', soundType);
            });
    }

/**
     * 볼륨 설정
     */
    setVolume(volume) {
        this.effectVolume = Math.max(0, Math.min(1, volume));

        // 현재 재생 중인 효과음에 적용
        if (this.currentBgSound) {
            const effectAudio = document.getElementById('effect-' + this.currentBgSound);
            if (effectAudio) {
                effectAudio.volume = this.effectVolume;
            }
        }
    }
    /**
     * 볼륨 가져오기
     */
    getVolume() {
        return this.effectVolume;
    }

    /**
     * 현재 재생 중인 효과음
     */
    getCurrentSound() {
        return this.currentBgSound;
    }

    /**
     * 모든 효과음 정지
     */
    stopAll() {
        if (this.currentBgSound) {
            const effectAudio = document.getElementById('effect-' + this.currentBgSound);
            if (effectAudio) {
                effectAudio.pause();
                effectAudio.currentTime = 0;
            }
            this.currentBgSound = null;
        }

        // 모든 버튼 비활성화
        const buttons = document.querySelectorAll('.bg-button');
        buttons.forEach(btn => btn.classList.remove('active'));

        console.log('🔇 모든 효과음 정지');
    }

    /**
     * 상태 가져오기
     */
    getStatus() {
        return {
            currentSound: this.currentBgSound,
            isPlaying: this.currentBgSound !== null,
            volume: this.effectVolume
        };
    }

    /**
     * 정리
     */
    cleanup() {
        this.stopAll();

        // 모든 효과음 요소 제거
        const effectAudios = document.querySelectorAll('[id^="effect-"]');
        effectAudios.forEach(audio => {
            audio.pause();
            audio.src = '';
            audio.remove();
        });

        console.log('🔊 EffectSoundManager 정리 완료');
    }
}

// 전역 등록
window.EffectSoundManager = EffectSoundManager;
