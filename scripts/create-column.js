const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'columns');
const IMAGE_DIR = path.join(ROOT, 'assets', 'images', 'success');
const LAWYER_IMAGE = 'assets/images/lawyer-portrait-gray.png';

const PREFIX_BY_TYPE = {
  general: '울산변호사',
  criminal: '울산형사변호사',
  'criminal-specialist': '울산형사전문변호사',
  sex: '울산성범죄변호사',
  divorce: '울산이혼변호사',
  civil: '울산민사소송변호사',
  traffic: '울산교통사고변호사',
  drunk: '울산음주운전변호사',
  drug: '울산마약변호사',
};

const CATEGORY_BY_TYPE = {
  civil: '민사소송 칼럼',
  divorce: '이혼소송 칼럼',
  general: '법률 칼럼',
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[name] = true;
    } else {
      args[name] = next;
      i += 1;
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
node scripts/create-column.js --type criminal-specialist --title "무면허 사고 벌금형 성공사례" --body draft.txt --image proof.png --result "벌금 1,000만 원"

Types:
  general              -> 울산변호사
  criminal             -> 울산형사변호사
  criminal-specialist  -> 울산형사전문변호사
  sex                  -> 울산성범죄변호사
  divorce              -> 울산이혼변호사
  civil                -> 울산민사소송변호사
  traffic              -> 울산교통사고변호사
  drunk                -> 울산음주운전변호사
  drug                 -> 울산마약변호사
`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function nextOrder() {
  if (!fs.existsSync(CONTENT_DIR)) return 1000;
  return fs.readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8'))
    .map((raw) => {
      const match = raw.match(/\norder:\s*([0-9]+)/);
      return match ? Number(match[1]) : 0;
    })
    .reduce((max, value) => Math.max(max, value), 999) + 1;
}

function quote(value) {
  return `"${String(value || '').replace(/"/g, '\\"')}"`;
}

function copyImage(imagePath, slug) {
  if (!imagePath) return '';
  const resolved = path.resolve(imagePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Image not found: ${imagePath}`);
  }
  ensureDir(IMAGE_DIR);
  const ext = path.extname(resolved) || '.png';
  const destName = `${slug}-column${ext}`;
  const destPath = path.join(IMAGE_DIR, destName);
  fs.copyFileSync(resolved, destPath);
  return `assets/images/success/${destName}`;
}

function hasCustomBlocks(body) {
  return /:::(summary|table|strategy|verdict|cta|crisis)/.test(body);
}

function buildBody({ title, summary, result, body }) {
  if (hasCustomBlocks(body)) return body.trim();

  return `:::summary
**핵심 요약**

${summary}
:::

:::table
구분 | 내용
사건 분야 | ${title}
주요 쟁점 | 사건 기록과 증거를 바탕으로 대응 방향 정리
핵심 대응 | 사실관계 정리, 증거자료 검토, 양형자료 준비
최종 결과 | **${result || '상담 후 사건별 확인'}**
:::

${body.trim()}`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.title || !args.body) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const type = args.type || 'general';
  const prefix = PREFIX_BY_TYPE[type];
  if (!prefix) {
    throw new Error(`Unknown type: ${type}`);
  }

  const rawTitle = String(args.title).trim();
  const title = rawTitle.startsWith(prefix) ? rawTitle : `${prefix} ${rawTitle}`;
  const slug = safeSlug(args.slug || `${today()}-${type}-${rawTitle}`) || `column-${Date.now()}`;
  const bodyPath = path.resolve(args.body);
  if (!fs.existsSync(bodyPath)) {
    throw new Error(`Body file not found: ${args.body}`);
  }

  const body = fs.readFileSync(bodyPath, 'utf8');
  const image = copyImage(args.image, slug);
  const summary = args.summary || `${title}에 관한 실제 사건 대응 사례입니다. 사건 개요, 해결 전략, 결과를 중심으로 정리했습니다.`;
  const result = args.result || '';
  const description = args.description || summary;
  const category = args.category || CATEGORY_BY_TYPE[type] || '형사사건 칼럼';

  ensureDir(CONTENT_DIR);
  const outputPath = path.join(CONTENT_DIR, `${slug}.md`);
  if (fs.existsSync(outputPath) && !args.force) {
    throw new Error(`Column already exists: ${outputPath}`);
  }

  const markdown = `---
title: ${quote(title)}
description: ${quote(description)}
category: ${quote(category)}
date: ${quote(args.date || today())}
order: ${nextOrder()}
slug: ${quote(slug)}
image: ${quote(image)}
imageAlt: ${quote(args.imageAlt || `${title} 관련 자료`)}
consultImage: ${quote(LAWYER_IMAGE)}
consultImageAlt: ${quote('강성수 변호사 프로필 사진')}
keywords: [${[prefix, `${prefix} 상담`, title].map(quote).join(', ')}]
summary: ${quote(summary)}
---

${buildBody({ title, summary, result, body })}
`;

  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`Created ${path.relative(ROOT, outputPath)}`);
  if (image) console.log(`Copied ${image}`);
  console.log('Next: npm run build');
}

main();
