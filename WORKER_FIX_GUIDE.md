# 🔧 Worker.js 수정 가이드 - Ambient 카테고리 디버깅

## 📊 현재 상황

### ✅ 프론트엔드 (완료)
- **index.html:166** - Ambient 버튼 추가됨
- **main.js:218-221** - Ambient 플레이리스트 로딩 로직 구현
- **main.js:266-274** - Ambient 데이터 처리 로직 구현
- **main.js:191-193** - Ambient 커버 로딩 로직 구현
- **PlaylistManager.js:15** - `shuffledTracks.ambient` 추가됨
- **PlaylistManager.js:63-66** - Ambient 트랙 필터링 로직 구현

### ❌ 백엔드 (문제)
- **R2 직접 접근** - `https://pub-4ecc0eaab30e42b999c67761f4c6f549.r2.dev/playlist-ambient.json` → ✅ 작동
- **Workers API** - `https://melony-music-api.zepplinn25.workers.dev/playlist-ambient.json` → ❌ `{"tracks": []}`

## 🎯 문제 원인

Cloudflare Workers의 `worker.js`에서 `generatePlaylist` 함수가 R2의 Ambient 폴더를 찾지 못함:

1. **경로 문제**: R2 실제 경로가 `Music/Ambient/` 또는 `Ambient/`인지 불명확
2. **한글 파일명**: 한글 파일명 인코딩 문제 (`잔잔한지 01.m4a` 등)
3. **필터링 로직**: `generatePlaylist` 함수가 Ambient 경로를 인식하지 못함

## 🔧 Worker.js 수정 방법

### 1. Cloudflare Workers 대시보드 접속
```
https://dash.cloudflare.com/
→ Workers & Pages
→ melony-music-api
→ Edit Code
```

### 2. `generatePlaylist` 함수 찾기

현재 코드는 아마도 이런 형태일 것입니다:

```javascript
async function generatePlaylist(env, category) {
  const validCategories = {
    'pop': 'Music/pop/',
    'kpop': 'Music/kpop/',
    'lofi-inst': 'Music/lofi-inst/'
  };

  const prefix = validCategories[category];
  if (!prefix) {
    return { tracks: [] };
  }

  // R2에서 파일 목록 가져오기
  const objects = await env.MY_BUCKET.list({ prefix });
  // ...
}
```

### 3. Ambient 카테고리 추가

**수정 후:**

```javascript
async function generatePlaylist(env, category) {
  const validCategories = {
    'pop': 'Music/pop/',
    'kpop': 'Music/kpop/',
    'lofi-inst': 'Music/lofi-inst/',
    'ambient': 'Music/Ambient/'  // ✅ 추가 (대문자 A 주의!)
  };

  const prefix = validCategories[category];
  if (!prefix) {
    console.log(`❌ Invalid category: ${category}`);
    return { tracks: [] };
  }

  console.log(`🔍 Searching R2 with prefix: ${prefix}`);

  // R2에서 파일 목록 가져오기
  const objects = await env.MY_BUCKET.list({ prefix });

  console.log(`📊 Found ${objects.objects.length} files in ${category}`);

  const tracks = [];

  for (const obj of objects.objects) {
    // .m4a, .mp3 파일만 필터링
    if (obj.key.endsWith('.m4a') || obj.key.endsWith('.mp3')) {
      const filename = obj.key.split('/').pop();

      // 한글 파일명 URL 인코딩
      const encodedFilename = encodeURIComponent(filename);

      tracks.push({
        title: filename.replace(/\.[^/.]+$/, ''), // 확장자 제거
        audio: obj.key,
        folder: category,
        size: obj.size,
        uploaded: obj.uploaded
      });
    }
  }

  console.log(`✅ Generated ${tracks.length} tracks for ${category}`);

  return { tracks };
}
```

### 4. 엔드포인트 핸들러 확인

`/playlist-ambient.json` 엔드포인트가 제대로 연결되어 있는지 확인:

```javascript
// worker.js의 fetch 핸들러에서
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

### 5. 디버깅 로그 추가

더 자세한 디버깅을 위해 로그 추가:

```javascript
async function generatePlaylist(env, category) {
  console.log(`🎵 generatePlaylist called with category: ${category}`);

  const validCategories = {
    'pop': 'Music/pop/',
    'kpop': 'Music/kpop/',
    'lofi-inst': 'Music/lofi-inst/',
    'ambient': 'Music/Ambient/'
  };

  const prefix = validCategories[category];

  if (!prefix) {
    console.error(`❌ Unknown category: ${category}`);
    console.log('📋 Available categories:', Object.keys(validCategories));
    return { tracks: [] };
  }

  console.log(`🔍 Listing R2 objects with prefix: "${prefix}"`);

  try {
    const objects = await env.MY_BUCKET.list({
      prefix,
      limit: 1000
    });

    console.log(`📦 R2 list result:`, {
      objectCount: objects.objects.length,
      truncated: objects.truncated,
      prefix: prefix
    });

    // 처음 5개 파일만 로그 (디버깅용)
    objects.objects.slice(0, 5).forEach(obj => {
      console.log(`  - ${obj.key} (${obj.size} bytes)`);
    });

    const tracks = [];

    for (const obj of objects.objects) {
      if (obj.key.endsWith('.m4a') || obj.key.endsWith('.mp3')) {
        const filename = obj.key.split('/').pop();

        tracks.push({
          title: filename.replace(/\.[^/.]+$/, ''),
          audio: obj.key,
          folder: category,
          size: obj.size
        });
      }
    }

    console.log(`✅ Successfully generated ${tracks.length} tracks for ${category}`);

    return {
      tracks,
      _debug: {
        totalFiles: objects.objects.length,
        audioFiles: tracks.length,
        prefix: prefix
      }
    };

  } catch (error) {
    console.error(`❌ Error listing R2 objects:`, error);
    return {
      tracks: [],
      error: error.message
    };
  }
}
```

## 🧪 테스트 방법

### 1. Worker 배포 후 테스트

```bash
# 브라우저에서 직접 접속
https://melony-music-api.zepplinn25.workers.dev/playlist-ambient.json
```

예상 결과:
```json
{
  "tracks": [
    {
      "title": "잔잔한지 01",
      "audio": "Music/Ambient/잔잔한지 01.m4a",
      "folder": "ambient",
      "size": 8234567
    },
    ...
  ]
}
```

### 2. Cloudflare Workers 로그 확인

```
Cloudflare Dashboard
→ Workers & Pages
→ melony-music-api
→ Logs (Real-time)
```

로그에서 다음을 확인:
- `🎵 generatePlaylist called with category: ambient`
- `🔍 Listing R2 objects with prefix: "Music/Ambient/"`
- `📦 R2 list result: { objectCount: X, ... }`
- `✅ Successfully generated X tracks for ambient`

### 3. R2 경로 확인

만약 `objectCount: 0`이 나온다면, R2 실제 경로를 확인:

```
Cloudflare Dashboard
→ R2
→ YOUR_BUCKET
→ Browse files
```

**경로 가능성:**
- `Music/Ambient/` (대문자 A)
- `Music/ambient/` (소문자 a)
- `Ambient/` (Music 폴더 없음)
- `ambient/` (Music 폴더 없음, 소문자)

경로를 확인한 후 `validCategories`의 `ambient` 값을 정확한 경로로 수정하세요.

## 🔍 경로 자동 감지 코드 (선택사항)

경로가 불확실한 경우, 이 코드를 사용해 자동으로 찾을 수 있습니다:

```javascript
async function findAmbientPath(env) {
  const possiblePaths = [
    'Music/Ambient/',
    'Music/ambient/',
    'Ambient/',
    'ambient/'
  ];

  for (const path of possiblePaths) {
    console.log(`🔍 Trying path: ${path}`);
    const result = await env.MY_BUCKET.list({ prefix: path, limit: 1 });

    if (result.objects.length > 0) {
      console.log(`✅ Found Ambient files at: ${path}`);
      return path;
    }
  }

  console.log(`❌ No Ambient files found in any path`);
  return null;
}

// generatePlaylist 함수에서 사용:
async function generatePlaylist(env, category) {
  if (category === 'ambient') {
    const ambientPath = await findAmbientPath(env);
    if (!ambientPath) {
      return { tracks: [], error: 'Ambient path not found' };
    }
    prefix = ambientPath;
  } else {
    // 기존 로직...
  }
  // ...
}
```

## 📝 체크리스트

- [ ] Cloudflare Workers 대시보드 접속
- [ ] worker.js 파일 열기
- [ ] `generatePlaylist` 함수에 `ambient: 'Music/Ambient/'` 추가
- [ ] `/playlist-ambient.json` 엔드포인트 확인
- [ ] 디버깅 로그 추가
- [ ] Worker 저장 및 배포 (Save and Deploy)
- [ ] `https://melony-music-api.zepplinn25.workers.dev/playlist-ambient.json` 테스트
- [ ] Cloudflare Workers 로그 확인
- [ ] R2 경로 확인 (필요 시)
- [ ] 프론트엔드에서 Ambient 버튼 클릭 테스트

## 🚀 배포 후 확인

1. **API 응답 확인**
   ```bash
   curl https://melony-music-api.zepplinn25.workers.dev/playlist-ambient.json
   ```

2. **프론트엔드 테스트**
   - Melony Player 열기
   - Ambient 버튼 클릭
   - 브라우저 콘솔 확인 (F12)
   - 음악 재생 확인

3. **브라우저 콘솔 로그 확인**
   ```
   ✅ Ambient 카테고리 데이터 설정 완료: X곡
   ```

## 🆘 문제 해결

### 문제 1: 여전히 빈 배열 반환

**원인**: R2 경로가 틀렸을 가능성
**해결**: R2 대시보드에서 실제 경로 확인 후 수정

### 문제 2: 한글 파일명이 깨짐

**원인**: URL 인코딩 문제
**해결**:
```javascript
const encodedFilename = encodeURIComponent(filename);
const audioUrl = `${baseUrl}/${prefix}${encodedFilename}`;
```

### 문제 3: 일부 파일만 로드됨

**원인**: R2 list 결과가 잘렸음 (truncated: true)
**해결**:
```javascript
const objects = await env.MY_BUCKET.list({
  prefix,
  limit: 1000  // 기본값 1000으로 증가
});
```

## 📞 추가 도움이 필요한 경우

Worker.js 전체 코드를 공유해주시면 더 정확한 수정 사항을 안내드릴 수 있습니다.
