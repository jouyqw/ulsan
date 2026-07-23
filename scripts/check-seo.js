const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://ulsanlawyer.kr';
const errors = [];
const warnings = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(['"])(.*?)\\1`, 'i'));
  return match ? match[2] : '';
}

function sitePathToFile(urlPath) {
  const clean = decodeURIComponent(urlPath).replace(/\/$/, '');
  if (!clean) return path.join(ROOT, 'index.html');
  const candidate = path.join(ROOT, clean.replace(/^\//, ''));
  if (path.extname(candidate)) return candidate;
  if (fs.existsSync(`${candidate}.html`)) return `${candidate}.html`;
  return path.join(candidate, 'index.html');
}

const pages = walk(ROOT).filter((file) => file.endsWith('.html') && !/\\(?:google|naver)[^\\]*\.html$/i.test(file));
const indexableCanonicals = new Map();
const titles = new Map();

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const fileRel = rel(file);
  const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim();
  const description = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1]?.trim();
  const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1]?.trim();
  const h1Count = (html.match(/<h1(?:\s[^>]*)?>/gi) || []).length;

  if (!title) errors.push(`${fileRel}: title 누락`);
  if (!description) errors.push(`${fileRel}: description 누락`);
  if (h1Count !== 1) errors.push(`${fileRel}: H1이 ${h1Count}개`);
  if (/:::[a-z]/i.test(html)) errors.push(`${fileRel}: 변환되지 않은 콘텐츠 블록(:::) 존재`);

  if (/data-live-consults/i.test(html) && (!/consult-demo-notice/i.test(html) || !/data-nosnippet/i.test(html))) {
    errors.push(`${fileRel}: automated consultation examples must keep their disclosure and data-nosnippet guard`);
  }

  if (!noindex) {
    if (!canonical?.startsWith(SITE_URL)) errors.push(`${fileRel}: canonical 누락 또는 도메인 오류`);
    if (!/property="og:title"/i.test(html) || !/property="og:image"/i.test(html)) errors.push(`${fileRel}: Open Graph 누락`);
    if (!/type="application\/rss\+xml"/i.test(html)) errors.push(`${fileRel}: RSS 자동발견 링크 누락`);
    if (canonical) {
      if (indexableCanonicals.has(canonical)) errors.push(`${fileRel}: canonical 중복 (${canonical})`);
      indexableCanonicals.set(canonical, fileRel);
    }
    if (title) {
      if (titles.has(title)) errors.push(`${fileRel}: title 중복 (${title})`);
      titles.set(title, fileRel);
    }
  }

  if (title && title.replace(/&[^;]+;/g, 'X').length > 62) warnings.push(`${fileRel}: title이 긴 편 (${title.length}자)`);
  if (description && description.length < 40 && !noindex) warnings.push(`${fileRel}: description이 짧은 편 (${description.length}자)`);

  for (const script of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(script[1]);
    } catch (error) {
      errors.push(`${fileRel}: JSON-LD 문법 오류 (${error.message})`);
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = attr(tag, 'src');
    if (!src) {
      errors.push(`${fileRel}: src 없는 이미지`);
      continue;
    }
    if (!attr(tag, 'alt')) warnings.push(`${fileRel}: alt 없는 이미지 (${src})`);
    if (!attr(tag, 'width') || !attr(tag, 'height')) errors.push(`${fileRel}: 이미지 크기 누락 (${src})`);
    if (!attr(tag, 'loading')) errors.push(`${fileRel}: 이미지 loading 속성 누락 (${src})`);
  }

  for (const match of html.matchAll(/<a\b[^>]*\shref=(['"])(.*?)\1/gi)) {
    const href = match[2];
    if (!href || /^(?:#|https?:|mailto:|tel:|javascript:|\/\/)/i.test(href)) continue;
    const clean = href.split(/[?#]/)[0];
    if (!clean) continue;
    let target = clean.startsWith('/')
      ? sitePathToFile(clean)
      : (clean.endsWith('/')
          ? path.join(path.resolve(path.dirname(file), clean), 'index.html')
          : path.resolve(path.dirname(file), clean));
    if (!fs.existsSync(target) && fs.existsSync(`${target}.html`)) target = `${target}.html`;
    if (!fs.existsSync(target) && fs.existsSync(path.join(target, 'index.html'))) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) errors.push(`${fileRel}: 깨진 내부 링크 (${href})`);
  }
}

const sitemapPath = path.join(ROOT, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  errors.push('sitemap.xml 누락');
} else {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  if (locations.some((location) => location.includes('#'))) errors.push('sitemap.xml: #이 포함된 주소 존재');
  for (const canonical of indexableCanonicals.keys()) {
    if (!locations.includes(canonical)) errors.push(`sitemap.xml: ${canonical} 누락`);
  }
  for (const location of locations) {
    const file = sitePathToFile(new URL(location).pathname);
    if (!fs.existsSync(file)) errors.push(`sitemap.xml: 존재하지 않는 페이지 (${location})`);
  }
}

for (const required of ['robots.txt', 'rss.xml', '404.html']) {
  if (!fs.existsSync(path.join(ROOT, required))) errors.push(`${required} 누락`);
}
if (fs.existsSync(path.join(ROOT, '404.html'))) {
  const notFound = fs.readFileSync(path.join(ROOT, '404.html'), 'utf8');
  if (!/noindex/i.test(notFound)) errors.push('404.html: noindex 누락');
}

if (warnings.length) {
  console.warn(`SEO warnings (${warnings.length}):`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}
if (errors.length) {
  console.error(`SEO errors (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`SEO check passed: ${indexableCanonicals.size} indexable pages, ${warnings.length} warnings.`);
