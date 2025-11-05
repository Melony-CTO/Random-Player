
/**
 * EffectSoundManager - 효과음(배경음) 재생 관리 모듈
 * 배경음 재생, 효과음 볼륨 조절 등을 담당
 */
class EffectSoundManager {
    constructor(audioManager, api) {
        this.audioManager = audioManager;
        this.api = api;
        this.currentBgSound = null;
        this.effectVolume = 1.0;

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
    }

    /**
     * 효과음 볼륨 설정
     * @param {number} volume - 볼륨 (0-1)
     */
    setEffectVolume(volume) {
        this.effectVolume = Math.max(0, Math.min(1, volume));

        // 현재 재생 중인 효과음에 적용
        if (this.currentBgSound) {
            const effectAudio = document.getElementById('effect-' + this.currentBgSound);
            if (effectAudio) {
                effectAudio.volume = this.effectVolume;
                console.log('🔊 효과음 볼륨 설정:', Math.round(this.effectVolume * 100) + '%');
            }
        }

        // AudioManager에도 동기화
        if (this.audioManager) {
            this.audioManager.effectVolume = this.effectVolume;
        }
    }

    /**
     * 효과음 볼륨 가져오기
     * @returns {number} 현재 효과음 볼륨 (0-1)
     */
    getEffectVolume() {
        return this.effectVolume;
    }

    /**
     * 배경음 토글
     * @param {string} soundType - 효과음 타입
     */
    toggleBgSound(soundType) {
        try {
            console.log('🔊 배경음 토글:', soundType);

            const actualFileName = this.soundFileMap[soundType] || (soundType + '.m4a');
            let effectAudio = document.getElementById('effect-' + soundType);

            // 오디오 요소가 없으면 생성
            if (!effectAudio) {
                effectAudio = document.createElement('audio');
                effectAudio.id = 'effect-' + soundType;
                effectAudio.loop = true;
                effectAudio.preload = 'none';
                effectAudio.crossOrigin = 'anonymous';
                effectAudio.src = this.api.buildUrl(`/file/effects/${encodeURIComponent(actualFileName)}`);
                document.body.appendChild(effectAudio);
                console.log('🔊 효과음 요소 생성:', soundType);
            }

            // 다른 효과음이 재생 중이면 정지
            if (this.currentBgSound && this.currentBgSound !== soundType) {
                const currentEffectAudio = document.getElementById('effect-' + this.currentBgSound);
                if (currentEffectAudio) {
                    currentEffectAudio.pause();
                    currentEffectAudio.currentTime = 0;
                    console.log('🔊 기존 효과음 정지:', this.currentBgSound);
                }
            }

            // 같은 효과음이면 토글 (정지)
            if (this.currentBgSound === soundType) {
                effectAudio.pause();
                effectAudio.currentTime = 0;
                this.currentBgSound = null;

                // AudioManager에도 동기화
                if (this.audioManager) {
                    this.audioManager.currentBgSound = null;
                }

                console.log('🔊 효과음 정지:', soundType);
                return null;
            }

            // 새 효과음 재생
            effectAudio.volume = this.effectVolume;
            effectAudio.loop = true;

            return effectAudio.play()
                .then(() => {
                    this.currentBgSound = soundType;

                    // AudioManager에도 동기화
                    if (this.audioManager) {
                        this.audioManager.currentBgSound = soundType;
                    }

                    console.log('✅ 효과음 재생:', soundType);
                    return soundType;
                })
                .catch(error => {
                    console.error('❌ 효과음 재생 실패:', error);
                    throw error;
                });

        } catch (error) {
            console.error('배경음 토글 오류:', error);
            throw error;
        }
    }

    /**
     * 현재 재생 중인 배경음 가져오기
     * @returns {string|null} 현재 배경음 타입
     */
    getCurrentBgSound() {
        return this.currentBgSound;
    }

    /**
     * 모든 효과음 정지
     */
    stopAllEffects() {
        if (this.currentBgSound) {
            const effectAudio = document.getElementById('effect-' + this.currentBgSound);
            if (effectAudio) {
                effectAudio.pause();
                effectAudio.currentTime = 0;
            }
            this.currentBgSound = null;

            // AudioManager에도 동기화
            if (this.audioManager) {
                this.audioManager.currentBgSound = null;
            }

            console.log('🔊 모든 효과음 정지');
        }
    }

    /**
     * 효과음 상태 가져오기
     * @returns {Object} 상태 정보
     */
    getStatus() {
        return {
            currentBgSound: this.currentBgSound,
            effectVolume: this.effectVolume,
            isPlaying: this.currentBgSound !== null
        };
    }

    /**
     * 정리
     */
    cleanup() {
        this.stopAllEffects();

        // 모든 효과음 요소 제거
        Object.keys(this.soundFileMap).forEach(soundType => {
            const effectAudio = document.getElementById('effect-' + soundType);
            if (effectAudio) {
                effectAudio.pause();
                effectAudio.remove();
            }
        });

        console.log('🔊 EffectSoundManager 정리 완료');
    }
}

// 전역으로 내보내기
window.EffectSoundManager = EffectSoundManager;