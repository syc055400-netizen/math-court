# 오답법정 · 미적분Ⅰ

픽셀 법정에서 풀이의 첫 오류를 찾고 증거로 판단하는 수학 추리 게임입니다.

## 플레이
튜토리얼 3단계와 극한·연속 / 미분 / 적분 사건 6개를 제공합니다. 오류 없는 풀이도 포함합니다. 사건 입장 시 법정문 연출은 건너뛰기·Escape를 지원합니다. 소리는 기본 꺼짐이며, 진행 상황은 해당 브라우저의 localStorage에 저장됩니다. 서버 계정 동기화는 없습니다.

## 개발
빌드 없는 HTML·CSS·ES modules입니다. 정적 HTTP 서버로 이 디렉터리를 제공하세요. `npm run check`로 문항 및 그래프 검증을 실행합니다. GitHub Pages는 main 브랜치 루트에서 배포합니다.

- `app.js`: 게임·기록·튜토리얼
- `cases.js`: 문항 및 해설
- `graphs.js`: 수학 증거 그래프
- `entrance.js`, `entrance.css`: 법정문 연출
- `style.css`: 픽셀 UI 및 반응형 화면

## 자산
법정 배경은 이 프로젝트를 위해 생성했습니다. Neo둥근모 Pro 글꼴은 SIL Open Font License 1.1입니다. 전문은 FONT-LICENSE.txt를 확인하세요.

## 수식 표시

문제·선택지·해설·그래프의 수식은 LaTeX로 작성하고 KaTeX 0.16.22로 표시합니다. 렌더러와 수식 글꼴을 함께 제공하므로 외부 CDN 연결이 필요하지 않습니다. KaTeX의 MIT 라이선스는 `KATEX-LICENSE.txt`에 있습니다.
