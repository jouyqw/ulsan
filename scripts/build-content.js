const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://ulsanlawyer.kr';
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const TODAY = new Date().toISOString().slice(0, 10);

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
        url: `/${type}/${slug}.html`,
      };
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
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

    if (block.type === 'cta') {
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

    if (/^:::(summary|highlight|table|cta|crisis|quote|strategy|verdict)$/.test(trimmed)) {
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

function pageHead({ title, description, canonical, rootPrefix = '../', schema }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/png" href="${rootPrefix}assets/images/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
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
                <a href="${rootPrefix}columns/" class="nav-link${active === 'columns' ? ' active' : ''}">칼럼</a>
                <a href="${rootPrefix}cases/" class="nav-link${active === 'cases' ? ' active' : ''}">사례</a>
                <a href="${rootPrefix}#location" class="nav-link">오시는길</a>
            </nav>
        </div>
    </header>`;
}

function bottomBar(rootPrefix = '../') {
  return `<div class="bottom-consult-bar" aria-label="빠른 상담 메뉴">
        <a href="tel:010-7219-9112"><i class="fas fa-phone-alt"></i><span>전화상담</span></a>
        <a href="https://open.kakao.com/o/se2trwfh" target="_blank" rel="noopener noreferrer"><i class="fas fa-comment"></i><span>카카오톡</span></a>
        <a href="https://naver.me/GEXyUXf6" target="_blank" rel="noopener noreferrer"><i class="fas fa-calendar-check"></i><span>네이버예약</span></a>
    </div>`;
}

function articlePage(item, type) {
  const isCase = type === 'cases';
  const canonical = `${SITE_URL}/${type}/${item.slug}.html`;
  const title = isCase
    ? `${item.title} | 울산변호사 강성수 성공사례`
    : `${item.title} | 울산변호사 강성수 칼럼`;
  const schemaType = isCase ? 'Article' : 'BlogPosting';
  const schema = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    headline: item.title,
    description: item.description || item.summary || item.title,
    datePublished: item.date || TODAY,
    dateModified: item.modified || item.date || TODAY,
    author: { '@type': 'Person', name: '강성수 변호사' },
    publisher: { '@type': 'LegalService', name: '법무법인 우린' },
    mainEntityOfPage: canonical,
  };

  const imageBlock = isCase && item.image
    ? `<figure class="article-proof-image"><img src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.title)}"><figcaption>${escapeHtml(item.result || '성공사례')}</figcaption></figure>`
    : '';
  const lawyerBlock = isCase
    ? `<section class="article-lawyer-card">
                    <div class="article-lawyer-photo"><img src="../assets/images/lawyer-card.png" alt="법무법인 우린 강성수 변호사"></div>
                    <div class="article-lawyer-copy">
                        <span>LAW FIRM WOORIN</span>
                        <h2>강성수 변호사가 직접 상담합니다</h2>
                        <p>사무장·상담실장을 거치지 않습니다. 사건 초기 검토부터 재판 대응 방향까지 변호사가 직접 사실관계와 증거자료를 확인합니다.</p>
                    </div>
                </section>`
    : '';

  return `${pageHead({ title, description: item.description || item.summary || item.title, canonical, schema })}
<body class="article-page">
    ${siteHeader(isCase ? 'cases' : 'columns')}
    <main>
        <section class="article-hero">
            <div class="article-hero-inner">
                <span class="article-eyebrow">${escapeHtml(item.category || (isCase ? '성공사례' : '법률 칼럼'))}</span>
                <h1>${escapeHtml(item.title)}</h1>
                <p>${escapeHtml(item.summary || item.description || '')}</p>
                <div class="article-meta">
                    <span>작성일 ${formatDate(item.date)}</span>
                    <span>강성수 변호사</span>
                    ${isCase && item.result ? `<span>결과 ${escapeHtml(item.result)}</span>` : ''}
                </div>
            </div>
        </section>
        <section class="article-wrap">
            <article class="article-body">
                ${imageBlock}
                ${lawyerBlock}
                ${markdownToHtml(item.body)}
                <p class="article-disclaimer">이 글은 일반적인 법률 정보 제공을 위한 자료이며, 개별 사건의 결과를 보장하지 않습니다. 구체적인 대응은 사실관계와 증거에 따라 달라질 수 있습니다.</p>
            </article>
            <aside class="article-side">
                <h3>${isCase ? '비슷한 사건 상담' : '상담 안내'}</h3>
                <p>사무장·상담실장 없이 변호사가 직접 상담합니다. 사건 자료를 정리해 오시면 더 빠르게 쟁점을 확인할 수 있습니다.</p>
                <a href="tel:010-7219-9112">전화 상담하기</a>
            </aside>
        </section>
    </main>
    ${bottomBar()}
    <script src="../assets/js/main.js?v=20260623-auto"></script>
</body>
</html>
`;
}

function listingPage(type, items) {
  const isCase = type === 'cases';
  const title = isCase ? '성공사례 | 울산변호사 강성수' : '법률 칼럼 | 울산변호사 강성수';
  const description = isCase
    ? '울산변호사 강성수 변호사의 형사·민사·가사 성공사례를 정리했습니다.'
    : '울산 형사, 민사, 임대차, 법률상담 쟁점을 강성수 변호사가 쉽게 정리한 법률 칼럼입니다.';
  const eyebrow = isCase ? 'Success Cases' : 'Legal Column';
  const h1 = isCase ? '강성수 변호사의 성공사례' : '강성수 변호사의 법률 칼럼';
  const lead = isCase
    ? '실제 결과를 중심으로 사건의 쟁점과 대응 방향을 정리합니다.'
    : '형사·민사 사건에서 의뢰인들이 자주 묻는 질문을 쉽게 정리합니다.';
  const cardClass = isCase ? 'result-card' : 'column-card';
  const gridClass = isCase ? 'result-grid' : 'column-grid';

  const cards = items.map((item) => {
    if (isCase) {
      return `<article class="${cardClass}">
                    <a href="${item.slug}.html">
                        <div class="result-media"><img src="../${escapeHtml(item.image || 'assets/images/og.png')}" alt="${escapeHtml(item.imageAlt || item.title)}"><span class="result-stamp">${escapeHtml(item.result || '성공')}</span></div>
                        <div class="result-body"><span class="result-type">${escapeHtml(item.category || '성공사례')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || item.description || '')}</p></div>
                    </a>
                </article>`;
    }
    return `<article class="${cardClass}">
                    <a href="${item.slug}.html">
                        <span class="column-category">${escapeHtml(item.category || '법률 칼럼')}</span>
                        <h3>${escapeHtml(item.title)}</h3>
                        <p>${escapeHtml(item.summary || item.description || '')}</p>
                        <span class="column-more">칼럼 읽기</span>
                    </a>
                </article>`;
  }).join('\n');

  const schema = {
    '@context': 'https://schema.org',
    '@type': isCase ? 'CollectionPage' : 'Blog',
    name: h1,
    url: `${SITE_URL}/${type}/`,
    publisher: { '@type': 'LegalService', name: '법무법인 우린' },
  };

  return `${pageHead({ title, description, canonical: `${SITE_URL}/${type}/`, schema })}
<body class="columns-page">
    ${siteHeader(isCase ? 'cases' : 'columns')}
    <main>
        <section class="columns-hero">
            <div class="columns-hero-inner">
                <span class="column-eyebrow">${eyebrow}</span>
                <h1>${h1}</h1>
                <p>${lead}</p>
            </div>
        </section>
        <section class="columns-content">
            <div class="${gridClass}">
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

function homepageColumnCards(items) {
  return items.slice(0, 3).map((item) => `<article class="column-card">
                    <a href="columns/${item.slug}.html">
                        <span class="column-category">${escapeHtml(item.category || '법률 칼럼')}</span>
                        <h3>${escapeHtml(item.title)}</h3>
                        <p>${escapeHtml(item.summary || item.description || '')}</p>
                        <span class="column-more">칼럼 읽기</span>
                    </a>
                </article>`).join('\n');
}

function homepageCaseCards(items) {
  return items.slice(0, 18).map((item) => `<article class="result-card"><a href="cases/${item.slug}.html"><div class="result-media"><img src="${escapeHtml(item.image || 'assets/images/og.png')}" alt="${escapeHtml(item.imageAlt || item.title)}"><span class="result-stamp">${escapeHtml(item.result || '성공')}</span></div><div class="result-body"><span class="result-type">${escapeHtml(item.category || '성공사례')}</span><h3>${escapeHtml(item.title)}</h3></div></a></article>`).join('\n                ');
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

  if (cases.length) {
    html = html.replace(
      /(<section class="success-proof" id="proof">[\s\S]*?<div class="result-grid">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/,
      `$1\n                ${homepageCaseCards(cases)}\n            $3`
    );
  }

  html = html.replace(/href="\.\.\/#consult"/g, 'href="https://naver.me/GEXyUXf6" target="_blank" rel="noopener noreferrer"');
  fs.writeFileSync(indexPath, html, 'utf8');
}

function buildSitemap(columns, cases) {
  const baseUrls = [
    ['/', 'weekly', '1.0'],
    ['/#success', 'monthly', '0.8'],
    ['/#proof', 'weekly', '0.9'],
    ['/#features', 'monthly', '0.8'],
    ['/#reviews', 'weekly', '0.8'],
    ['/#location', 'monthly', '0.8'],
    ['/columns/', 'weekly', '0.9'],
    ['/cases/', 'weekly', '0.9'],
    ['/press/', 'weekly', '0.8'],
  ];

  const urls = baseUrls.map(([url, freq, priority]) => ({ loc: `${SITE_URL}${url}`, lastmod: TODAY, freq, priority }));
  columns.forEach((item) => urls.push({ loc: `${SITE_URL}/columns/${item.slug}.html`, lastmod: item.date || TODAY, freq: 'monthly', priority: '0.8' }));
  cases.forEach((item) => urls.push({ loc: `${SITE_URL}/cases/${item.slug}.html`, lastmod: item.date || TODAY, freq: 'monthly', priority: '0.8' }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.freq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
}

function build() {
  const columns = readMarkdownItems('columns');
  const cases = readMarkdownItems('cases');

  ensureDir(path.join(ROOT, 'columns'));
  ensureDir(path.join(ROOT, 'cases'));

  columns.forEach((item) => fs.writeFileSync(path.join(ROOT, 'columns', `${item.slug}.html`), articlePage(item, 'columns'), 'utf8'));
  cases.forEach((item) => fs.writeFileSync(path.join(ROOT, 'cases', `${item.slug}.html`), articlePage(item, 'cases'), 'utf8'));

  fs.writeFileSync(path.join(ROOT, 'columns', 'index.html'), listingPage('columns', columns), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'cases', 'index.html'), listingPage('cases', cases), 'utf8');

  replaceHomepageSections(columns, cases);
  buildSitemap(columns, cases);

  console.log(`Built ${columns.length} columns and ${cases.length} success cases.`);
}

build();
