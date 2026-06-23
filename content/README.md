# 홈페이지 콘텐츠 자동화 사용법

이 폴더에 성공사례와 칼럼 원고를 Markdown 파일로 넣고 빌드하면 HTML 페이지, 목록, 사이트맵이 자동 생성됩니다.

## 성공사례 추가

1. `content/cases/_template.md`를 복사합니다.
2. 파일명을 영문 또는 한글 slug 기준으로 바꿉니다.
3. 위쪽 `---` 안의 제목, 결과, 이미지, 설명을 채웁니다.
4. 판결문 이미지는 `assets/images/success/` 아래에 넣고 `image` 경로에 적습니다.

예:

```text
content/cases/drunk-driving-third-probation.md
assets/images/success/drunk-driving-third-probation.jpg
```

## 칼럼 추가

1. `content/columns/_template.md`를 복사합니다.
2. 제목, 설명, 카테고리, slug, 본문을 채웁니다.

## 빌드 명령

사이트 폴더에서 아래 명령을 실행합니다.

```bash
node scripts/build-content.js
```

생성되는 것:

- `cases/index.html`
- `cases/{slug}.html`
- `columns/index.html`
- `columns/{slug}.html`
- `sitemap.xml`
- 메인 페이지의 성공사례 카드 일부 자동 갱신
- 메인 페이지의 칼럼 미리보기 일부 자동 갱신
