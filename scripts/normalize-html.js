const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://ulsanlawyer.kr';
const ASSET_VERSION = '20260724-3';
const DEFAULT_IMAGE = `${SITE_URL}/assets/images/og.png`;
const PRACTICE_PATHS = new Set([
  '/criminal/',
  '/divorce/',
  '/sex-crime/',
  '/real-estate/',
  '/civil/',
  '/affair-lawsuit/',
  '/dui/',
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(['"])(.*?)\\1`, 'i'));
  return match ? match[2] : '';
}

function readJpegSize(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebpSize(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === 'VP8L' && buffer.length >= 25) {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    return {
      width: 1 + (b1 | ((b2 & 0x3f) << 8)),
      height: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)),
    };
  }
  return null;
}

function imageSize(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) return readJpegSize(buffer);
  if (buffer.length >= 30) return readWebpSize(buffer);
  return null;
}

function localImagePath(htmlPath, src) {
  const clean = src.split(/[?#]/)[0];
  if (/^(?:data:|https?:|\/\/)/i.test(clean)) {
    if (!clean.startsWith(SITE_URL)) return null;
    return path.join(ROOT, new URL(clean).pathname.replace(/^\//, ''));
  }
  return clean.startsWith('/')
    ? path.join(ROOT, clean.replace(/^\//, ''))
    : path.resolve(path.dirname(htmlPath), clean);
}

function normalizeImages(html, htmlPath) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = getAttribute(tag, 'src');
    if (!src) return tag;
    const filePath = localImagePath(htmlPath, src);
    const size = filePath ? imageSize(filePath) : null;
    const isPriority = /profile-main-image/.test(tag);
    const isLogo = /logo-image|footer-logo/.test(tag);
    const attrs = [];

    if (size && !/\swidth=/i.test(tag)) attrs.push(`width="${size.width}"`);
    if (size && !/\sheight=/i.test(tag)) attrs.push(`height="${size.height}"`);
    if (!/\sloading=/i.test(tag)) attrs.push(`loading="${isPriority || isLogo ? 'eager' : 'lazy'}"`);
    if (!/\sdecoding=/i.test(tag)) attrs.push('decoding="async"');
    if (isPriority && !/\sfetchpriority=/i.test(tag)) attrs.push('fetchpriority="high"');
    if (!attrs.length) return tag;
    return tag.replace(/\s*\/?>$/, (ending) => ` ${attrs.join(' ')}${ending.includes('/') ? ' />' : '>'}`);
  });
}

function normalizeHead(html) {
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim();
  const description = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1]?.trim();
  const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1]?.trim();
  if (!title || !description || !canonical) return html;

  if (!/name="author"/i.test(html)) {
    html = html.replace(/(<meta\s+name="description"[^>]*>)/i, '$1\n    <meta name="author" content="강성수 변호사">');
  }
  if (!/name="theme-color"/i.test(html)) {
    html = html.replace(/(<meta\s+name="author"[^>]*>)/i, '$1\n    <meta name="theme-color" content="#17243d">');
  }
  html = html.replace(
    /<meta\s+name="robots"\s+content="index, follow"\s*\/?\s*>/i,
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'
  );
  if (!/type="application\/rss\+xml"/i.test(html)) {
    html = html.replace(
      /(<link\s+rel="canonical"[^>]*>)/i,
      `$1\n    <link rel="alternate" type="application/rss+xml" title="울산변호사 강성수 새 글" href="${SITE_URL}/rss.xml">`
    );
  }
  if (!/property="og:title"/i.test(html)) {
    const ogType = /\/columns\/|\/cases\//.test(canonical) && !/\/(?:columns|cases)\/$/.test(canonical) ? 'article' : 'website';
    const block = `    <meta property="og:type" content="${ogType}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${DEFAULT_IMAGE}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="울산변호사 강성수 - 법무법인 우린">
    <meta property="og:locale" content="ko_KR">
    <meta property="og:site_name" content="법무법인 우린">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${DEFAULT_IMAGE}">
`;
    html = html.replace(/<\/head>/i, `${block}</head>`);
  }

  const canonicalPath = new URL(canonical).pathname;
  if (PRACTICE_PATHS.has(canonicalPath)) {
    html = html.replace(
      '"telephone":"+82-10-7219-9112","areaServed":["울산광역시"],',
      '"telephone":"+82-52-227-2121","contactPoint":{"@type":"ContactPoint","telephone":"+82-10-7219-9112","contactType":"법률 상담"},"address":{"@type":"PostalAddress","streetAddress":"법대로 86-6 재송빌딩 3층","addressLocality":"남구","addressRegion":"울산광역시","postalCode":"44645","addressCountry":"KR"},"parentOrganization":{"@id":"https://ulsanlawyer.kr/#legal-service"},"employee":{"@id":"https://ulsanlawyer.kr/lawyer/#person"},"areaServed":["울산광역시","울산 남구","울산 중구","울산 동구","울산 북구","울산 울주군"],'
    );
    if (!/"@type"\s*:\s*"BreadcrumbList"/.test(html)) {
      const h1 = (html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i) || [])[1]
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const breadcrumb = `    <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"홈","item":"${SITE_URL}/"},{"@type":"ListItem","position":2,"name":"${h1 || title}","item":"${canonical}"}]}
    </script>
`;
      html = html.replace(/<\/head>/i, `${breadcrumb}</head>`);
    }
  }
  return html;
}

function normalizeNavigation(html) {
  if (/href="\.\.\/lawyer\/"/.test(html)) return html;
  return html.replace(
    /(<a href="\.\.\/columns\/" class="nav-link)/,
    '<a href="../lawyer/" class="nav-link">변호사 소개</a>$1'
  );
}

function normalizeInternalLinks(html) {
  return html.replace(/href=(['"])(.*?)\1/gi, (full, quote, href) => {
    if (/^(?:mailto:|tel:|javascript:|#|\/\/)/i.test(href)) return full;
    if (/^https?:/i.test(href) && !href.startsWith(SITE_URL)) return full;
    const [beforeHash, hash = ''] = href.split('#', 2);
    const [pathname, query = ''] = beforeHash.split('?', 2);
    if (!pathname.endsWith('.html')) return full;
    const normalized = `${pathname.slice(0, -5)}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
    return `href=${quote}${normalized}${quote}`;
  });
}

// 외부 CDN 에서 오는 CSS(구글 폰트, Font Awesome)는 첫 화면 렌더링을 막는다.
// 본문 글자가 먼저 보이도록 비동기 로딩 패턴으로 바꾸고 JS 없는 환경용 noscript 를 붙인다.
// 이미 media 속성이 있거나 noscript 안에 있는 링크는 건드리지 않는다.
const DEFERRABLE_CSS = /(?:fonts\.googleapis\.com|font-awesome)/i;

function deferBlockingStylesheets(html) {
  // noscript 블록은 그대로 두어야 하므로 잠시 빼놓는다.
  const stash = [];
  let work = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, (block) => {
    stash.push(block);
    return `__NOSCRIPT_${stash.length - 1}__`;
  });

  work = work.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel=["']stylesheet["']/i.test(tag)) return tag;
    if (/\bmedia=/i.test(tag)) return tag;
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href || !/^https?:/i.test(href) || !DEFERRABLE_CSS.test(href)) return tag;

    const origin = new URL(href).origin;
    return `<link rel="preconnect" href="${origin}" crossorigin>`
      + `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'">`
      + `<noscript><link rel="stylesheet" href="${href}"></noscript>`;
  });

  return work.replace(/__NOSCRIPT_(\d+)__/g, (_m, i) => stash[Number(i)]);
}

// 화면에 보이는 "자주 묻는 질문" 블록에서 FAQPage 구조화 데이터를 만들어 넣는다.
// 본문을 고치면 스키마도 같이 바뀌므로 손으로 관리할 필요가 없다.
// 구글 리치결과와 AI 검색 인용의 근거가 되는 부분이다.
function plainText(value = '') {
  return String(value)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractVisibleFaq(html) {
  const grid = html.match(/<div class="practice-faq-grid">([\s\S]*?)<\/div>\s*<\/section>/i);
  if (!grid) return [];

  const pairs = [];
  const seen = new Set();
  const itemRegex = /<article>\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/article>/gi;
  let match;
  while ((match = itemRegex.exec(grid[1])) !== null) {
    const question = plainText(match[1]);
    const answer = plainText(match[2]);
    if (!question || !answer || seen.has(question)) continue;
    seen.add(question);
    pairs.push({ question, answer });
  }
  return pairs;
}

function injectFaqSchema(html) {
  if (/"FAQPage"/.test(html)) return html;

  const pairs = extractVisibleFaq(html);
  if (!pairs.length) return html;

  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1];
  if (!canonical) return html;

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: pairs.map((pair) => ({
      '@type': 'Question',
      name: pair.question,
      acceptedAnswer: { '@type': 'Answer', text: pair.answer },
    })),
  };

  const script = `<script type="application/ld+json">\n${JSON.stringify(faq, null, 4)}\n</script>\n</head>`;
  return html.replace(/<\/head>/i, script);
}

function versionLocalStylesheets(html) {
  return html.replace(/href=(['"])(?!https?:|\/\/)([^'"]+\.css)(?:\?[^'"]*)?\1/gi, (_full, quote, href) => (
    `href=${quote}${href}?v=${ASSET_VERSION}${quote}`
  ));
}

const htmlFiles = walk(ROOT).filter((file) => file.endsWith('.html'));
let changed = 0;

htmlFiles.forEach((file) => {
  if (/\\(?:google|naver)[^\\]*\.html$/i.test(file)) return;
  const original = fs.readFileSync(file, 'utf8');
  let html = normalizeHead(original);
  html = normalizeNavigation(html);
  html = normalizeInternalLinks(html);
  html = versionLocalStylesheets(html);
  html = injectFaqSchema(html);
  html = deferBlockingStylesheets(html);
  html = normalizeImages(html, file);
  html = html.replace(/[ \t]+(?=\r?\n)/g, '');
  if (html !== original) {
    fs.writeFileSync(file, html, 'utf8');
    changed += 1;
  }
});

console.log(`Normalized metadata and image attributes in ${changed} HTML files.`);
