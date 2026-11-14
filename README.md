# 🧄 오늘도 다짐

퇴근길에 쌓인 화를 마늘에 풀고, 끝까지 다진 만큼 오늘의 저녁 메뉴를 받는 게임.
허들링 6조 프로젝트 · 모바일 웹 우선

- 📄 기획서: [docs/기획서.md](docs/기획서.md) (팀 공통 기준, v1.1)
- 🎨 그래픽 목록: [docs/그래픽-목록.md](docs/그래픽-목록.md)

## 실행하기

빌드 과정이 없습니다. 로컬 서버로 열기만 하면 됩니다.

```bash
git clone https://github.com/huddlingclub/huddling-6team.git
cd huddling-6team
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

VS Code를 쓴다면 "Live Server" 확장으로 `index.html`을 열어도 됩니다.
모바일 화면은 브라우저 개발자 도구(F12)의 기기 모드로 확인하세요.

## 비밀 값 설정 (리더보드 서버 주소)

앱 키와 서버 주소는 **커밋하지 않습니다.**

```bash
cp src/secrets.example.js src/secrets.js
# src/secrets.js 를 열어 값 채우기 (이 파일은 .gitignore 처리되어 있음)
```

값은 담당자에게 팀 채팅으로 받으세요. 비어 있어도 게임은 돌아가야 합니다
(리더보드는 내 브라우저 기록). 공유는 키 없이 모바일 공유 바텀시트 / PC 링크 복사로 동작합니다.

## 폴더 구조

```
index.html              화면 뼈대
src/
  config.js             ★ 모든 숫자·메뉴·문구 (기획서 숫자는 여기서만 고침)
  style.css             공통 스타일 (색·글꼴은 :root 변수)
  game.js               게임 상태: 레벨, 단계, 점수, 타이머, 하루 판 수
  view.js               상태 → 화면 반영, 그래픽 불러오기, 입력(터치·스페이스바), 효과음
  share.js              친구에게 공유(모바일 바텀시트 / PC 링크 복사), 메뉴 카드 이미지 저장
  leaderboard.js        기록 저장, 닉네임, 리더보드 (지금은 이 기기 localStorage)
  secrets.example.js    비밀 값 예시
  assets/images/        그래픽 (파일 이름 규칙은 그래픽 목록 참고)
  assets/sounds/        효과음
docs/
  기획서.md
  그래픽-목록.md
.github/                PR·이슈 템플릿, 배포 설정
CLAUDE.md               Claude Code 작업 규칙
```

그래픽 파일이 아직 없으면 `index.html` 안의 임시 그래픽(`<symbol>`)이 보이고, `src/assets/images/`에 같은 이름의 파일을 넣으면 자동으로 바뀝니다.
그래서 개발자 도구 콘솔에 그래픽·효과음 파일 404가 보이는 건 정상입니다.

## 누가 어디를 고치나요?

| 담당 (기획서 9장) | 주로 고치는 곳 |
|---|---|
| 게임 로직 / 레벨·점수 / config 튜닝 | `src/game.js`, `src/config.js` |
| 화면·연출(CSS) | `index.html`, `src/style.css`, `src/view.js` |
| 그래픽 제작·적용 | `src/assets/images/` |
| 메뉴 카드·카피 | `src/config.js`의 `MENU_GROUPS` |
| 리더보드·닉네임(서버) | `src/leaderboard.js` |
| 이미지 저장·공유 | `src/share.js` |
| 발표 자료·시연 시나리오 | `docs/` |

## 협업 규칙

1. **`main`에 직접 push 금지.** 작업마다 브랜치를 만듭니다.
   ```bash
   git switch main && git pull
   git switch -c feature/level-intro      # 기능
   git switch -c fix/space-repeat         # 버그
   git switch -c design/garlic-stages     # 그래픽·화면
   ```
2. 작업이 끝나면 push하고 GitHub에서 **Pull Request**를 엽니다. 1명 이상 확인 후 merge.
3. 커밋 메시지는 한 줄로: `feat: 레벨 인트로 3·2·1 추가`, `balance: LV6 탭 수 20→18`, `design: 마늘 단계 그림 5종`
4. 같은 파일을 여러 명이 크게 고치면 충돌이 납니다. 시작 전에 이슈로 "제가 이거 합니다"를 남겨 주세요.
5. 기획을 바꾸고 싶으면 `docs/기획서.md`를 고치는 PR을 올립니다.

## 배포 (GitHub Pages)

`main`에 merge되면 GitHub Actions가 자동으로 배포합니다(`.github/workflows/deploy.yml`).
처음 한 번만 설정이 필요합니다.

1. 레포 **Settings → Pages → Source**를 **GitHub Actions**로 바꾸기
2. 레포 **Settings → Secrets and variables → Actions**에 아래 값 등록 (없으면 비워 둬도 배포됨)
   - `LEADERBOARD_URL`, `LEADERBOARD_ANON_KEY`
3. 배포 주소: `https://huddlingclub.github.io/huddling-6team/`

> 배포할 때만 Actions가 비밀 값으로 `src/secrets.js`를 만들어 넣습니다. 레포에는 남지 않습니다.
> 리더보드 공개용(anon) 키는 배포된 페이지에서 보일 수 있습니다. 관리자 키는 절대 넣지 마세요.
