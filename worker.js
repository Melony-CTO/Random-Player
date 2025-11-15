export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 🔥 CORS 헤더 - 모든 응답에 필수!
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range, Accept-Ranges, Origin, X-Requested-With',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Accept-Ranges': 'bytes'
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // R2 바인딩 찾기
      let bucket = null;
      const possibleNames = ['MELONY_BUCKET', 'MUSIC_BUCKET', 'BUCKET'];

      for (const name of possibleNames) {
        if (env[name]) {
          bucket = env[name];
          console.log(`✅ R2 바인딩 발견: ${name}`);
          break;
        }
      }

      if (!bucket) {
        return new Response('R2 binding not configured', {
          status: 500,
          headers: corsHeaders
        });
      }

      // 🔥 플레이리스트 엔드포인트
      if (path === '/playlist-kpop.json') {
        const playlist = await generatePlaylist(bucket, 'kpop');
        return new Response(JSON.stringify({ tracks: playlist }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
        });
      }

      if (path === '/playlist-pop.json') {
        const playlist = await generatePlaylist(bucket, 'pop');
        return new Response(JSON.stringify({ tracks: playlist }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
        });
      }

      if (path === '/playlist-lofi-inst.json') {
        const playlist = await generatePlaylist(bucket, 'lofi-inst');
        return new Response(JSON.stringify({ tracks: playlist }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
        });
      }

      // ✅ Ambient 플레이리스트 엔드포인트 (수정됨)
      if (path === '/playlist-ambient.json') {
        console.log('🔍 Ambient 플레이리스트 요청');
        const playlist = await generatePlaylist(bucket, 'ambient');
        console.log(`✅ Ambient 플레이리스트 생성 완료: ${playlist.length}곡`);

        return new Response(JSON.stringify({ tracks: playlist }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
        });
      }

      // 🔥 커버 리스트 엔드포인트 (수정됨)
      if (path === '/coverlist-pop.json') {
        console.log('🖼️ POP/KPOP 커버 리스트 요청');
        const covers = await generateCoverList(bucket, 'pop-covers');
        console.log(`✅ 커버 ${covers.length}개 발견`);
        return new Response(JSON.stringify({ covers }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
        });
      }

      if (path === '/coverlist-lofi.json' || path === '/coverlist-lofi-inst.json') {
        console.log('🖼️ LOFI 커버 리스트 요청');
        const covers = await generateCoverList(bucket, 'covers');
        console.log(`✅ 커버 ${covers.length}개 발견`);
        return new Response(JSON.stringify({ covers }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
        });
      }

      // ✅ Ambient 커버 리스트 엔드포인트 (추가됨)
      if (path === '/coverlist-ambient.json') {
        console.log('🖼️ Ambient 커버 리스트 요청');
        const covers = await generateCoverList(bucket, 'ambient-covers');
        console.log(`✅ Ambient 커버 ${covers.length}개 발견`);
        return new Response(JSON.stringify({ covers }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
        });
      }

      // 🔥 파일 서빙 - HTML이 요청하는 /file/ 경로
      if (path.startsWith('/file/')) {
        let filePath = path.replace('/file/', '');
        console.log('📁 파일 요청:', filePath);

        let object = await findFile(bucket, filePath);

        if (!object) {
          console.log('❌ 파일을 찾을 수 없음:', filePath);
          return new Response('File not found: ' + filePath, {
            status: 404,
            headers: corsHeaders
          });
        }

        console.log('✅ 파일 발견:', object.key);

        const contentType = getContentType(filePath);
        const isAudio = contentType.startsWith('audio/');

        const responseHeaders = {
          ...corsHeaders,
          'Content-Type': contentType,
          'Content-Length': object.size,
          'Cache-Control': 'public, max-age=31536000'
        };

        if (isAudio) {
          responseHeaders['Accept-Ranges'] = 'bytes';
          responseHeaders['Content-Disposition'] = 'inline';
        }

        return new Response(object.body, { headers: responseHeaders });
      }

      // 기존 /list 엔드포인트 유지 (수정됨)
      if (path === '/list') {
        const [popPlaylist, lofiPlaylist, kpopPlaylist, ambientPlaylist] = await Promise.all([
          generatePlaylist(bucket, 'pop'),
          generatePlaylist(bucket, 'lofi-inst'),
          generatePlaylist(bucket, 'kpop'),
          generatePlaylist(bucket, 'ambient')  // ✅ 수정됨
        ]);

        return new Response(JSON.stringify({
          pop: popPlaylist,
          'lofi-inst': lofiPlaylist,
          'kpop': kpopPlaylist,
          'ambient': ambientPlaylist
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 헬스체크
      if (path === '/' || path === '/health') {
        return new Response(JSON.stringify({
          service: 'Melony Music API',
          status: 'R2 connected',
          cors: 'enabled',
          timestamp: new Date().toISOString()
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('API 오류:', error);
      return new Response(`Error: ${error.message}`, {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

// 🔥 MIME 타입 함수
function getContentType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const mimeTypes = {
    'm4a': 'audio/x-m4a',
    'mp3': 'audio/mpeg',
    'aac': 'audio/aac',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'json': 'application/json'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// 🔥 폴더 매핑 정의 (추가됨)
const FOLDER_MAPPING = {
  'pop': 'pop',
  'kpop': 'kpop',
  'lofi-inst': 'lofi-inst',
  'ambient': 'Music/Ambient'  // ✅ Ambient는 Music/Ambient 경로 사용
};

// 🔥 R2에서 플레이리스트 생성 (수정됨)
async function generatePlaylist(bucket, category) {
  // 폴더 매핑 적용
  const folder = FOLDER_MAPPING[category] || category;

  console.log(`🎵 플레이리스트 생성 시작 - category: ${category}, folder: ${folder}`);

  const objects = await bucket.list({ prefix: folder + '/' });
  const tracks = [];

  console.log(`🔍 ${folder} 플레이리스트 생성 - ${objects.objects.length}개 파일 발견`);

  for (const obj of objects.objects) {
    if (obj.key.endsWith('.m4a') || obj.key.endsWith('.mp3')) {
      const filename = obj.key.split('/').pop();
      const title = cleanTitle(filename);

      // ✅ 한글 파일명 URL 인코딩
      const encodedFilename = encodeURIComponent(filename);

      // ✅ audio 경로는 원본 폴더 사용 (Music/Ambient 그대로)
      const audioPath = folder + '/' + encodedFilename;

      tracks.push({
        title: title,
        audio: audioPath,  // ✅ 인코딩된 파일명 사용
        image: category === 'kpop' ?
          `pop-covers/${filename.replace(/\.(m4a|mp3)$/i, '')}.webp` :
          category === 'ambient' ?
          `ambient-covers/default-ambient.jpg` :
          'covers/default-cover.jpg',
        folder: category,  // ✅ category 정보 추가
        size: obj.size,
        uploaded: obj.uploaded
      });
    }
  }

  console.log(`✅ ${folder} 플레이리스트 완료 - ${tracks.length}곡`);
  return tracks.sort((a, b) => a.title.localeCompare(b.title));
}

// 🔥 R2에서 커버 목록 생성 (WebP 지원 버전) - 수정됨
async function generateCoverList(bucket, prefix = 'covers') {
  console.log(`🔍 커버 검색 시작 - prefix: ${prefix}`);

  const objects = await bucket.list({ prefix: prefix + '/' });
  console.log(`📦 R2 객체 개수: ${objects.objects.length}`);

  const covers = [];

  for (const obj of objects.objects) {
    const filename = obj.key.split('/').pop();

    // 이미지 파일만 필터링
    if (obj.key.match(/\.(jpg|jpeg|png|webp)$/i)) {
      covers.push({
        filename: filename,
        url: `${prefix}/${filename}`
      });

      // 디버그: 처음 3개만 로그
      if (covers.length <= 3) {
        console.log(`✅ 커버 추가: ${filename}`);
      }
    }
  }

  console.log(`✅ 총 ${covers.length}개 커버 발견`);

  return covers;
}

// 🔥 R2에서 파일 찾기 (유연한 경로 매칭) - 수정됨
async function findFile(bucket, requestedPath) {
  // 1. 요청된 경로 그대로 시도
  let object = await bucket.get(requestedPath);
  if (object) {
    console.log(`✅ 파일 발견 (직접 경로): ${requestedPath}`);
    return object;
  }

  // 2. URL 디코딩 시도
  try {
    const decodedPath = decodeURIComponent(requestedPath);
    object = await bucket.get(decodedPath);
    if (object) {
      console.log(`✅ 파일 발견 (디코딩): ${decodedPath}`);
      return object;
    }
  } catch (e) {
    console.log(`⚠️ 디코딩 실패: ${e.message}`);
  }

  // 3. 파일명만 추출해서 여러 폴더에서 검색
  const fileName = requestedPath.split('/').pop();
  if (fileName) {
    const decodedFileName = decodeURIComponent(fileName);
    // ✅ Music/Ambient 경로 추가됨
    const folders = ['pop', 'lofi-inst', 'kpop', 'Music/Ambient', 'effects', 'covers', 'pop-covers', 'ambient-covers'];

    console.log(`🔍 파일명으로 검색: ${decodedFileName}`);

    for (const folder of folders) {
      const patterns = [
        `${folder}/${fileName}`,
        `${folder}/${decodedFileName}`,
        `${folder}/${decodedFileName.replace(/\s+/g, '_')}`,
        `${folder}/${decodedFileName.replace(/\s+/g, '-')}`
      ];

      for (const pattern of patterns) {
        object = await bucket.get(pattern);
        if (object) {
          console.log(`✅ 파일 발견 (패턴 매칭): ${pattern}`);
          return object;
        }
      }
    }
  }

  console.log(`❌ 모든 경로에서 파일을 찾지 못함: ${requestedPath}`);
  return null;
}

// 🔥 파일명에서 제목 추출
function cleanTitle(filename) {
  return filename
    .replace(/\.(m4a|mp3)$/i, '')
    .replace(/^[0-9A-Z]+\.\s*/i, '')
    .replace(/_M$/, '')
    .replace(/[_-]/g, ' ')
    .trim();
}
