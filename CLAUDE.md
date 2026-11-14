# CLAUDE.md — 오늘도 다짐

Claude Code가 이 레포에서 작업할 때 따르는 규칙입니다. 사람 팀원에게도 같은 규칙입니다.

## 기준 문서
- 모든 기능과 숫자의 기준은 `docs/기획서.md`입니다. 기획서와 다르게 구현해야 하면 먼저 사용자에게 확인하고, 기획서 수정도 같은 PR에 넣습니다.
- 그래픽 파일 목록은 `docs/그래픽-목록.md`입니다.

## 기술 원칙 (기획서 7장)
- 빌드 도구, 프레임워크, npm 패키지를 쓰지 않습니다. 순수 HTML/CSS/JavaScript, `<script>` 태그로 불러옵니다.
- 화면은 DOM(버튼, 글자)으로 만듭니다. `<canvas>`는 결과 카드 이미지 저장에만 씁니다.
- 외부 라이브러리 예외는 두 가지뿐입니다: 카카오 JavaScript SDK, 리더보드 서버(fetch 우선).
- 숫자(탭 수, 시간, 점수, 횟수 등)는 `src/config.js`에만 둡니다. 다른 파일에 숫자를 하드코딩하지 않습니다.
- 로직과 겉모습을 분리합니다. `game.js`는 상태만 바꾸고, 보이는 모습은 CSS 클래스와 `src/assets/images/`의 그래픽이 정합니다.
- 그래픽 파일이 없으면 이름 글자로 대체 표시합니다(로딩 실패로 화면이 깨지면 안 됨).
- 입력은 모바일 터치와 PC 스페이스바입니다. 스페이스바 누르고 있기(keydown repeat)는 1회만 인정합니다.

## 비밀 값
- `src/secrets.js`는 절대 커밋하지 않습니다(.gitignore 처리됨). 새 키가 필요하면 `src/secrets.example.js`에 빈 항목을 추가합니다.
- 키가 비어 있어도 게임이 동작해야 합니다(카카오 대신 기기 공유/링크 복사, 서버 대신 localStorage).

## 작업 방식
- `main`에 직접 커밋하지 않습니다. `feature/…`, `fix/…`, `design/…` 브랜치에서 작업하고 PR을 올립니다.
- 커밋 메시지: `feat: …`, `fix: …`, `design: …`, `docs: …`, `balance: …` (한국어 설명 OK)
- 확인 방법: `python3 -m http.server 8000` 후 http://localhost:8000 에서 모바일 크기(개발자 도구)와 PC 스페이스바로 한 판 끝까지 플레이.

## 파일 구조
```
index.html              화면 뼈대
src/config.js           모든 숫자와 문구 데이터
src/style.css           공통 스타일 (:root 변수)
src/game.js             게임 상태: 레벨, 단계, 점수, 타이머
src/view.js             상태 → 화면 반영, 그래픽 로딩
src/share.js            이미지 저장, 카카오톡 공유
src/leaderboard.js      기록 저장, 리더보드
src/secrets.example.js  비밀 값 예시 (복사해서 secrets.js로)
src/assets/images/      그래픽
src/assets/sounds/      효과음
docs/                   기획서, 그래픽 목록
```
