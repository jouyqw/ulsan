const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://ulsanlawyer.kr';
const SITE_NAME = '울산변호사 강성수 | 법무법인 우린';
const SITE_UPDATED = '2026-07-23';
const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/assets/images/og.png`;
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const TODAY = new Date().toISOString().slice(0, 10);

const STATIC_SUCCESS_IMAGES = [
  'assets/images/success/case-drunk-driving-probation.jpg',
  'assets/images/success/indecent-act-appeal-fine-reduced.webp',
  'assets/images/success/case-fraud-probation.jpg',
  'assets/images/success/case-special-assault-fine.jpg',
  'assets/images/success/case-quasi-rape-non-prosecution.jpg',
  'assets/images/success/case-fraud-forgery.jpg',
  'assets/images/success/additional/drunk-driving-4th-fine.jpg',
  'assets/images/success/additional/military-forgery-probation.jpg',
  'assets/images/success/additional/civil-appeal-reversal.png',
  'assets/images/success/additional/civil-settlement-10m.png',
  'assets/images/success/additional/drug-probation.jpg',
  'assets/images/success/additional/fraud-20-probation.jpg',
  'assets/images/success/additional/game-law-probation.webp',
  'assets/images/success/additional/telecom-fraud-probation.jpg',
  'assets/images/success/additional/license-free-accident-fine.jpg',
  'assets/images/success/additional/supreme-court-merge.jpg',
  'assets/images/success/additional/insult-non-prosecution.jpg',
  'assets/images/success/additional/drunk-driving-3rd-probation.jpg',
  'assets/images/success/additional/settlement-content-proof.jpg',
];


const COLUMN_CATEGORIES = [
  { key: 'criminal', label: '형사', test: /형사/ },
  { key: 'sex', label: '성범죄', test: /성범죄|추행|강간|성폭력/ },
  { key: 'drug', label: '마약', test: /마약/ },
  { key: 'dui', label: '음주운전', test: /음주/ },
  { key: 'fraud', label: '사기', test: /사기/ },
  { key: 'affair', label: '상간소송', test: /상간|부정행위/ },
  { key: 'civil', label: '민사·임대차', test: /민사|임대차|부동산|보증금|대여금/ },
  { key: 'info', label: '상담·안내', test: /상담|안내/ },
];

function categoryGroup(raw) {
  const value = String(raw || '');
  for (const group of COLUMN_CATEGORIES) {
    if (group.test.test(value)) return group;
  }
  return { key: 'etc', label: '기타' };
}

// 분야 그룹 -> 실제 상담(분야) 페이지 + 키워드 앵커 텍스트
const PRACTICE_LINKS = {
  criminal: { url: '../criminal/', label: '울산 형사 변호사' },
  sex: { url: '../sex-crime/', label: '울산 성범죄 변호사' },
  drug: { url: '../criminal/', label: '울산 마약 변호사' },
  dui: { url: '../dui/', label: '울산 음주운전 변호사' },
  fraud: { url: '../criminal/', label: '울산 사기 변호사' },
  affair: { url: '../affair-lawsuit/', label: '울산 상간소송 변호사' },
  civil: { url: '../civil/', label: '울산 민사소송 변호사' },
};

function relatedColumns(item, all) {
  const key = categoryGroup(item.category).key;
  const others = all.filter((entry) => entry.slug !== item.slug);
  const sameGroup = others.filter((entry) => categoryGroup(entry.category).key === key);
  const rest = others.filter((entry) => categoryGroup(entry.category).key !== key);
  return [...sameGroup, ...rest].slice(0, 3);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readMarkdownItems(type) {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.md') && !file.startsWith('_'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const { data, body } = parseFrontMatter(raw);
      const slug = data.slug || path.basename(file, '.md');
      return {
        ...data,
        slug,
        body,
        url: `/${type}/${slug}`,
      };
    })
    .sort((a, b) => {
      const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
      if (dateCompare !== 0) return dateCompare;
      return Number(b.order || 0) - Number(a.order || 0);
    });
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const data = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
    data[key] = value;
  });

  return { data, body: match[2].trim() };
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date) {
  return String(date || TODAY).replace(/-/g, '.');
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = [];
  let raw = [];
  let customBlock = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${paragraph.join(' ')}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    html.push('<ul>');
    list.forEach((item) => html.push(`<li>${item}</li>`));
    html.push('</ul>');
    list = [];
  };

  const flushRaw = () => {
    if (!raw.length) return;
    html.push(raw.join('\n'));
    raw = [];
  };

  const renderCustomBlock = (block) => {
    const content = block.lines.join('\n').trim();
    if (!content) return;

    if (block.type === 'summary') {
      html.push(`<div class="article-summary-box">${markdownToHtml(content)}</div>`);
      return;
    }

    if (block.type === 'highlight') {
      html.push(`<div class="article-highlight-box">${markdownToHtml(content)}</div>`);
      return;
    }

    if (block.type === 'cta' || block.type === 'consult') {
      html.push(`<div class="article-cta-box">${markdownToHtml(content)}</div>`);
      return;
    }

    if (block.type === 'crisis') {
      html.push(`<div class="article-crisis-box">${markdownToHtml(content)}</div>`);
      return;
    }

    if (block.type === 'quote') {
      html.push(`<div class="article-quote-box">${markdownToHtml(content)}</div>`);
      return;
    }

    if (block.type === 'strategy') {
      html.push(`<div class="article-strategy-box">${markdownToHtml(content)}</div>`);
      return;
    }

    if (block.type === 'verdict') {
      html.push(`<div class="article-verdict-box">${markdownToHtml(content)}</div>`);
      return;
    }

    if (block.type === 'table') {
      const rows = block.lines
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split('|').map((cell) => inlineMarkdown(cell.trim())));

      html.push('<div class="article-table-wrap"><table class="article-table"><tbody>');
      rows.forEach(([head, value]) => {
        html.push(`<tr><th>${head || ''}</th><td>${value || ''}</td></tr>`);
      });
      html.push('</tbody></table></div>');
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (customBlock) {
      if (trimmed === ':::') {
        renderCustomBlock(customBlock);
        customBlock = null;
      } else {
        customBlock.lines.push(line);
      }
      return;
    }

    if (raw.length) {
      raw.push(line);
      if (/^<\/(div|table|section|blockquote)>/i.test(trimmed)) {
        flushRaw();
      }
      return;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (/^:::(summary|highlight|table|cta|consult|crisis|quote|strategy|verdict)$/.test(trimmed)) {
      flushParagraph();
      flushList();
      customBlock = { type: trimmed.slice(3), lines: [] };
      return;
    }

    if (/^<(div|table|section|blockquote)\b/i.test(trimmed)) {
      flushParagraph();
      flushList();
      raw.push(line);
      if (/^<\/(div|table|section|blockquote)>/i.test(trimmed)) {
        flushRaw();
      }
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      return;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      list.push(inlineMarkdown(trimmed.slice(2)));
      return;
    }

    flushList();
    paragraph.push(inlineMarkdown(trimmed));
  });

  flushParagraph();
  flushList();
  flushRaw();
  if (customBlock) renderCustomBlock(customBlock);
  return html.join('\n');
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/==(.+?)==/g, '<span class="article-underline">$1</span>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function pageHead({
  title,
  description,
  canonical,
  rootPrefix = '../',
  schema,
  ogType = 'website',
  published,
  modified,
}) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="강성수 변호사">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="theme-color" content="#17243d">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" type="application/rss+xml" title="${SITE_NAME} 새 글" href="${SITE_URL}/rss.xml">
    <link rel="icon" type="image/png" href="${rootPrefix}assets/images/logo.png">
    <meta property="og:type" content="${ogType}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${DEFAULT_SOCIAL_IMAGE}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="울산변호사 강성수 - 법무법인 우린">
    <meta property="og:locale" content="ko_KR">
    <meta property="og:site_name" content="법무법인 우린">
    ${published ? `<meta property="article:published_time" content="${published}">` : ''}
    ${modified ? `<meta property="article:modified_time" content="${modified}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${DEFAULT_SOCIAL_IMAGE}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet"></noscript>
    <link rel="stylesheet" href="${rootPrefix}assets/css/style.css">
    ${schema ? `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n    </script>` : ''}
</head>`;
}

function siteHeader(active, rootPrefix = '../') {
  return `<header class="header">
        <div class="header-container">
            <div class="logo"><a href="${rootPrefix}"><img src="${rootPrefix}assets/images/logo.png" alt="법무법인 우린" class="logo-image"></a></div>
            <button class="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="메뉴 열기"><span class="hamburger-line"></span><span class="hamburger-line"></span><span class="hamburger-line"></span></button>
            <nav class="nav" id="mobileNav">
                <a href="${rootPrefix}#home" class="nav-link">홈</a>
                <a href="${rootPrefix}#success" class="nav-link">성공사례</a>
                <a href="${rootPrefix}lawyer/" class="nav-link${active === 'lawyer' ? ' active' : ''}">변호사 소개</a>
                <a href="${rootPrefix}columns/" class="nav-link${active === 'columns' ? ' active' : ''}">칼럼</a>
                <a href="${rootPrefix}cases/" class="nav-link${active === 'cases' ? ' active' : ''}">사례</a>
                <a href="${rootPrefix}#location" class="nav-link">오시는길</a>
            </nav>
        </div>
    </header>`;
}

function bottomBar(rootPrefix = '../') {
  return `<div class="bottom-consult-bar" aria-label="빠른 상담 메뉴">
        <a href="tel:010-7219-9112"><span>전화상담</span></a>
        <a href="https://open.kakao.com/o/se2trwfh" target="_blank" rel="noopener noreferrer"><span>카카오톡</span></a>
        <a href="https://naver.me/F0zsrR8L" target="_blank" rel="noopener noreferrer"><span>네이버예약</span></a>
    </div>`;
}

function articlePage(item, type, all = []) {
  const isCase = type === 'cases';
  const canonical = `${SITE_URL}/${type}/${item.slug}`;
  const title = isCase
    ? `${item.title} | 강성수 변호사`
    : `${item.title} | 강성수 변호사`;
  const schemaType = isCase ? 'Article' : 'BlogPosting';
  const published = item.date || TODAY;
  const modified = item.modified || item.date || TODAY;
  const articleImage = item.image ? `${SITE_URL}/${item.image}` : DEFAULT_SOCIAL_IMAGE;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/lawyer/#person`,
        name: '강성수',
        jobTitle: '변호사',
        url: `${SITE_URL}/lawyer/`,
        worksFor: { '@id': `${SITE_URL}/#legal-service` },
      },
      {
        '@type': 'LegalService',
        '@id': `${SITE_URL}/#legal-service`,
        name: '법무법인 우린',
        url: `${SITE_URL}/`,
        telephone: '+82-52-227-2121',
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/assets/images/logo.png`,
          width: 548,
          height: 164,
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: '법대로 86-6 재송빌딩 3층',
          addressLocality: '남구',
          addressRegion: '울산광역시',
          postalCode: '44645',
          addressCountry: 'KR',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: '법무법인 우린',
        alternateName: '울산변호사 강성수',
        publisher: { '@id': `${SITE_URL}/#legal-service` },
        inLanguage: 'ko-KR',
      },
      {
        '@type': schemaType,
        '@id': `${canonical}#article`,
        headline: item.title,
        description: item.description || item.summary || item.title,
        image: articleImage,
        datePublished: published,
        dateModified: modified,
        inLanguage: 'ko-KR',
        author: { '@id': `${SITE_URL}/lawyer/#person` },
        publisher: { '@id': `${SITE_URL}/#legal-service` },
        mainEntityOfPage: { '@id': canonical },
        about: Array.isArray(item.keywords) ? item.keywords : undefined,
      },
      {
        '@type': 'WebPage',
        '@id': canonical,
        url: canonical,
        name: title,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        primaryImageOfPage: { '@type': 'ImageObject', url: articleImage },
        breadcrumb: { '@id': `${canonical}#breadcrumb` },
        inLanguage: 'ko-KR',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: isCase ? '성공사례' : '법률 칼럼', item: `${SITE_URL}/${type}/` },
          { '@type': 'ListItem', position: 3, name: item.title, item: canonical },
        ],
      },
    ],
  };

  const imageBlock = item.image
    ? `<figure class="article-proof-image"><img src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(item.result || item.category || '성공사례')}</figcaption></figure>`
    : '';
  const consultImageBlock = item.consultImage
    ? `<figure class="article-consult-image"><img src="../${escapeHtml(item.consultImage)}" alt="${escapeHtml(item.consultImageAlt || '변호사 직접 상담 안내')}" loading="lazy" decoding="async"></figure>`
    : '';
  const lawyerBlock = isCase
    ? `<section class="article-lawyer-card">
                    <div class="article-lawyer-photo"><a href="../lawyer/"><img src="../assets/images/lawyer-card.png" alt="법무법인 우린 강성수 변호사" loading="lazy" decoding="async"></a></div>
                    <div class="article-lawyer-copy">
                        <span>LAW FIRM WOORIN</span>
                        <h2><a href="../lawyer/">강성수 변호사가 직접 상담합니다</a></h2>
                        <p>사무장·상담실장을 거치지 않습니다. 사건 초기 검토부터 재판 대응 방향까지 변호사가 직접 사실관계와 증거자료를 확인합니다.</p>
                    </div>
                </section>`
    : '';

  const group = categoryGroup(item.category);
  const practice = !isCase ? PRACTICE_LINKS[group.key] : null;
  const breadcrumbNav = `<nav class="article-breadcrumb" aria-label="현재 위치">
            <a href="../">홈</a><span aria-hidden="true">›</span><a href="../${type}/">${isCase ? '성공사례' : '법률 칼럼'}</a><span aria-hidden="true">›</span><span class="article-breadcrumb-current">${escapeHtml(item.title)}</span>
        </nav>`;
  const related = isCase ? [] : relatedColumns(item, all);
  const relatedSection = related.length ? `<section class="article-related">
            <div class="article-related-inner">
                <h2>같은 분야의 다른 칼럼</h2>
                <div class="column-grid">
                    ${related.map((rel) => `<article class="column-card">
                        <a href="${escapeHtml(rel.slug)}">
                            <span class="column-category">${escapeHtml(categoryGroup(rel.category).label)}</span>
                            <h3>${escapeHtml(rel.title)}</h3>
                            <p>${escapeHtml(rel.summary || rel.description || '')}</p>
                            <span class="column-more">칼럼 읽기</span>
                        </a>
                    </article>`).join('\n                    ')}
                </div>
            </div>
        </section>` : '';
  const practiceBlock = practice ? `<a class="article-practice-link" href="${practice.url}">${escapeHtml(practice.label)} 상담 &rarr;</a>` : '';

  return `${pageHead({ title, description: item.description || item.summary || item.title, canonical, schema, ogType: 'article', published, modified })}
<body class="article-page">
    ${siteHeader(isCase ? 'cases' : 'columns')}
    <main>
        ${breadcrumbNav}
        <section class="article-hero">
            <div class="article-hero-inner">
                <span class="article-eyebrow">${escapeHtml(item.category || (isCase ? '성공사례' : '법률 칼럼'))}</span>
                <h1>${escapeHtml(item.title)}</h1>
                <p>${escapeHtml(item.summary || item.description || '')}</p>
                <div class="article-meta">
                    <span>작성일 ${formatDate(item.date)}</span>
                    <span><a href="../lawyer/">강성수 변호사</a></span>
                    ${isCase && item.result ? `<span>결과 ${escapeHtml(item.result)}</span>` : ''}
                </div>
            </div>
        </section>
        <section class="article-wrap">
            <article class="article-body">
                ${imageBlock}
                ${consultImageBlock}
                ${lawyerBlock}
                ${markdownToHtml(item.body)}
                <p class="article-disclaimer">이 글은 일반적인 법률 정보 제공을 위한 자료이며, 개별 사건의 결과를 보장하지 않습니다. 구체적인 대응은 사실관계와 증거에 따라 달라질 수 있습니다.</p>
            </article>
            <aside class="article-side">
                <h3>${isCase ? '비슷한 사건 상담' : '상담 안내'}</h3>
                <p>사무장·상담실장 없이 변호사가 직접 상담합니다. 사건 자료를 정리해 오시면 더 빠르게 쟁점을 확인할 수 있습니다.</p>
                <a href="tel:010-7219-9112">전화 상담하기</a>
                ${practiceBlock}
            </aside>
        </section>
        ${relatedSection}
    </main>
    ${bottomBar()}
    <script src="../assets/js/main.js?v=20260623-auto"></script>
</body>
</html>
`;
}

const COLUMN_FILTER_SCRIPT = `(function(){
  var grid = document.getElementById('columnGrid');
  if(!grid){return;}
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.column-card'));
  var search = document.getElementById('columnSearch');
  var clearBtn = document.getElementById('columnSearchClear');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.column-chip'));
  var countEl = document.getElementById('columnCount');
  var emptyEl = document.getElementById('columnEmpty');
  var activeCat = 'all';
  function norm(value){return (value||'').toString().toLowerCase().replace(/\\s+/g,'');}
  function apply(){
    var q = norm(search ? search.value : '');
    var shown = 0;
    cards.forEach(function(card){
      var cat = card.getAttribute('data-cat') || '';
      var text = card.getAttribute('data-text') || '';
      var okCat = activeCat === 'all' || cat === activeCat;
      var okQuery = !q || text.indexOf(q) !== -1;
      var show = okCat && okQuery;
      card.style.display = show ? '' : 'none';
      if(show){shown++;}
    });
    if(countEl){countEl.textContent = q || activeCat !== 'all' ? (shown + '개 칼럼') : ('전체 ' + cards.length + '개 칼럼');}
    if(emptyEl){emptyEl.hidden = shown !== 0;}
    if(clearBtn){clearBtn.hidden = !(search && search.value);}
  }
  if(search){search.addEventListener('input', apply);}
  if(clearBtn){clearBtn.addEventListener('click', function(){search.value=''; search.focus(); apply();});}
  chips.forEach(function(chip){
    chip.addEventListener('click', function(){
      chips.forEach(function(other){other.classList.remove('is-active'); other.setAttribute('aria-selected','false');});
      chip.classList.add('is-active');
      chip.setAttribute('aria-selected','true');
      activeCat = chip.getAttribute('data-filter') || 'all';
      apply();
    });
  });
  apply();
})();`;

function listingPage(type, items, cases) {
  const isCase = type === 'cases';
  const title = isCase ? '성공사례 | 울산변호사 강성수' : '법률 칼럼 | 울산변호사 강성수';
  const description = isCase
    ? '울산변호사 강성수 변호사가 직접 수행한 형사·민사·가사 사건의 쟁점, 대응 과정과 결과를 성공사례로 정리했습니다.'
    : '울산 형사·성범죄·마약·음주운전·사기·민사 사건을 강성수 변호사가 쉽게 정리한 법률 칼럼입니다. 검색과 분야별 분류로 원하는 칼럼을 빠르게 찾아보세요.';
  const eyebrow = isCase ? 'Success Cases' : 'Legal Column';
  const h1 = isCase ? '강성수 변호사의 성공사례' : '강성수 변호사의 법률 칼럼';
  const lead = isCase
    ? '실제 결과를 중심으로 사건의 쟁점과 대응 방향을 정리합니다.'
    : '형사·민사 사건에서 의뢰인들이 자주 묻는 질문을 분야별로 정리했습니다. 키워드로 검색하거나 분야를 선택해 보세요.';

  if (isCase) {
    const cards = items.map((item) => `<article class="result-card">
                    <a href="${item.slug}">
                        <div class="result-media"><img src="../${escapeHtml(item.image || 'assets/images/og.png')}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy" decoding="async"><span class="result-stamp">${escapeHtml(item.result || '성공')}</span></div>
                        <div class="result-body"><span class="result-type">${escapeHtml(item.category || '성공사례')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || item.description || '')}</p></div>
                    </a>
                </article>`).join('\n');
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: h1,
      url: `${SITE_URL}/${type}/`,
      publisher: { '@type': 'LegalService', name: '법무법인 우린' },
    };
    return `${pageHead({ title, description, canonical: `${SITE_URL}/${type}/`, schema })}
<body class="columns-page">
    ${siteHeader('cases')}
    <main>
        <section class="columns-hero">
            <div class="columns-hero-inner">
                <span class="column-eyebrow">${eyebrow}</span>
                <h1>${h1}</h1>
                <p>${lead}</p>
            </div>
        </section>
        <section class="columns-content">
            <div class="result-grid">
                ${cards || '<p class="empty-state">등록된 글이 없습니다.</p>'}
            </div>
        </section>
    </main>
    ${bottomBar()}
    <script src="../assets/js/main.js?v=20260623-auto"></script>
</body>
</html>
`;
  }

  // ----- 칼럼 목록 페이지 -----
  const counts = {};
  items.forEach((item) => {
    const key = categoryGroup(item.category).key;
    counts[key] = (counts[key] || 0) + 1;
  });
  const chipDefs = [{ key: 'all', label: '전체' }];
  COLUMN_CATEGORIES.forEach((group) => {
    if (counts[group.key]) chipDefs.push({ key: group.key, label: group.label });
  });
  if (counts.etc) chipDefs.push({ key: 'etc', label: '기타' });

  const chips = chipDefs.map((chip, index) => `<button type="button" class="column-chip${index === 0 ? ' is-active' : ''}" data-filter="${chip.key}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}">${escapeHtml(chip.label)}${chip.key === 'all' ? '' : ` <span class="column-chip-count">${counts[chip.key]}</span>`}</button>`).join('\n                    ');

  const cards = items.map((item) => {
    const group = categoryGroup(item.category);
    const searchText = [item.title, item.summary, item.description, Array.isArray(item.keywords) ? item.keywords.join(' ') : item.keywords, group.label, item.category]
      .filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, '');
    return `<article class="column-card" data-cat="${group.key}" data-text="${escapeHtml(searchText)}">
                    <a href="${item.slug}">
                        <span class="column-category">${escapeHtml(group.label)}</span>
                        <h3>${escapeHtml(item.title)}</h3>
                        <p>${escapeHtml(item.summary || item.description || '')}</p>
                        <span class="column-more">칼럼 읽기</span>
                    </a>
                </article>`;
  }).join('\n');

  const successItems = columnSuccessCards(items, cases);
  const successCards = successItems.map((item) => `<article class="result-card">
                    <a href="${escapeHtml(item.href)}">
                        <div class="result-media"><img src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt)}" loading="lazy" decoding="async"><span class="result-stamp">${escapeHtml(item.result)}</span></div>
                        <div class="result-body"><span class="result-type">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3></div>
                    </a>
                </article>`).join('\n                ');
  const successSection = successItems.length ? `<section class="column-success">
            <div class="column-success-inner">
                <div class="column-success-head">
                    <span class="column-eyebrow">Success Cases</span>
                    <h2>대표 성공사례</h2>
                    <p>강성수 변호사가 직접 이끌어낸 실제 사건 결과입니다.</p>
                </div>
                <div class="result-grid">
                ${successCards}
                </div>
                <div class="column-success-action"><a href="../#success" class="column-list-button">전체 성공사례 보기</a></div>
            </div>
        </section>` : '';

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${SITE_URL}/columns/#blog`,
        name: h1,
        url: `${SITE_URL}/columns/`,
        description,
        inLanguage: 'ko-KR',
        publisher: { '@type': 'LegalService', name: '법무법인 우린', url: `${SITE_URL}/` },
        blogPost: items.slice(0, 20).map((item) => ({
          '@type': 'BlogPosting',
          headline: item.title,
          url: `${SITE_URL}/columns/${item.slug}`,
          datePublished: item.date || TODAY,
          author: { '@type': 'Person', name: '강성수' },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: '법률 칼럼', item: `${SITE_URL}/columns/` },
        ],
      },
    ],
  };

  return `${pageHead({ title, description, canonical: `${SITE_URL}/${type}/`, schema })}
<body class="columns-page">
    ${siteHeader('columns')}
    <main>
        <section class="columns-hero">
            <div class="columns-hero-inner">
                <span class="column-eyebrow">${eyebrow}</span>
                <h1>${h1}</h1>
                <p>${lead}</p>
            </div>
        </section>
        ${successSection}
        <section class="columns-content">
            <div class="column-toolbar">
                <div class="column-search">
                    <svg class="column-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.2-3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    <input type="search" id="columnSearch" class="column-search-input" placeholder="키워드로 검색 (예: 음주운전, 불송치, 상간)" aria-label="칼럼 검색" autocomplete="off">
                    <button type="button" id="columnSearchClear" class="column-search-clear" aria-label="검색어 지우기" hidden>&times;</button>
                </div>
                <div class="column-filters" role="tablist" aria-label="칼럼 분야">
                    ${chips}
                </div>
            </div>
            <p class="column-count" id="columnCount" aria-live="polite">전체 ${items.length}개 칼럼</p>
            <div class="column-grid" id="columnGrid">
                ${cards || '<p class="empty-state">등록된 글이 없습니다.</p>'}
            </div>
            <p class="empty-state" id="columnEmpty" hidden>검색 결과가 없습니다. 다른 키워드로 검색하거나 분야를 바꿔보세요.</p>
        </section>
    </main>
    ${bottomBar()}
    <script src="../assets/js/main.js?v=20260623-auto"></script>
    <script>${COLUMN_FILTER_SCRIPT}</script>
</body>
</html>
`;
}

function homepageColumnCards(items) {
  return items.slice(0, 3).map((item) => `<article class="column-card">
                    <a href="columns/${item.slug}">
                        <span class="column-category">${escapeHtml(item.category || '법률 칼럼')}</span>
                        <h3>${escapeHtml(item.title)}</h3>
                        <p>${escapeHtml(item.summary || item.description || '')}</p>
                        <span class="column-more">칼럼 읽기</span>
                    </a>
                </article>`).join('\n');
}

function resultFromCaseTitle(title) {
  if (title.includes('불송치')) return '불송치';
  if (title.includes('불기소') || title.includes('무혐의') || title.includes('혐의없음')) return '무혐의';
  if (title.includes('집행유예')) return '집행유예';
  if (title.includes('벌금')) return '벌금형';
  if (title.includes('감액') || title.includes('감형')) return '감액';
  if (title.includes('승소') || title.includes('역전') || title.includes('인정')) return '승소';
  if (title.includes('가압류') || title.includes('묶어')) return '가압류';
  if (title.includes('병합')) return '병합심리';
  if (title.includes('조기 해결')) return '조기해결';
  return '성공';
}

function columnSuccessCards(columns, cases) {
  const seen = new Set();
  const fromCases = (cases || [])
    .filter((item) => item.image)
    .map((item) => ({
      title: item.title,
      image: item.image,
      imageAlt: item.imageAlt || item.title,
      result: item.result || resultFromCaseTitle(item.title),
      category: categoryGroup(item.category).label,
      href: `../cases/${item.slug}`,
      date: item.date || '',
    }));
  const fromColumns = (columns || [])
    .filter((item) => item.image && !/guide/i.test(item.slug))
    .map((item) => ({
      title: item.title,
      image: item.image,
      imageAlt: item.imageAlt || item.title,
      result: resultFromCaseTitle(item.title),
      category: categoryGroup(item.category).label,
      href: item.slug,
      date: item.date || '',
    }));
  return [...fromCases, ...fromColumns]
    .filter((item) => {
      if (seen.has(item.title)) return false;
      seen.add(item.title);
      return true;
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);
}

function additionalSuccessCases(items) {
  const rows = [];
  items.forEach((item) => {
    const match = item.body.match(/## 수많은 사건 중 일부 성공사례[\s\S]*?:::table\r?\n([\s\S]*?)\r?\n:::/);
    if (!match) return;
    match[1].split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
      if (line.startsWith('분야 |')) return;
      const [category, title] = line.split('|').map((cell) => cell.trim());
      if (!category || !title) return;
      rows.push({
        category,
        title,
        result: resultFromCaseTitle(title),
        image: STATIC_SUCCESS_IMAGES[rows.length] || 'assets/images/og.png',
        imageAlt: `${title} 자료`,
        href: 'cases/',
      });
    });
  });
  return rows;
}

function homepageCaseCards(items) {
  const seen = new Set();
  const combined = [
    ...items.map((item) => ({ ...item, href: `cases/${item.slug}` })),
    ...additionalSuccessCases(items),
  ].filter((item) => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });

  return combined.slice(0, 20).map((item) => `<article class="result-card"><a href="${escapeHtml(item.href || 'cases/')}"><div class="result-media"><img src="${escapeHtml(item.image || 'assets/images/og.png')}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy" decoding="async"><span class="result-stamp">${escapeHtml(item.result || '성공')}</span></div><div class="result-body"><span class="result-type">${escapeHtml(item.category || '성공사례')}</span><h3>${escapeHtml(item.title)}</h3></div></a></article>`).join('\n                ');
}
function replaceHomepageSections(columns, cases) {
  const indexPath = path.join(ROOT, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, 'utf8');

  if (columns.length) {
    html = html.replace(
      /(<section class="column-preview" id="columns">[\s\S]*?<div class="column-grid">)([\s\S]*?)(<\/div>\s*<div class="column-preview-action">)/,
      `$1\n                ${homepageColumnCards(columns)}\n            $3`
    );
  }

  html = html.replace(
    /(<section class="success-proof" id="proof">[\s\S]*?<p class="section-subtitle">)([\s\S]*?)(<\/p>)/,
    '$1사건별 핵심 결과를 한눈에 볼 수 있도록 정리했습니다.$3'
  );

  html = html.replace(
    /(<section class="success-proof" id="proof">[\s\S]*?<div class="result-grid">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/,
    `$1\n                ${homepageCaseCards(cases)}\n            $3`
  );

  html = html.replace(/href="\.\.\/#consult"/g, 'href="https://naver.me/F0zsrR8L" target="_blank" rel="noopener noreferrer"');
  fs.writeFileSync(indexPath, html, 'utf8');
}

function buildSitemap(columns, cases) {
  const latestContentDate = [...columns, ...cases]
    .map((item) => item.modified || item.date || SITE_UPDATED)
    .sort()
    .pop() || SITE_UPDATED;
  const staticUrls = [
    ['/', SITE_UPDATED],
    ['/lawyer/', SITE_UPDATED],
    ['/criminal/', SITE_UPDATED],
    ['/divorce/', SITE_UPDATED],
    ['/sex-crime/', SITE_UPDATED],
    ['/real-estate/', SITE_UPDATED],
    ['/civil/', SITE_UPDATED],
    ['/affair-lawsuit/', SITE_UPDATED],
    ['/dui/', SITE_UPDATED],
    ['/columns/', latestContentDate],
    ['/cases/', latestContentDate],
    ['/press/', SITE_UPDATED],
  ];

  const urls = staticUrls.map(([url, lastmod]) => ({ loc: `${SITE_URL}${url}`, lastmod }));
  columns.forEach((item) => urls.push({ loc: `${SITE_URL}/columns/${item.slug}`, lastmod: item.modified || item.date || SITE_UPDATED }));
  cases.forEach((item) => urls.push({ loc: `${SITE_URL}/cases/${item.slug}`, lastmod: item.modified || item.date || SITE_UPDATED }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRss(columns, cases) {
  const items = [
    ...columns.map((item) => ({ ...item, type: 'columns' })),
    ...cases.map((item) => ({ ...item, type: 'cases' })),
  ]
    .sort((a, b) => String(b.modified || b.date || '').localeCompare(String(a.modified || a.date || '')))
    .slice(0, 30);
  const latestFeedDate = [SITE_UPDATED, ...items.map((item) => item.modified || item.date || SITE_UPDATED)].sort().pop();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}/</link>
    <description>울산 형사·민사·이혼·성범죄·부동산 사건의 법률 칼럼과 성공사례</description>
    <language>ko-KR</language>
    <lastBuildDate>${new Date(`${latestFeedDate}T00:00:00+09:00`).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items.map((item) => {
    const link = `${SITE_URL}/${item.type}/${item.slug}`;
    const date = new Date(`${item.modified || item.date || SITE_UPDATED}T00:00:00+09:00`).toUTCString();
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${date}</pubDate>
      <category>${escapeXml(item.category || (item.type === 'cases' ? '성공사례' : '법률 칼럼'))}</category>
      <description>${escapeXml(item.description || item.summary || item.title)}</description>
    </item>`;
  }).join('\n')}
  </channel>
</rss>
`;
  fs.writeFileSync(path.join(ROOT, 'rss.xml'), rss, 'utf8');
}

function build() {
  const columns = readMarkdownItems('columns');
  const cases = readMarkdownItems('cases');

  ensureDir(path.join(ROOT, 'columns'));
  ensureDir(path.join(ROOT, 'cases'));

  columns.forEach((item) => fs.writeFileSync(path.join(ROOT, 'columns', `${item.slug}.html`), articlePage(item, 'columns', columns), 'utf8'));
  cases.forEach((item) => fs.writeFileSync(path.join(ROOT, 'cases', `${item.slug}.html`), articlePage(item, 'cases'), 'utf8'));

  fs.writeFileSync(path.join(ROOT, 'columns', 'index.html'), listingPage('columns', columns, cases), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'cases', 'index.html'), listingPage('cases', cases), 'utf8');

  replaceHomepageSections(columns, cases);
  buildSitemap(columns, cases);
  buildRss(columns, cases);

  console.log(`Built ${columns.length} columns and ${cases.length} success cases.`);
}

build();
