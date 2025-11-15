# 🚀 배포 체크리스트 - Melony Music Player

## 📅 2025-01-15 배포 준비

### ✅ 완료된 작업 (2025-01-14)

1. **SecurityManager 구현** ✅
   - `js/core/SecurityManager.js` 생성
   - 우클릭, F12, URL 난독화, 텍스트 선택 차단 구현
   - main.js에 통합 (`enabled: true`)

2. **Ambient 카테고리 프론트엔드** ✅
   - index.html에 Ambient 버튼 추가
   - PlaylistManager에 ambient 지원 추가
   - main.js에 Ambient 로딩 로직 추가
   - CoverManager에 Ambient 커버 로딩 추가

---

## 🔴 우선순위 1: Ambient 카테고리 완성

### 현재 상태
- ✅ 프론트엔드: 완료
- ❌ 백엔드: Workers API에서 빈 배열 반환

### 해결 방법
Cloudflare Workers의 `worker.js` 수정 필요

#### 1단계: Cloudflare Workers 대시보드 접속
```
https://dash.cloudflare.com/
→ Workers & Pages
→ melony-music-api
→ Edit Code
```

#### 2단계: generatePlaylist 함수 수정
**수정 전**:
```javascript
const validCategories = {
  'pop': 'Music/pop/',
  'kpop': 'Music/kpop/',
  'lofi-inst': 'Music/lofi-inst/'
};
```

**수정 후**:
```javascript
const validCategories = {
  'pop': 'Music/pop/',
  'kpop': 'Music/kpop/',
  'lofi-inst': 'Music/lofi-inst/',
  'ambient': 'Music/Ambient/'  // ✅ 추가
};
```

#### 3단계: 엔드포인트 확인
`/playlist-ambient.json` 엔드포인트가 있는지 확인:

```javascript
if (url.pathname === '/playlist-ambient.json') {
  const playlist = await generatePlaylist(env, 'ambient');
  return new Response(JSON.stringify(playlist), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
```

#### 4단계: 배포 및 테스트
- [ ] Worker 저장 및 배포 (Save and Deploy)
- [ ] API 테스트: `https://melony-music-api.zepplinn25.workers.dev/playlist-ambient.json`
- [ ] 예상 결과: `{"tracks": [...]}` (빈 배열 아님)
- [ ] Cloudflare Workers 로그 확인
- [ ] 프론트엔드에서 Ambient 버튼 클릭 → 음악 재생 확인

**상세 가이드**: `WORKER_FIX_GUIDE.md` 참조

---

## 🔐 우선순위 2: SecurityManager 테스트

### 브라우저 테스트 체크리스트

#### 기본 기능 테스트
- [ ] 우클릭 시도 → 차단 + 경고 메시지
- [ ] F12 키 누르기 → 차단 + 경고 메시지
- [ ] Ctrl+Shift+I → 개발자 도구 정상 작동 ✅
- [ ] 텍스트 선택 시도 → 차단
- [ ] 드래그 앤 드롭 시도 → 차단

#### URL 난독화 테스트
1. Ctrl+Shift+I로 콘솔 열기
2. 곡 재생 시작
3. 콘솔 로그 확인:
   - [ ] URL이 `melony_music`으로 표시됨
   - [ ] 실제 API URL이 보이지 않음

**예상 로그**:
```
🎵 오디오 URL: melony_music
✅ 트랙 로드 완료: Song Title
```

**잘못된 로그 (수정 필요)**:
```
❌ https://melony-music-api.zepplinn25.workers.dev/file/pop/song.mp3
```

#### Network 탭 확인
- [ ] Network 탭 열기
- [ ] 곡 재생 시작
- [ ] 실제 API 호출은 여전히 보임 (정상 - 이건 차단 불가)
- [ ] 하지만 Console 로그에는 난독화된 URL만 표시되는지 확인

### 런타임 제어 테스트
콘솔에서 다음 명령어 실행:

```javascript
// 현재 설정 확인
window.melonyPlayer.securityManager.config

// 콘솔 로그 복구 (난독화 해제)
window.melonyPlayer.securityManager.enableConsoleLog()

// 모든 보안 해제
window.melonyPlayer.securityManager.disableAllSecurity()
```

**상세 가이드**: `SECURITY_STATUS.md` 참조

---

## 📦 배포 전 최종 확인

### 1. 코드 검증
- [ ] `git status` 실행 - 모든 변경사항 커밋됨
- [ ] 불필요한 console.log 제거 (선택)
- [ ] TODO 주석 확인 및 제거

### 2. 기능 테스트
- [ ] POP 카테고리 재생
- [ ] KPOP 카테고리 재생
- [ ] LOFI-INST 카테고리 재생
- [ ] Ambient 카테고리 재생 ← **중요**
- [ ] PC (로컬 파일) 재생
- [ ] 배경음 기능 (Rain, Bird, etc.)
- [ ] 이퀄라이저 기능
- [ ] 비주얼라이저 작동
- [ ] YouTube 영상 표시 (PC 카테고리)

### 3. 보안 기능 확인
- [ ] SecurityManager 활성화 (`enabled: true`)
- [ ] URL 난독화 작동
- [ ] 우클릭 차단 작동
- [ ] F12 차단 작동

### 4. 성능 확인
- [ ] 페이지 로딩 속도 (<3초)
- [ ] 곡 전환 속도 (<1초)
- [ ] 커버 이미지 로딩
- [ ] 메모리 누수 없음 (장시간 재생 테스트)

### 5. 브라우저 호환성
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (Mac/iOS)
- [ ] 모바일 Chrome
- [ ] 모바일 Safari

### 6. API 엔드포인트 확인
- [ ] `https://melony-music-api.zepplinn25.workers.dev/playlist-pop.json`
- [ ] `https://melony-music-api.zepplinn25.workers.dev/playlist-kpop.json`
- [ ] `https://melony-music-api.zepplinn25.workers.dev/playlist-lofi-inst.json`
- [ ] `https://melony-music-api.zepplinn25.workers.dev/playlist-ambient.json` ← **중요**
- [ ] `https://melony-music-api.zepplinn25.workers.dev/cover-pop.json`
- [ ] `https://melony-music-api.zepplinn25.workers.dev/cover-kpop.json`
- [ ] `https://melony-music-api.zepplinn25.workers.dev/cover-lofi-inst.json`
- [ ] `https://melony-music-api.zepplinn25.workers.dev/cover-ambient.json`

---

## 🔄 Git 커밋 및 푸시

### 커밋 메시지 예시

```bash
# Ambient 카테고리 완성 (worker.js 수정 후)
git add .
git commit -m "feat: Add Ambient category support

- Add Ambient button in index.html
- Add Ambient playlist loading in main.js
- Add Ambient cover loading in CoverManager
- Update PlaylistManager to support ambient category
- Fix worker.js to generate playlist-ambient.json

Closes: Ambient category implementation"

# SecurityManager 통합
git add .
git commit -m "feat: Implement SecurityManager for content protection

- Create SecurityManager.js with multiple security features
- Add right-click blocking
- Add F12 key blocking (Ctrl+Shift+I still works)
- Add console log URL obfuscation
- Add text selection blocking
- Add drag-and-drop blocking
- Integrate SecurityManager in main.js with enabled: true

Security features:
- URL masking: API URLs shown as 'melony_music' in console
- User can still use browser DevTools via Ctrl+Shift+I
- Runtime control via window.melonyPlayer.securityManager

Closes: Security implementation"
```

### 푸시

```bash
# 현재 브랜치 확인
git branch

# 푸시
git push -u origin claude/debug-ambient-category-019crkG88agEiYJ4fEYtYhTb
```

---

## 📝 배포 후 모니터링

### Cloudflare 대시보드 확인

#### Workers 상태
```
Cloudflare Dashboard
→ Workers & Pages
→ melony-music-api
→ Metrics
```

확인 사항:
- [ ] 요청 수 (Requests)
- [ ] 성공률 (Success Rate) > 95%
- [ ] 에러 로그 (Errors) = 0
- [ ] CPU Time

#### R2 사용량
```
Cloudflare Dashboard
→ R2
→ YOUR_BUCKET
→ Metrics
```

확인 사항:
- [ ] 저장 용량 (< 10GB 무료)
- [ ] 데이터 전송량
- [ ] 요청 수

### 브라우저 콘솔 모니터링

프론트엔드 로그 확인:
```
✅ Melony Player 초기화 완료! XXXms
✅ POP 카테고리 데이터 설정 완료: XX곡
✅ KPOP 카테고리 데이터 설정 완료: XX곡
✅ LOFI-INST 카테고리 데이터 설정 완료: XX곡
✅ Ambient 카테고리 데이터 설정 완료: XX곡  ← 중요!
```

에러가 있다면:
```
❌ Ambient 플레이리스트 로드 실패 → 기본값 사용
```
→ worker.js 수정 필요

---

## 🐛 알려진 이슈 및 해결 방법

### 이슈 1: Ambient 플레이리스트 빈 배열
**증상**: `{"tracks": []}`
**원인**: worker.js가 R2에서 Ambient 파일을 찾지 못함
**해결**: `WORKER_FIX_GUIDE.md` 참조

### 이슈 2: SecurityManager 작동 안함
**증상**: 우클릭/F12가 차단되지 않음
**원인**: `enabled: false`
**해결**: main.js:147에서 `enabled: true`로 변경

### 이슈 3: URL이 콘솔에 그대로 표시됨
**증상**: `https://melony-music-api...` 표시
**원인**: `obfuscateConsoleLog: false`
**해결**: main.js:151에서 `obfuscateConsoleLog: true`로 변경

### 이슈 4: 한글 파일명 오류
**증상**: 404 Not Found
**원인**: URL 인코딩 문제
**해결**: worker.js에서 `encodeURIComponent()` 사용

---

## 📊 최종 체크리스트

### 프론트엔드
- [x] index.html - Ambient 버튼 추가
- [x] main.js - Ambient 로딩 로직 추가
- [x] PlaylistManager.js - ambient 지원 추가
- [x] SecurityManager.js - 보안 기능 구현
- [x] main.js - SecurityManager 통합 (`enabled: true`)

### 백엔드 (Cloudflare Workers)
- [ ] worker.js - Ambient 카테고리 추가 ← **작업 필요**
- [ ] worker.js - `/playlist-ambient.json` 엔드포인트 추가
- [ ] R2 경로 확인 (`Music/Ambient/` vs `Ambient/`)

### 테스트
- [ ] Ambient 음악 재생 확인
- [ ] SecurityManager 기능 확인
- [ ] 모든 카테고리 재생 확인
- [ ] 브라우저 호환성 확인

### 배포
- [ ] Git 커밋
- [ ] Git 푸시
- [ ] Cloudflare Workers 배포
- [ ] API 엔드포인트 테스트
- [ ] 프로덕션 환경 테스트

---

## 🎯 다음 단계

1. **Ambient 카테고리 완성** (우선순위 1)
   - Cloudflare Workers 수정
   - API 테스트
   - 프론트엔드 테스트

2. **SecurityManager 테스트** (우선순위 2)
   - 브라우저 테스트
   - URL 난독화 확인
   - 런타임 제어 테스트

3. **최종 배포**
   - Git 커밋 및 푸시
   - 프로덕션 모니터링
   - 사용자 피드백 수집

---

## 📞 문제 발생 시

1. **Cloudflare Workers 로그 확인**
   ```
   Dashboard → Workers → melony-music-api → Logs
   ```

2. **브라우저 콘솔 확인**
   ```
   Ctrl+Shift+I → Console 탭
   ```

3. **Network 탭 확인**
   ```
   Ctrl+Shift+I → Network 탭
   ```

4. **긴급 보안 해제**
   ```javascript
   window.melonyPlayer.securityManager.disableAllSecurity()
   ```

---

## ✅ 배포 승인 조건

다음 조건이 모두 충족되면 배포 가능:

- [ ] Ambient 카테고리 음악 재생 성공
- [ ] SecurityManager 정상 작동
- [ ] 모든 카테고리 재생 확인
- [ ] 에러 로그 0개
- [ ] 브라우저 호환성 확인
- [ ] API 응답 시간 < 500ms

**배포 예정일**: 2025-01-15
**배포 담당자**: Melony-CTO
**검증자**: QA Team
