const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://ulsanlawyer.kr';
const UPDATED = '2026-11-02';

const areas = [
  {
    slug: 'yangsan', name: '양산', eyebrow: 'YANGSAN LEGAL CONSULTATION',
    title: '양산변호사 상담 | 울산 인접 지역 형사·민사·이혼 사건',
    description: '양산에서 울산 인접 변호사를 찾는 분을 위한 상담 안내입니다. 형사·성범죄·교통사고·이혼·민사 사건을 강성수 변호사가 울산 사무실에서 직접 검토합니다.',
    lead: '양산에서 울산 생활권 변호사를 찾는 분을 위해 경찰조사부터 재판, 민사·가사 절차까지 상담 범위를 정리했습니다. 사무실은 울산 남구에 있으며 방문 전 전화로 사건 단계와 필요한 자료를 먼저 확인할 수 있습니다.',
    context: '양산은 울산과 통근·사업·거래 관계가 이어지는 경우가 많아 사건 장소와 당사자의 거주지가 서로 다른 사례가 적지 않습니다. 관할만 보고 대응을 늦추지 말고, 현재 수사·소송 단계와 제출기한부터 확인해야 합니다.',
    keywords: ['양산변호사','양산형사변호사','양산이혼변호사','양산교통사고변호사','양산법률상담']
  },
  {
    slug: 'gyeongju', name: '경주', eyebrow: 'GYEONGJU LEGAL CONSULTATION',
    title: '경주변호사 상담 | 울산 인접 지역 형사·교통·민사 대응',
    description: '경주에서 울산 인접 변호사를 찾는 분을 위한 법률상담 안내입니다. 형사·교통사고·산재·민사 사건을 강성수 변호사가 울산 사무실에서 직접 검토합니다.',
    lead: '경주와 울산을 오가는 과정에서 발생한 형사·교통·산재·민사 사건은 사고 장소, 근무지와 거주지가 다를 수 있습니다. 울산 남구 사무실 방문 전 기록과 일정을 먼저 확인해 상담 범위를 정합니다.',
    context: '경주 사건이라고 해서 모든 절차가 한 기관에서 진행되는 것은 아닙니다. 신고 장소, 사고 지점, 계약 이행지와 상대방 주소 등에 따라 관할이 달라질 수 있으므로 서류에 적힌 기관과 기한을 기준으로 준비해야 합니다.',
    keywords: ['경주변호사','경주형사변호사','경주교통사고변호사','경주산재변호사','경주법률상담']
  },
  {
    slug: 'gijang', name: '부산 기장', eyebrow: 'GIJANG LEGAL CONSULTATION',
    title: '기장변호사 상담 | 울산 인접 지역 형사·이혼·민사 사건',
    description: '부산 기장에서 울산 인접 변호사를 찾는 분을 위한 상담 안내입니다. 형사·성범죄·이혼·민사·부동산 사건을 강성수 변호사가 직접 검토합니다.',
    lead: '부산 기장과 울산을 오가며 생긴 형사·가사·민사 분쟁은 생활권은 가깝지만 사건별 관할과 절차가 다를 수 있습니다. 울산 남구 사무실에서 자료를 직접 확인하고 다음 대응 순서를 정합니다.',
    context: '기장 거주자라도 사건이 울산에서 발생했거나 상대방·사업장이 울산에 있으면 울산 기관에서 절차가 진행될 수 있습니다. 반대로 부산에서 진행되는 사건도 있으므로 출석요구서, 고소장, 소장에 적힌 기관을 먼저 확인하는 것이 중요합니다.',
    keywords: ['기장변호사','부산기장변호사','기장형사변호사','기장이혼변호사','기장법률상담']
  },
  {
    slug: 'miryang', name: '밀양', eyebrow: 'MIRYANG LEGAL CONSULTATION',
    title: '밀양변호사 상담 | 울산 인접 지역 형사·민사·상속 사건',
    description: '밀양에서 울산 인접 변호사를 찾는 분을 위한 법률상담 안내입니다. 형사·민사·상속·부동산 사건을 강성수 변호사가 울산 사무실에서 직접 검토합니다.',
    lead: '밀양과 울산 사이의 가족·사업·부동산 관계에서 발생한 사건은 여러 지역의 자료와 당사자가 얽힐 수 있습니다. 울산 남구 사무실 방문 전에 사건 서류와 기한을 확인해 필요한 상담 자료를 안내합니다.',
    context: '상속인이나 계약 당사자가 여러 지역에 거주하면 어디에서 상담받아야 할지부터 고민하게 됩니다. 변호사 선택과 법원의 관할은 같은 문제가 아니므로, 먼저 사건 유형과 현재 접수된 기관을 확인한 뒤 대응하면 됩니다.',
    keywords: ['밀양변호사','밀양형사변호사','밀양민사변호사','밀양상속변호사','밀양법률상담']
  }
];

const header = `<header class="header"><div class="header-container"><div class="logo"><a href="/" class="text-logo header-text-logo" aria-label="울산형사전문변호사 강성수 홈"><strong>울산형사전문변호사 강성수</strong></a></div><nav class="nav"><a href="/" class="nav-link">홈</a><a href="/lawyer/" class="nav-link">변호사 소개</a><a href="/columns/" class="nav-link">칼럼</a><a href="/cases/" class="nav-link">성공사례</a><a href="/areas/" class="nav-link active">인접 지역</a></nav></div></header>`;

function head({ title, description, canonical, root, schema, faq }) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title><meta name="description" content="${description}"><meta name="author" content="강성수 변호사"><meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"><meta name="theme-color" content="#17243d">
<link rel="canonical" href="${canonical}"><link rel="icon" type="image/png" sizes="512x512" href="${SITE}/assets/images/favicon-v2.png"><link rel="apple-touch-icon" href="${SITE}/assets/images/favicon-v2.png"><link rel="alternate" type="application/rss+xml" title="울산변호사 강성수 새 글" href="${SITE}/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap">
<link rel="stylesheet" href="${root}assets/css/style.css?v=20261019-responsive"><link rel="stylesheet" href="${root}assets/css/practice.css?v=20261019-responsive">
<meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${SITE}/assets/images/lawyer-direct-consultation.webp"><meta property="og:image:alt" content="울산변호사 강성수 변호사"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="울산변호사 강성수">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${SITE}/assets/images/lawyer-direct-consultation.webp">
<script type="application/ld+json">${JSON.stringify(schema)}</script>${faq ? `
<script type="application/ld+json">${JSON.stringify(faq)}</script>` : ''}</head>`;
}

function cards(areaName) {
  return `<div class="practice-link-grid">
<a class="practice-link-card" href="/criminal/"><b>${areaName} 형사변호사 상담</b><h3>경찰조사·구속·사기 사건</h3><p>첫 진술 전 사실관계와 증거, 출석 일정을 확인합니다.</p></a>
<a class="practice-link-card" href="/sex-crime/"><b>${areaName} 성범죄변호사 상담</b><h3>진술과 디지털 증거 검토</h3><p>메신저, 통화와 이동 기록을 진술 내용과 대조합니다.</p></a>
<a class="practice-link-card" href="/traffic-accident/"><b>${areaName} 교통사고변호사 상담</b><h3>사고·보험·형사합의 대응</h3><p>블랙박스와 피해 회복 자료를 함께 검토합니다.</p></a>
<a class="practice-link-card" href="/divorce/"><b>${areaName} 이혼변호사 상담</b><h3>재산분할·양육권·위자료</h3><p>혼인 기간의 재산과 자녀 관련 자료를 정리합니다.</p></a>
<a class="practice-link-card" href="/civil/"><b>${areaName} 민사변호사 상담</b><h3>대여금·손해배상·집행</h3><p>계약서와 송금 내역을 토대로 회수 가능성을 살핍니다.</p></a>
<a class="practice-link-card" href="/inheritance/"><b>${areaName} 상속변호사 상담</b><h3>상속재산분할·유류분</h3><p>가족관계와 재산 변동 자료부터 확인합니다.</p></a></div>`;
}

function areaPage(a) {
  const canonical = `${SITE}/areas/${a.slug}/`;
  const questions = [
    [`${a.name}에 사무실이 있나요?`, `아닙니다. 사무실은 울산 남구 법대로 86-6에 있습니다. ${a.name} 거주자도 전화로 사건 개요를 확인한 뒤 방문상담을 예약할 수 있습니다.`],
    ['다른 지역 사건도 상담할 수 있나요?', '가능합니다. 다만 사건 유형과 진행 기관에 따라 관할과 출석 일정이 다르므로 받은 서류를 먼저 확인해야 합니다.'],
    ['방문 전에 무엇을 보내야 하나요?', '출석요구서, 고소장, 소장, 처분서와 사건 경위를 날짜순으로 정리한 메모를 준비하면 상담 범위를 빠르게 확인할 수 있습니다.']
  ];
  const schema = {'@context':'https://schema.org','@type':'LegalService',name:`${a.name} 변호사 상담 | 강성수 변호사`,url:canonical,telephone:'+82-52-227-2121',address:{'@type':'PostalAddress',streetAddress:'법대로 86-6 재송빌딩 3층',addressLocality:'남구',addressRegion:'울산광역시',postalCode:'44645',addressCountry:'KR'},areaServed:[a.name,'울산광역시'],employee:{'@id':`${SITE}/lawyer/#person`},knowsAbout:a.keywords};
  const faq = {'@context':'https://schema.org','@type':'FAQPage',mainEntity:questions.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))};
  return `${head({title:a.title,description:a.description,canonical,root:'../../',schema,faq})}
<body class="practice-page">${header}<main><section class="practice-hero"><div class="practice-inner"><span class="practice-eyebrow">${a.eyebrow}</span><h1>${a.name}변호사 상담, 울산 인접 생활권 사건을 직접 검토합니다</h1><p class="practice-lead">${a.lead}</p><div class="practice-actions"><a class="practice-btn primary" href="tel:010-7219-9112">전화 상담</a><a class="practice-btn secondary" href="https://open.kakao.com/o/se2trwfh" target="_blank" rel="noopener noreferrer">카카오톡 상담</a></div></div></section>
<section class="practice-section"><div class="practice-inner"><div class="practice-grid"><article class="practice-card"><h2>${a.name} 사건 상담에서 먼저 확인할 것</h2><p>${a.context}</p><ul class="practice-list"><li>현재 사건을 담당하는 경찰서·검찰청·법원</li><li>출석일, 답변서·항소장 등 가장 가까운 기한</li><li>계약서, 문자, 녹취, 송금·위치 자료</li><li>원하는 결과와 상대방과의 연락 경위</li></ul></article><article class="practice-card"><h3>지역명보다 사건 단계가 먼저입니다</h3><p>사무실 위치만으로 관할이나 결과가 정해지지 않습니다. 받은 문서와 현재 단계를 기준으로 필요한 대응을 정합니다.</p></article></div>
<section class="practice-related"><h2>${a.name} 분야별 법률상담</h2>${cards(a.name)}</section>
<section class="practice-faq"><h2>${a.name} 법률상담 자주 묻는 질문</h2><div class="practice-faq-grid">${questions.map(([q,v])=>`<article><h3>${q}</h3><p>${v}</p></article>`).join('')}</div></section>
<section class="practice-related"><h2>울산 인접 지역 상담 안내</h2><div class="practice-link-grid"><a class="practice-link-card" href="/areas/"><b>지역 안내 전체보기</b><h3>울산 생활권 법률상담</h3><p>양산·경주·기장·밀양 상담 페이지를 확인합니다.</p></a>${areas.filter(x=>x.slug!==a.slug).map(x=>`<a class="practice-link-card" href="/areas/${x.slug}/"><b>${x.name}변호사 상담</b><h3>${x.name} 지역 안내</h3><p>사건 단계와 준비 자료를 확인합니다.</p></a>`).join('')}</div></section>
<div class="practice-final"><strong>사무실은 울산 남구에 있습니다.</strong><p>${a.name} 거주자는 방문 전 전화나 카카오톡으로 사건 종류와 필요한 자료를 먼저 확인해 주세요.</p></div></div></section></main><script src="../../assets/js/main.js"></script></body></html>`;
}

function hubPage() {
  const title = '울산 인접 지역 변호사 상담 | 양산·경주·기장·밀양';
  const description = '울산과 생활권이 이어지는 양산·경주·부산 기장·밀양 지역의 형사·민사·이혼·교통사고 법률상담 안내입니다. 사무실은 울산 남구에 있습니다.';
  const canonical = `${SITE}/areas/`;
  const schema = {'@context':'https://schema.org','@type':'CollectionPage',name:title,url:canonical,description,mainEntity:{'@type':'ItemList',itemListElement:areas.map((a,i)=>({'@type':'ListItem',position:i+1,name:`${a.name}변호사 상담`,url:`${SITE}/areas/${a.slug}/`}))}};
  return `${head({title,description,canonical,root:'../',schema})}<body class="practice-page">${header}<main><section class="practice-hero"><div class="practice-inner"><span class="practice-eyebrow">NEAR ULSAN</span><h1>울산 인접 지역 변호사 상담 안내</h1><p class="practice-lead">양산·경주·부산 기장·밀양에서 울산 생활권 변호사를 찾는 분을 위한 지역별 안내입니다. 사무실 소재지는 울산 남구이며, 지역 사무실이 있는 것처럼 표시하지 않습니다.</p><div class="practice-actions"><a class="practice-btn primary" href="tel:010-7219-9112">전화 상담</a><a class="practice-btn secondary" href="https://open.kakao.com/o/se2trwfh" target="_blank" rel="noopener noreferrer">카카오톡 상담</a></div></div></section><section class="practice-section"><div class="practice-inner"><section class="practice-related"><h2>지역별 상담 페이지</h2><div class="practice-link-grid">${areas.map(a=>`<a class="practice-link-card" href="/areas/${a.slug}/"><b>${a.name}변호사</b><h3>${a.name} 법률상담 안내</h3><p>형사·민사·이혼·교통사고 사건의 준비 자료와 상담 범위를 확인합니다.</p></a>`).join('')}</div></section><div class="practice-grid"><article class="practice-card"><h2>기존 울산 분야별 페이지는 그대로 유지합니다</h2><p>현재 검색 노출 신호가 있는 울산 형사·이혼·민사·교통사고 등 기존 페이지의 제목과 본문은 변경하지 않았습니다. 인접 지역은 별도 주소로 분리해 검색 의도가 섞이지 않도록 구성했습니다.</p></article><article class="practice-card"><h3>상담 전 확인할 자료</h3><ul class="practice-list"><li>사건번호와 담당 기관</li><li>출석·제출 기한</li><li>사건 경위와 핵심 증거</li><li>상대방과의 최근 연락</li></ul></article></div><div class="practice-final"><strong>강성수 변호사가 자료를 직접 확인합니다.</strong><p>방문 전 사건 단계와 상담 가능 범위를 먼저 문의해 주세요.</p></div></div></section></main><script src="../assets/js/main.js"></script></body></html>`;
}

fs.mkdirSync(path.join(ROOT, 'areas'), {recursive:true});
fs.writeFileSync(path.join(ROOT, 'areas', 'index.html'), hubPage(), 'utf8');
for (const area of areas) {
  const dir = path.join(ROOT, 'areas', area.slug);
  fs.mkdirSync(dir, {recursive:true});
  fs.writeFileSync(path.join(dir, 'index.html'), areaPage(area), 'utf8');
}
console.log(`Built ${areas.length + 1} area pages (${UPDATED}).`);
