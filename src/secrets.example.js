/* =============================================================
 * 비밀 설정 예시 파일
 *
 * 1) 이 파일을 복사해서 같은 폴더에 secrets.js 로 저장하세요.
 *      cp src/secrets.example.js src/secrets.js
 * 2) secrets.js 에 실제 값을 채우세요.
 * 3) secrets.js 는 .gitignore 에 들어 있어서 커밋되지 않습니다. 절대 커밋하지 마세요.
 *
 * 값을 모르면 비워 두세요. 비어 있으면
 * 리더보드는 내 브라우저 기록만 보여 주도록 만들어 주세요.
 * ============================================================= */

const SECRETS = {
  LEADERBOARD_URL: '',       // Supabase/Firebase 주소 (서버 결정 후)
  LEADERBOARD_ANON_KEY: ''   // 공개용(anon) 키. 관리자 키는 절대 넣지 마세요
};
