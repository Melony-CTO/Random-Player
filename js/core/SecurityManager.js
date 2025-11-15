/**
 * SecurityManager - 보안 기능 관리
 * 
 * 📖 사용 방법:
 * 
 * 1. 개발 중 (모든 보안 기능 끔):
 *    new SecurityManager({ enabled: false });
 * 
 * 2. 배포 시 (모든 보안 기능 켬):
 *    new SecurityManager({ enabled: true });
 * 
 * 3. 브라우저 콘솔에서 긴급 해제:
 *    window.melonyPlayer.securityManager.disableAllSecurity();
 * 
 * 4. 콘솔 로그만 토글:
 *    window.melonyPlayer.securityManager.toggleConsoleLog();
 * 
 * 5. 전체 보안 켜기:
 *    window.melonyPlayer.securityManager.enableAllSecurity();
 */
class SecurityManager {
    constructor(options = {}) {
        // 🔒 전체 활성화 플래그 (이것만 바꾸면 모든 보안 ON/OFF)
        this.enabled = options.enabled ?? false;  // 기본: false (개발 모드)

        // ✅ 개별 설정
        this.config = {
            blockRightClick: options.blockRightClick ?? true,      // 우클릭 차단
            blockF12Key: options.blockF12Key ?? true,              // F12 키만 차단
            blockConsoleLog: options.blockConsoleLog ?? false,     // 콘솔 로그 완전 차단 (false 권장)
            obfuscateConsoleLog: options.obfuscateConsoleLog ?? true,  // 콘솔 URL 난독화 (true 권장)
            blockSelection: options.blockSelection ?? true,        // 텍스트 선택 차단
            blockDragDrop: options.blockDragDrop ?? true,          // 드래그 앤 드롭 차단
            blockScreenshot: options.blockScreenshot ?? false,     // 스크린샷 차단 (실험적)
            showWarning: options.showWarning ?? true,              // 경고 메시지 표시
        };

        // 원본 console 메서드 백업
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
        };

        this.init();
    }

    init() {
        if (!this.enabled) {
            console.log('🔓 SecurityManager 비활성화 (개발 모드)');
            return;
        }

        console.log('🔒 SecurityManager 활성화');
        
        if (this.config.blockRightClick) {
            this.blockRightClick();
        }

        if (this.config.blockF12Key) {
            this.blockF12Key();
        }

        if (this.config.blockConsoleLog) {
            this.disableConsoleLog();
        } else if (this.config.obfuscateConsoleLog) {
            this.obfuscateConsoleLog();
        }

        if (this.config.blockSelection) {
            this.blockTextSelection();
        }

        if (this.config.blockDragDrop) {
            this.blockDragAndDrop();
        }

        if (this.config.blockScreenshot) {
            this.blockScreenshots();
        }

        console.log('🔒 보안 설정:', this.config);
    }

    /**
     * 우클릭 차단
     */
    blockRightClick() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.config.showWarning) {
                this.showWarningMessage('우클릭이 비활성화되어 있습니다.');
            }
            return false;
        });
        console.log('🔒 우클릭 차단 활성화');
    }

    /**
     * 개발자 도구 차단
     */
    /**
     * F12 키만 차단 (개발자도구는 다른 방법으로 열 수 있음)
     */
    blockF12Key() {
        document.addEventListener('keydown', (e) => {
            // F12만 차단
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
                if (this.config.showWarning) {
                    this.showWarningMessage('F12 키가 비활성화되어 있습니다.');
                }
                return false;
            }
        });

        console.log('🔒 F12 키 차단 활성화');
    }

    /**
     * 콘솔 로그 비활성화
     */
    disableConsoleLog() {
        console.log = function() {};
        console.warn = function() {};
        console.error = function() {};
        console.info = function() {};
        console.debug = function() {};
        
        console.log('🔒 콘솔 로그 비활성화 (이 메시지 이후부터)');
    }

    /**
     * 콘솔 로그에서 민감한 URL 숨기기
     */
    obfuscateConsoleLog() {
        const self = this;
        
        // URL 패턴 정의
        const urlPatterns = [
            {
                pattern: /https?:\/\/melony-music-api\.zepplinn25\.workers\.dev\/file/g,
                replacement: 'melony_music'
            },
            {
                pattern: /https?:\/\/pub-4ecc0eaab30e42b999c67761f4c6f549\.r2\.dev/g,
                replacement: 'melony_music'
            },
            {
                pattern: /blob:https?:\/\/[^\/]+/g,
                replacement: 'blob:local'
            }
        ];

        // URL을 난독화하는 함수
        const obfuscateText = (text) => {
            if (typeof text !== 'string') return text;
            
            let result = text;
            urlPatterns.forEach(({ pattern, replacement }) => {
                result = result.replace(pattern, replacement);
            });
            return result;
        };

        // 인자들을 난독화
        const obfuscateArgs = (args) => {
            return Array.from(args).map(arg => {
                if (typeof arg === 'string') {
                    return obfuscateText(arg);
                } else if (typeof arg === 'object' && arg !== null) {
                    return JSON.parse(obfuscateText(JSON.stringify(arg)));
                }
                return arg;
            });
        };

        // console.log 래핑
        console.log = function(...args) {
            self.originalConsole.log.apply(console, obfuscateArgs(args));
        };

        // console.warn 래핑
        console.warn = function(...args) {
            self.originalConsole.warn.apply(console, obfuscateArgs(args));
        };

        // console.error 래핑
        console.error = function(...args) {
            self.originalConsole.error.apply(console, obfuscateArgs(args));
        };

        // console.info 래핑
        console.info = function(...args) {
            self.originalConsole.info.apply(console, obfuscateArgs(args));
        };

        // console.debug 래핑
        console.debug = function(...args) {
            self.originalConsole.debug.apply(console, obfuscateArgs(args));
        };

        console.log('🔒 콘솔 URL 난독화 활성화');
        console.log('✅ 테스트: https://melony-music-api.zepplinn25.workers.dev/file/pop/test.mp3');
        console.log('✅ 테스트: https://pub-4ecc0eaab30e42b999c67761f4c6f549.r2.dev/kpop/test.m4a');
    }

    /**
     * 콘솔 로그 복구
     */
    enableConsoleLog() {
        console.log = this.originalConsole.log;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        console.info = this.originalConsole.info;
        console.debug = this.originalConsole.debug;
        
        console.log('✅ 콘솔 로그 복구');
    }

    /**
     * 텍스트 선택 차단
     */
    blockTextSelection() {
        document.addEventListener('selectstart', (e) => {
            e.preventDefault();
            return false;
        });

        // CSS로도 적용
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
            }
            input, textarea {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);

        console.log('🔒 텍스트 선택 차단 활성화');
    }

    /**
     * 드래그 앤 드롭 차단
     */
    blockDragAndDrop() {
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
            return false;
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            return false;
        });

        console.log('🔒 드래그 앤 드롭 차단 활성화');
    }

    /**
     * 스크린샷 차단 (실험적)
     */
    blockScreenshots() {
        // Print Screen 키 감지
        document.addEventListener('keyup', (e) => {
            if (e.key === 'PrintScreen') {
                navigator.clipboard.writeText('');
                if (this.config.showWarning) {
                    this.showWarningMessage('스크린샷이 차단되었습니다.');
                }
            }
        });

        // 페이지 블러 처리 (다른 창으로 전환 시)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                document.body.style.filter = 'blur(5px)';
            } else {
                document.body.style.filter = 'none';
            }
        });

        console.log('🔒 스크린샷 차단 활성화 (실험적)');
    }

    /**
     * 경고 메시지 표시
     */
    showWarningMessage(message) {
        // 중복 표시 방지
        if (document.getElementById('security-warning')) return;

        const warning = document.createElement('div');
        warning.id = 'security-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            z-index: 999999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        warning.textContent = '🔒 ' + message;

        // 애니메이션 추가
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(warning);

        // 3초 후 자동 제거
        setTimeout(() => {
            warning.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.parentNode.removeChild(warning);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 설정 변경
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🔒 보안 설정 업데이트:', this.config);
    }

    /**
     * 콘솔 로그 토글 (개발 시 유용)
     */
    toggleConsoleLog() {
        if (this.config.blockConsoleLog) {
            this.enableConsoleLog();
            this.config.blockConsoleLog = false;
        } else {
            this.disableConsoleLog();
            this.config.blockConsoleLog = true;
        }
    }

    /**
     * 모든 보안 기능 활성화 (배포 시)
     */
    enableAllSecurity() {
        this.enabled = true;
        this.config = {
            blockRightClick: true,
            blockF12Key: true,
            blockConsoleLog: true,
            blockSelection: true,
            blockDragDrop: true,
            blockScreenshot: false,
            showWarning: true
        };
        
        // 페이지 새로고침 필요
        console.log('✅ 모든 보안 기능 활성화됨 (페이지 새로고침 권장)');
        
        if (confirm('보안 기능을 활성화했습니다.\n페이지를 새로고침하시겠습니까?')) {
            window.location.reload();
        }
    }

    /**
     * 모든 보안 기능 해제 (긴급)
     */
    disableAllSecurity() {
        this.enabled = false;
        this.config = {
            blockRightClick: false,
            blockF12Key: false,
            blockConsoleLog: false,
            blockSelection: false,
            blockDragDrop: false,
            blockScreenshot: false,
            showWarning: false
        };
        this.enableConsoleLog();
        console.log('⚠️ 모든 보안 기능 해제됨 (페이지 새로고침 권장)');
        
        if (confirm('보안 기능을 해제했습니다.\n페이지를 새로고침하시겠습니까?')) {
            window.location.reload();
        }
    }
}

// 전역 등록
window.SecurityManager = SecurityManager;

// 보안 기능 전체 OFF : 브라우저 콘솔에서 실행:
// window.melonyPlayer.securityManager.disableAllSecurity();