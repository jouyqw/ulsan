/*
 * 칼럼 발행 큐 관리 스크립트
 *
 *   node scripts/plan-columns.js            큐 현황 + 목표 키워드 커버리지 리포트
 *   node scripts/plan-columns.js --assign   date 가 비었거나 "TBD" 인 글에 하루 1건씩 날짜 배정
 *   node scripts/plan-columns.js --check    남은 예약분이 부족하면 종료코드 1 (GitHub Actions 알림용)
 *   node scripts/plan-columns.js --check --min 14
 *
 * 예약 발행 자체는 build-content.js 가 frontmatter 의 date 로 처리한다.
 * 이 스크립트는 "하루 1건" 리듬이 끊기지 않게 큐를 감시하고 날짜를 채워 넣는 역할만 한다.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COLUMNS_DIR = path.join(ROOT, 'content', 'columns');
const QUEUE_FILE = path.join(ROOT, 'content', 'topic-queue.txt');
const DEFAULT_MIN_DAYS = 10;

// 상위노출 목표 키워드. 제목 맨 앞에 붙는 문자열 기준으로 커버리지를 센다.
// variants 는 같은 목표를 노리는 표기 흔들림(전문변호사 등)을 함께 집계하기 위한 것이다.
const TARGET_KEYWORDS = [
  { key: '울산변호사', variants: ['울산변호사'] },
  { key: '울산형사변호사', variants: ['울산형사변호사', '울산형사전문변호사'] },
  { key: '울산성범죄변호사', variants: ['울산성범죄변호사', '울산성범죄전문변호사'] },
  { key: '울산교통사고변호사', variants: ['울산교통사고변호사'] },
  { key: '울산음주운전변호사', variants: ['울산음주운전변호사'] },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const name = argv[i].slice(2);
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

function todayKst() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function readColumns() {
  if (!fs.existsSync(COLUMNS_DIR)) return [];
  return fs.readdirSync(COLUMNS_DIR)
    .filter((file) => file.endsWith('.md') && !file.startsWith('_'))
    .map((file) => {
      const filePath = path.join(COLUMNS_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const date = (raw.match(/^date:\s*"?([^"\n]*)"?/m) || [])[1]?.trim() || '';
      const title = (raw.match(/^title:\s*"([^"]*)"/m) || [])[1]?.trim() || '';
      const category = (raw.match(/^category:\s*"([^"]*)"/m) || [])[1]?.trim() || '';
      return { file, filePath, raw, date, title, category };
    });
}

function keywordOf(title) {
  for (const target of TARGET_KEYWORDS) {
    if (target.variants.some((variant) => title.startsWith(variant))) return target.key;
  }
  return null;
}

function scheduleReport(columns) {
  const today = todayKst();
  const dated = columns.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));
  const undated = columns.filter((item) => !/^\d{4}-\d{2}-\d{2}$/.test(item.date));
  const future = dated.filter((item) => item.date > today).sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map();
  future.forEach((item) => {
    if (!byDate.has(item.date)) byDate.set(item.date, []);
    byDate.get(item.date).push(item);
  });
  const lastDate = future.length ? future[future.length - 1].date : today;
  const runwayDays = Math.round((new Date(`${lastDate}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000);
  return { today, dated, undated, future, byDate, lastDate, runwayDays };
}

function nextFreeDate(columns, from) {
  const used = new Set(columns.map((item) => item.date));
  let candidate = from;
  while (used.has(candidate)) candidate = addDays(candidate, 1);
  return candidate;
}

function assign(columns) {
  const { today, undated } = scheduleReport(columns);
  if (!undated.length) {
    console.log('날짜를 배정할 글이 없습니다.');
    return;
  }
  // 순서는 파일명 기준으로 고정해 재실행해도 같은 결과가 나오게 한다.
  undated.sort((a, b) => a.file.localeCompare(b.file));
  let cursor = addDays(today, 1);
  for (const item of undated) {
    cursor = nextFreeDate(columns, cursor);
    const updated = item.raw.replace(/^date:.*$/m, `date: "${cursor}"`);
    if (updated === item.raw) {
      console.warn(`  ! ${item.file}: date 필드를 찾지 못해 건너뜁니다.`);
      continue;
    }
    fs.writeFileSync(item.filePath, updated, 'utf8');
    item.date = cursor;
    console.log(`  ${cursor}  ${item.file}`);
    cursor = addDays(cursor, 1);
  }
}

function readQueueTopics() {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  return fs.readFileSync(QUEUE_FILE, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [keyword, category, slug, title] = line.split('|').map((cell) => (cell || '').trim());
      return { keyword, category, slug, title };
    })
    .filter((topic) => topic.slug);
}

function report(columns) {
  const { today, future, byDate, lastDate, runwayDays, undated } = scheduleReport(columns);

  console.log(`오늘(KST): ${today}`);
  console.log(`전체 칼럼: ${columns.length}편`);
  console.log(`예약 대기: ${future.length}편, 마지막 예약일 ${lastDate} (약 ${runwayDays}일치)`);
  if (undated.length) console.log(`날짜 미배정: ${undated.length}편 (--assign 으로 배정)`);

  const gaps = [];
  const doubled = [];
  for (let i = 1; i <= runwayDays; i += 1) {
    const date = addDays(today, i);
    const items = byDate.get(date) || [];
    if (items.length === 0) gaps.push(date);
    if (items.length > 1) doubled.push(`${date}(${items.length}편)`);
  }
  if (gaps.length) console.log(`빈 날: ${gaps.length}일 — ${gaps.slice(0, 10).join(', ')}${gaps.length > 10 ? ' …' : ''}`);
  if (doubled.length) console.log(`하루 2편 이상: ${doubled.join(', ')}`);
  if (!gaps.length && !doubled.length && future.length) console.log('빈 날 없이 하루 1건으로 채워져 있습니다.');

  console.log('\n목표 키워드 커버리지 (제목 선두 기준)');
  const futureByKeyword = new Map();
  future.forEach((item) => {
    const key = keywordOf(item.title);
    if (!key) return;
    futureByKeyword.set(key, (futureByKeyword.get(key) || 0) + 1);
  });
  for (const target of TARGET_KEYWORDS) {
    const total = columns.filter((item) => keywordOf(item.title) === target.key).length;
    const upcoming = futureByKeyword.get(target.key) || 0;
    console.log(`  ${target.key.padEnd(12, ' ')} 전체 ${String(total).padStart(3, ' ')}편 / 예약 ${String(upcoming).padStart(2, ' ')}편`);
  }

  const topics = readQueueTopics();
  if (topics.length) {
    const usedSlugs = new Set(columns.map((item) => item.file.replace(/\.md$/, '')));
    const pending = topics.filter((topic) => !usedSlugs.has(topic.slug));
    console.log(`\n주제 백로그: ${topics.length}건 중 미작성 ${pending.length}건`);
    pending.slice(0, 10).forEach((topic) => console.log(`  [${topic.keyword}] ${topic.title}`));
    if (pending.length > 10) console.log(`  … 외 ${pending.length - 10}건`);
  }

  return { runwayDays, future };
}

function main() {
  const args = parseArgs(process.argv);
  const columns = readColumns();

  if (args.assign) {
    assign(columns);
    console.log('');
  }

  const { runwayDays } = report(columns);

  if (args.check) {
    const min = Number(args.min || DEFAULT_MIN_DAYS);
    if (runwayDays < min) {
      console.error(`\n예약 칼럼이 ${runwayDays}일치밖에 남지 않았습니다 (기준 ${min}일). 새 칼럼을 채워야 합니다.`);
      process.exit(1);
    }
    console.log(`\n예약분 ${runwayDays}일치 확보 (기준 ${min}일).`);
  }
}

main();
