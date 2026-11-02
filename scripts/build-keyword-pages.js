const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://ulsanlawyer.kr';
const pages = [
  {
    slug: 'civil-litigation-lawyer', keyword: '울산민사소송변호사',
    title: '울산민사소송변호사 상담 | 소장·가압류·강제집행',
    description: '울산 민사소송에서 소장 작성, 답변서, 증거 정리, 가압류와 판결 후 강제집행까지 단계별로 확인할 사항을 강성수 변호사가 직접 상담합니다.',
    h1: '울산민사소송변호사 상담은 판결 이후 회수까지 봅니다',
    lead: '민사소송은 승소 가능성만 묻고 시작하기보다 권리의 근거, 증거, 상대방 재산과 판결 후 집행 가능성을 함께 확인해야 합니다.',
    issue: '대여금·공사대금·손해배상·계약해제 사건은 같은 민사소송이라도 증명해야 할 사실과 필요한 자료가 다릅니다. 소장을 내기 전 청구할 금액과 법적 근거를 구분하고, 상대방의 예상 반박까지 검토해야 합니다.',
    items: ['계약서·차용증과 송금 내역','문자·이메일·녹취 등 약속을 확인할 자료','내용증명과 계약해제 통지','상대방 재산과 가압류 필요성'],
    links: [['/civil/','울산민사변호사','민사소송·보전처분 안내'],['/columns/ulsan-civil-specialist-lawyer-case-review','울산민사전문변호사를 찾을 때','승소 가능성과 회수 가능성 확인'],['/columns/ulsan-civil-provisional-attachment-timing','울산 가압류 상담','소송 전 재산 보전 시점']],
    faq: [['민사소송 전에 내용증명을 꼭 보내야 하나요?','항상 필수는 아니지만 요구 내용과 시점을 남기고 계약해제나 이행 최고 사실을 입증하는 데 도움이 될 수 있습니다.'],['승소하면 변호사 비용을 전부 받을 수 있나요?','실제 지출액 전부가 아니라 소송비용 산입 기준에 따라 일부가 인정됩니다.'],['판결을 받으면 바로 돈을 받을 수 있나요?','상대방이 임의로 지급하지 않으면 재산을 확인해 압류·추심 등 강제집행 절차를 진행해야 합니다.']]
  },
  {
    slug: 'real-estate-specialist-lawyer', keyword: '울산부동산전문변호사',
    title: '울산부동산전문변호사를 찾을 때 확인할 계약·등기·집행 기준',
    description: '울산부동산전문변호사를 검색할 때 전세보증금, 임대차, 명도, 매매계약과 등기 분쟁에서 어떤 경험과 자료 검토 방식을 확인해야 하는지 안내합니다.',
    h1: '울산부동산전문변호사를 찾을 때 사건 유형부터 구분해야 합니다',
    lead: '‘부동산전문’이라는 검색어보다 중요한 것은 내 사건이 임대차·보증금·명도·매매·등기 중 어디에 해당하고, 담당 변호사가 계약서와 등기부를 직접 검토하는지입니다.',
    issue: '부동산 분쟁은 같은 건물에 관한 사건이어도 계약 해석, 점유 이전, 보증금 회수, 소유권과 담보권의 문제가 서로 다릅니다. 사무실은 특정 전문분야 등록을 오인시키는 표현 대신 실제 검토 범위와 절차를 기준으로 안내합니다.',
    items: ['계약서 원본과 특약사항','등기사항전부증명서와 권리 변동','보증금·계약금·잔금 송금 내역','인도·점유 상태와 내용증명'],
    links: [['/real-estate/','울산부동산변호사','임대차·보증금·매매 분쟁 안내'],['/columns/ulsan-real-estate-lawyer-lease-deposit-order','울산 임차권등기명령','이사 전 보증금 순위 보전'],['/columns/real-estate-sale-contract-breach','울산 부동산 매매분쟁','계약금과 채무불이행 판단']],
    faq: [['부동산 전문분야 등록 여부는 어디서 확인하나요?','광고 문구만 보지 말고 대한변호사협회 전문분야 등록 여부와 실제 유사사건 처리 범위를 구분해 확인하는 것이 좋습니다.'],['등기부만 보면 안전한 계약인가요?','등기부는 핵심 자료지만 체납, 선순위 임차인, 신탁과 실제 점유관계 등 별도 확인이 필요한 사항이 있습니다.'],['보증금을 못 받으면 바로 소송해야 하나요?','계약 종료와 반환 요구, 이사 계획, 임차권등기와 가압류 필요성을 먼저 확인한 뒤 절차를 정해야 합니다.']]
  },
  {
    slug: 'criminal-litigation-lawyer', keyword: '울산형사소송변호사',
    title: '울산형사소송변호사 | 경찰조사부터 형사재판 대응',
    description: '울산 형사소송에서 고소·경찰조사·검찰·구속영장·형사재판과 항소까지 단계별 대응을 형사법 전문 강성수 변호사가 직접 검토합니다.',
    h1: '울산형사소송변호사 상담은 첫 진술부터 재판까지 이어집니다',
    lead: '형사사건은 경찰에서 한 첫 진술과 제출한 자료가 검찰과 재판까지 이어질 수 있습니다. 현재 단계, 혐의, 객관적 증거를 먼저 확인해 인정할 부분과 다툴 부분을 나눕니다.',
    issue: '피의자·피고인 사건은 혐의 성립과 증거를 검토해야 하고, 피해자 사건은 고소사실과 입증자료를 구체적으로 정리해야 합니다. 형사법 전문 등록 강성수 변호사가 조사 전 준비부터 재판 대응까지 직접 상담합니다.',
    items: ['출석요구서·고소장·공소장','메신저·통화·계좌·위치 자료','압수수색과 휴대전화 포렌식 범위','합의·공탁과 양형자료 준비'],
    links: [['/criminal/','울산형사전문변호사','경찰조사·구속·형사재판 안내'],['/columns/police-investigation-early-defense-guide','울산 경찰조사 변호사','첫 조사 전 진술 준비'],['/columns/ulsan-criminal-appeal-decision-deadline','울산 형사항소 변호사','1심 판결 후 7일 대응']],
    faq: [['경찰 출석 연락을 받으면 언제 상담해야 하나요?','첫 진술이 이후 수사와 재판의 기준이 될 수 있으므로 조사일 전에 혐의와 증거를 확인하는 것이 좋습니다.'],['혐의를 부인하면 진술을 거부해야 하나요?','사건별로 다릅니다. 기록과 증거를 확인하지 않은 채 전부 답하거나 무조건 거부하기보다 질문별 대응 범위를 정해야 합니다.'],['1심 판결 후 항소 기간은 얼마인가요?','형사사건은 판결 선고일부터 7일 이내에 항소장을 제출해야 하므로 즉시 판결 내용과 기록을 검토해야 합니다.']]
  }
];

const header = `<header class="header"><div class="header-container"><div class="logo"><a href="/" class="text-logo header-text-logo" aria-label="울산형사전문변호사 강성수 홈"><strong>울산형사전문변호사 강성수</strong></a></div><nav class="nav"><a href="/" class="nav-link">홈</a><a href="/lawyer/" class="nav-link">변호사 소개</a><a href="/columns/" class="nav-link">칼럼</a><a href="/cases/" class="nav-link">성공사례</a><a href="/guides/" class="nav-link active">검색 안내</a></nav></div></header>`;

function commonHead(p, canonical, schema, faq, root = '../../') {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${p.title}</title><meta name="description" content="${p.description}"><meta name="author" content="강성수 변호사"><meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"><meta name="theme-color" content="#17243d"><link rel="canonical" href="${canonical}"><link rel="icon" type="image/png" sizes="512x512" href="${SITE}/assets/images/favicon-v2.png"><link rel="apple-touch-icon" href="${SITE}/assets/images/favicon-v2.png"><link rel="alternate" type="application/rss+xml" title="울산변호사 강성수 새 글" href="${SITE}/rss.xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap"><link rel="stylesheet" href="${root}assets/css/style.css?v=20261019-responsive"><link rel="stylesheet" href="${root}assets/css/practice.css?v=20261019-responsive"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${p.title}"><meta property="og:description" content="${p.description}"><meta property="og:image" content="${SITE}/assets/images/lawyer-direct-consultation.webp"><meta property="og:image:alt" content="울산변호사 강성수 변호사"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="울산변호사 강성수"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${p.title}"><meta name="twitter:description" content="${p.description}"><meta name="twitter:image" content="${SITE}/assets/images/lawyer-direct-consultation.webp"><script type="application/ld+json">${JSON.stringify(schema)}</script>${faq ? `<script type="application/ld+json">${JSON.stringify(faq)}</script>` : ''}</head>`;
}

function detail(p) {
  const canonical = `${SITE}/guides/${p.slug}/`;
  const schema = {'@context':'https://schema.org','@type':'LegalService',name:`${p.keyword} 상담 | 강성수 변호사`,url:canonical,telephone:'+82-52-227-2121',address:{'@type':'PostalAddress',streetAddress:'법대로 86-6 재송빌딩 3층',addressLocality:'남구',addressRegion:'울산광역시',postalCode:'44645',addressCountry:'KR'},areaServed:'울산광역시',employee:{'@id':`${SITE}/lawyer/#person`},knowsAbout:[p.keyword]};
  const faq = {'@context':'https://schema.org','@type':'FAQPage',mainEntity:p.faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))};
  return `${commonHead(p,canonical,schema,faq)}<body class="practice-page">${header}<main><section class="practice-hero"><div class="practice-inner"><span class="practice-eyebrow">LEGAL SEARCH GUIDE</span><h1>${p.h1}</h1><p class="practice-lead">${p.lead}</p><div class="practice-actions"><a class="practice-btn primary" href="tel:010-7219-9112">전화 상담</a><a class="practice-btn secondary" href="https://open.kakao.com/o/se2trwfh" target="_blank" rel="noopener noreferrer">카카오톡 상담</a></div></div></section><section class="practice-section"><div class="practice-inner"><div class="practice-grid"><article class="practice-card"><h2>${p.keyword} 검색 후 먼저 확인할 기준</h2><p>${p.issue}</p><ul class="practice-list">${p.items.map(x=>`<li>${x}</li>`).join('')}</ul></article><article class="practice-card"><h3>검색어보다 실제 검토 범위가 중요합니다</h3><p>전문 명칭이나 광고 문구만으로 결과를 판단하지 말고 담당 변호사가 자료를 직접 확인하는지, 불리한 점과 비용·기간까지 설명하는지 확인해야 합니다.</p></article></div><section class="practice-related"><h2>관련 울산 법률상담</h2><div class="practice-link-grid">${p.links.map(([u,b,h])=>`<a class="practice-link-card" href="${u}"><b>${b}</b><h3>${h}</h3><p>사건별 절차와 준비 자료를 확인합니다.</p></a>`).join('')}</div></section><section class="practice-faq"><h2>${p.keyword} 자주 묻는 질문</h2><div class="practice-faq-grid">${p.faq.map(([q,a])=>`<article><h3>${q}</h3><p>${a}</p></article>`).join('')}</div></section><section class="practice-related"><h2>다른 분야 검색 안내</h2><div class="practice-link-grid"><a class="practice-link-card" href="/guides/"><b>전체 키워드 안내</b><h3>울산 분야별 변호사 찾기</h3><p>민사·부동산·형사소송 페이지를 모아봅니다.</p></a>${pages.filter(x=>x.slug!==p.slug).map(x=>`<a class="practice-link-card" href="/guides/${x.slug}/"><b>${x.keyword}</b><h3>${x.h1}</h3><p>선임 전 확인할 기준을 정리했습니다.</p></a>`).join('')}</div></section><div class="practice-final"><strong>강성수 변호사가 사건자료를 직접 확인합니다.</strong><p>사무실은 울산 남구 법대로 86-6에 있습니다. 방문 전 전화나 카카오톡으로 상담 범위를 확인해 주세요.</p></div></div></section></main><script src="../../assets/js/main.js"></script></body></html>`;
}

function hub() {
  const p={title:'울산 분야별 변호사 검색 안내 | 민사·부동산·형사소송',description:'울산민사전문변호사·울산민사소송변호사·울산부동산전문변호사·울산형사소송변호사를 검색할 때 확인할 자격, 사건 경험과 상담 기준을 정리했습니다.'};
  const canonical=`${SITE}/guides/`;
  const schema={'@context':'https://schema.org','@type':'CollectionPage',name:p.title,url:canonical,description:p.description,mainEntity:{'@type':'ItemList',itemListElement:pages.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.keyword,url:`${SITE}/guides/${x.slug}/`}))}};
  return `${commonHead(p,canonical,schema,null,'../')}<body class="practice-page">${header}<main><section class="practice-hero"><div class="practice-inner"><span class="practice-eyebrow">LEGAL KEYWORD GUIDE</span><h1>울산 분야별 변호사 검색 안내</h1><p class="practice-lead">분야별 검색어에 맞는 대표 페이지를 하나씩 연결했습니다. 같은 키워드의 페이지를 반복 생성하지 않아 기존 검색 노출과 경쟁하지 않도록 구성했습니다.</p></div></section><section class="practice-section"><div class="practice-inner"><section class="practice-related"><h2>사건 분야별 확인 페이지</h2><div class="practice-link-grid"><a class="practice-link-card" href="/columns/ulsan-civil-specialist-lawyer-case-review"><b>울산민사전문변호사</b><h3>승소와 회수 가능성 확인</h3><p>기존 대표 칼럼을 유지합니다.</p></a>${pages.map(x=>`<a class="practice-link-card" href="/guides/${x.slug}/"><b>${x.keyword}</b><h3>${x.h1}</h3><p>상담 전 자료와 선임 기준을 확인합니다.</p></a>`).join('')}</div></section><div class="practice-final"><strong>전문분야 표시는 등록 여부를 구분해야 합니다.</strong><p>강성수 변호사는 형사법 전문분야 등록 변호사이며, 다른 분야는 실제 사건 검토 범위와 경험을 기준으로 안내합니다.</p></div></div></section></main><script src="../assets/js/main.js"></script></body></html>`;
}

fs.mkdirSync(path.join(ROOT,'guides'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'guides','index.html'),hub(),'utf8');
for(const p of pages){const dir=path.join(ROOT,'guides',p.slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),detail(p),'utf8');}
console.log(`Built ${pages.length+1} keyword guide pages.`);
