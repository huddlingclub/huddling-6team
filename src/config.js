/* =============================================================
 * 오늘도 다짐 — 게임 설정
 * 기획서(docs/기획서.md) v1.3 기준
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
   * mission: 미션 팝업 문구, image: src/assets/images/ 안의 파일 이름(확장자 제외)
   * 필요 속도 = taps ÷ timeLimit → LV1 초당 1.2회 ~ LV6 초당 4.6회 */
  LEVELS: [
    { level: 1, key: 'auto-mixer', name: '자동 믹서기', taps: 6,  timeLimit: 5.0, sound: '위이이잉—',     mission: '버튼만 누르면 끝! 가볍게 몸 풀자',  taste: '몇 번만 눌러도 끝나는 몸풀기',               relief: 12, image: 'tool-auto-mixer' },
    { level: 2, key: 'hand-mixer', name: '수동 믹서기', taps: 10, timeLimit: 5.4, sound: '드르륵 드르륵', mission: '손잡이 돌리듯 쉬지 말고 연타!',     taste: '손잡이를 돌리듯 연타하는 맛',                relief: 15, image: 'tool-hand-mixer' },
    { level: 3, key: 'mortar',     name: '절구',        taps: 14, timeLimit: 5.8, sound: '쿵! 쿵!',       mission: '묵직하게 빻아 버려라!',             taste: '한 방 한 방이 묵직함',                       relief: 17, image: 'tool-mortar' },
    { level: 4, key: 'knife',      name: '칼과 도마',   taps: 20, timeLimit: 6.2, sound: '탁탁탁',        mission: '리듬 타며 잘게 다져라!',            taste: '리듬감 있게 정성껏 다지는 맛',               relief: 18, image: 'tool-knife' },
    { level: 5, key: 'fist',       name: '맨주먹',      taps: 26, timeLimit: 6.6, sound: '퍽! 퍽!',       mission: '오늘 쌓인 화, 주먹으로 터뜨려라!',  taste: '직접 패는 쾌감이 최고. 화면이 크게 흔들림', relief: 20, image: 'tool-fist', shake: 'strong' },
    { level: 6, key: 'fork',       name: '포크',        taps: 32, timeLimit: 7.0, sound: '콕! 콕!',       mission: '최종 보스! 끝까지 찔러라!',         taste: '찔러도 찔러도 안 다져지는 극한의 인내. 최종 보스', relief: 25, image: 'tool-fork' }
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

  /* ---------- 연출 시간 (기획서 3-5 팝업 시간, 6장) ----------
   * 제한시간은 미션 팝업이 닫힌 뒤부터 잼. 팝업이 떠 있는 동안은 시간도 콤보 간격도 안 감 */
  TIMING: {
    missionPopupSeconds: 3.5,    // 미션 팝업 "LEVEL 3 · 절구 · 미션" 표시 후 자동 시작
    scorePopupSeconds: 2.8,      // 점수 팝업 "LV3 CLEAR! +540점" 표시 후 다음 미션
    countdownFrom: 3,            // 앱을 벗어났다 돌아오면 3·2·1 후 재개 (기획서 3-5)
    countStepSeconds: 0.5,       // 3, 2, 1 숫자 하나당 시간
    failToResultSeconds: 1.5,    // 이어하기를 다 쓴 뒤 FAIL → 결과 화면으로 넘어가는 시간
    lowTimeRatio: 0.3,           // 남은 시간이 이 비율 아래면 시간 바를 빨갛게
    toastSeconds: 2.2            // 아래쪽 안내 문구 표시 시간
  },

  /* ---------- 타격 연출 ---------- */
  FX: {
    crumbsPerTap: 3              // 한 번 칠 때 튀는 마늘 조각 수
  },

  /* ---------- 점수 (기획서 3-2) ----------
   * 레벨 점수 = 탭 속도(탭 수 ÷ 걸린 초) × perLevelBase × 레벨 번호 × 콤보 배수 + 크리티컬 보너스
   * 한 판 점수 = 깬 레벨 점수 합 + (6레벨 모두 클리어 시) allClearBonus
   * 이론상 최고점은 이 파일의 값으로 계산함 (leaderboard.js Records.maxPossible) */
  SCORE: {
    perLevelBase: 100,
    allClearBonus: 1000
  },

  /* ---------- 연타 콤보 (기획서 3-3) ----------
   * 탭 사이가 gapSeconds 이내면 이어짐. 레벨이 바뀌어도 이어짐.
   * 레벨 점수에는 그 레벨에서 도달한 최고 구간의 mult를 곱함.
   * fx: 화면 연출 (style.css의 data-combo 값) */
  COMBO: {
    gapSeconds: 0.3,
    tiers: [
      { min: 0,  mult: 1.0, fx: '' },
      { min: 10, mult: 1.1, fx: 'combo' },     // 10 COMBO
      { min: 20, mult: 1.2, fx: 'big' },       // 20 COMBO + 글자 커짐
      { min: 30, mult: 1.3, fx: 'flash' },     // 30 COMBO + 화면 테두리 번쩍
      { min: 50, mult: 1.5, fx: 'max' }        // MAX COMBO
    ]
  },

  /* ---------- 크리티컬 (기획서 3-3) ---------- */
  CRITICAL: {
    chance: 0.05,                // 탭마다 5% 확률
    bonusPerLevel: 50,           // 1번마다 +50 × 레벨 번호
    tapValue: 2,                 // 그 탭은 2탭으로 인정
    vibrateMs: 60                // 모바일 진동 길이
  },

  /* ---------- FAIL과 이어하기 (기획서 3-4) ---------- */
  CONTINUE: {
    perRun: 1                    // 한 판에 이어하기 1번. 점수 불이익 없음, 하루 판 수도 안 줄어듦
  },

  /* ---------- 매크로 방지 (기획서 3-5) ---------- */
  ANTI_MACRO: {
    maxTapsPerSecond: 15         // 1초에 15회를 넘는 탭은 무시하고 콤보도 끊음
  },

  /* ---------- 오늘의 저녁 메뉴 10종 (기획서 4장) ----------
   * 결과 화면이 열리면 바로, 마지막으로 깬 레벨(0~6)이 minLevel~maxLevel에 드는 묶음에서 랜덤.
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
    hideZeroScore: true          // 0점 기록은 올리지 않음. 보여 줄 기록이 없으면 리더보드 버튼을 숨김
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

  /* ---------- 공유와 이미지 저장 (기획서 3-4, 4장, 7-1) ----------
   * 모바일: 기기 공유 바텀시트 / PC: 링크 복사 + "링크 복사 완료!" (카카오 SDK 안 씀)
   * {score} {level} {relief} {menu} 는 실제 값으로 바뀜 */
  SHARE: {
    title: '오늘도 다짐',
    resultText: '오늘 마늘 다지고 화 {relief}% 풀었어요. {score}점! 저녁은 {menu}.',
    continueText: 'LV{level}에서 막혔어요. 나 대신 마늘 좀 다져 줄 사람?',
    copiedToast: '링크 복사 완료!',
    manualToast: '주소창의 링크를 친구에게 보내 주세요',
    clipboardTimeoutSeconds: 1.5,  // 링크 복사가 이 시간 안에 안 끝나면 다른 방법으로 복사 (게임이 멈추지 않게)
    // 메뉴 카드 이미지 (px): 메뉴명, 한 줄 PS, 점수
    card: {
      width: 1080, height: 1600, pad: 84, radius: 56,
      menuArtHeight: 520,
      font: { eyebrow: 40, menuGroup: 34, menu: 96, ps: 42, score: 120, unit: 48, meta: 36, foot: 30 },
      lineGap: 1.45
    }
  },

  /* ---------- 문구 ---------- */
  TEXT: {
    tagline: '퇴근길에 쌓인 화를 마늘에 풀고, 끝까지 다진 만큼 오늘의 저녁 메뉴를 받는 게임',
    failLine: '아깝다! 조금만 더 빨랐으면',   // FAIL 화면 한 줄 (숫자 서브 멘트는 쓰지 않음, 기획서 3-5)
    critical: '크리티컬!',
    maxCombo: 'MAX COMBO'
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
