# 칼럼 자동화 사용법

## 1. 기본 구조

칼럼 원고는 `content/columns`에 저장합니다.

빌드를 실행하면 아래 항목이 자동으로 바뀝니다.

- 칼럼 상세페이지 생성
- 칼럼 목록 추가
- 메인 최신 칼럼 반영
- 사이트맵 추가
- SEO 기본 메타 태그 생성

## 2. 사건별 제목 앞 키워드

`scripts/create-column.js`를 쓰면 사건 유형에 맞춰 제목 맨 앞에 키워드가 자동으로 붙습니다.

| 유형 | 붙는 키워드 |
| --- | --- |
| `general` | 울산변호사 |
| `criminal` | 울산형사변호사 |
| `criminal-specialist` | 울산형사전문변호사 |
| `sex` | 울산성범죄변호사 |
| `divorce` | 울산이혼변호사 |
| `civil` | 울산민사소송변호사 |
| `traffic` | 울산교통사고변호사 |
| `drunk` | 울산음주운전변호사 |
| `drug` | 울산마약변호사 |

## 3. 새 칼럼 생성 예시

```powershell
npm run new:column -- --type criminal-specialist --title "집행유예 중 무면허 사고 벌금형 성공사례" --body draft.txt --image proof.png --result "벌금 1,000만 원"
npm run build
git add .
git commit -m "Add new column"
git push
```

## 4. 추천 작업 방식

가장 쉬운 방식은 아래 3가지만 준비하는 것입니다.

1. 칼럼 원고 텍스트
2. 판결문 또는 결정서 이미지
3. 사건 유형

그 다음 Codex가 제목, 표, 문단, SEO 설명, 이미지 배치, 배포까지 처리합니다.
