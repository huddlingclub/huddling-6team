/* =============================================================
 * 오늘도 다짐 — 게임 설정
 * 기획서(docs/기획서.md) v1.1 기준
 *
 * 속도, 점수, 시간, 횟수 같은 숫자는 이 파일에서만 고칩니다.
 * 다른 파일에 숫자를 직접 쓰지 말고 CONFIG.xxx 로 가져다 쓰세요.
 * 숫자를 바꾸는 PR에는 "왜 바꿨는지(플레이 테스트 결과)"를 적어 주세요.
 * ============================================================= */

const CONFIG = {
  GAME_NAME: '오늘도 다짐',
  TIMEZONE: 'Asia/Seoul',

  /* ---------- 하루 제한 (기획서 2장, 3-4) ---------- */
  DAILY_PLAYS: 6,                // 하루 6판. 판을 시작할 때 차감, 자정(한국 시간)에 다시 채움

  /* 시연 모드: 발표 때 켜기 */
  DEMO: {
    disableDailyLimit: false,    // true면 하루 제한 없음
    showResetButton: false       // true면 홈에 "횟수 초기화" 버튼 표시
  },

  /* ---------- 레벨별 도구 6종 (기획서 2-2) ----------
   * taps: 1쪽당 탭 수, timeLimit: 제한시간(초), relief: 화 해소량
   * image: src/assets/images/ 안의 파일 이름(확장자 제외) */
  LEVELS: [
    { level: 1, key: 'auto-mixer', name: '자동 믹서기', taps: 3,  timeLimit: 5.0, sound: '위이이잉—',     taste: '몇 번만 눌러도 끝나는 몸풀기',               relief: 12, image: 'tool-auto-mixer' },
    { level: 2, key: 'hand-mixer', name: '수동 믹서기', taps: 6,  timeLimit: 5.4, sound: '드르륵 드르륵', taste: '손잡이를 돌리듯 연타하는 맛',                relief: 15, image: 'tool-hand-mixer' },
    { level: 3, key: 'mortar',     name: '절구',        taps: 8,  timeLimit: 5.8, sound: '쿵! 쿵!',       taste: '한 방 한 방이 묵직함',                       relief: 17, image: 'tool-mortar' },
    { level: 4, key: 'knife',      name: '칼과 도마',   taps: 12, timeLimit: 6.2, sound: '탁탁탁',        taste: '리듬감 있게 정성껏 다지는 맛',               relief: 18, image: 'tool-knife' },
    { level: 5, key: 'fist',       name: '맨주먹',      taps: 15, timeLimit: 6.6, sound: '퍽! 퍽!',       taste: '직접 패는 쾌감이 최고. 화면이 크게 흔들림', relief: 20, image: 'tool-fist', shake: 'strong' },
    { level: 6, key: 'fork',       name: '포크',        taps: 20, timeLimit: 7.0, sound: '콕! 콕!',       taste: '찔러도 찔러도 안 다져지는 극한의 인내. 최종 보스', relief: 25, image: 'tool-fork' }
  ],

  /* ---------- 다져지는 단계 (기획서 2-3) ----------
   * 1쪽을 패는 동안 진행률(친 횟수 / 탭 수)에 따라 그림이 바뀜.
   * at: 이 진행률 이상이면 해당 단계. 마지막 단계(완성)는 탭을 다 채웠을 때. */
  GARLIC_STAGES: [
    { at: 0,    name: '통마늘',         image: 'garlic-stage0' },
    { at: 0.25, name: '반 토막',        image: 'garlic-stage1' },
    { at: 0.5,  name: '굵게 다짐',      image: 'garlic-stage2' },
    { at: 0.75, name: '곱게 다짐',      image: 'garlic-stage3' },
    { at: 1,    name: '다진 마늘 완성', image: 'garlic-stage4' }
  ],

  /* ---------- 화 게이지 (기획서 2-4) ----------
   * 100에서 시작, 레벨을 깰 때마다 그 도구의 relief만큼 줄어듦 (6레벨 합계 107) */
  ANGER: { start: 100 },

  /* ---------- 연출 시간 (기획서 6장) ----------
   * 레벨 인트로 + 3·2·1 = introPanelSeconds + countdownFrom × countStepSeconds = 약 1.5초
   * 이 동안에는 제한시간이 가지 않음 */
  TIMING: {
    countdownFrom: 3,            // 3·2·1
    introPanelSeconds: 0.6,      // "LEVEL 3 · 절구 · 5.8초 안에!" 표시 시간
    countStepSeconds: 0.3,       // 3, 2, 1 숫자 하나당 시간
    clearPopupSeconds: 0.8,      // "+540점" 표시 시간
    failToResultSeconds: 1.5,    // 이어하기를 다 쓴 뒤 FAIL → 결과 화면으로 넘어가는 시간
    lowTimeRatio: 0.3,           // 남은 시간이 이 비율 아래면 시간 바를 빨갛게
    toastSeconds: 2.2            // 아래쪽 안내 문구 표시 시간
  },

  /* ---------- 타격 연출 ---------- */
  FX: {
    crumbsPerTap: 3              // 한 번 칠 때 튀는 마늘 조각 수
  },

  /* ---------- 점수 (기획서 3-2) ----------
   * 레벨 점수 = 탭 속도(탭 수 ÷ 걸린 초) × perLevelBase × 레벨 번호
   * 한 판 점수 = 깬 레벨 점수 합 + (6레벨 모두 클리어 시) allClearBonus */
  SCORE: {
    perLevelBase: 100,
    allClearBonus: 1000,
    maxPossible: 32500           // 이론상 최고점 (초당 15회 × 100 × 21 + 1000). 서버에서 이 이상은 거부
  },

  /* ---------- FAIL과 이어하기 (기획서 3-3) ---------- */
  CONTINUE: {
    perRun: 1                    // 한 판에 이어하기 1번. 점수 불이익 없음, 하루 판 수도 안 줄어듦
  },

  /* ---------- 매크로 방지 (기획서 3-4) ---------- */
  ANTI_MACRO: {
    maxTapsPerSecond: 15         // 1초에 15회를 넘는 탭은 무시
  },

  /* ---------- 오늘의 저녁 메뉴 10종 (기획서 4장) ----------
   * 마지막으로 깬 레벨(0~6)이 minLevel~maxLevel에 들면 그 묶음에서 랜덤.
   * 직전 판에 나온 메뉴는 빼고 뽑음. PS는 아직 제안안(확정 전). */
  MENU_GROUPS: [
    {
      minLevel: 0, maxLevel: 2, label: '가볍게',
      menus: [
        { name: '마늘 버터 토스트', image: 'menu-toast',      ps: '가볍게 털어냈으니 가볍게 한 입. 바삭하게 마무리해요.' },
        { name: '흑마늘 감자탕',    image: 'menu-gamjatang',  ps: '뼈 있는 하루였죠? 푹 고아서 국물까지 싹 비워 버려요.' },
        { name: '마늘볶음밥',       image: 'menu-friedrice',  ps: '흩어진 하루를 한 팬에 모아 고슬고슬하게 볶아 버려요.' }
      ]
    },
    {
      minLevel: 3, maxLevel: 4, label: '적당히',
      menus: [
        { name: '알리오 올리오',    image: 'menu-pasta',      ps: '마늘과 올리브유면 충분해요. 오늘도 복잡할 필요 없었어요.' },
        { name: '감바스',           image: 'menu-gambas',     ps: '지글지글 끓는 기름에 화도 같이 튀겨 버렸어요. 빵 찍어 먹는 건 덤.' },
        { name: '김치찌개',         image: 'menu-kimchi',     ps: '보글보글 끓는 건 찌개 하나로 충분해요. 내 속은 이제 그만.' }
      ]
    },
    {
      minLevel: 5, maxLevel: 6, label: '푸짐하게',
      menus: [
        { name: '삼계탕',           image: 'menu-samgyetang', ps: '오늘 고생한 몸에게 보양식 한 그릇. 충분히 그럴 자격 있어요.' },
        { name: '마늘 폭탄 떡볶이', image: 'menu-tteokbokki', ps: '터질 것 같던 화, 떡볶이 속에서 대신 터뜨렸어요.' },
        { name: '마늘보쌈',         image: 'menu-bossam',     ps: '꾹 참은 만큼 크게 싸 드세요. 오늘 하루까지 한 쌈에.' },
        { name: '마늘통닭',         image: 'menu-chicken',    ps: '치킨은 배신하지 않아요. 오늘 만난 누구와는 다르게.' }
      ]
    }
  ],

  /* ---------- 리더보드 (기획서 5-1) ---------- */
  LEADERBOARD: {
    topN: 50,                    // 이번 달 TOP 50 + 내 순위
    resetDayOfMonth: 1,          // 매달 1일 0시(한국 시간) 초기화
    hallOfFameCount: 3,          // 지난달 1~3위 보관
    hideZeroScore: true          // 0점 기록은 올리지 않음
  },

  /* ---------- 닉네임 (기획서 5-2) ---------- */
  NICKNAME: {
    minLength: 2,
    maxLength: 10,               // '#0614' 같은 뒤 4자리는 제외한 길이
    tagDigits: 4,
    // 자동 생성 예: "퇴근하고싶은 마늘#0614" (앞말 + ' 마늘')
    autoPrefixes: ['퇴근하고싶은', '야근하는', '칼퇴하는', '월요병 걸린', '다짐하는', '참고있는'],
    bannedWords: []              // 금지어 목록 (채워 주세요)
  },

  /* ---------- 최근 기록 (기획서 8장 '시간이 되면') ---------- */
  HISTORY: {
    days: 7                      // 최근 7일
  },

  /* ---------- 공유와 이미지 저장 (기획서 3-3, 8장) ----------
   * {score} {level} {relief} {menu} 는 실제 값으로 바뀜 */
  SHARE: {
    kakaoSdkUrl: 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js',
    ogImage: 'src/assets/images/og-image.png',
    title: '오늘도 다짐',
    resultText: '오늘 마늘 다지고 화 {relief}% 풀었어요. {score}점! 저녁은 {menu}.',
    resultTextNoMenu: '오늘 마늘 다지고 화 {relief}% 풀었어요. {score}점!',
    continueText: 'LV{level}에서 막혔어요. 나 대신 마늘 좀 다져 줄 사람?',
    buttonText: '나도 다지러 가기',
    // 결과 카드 이미지 (px)
    card: {
      width: 1080, height: 1800, pad: 84, radius: 56,
      menuArtHeight: 600,
      font: { eyebrow: 40, score: 200, unit: 64, meta: 40, menuGroup: 34, menu: 76, ps: 40, foot: 32 },
      lineGap: 1.45
    }
  },

  /* ---------- 문구 ---------- */
  TEXT: {
    tagline: '퇴근길에 쌓인 화를 마늘에 풀고, 끝까지 다진 만큼 오늘의 저녁 메뉴를 받는 게임'
  },

  /* ---------- 효과음 (src/assets/sounds/) ----------
   * 파일이 없으면 짧은 기본음으로 대신함 */
  SOUND: {
    ext: 'mp3',
    fallbackTone: { freq: 160, seconds: 0.07, volume: 0.18 }
  },

  /* ---------- 그래픽 (기획서 7-2) ---------- */
  ASSETS: {
    imageDir: 'src/assets/images/',
    soundDir: 'src/assets/sounds/',
    extensions: ['svg', 'webp', 'png'],   // 이 순서로 찾아보고, 없으면 index.html 안의 임시 그래픽 사용
    // 임시 그래픽도 없으면 이름 글자(예: "포크")를 띄움
    fallbackToText: true
  }
};
