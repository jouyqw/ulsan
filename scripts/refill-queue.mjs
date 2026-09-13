/**
 * 울산변호사 강성수 — 칼럼 큐 자동 보충
 *
 *   node scripts/refill-queue.mjs --check        예약 잔량만 본다
 *   node scripts/refill-queue.mjs                부족하면 채운다(로컬만)
 *   node scripts/refill-queue.mjs --git          채운 뒤 커밋·푸시까지 한다
 *   node scripts/refill-queue.mjs --force 3      잔량과 무관하게 3편 쓴다
 *
 * 구조
 *   content/columns/<slug>.md 의 frontmatter date 가 곧 예약일이다.
 *   .github/workflows/publish-columns.yml 이 매일 09:00 KST 에 빌드하면
 *   date 가 도래한 글만 HTML·목록·사이트맵·RSS 에 들어간다.
 *   즉 "글을 쓰는 것" 과 "내보내는 것" 이 이미 분리돼 있고, 여기서 채우는 건 앞쪽뿐이다.
 *
 *   2026-08-23 이후 발행이 멈춘 원인은 워크플로 고장이 아니라 예약분 소진이었다.
 *   72편을 전부 발행하고 나니 매일 돌아도 낼 것이 없었고, 아무 알림도 뜨지 않았다.
 *
 * 안전장치
 *   - 규격검사를 통과한 초안만 남긴다. 하나라도 어긋나면 그 파일을 지운다.
 *   - PUBLISH_ALL=1 로 실제 빌드·SEO 검사까지 돌려 본 뒤 산출물을 되돌린다.
 *     초안 하나가 빌드를 깨뜨리면 하루치가 아니라 사이트 전체 발행이 멈추기 때문이다.
 *   - 실패는 바탕화면 파일로 알린다.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const COLUMNS = path.join(ROOT, 'content', 'columns');
const BANK = path.join(ROOT, 'content', 'topic-bank.json');
const LOG = path.join(ROOT, 'refill.log');
const LOCK = path.join(ROOT, '.refill.lock');
const DESK = path.join(process.env.USERPROFILE || '', 'Desktop', '울산_칼럼보충_실패.txt');

const PER_DAY = 2;            // 하루에 몇 편 발행하나. 같은 date 를 이 수만큼 배정한다
const THRESHOLD = 10;         // 예약 잔량이 이 미만이면 채운다(= 5일치)
const TARGET = 20;            // 채울 때는 여기까지(= 10일치)
const MAX_ADD = 6;            // 한 번에 쓰는 최대 편수(세션 한도·대량생성 신호 회피)
const RETRY = 2;              // 규격 불통과 시 재작성 횟수
const BATCH_TIMEOUT = 30 * 60 * 1000;

// 변호사 광고 규정상 결과를 약속하거나 최상급을 쓰면 안 된다.
// 기존 성공사례 글은 "받은 사례" 로 과거 사실을 적을 뿐 보장하지 않는다.
const BANNED = ['100%', '무조건 승소', '반드시 승소', '승소 보장', '무죄 보장', '선처 보장',
  '집행유예 보장', '최고의 변호사', '업계 1위', '국내 최고', '전국 1위', '반드시 무혐의'];

const BLOCKS = ['summary', 'highlight', 'table', 'cta', 'consult', 'crisis', 'quote', 'strategy', 'verdict'];

const CLAUDE = [
  'C:\\Users\\c\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe\\claude.exe',
  'claude',
].find((p) => p === 'claude' || fs.existsSync(p));

const stamp = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
const TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

function log(msg) {
  const line = `[${stamp()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch { }
}
const unlock = () => { try { fs.rmSync(LOCK); } catch { } };
function fail(msg, detail = '') {
  log('!! ' + msg);
  if (detail) log(String(detail).slice(0, 600));
  try {
    fs.writeFileSync(DESK, `${stamp()}\n울산변호사 칼럼 보충에 실패했습니다.\n\n${msg}\n\n${String(detail).slice(0, 1200)}\n`);
  } catch { }
  unlock();
  process.exit(1);
}
const sleep = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { } };
const len = (s) => [...String(s || '')].length;
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/* ---------- 기존 글 읽기 ---------- */
function mdFiles() {
  return fs.readdirSync(COLUMNS).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
}
function frontMatter(file) {
  const raw = fs.readFileSync(path.join(COLUMNS, file), 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[')) { try { v = JSON.parse(v); } catch { } }
    else v = v.replace(/^"(.*)"$/, '$1');
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}
function existing() {
  return mdFiles().map((f) => {
    const fm = frontMatter(f);
    return fm ? { file: f, ...fm.data, body: fm.body } : null;
  }).filter(Boolean);
}

/**
 * build-content.js 의 extractFaqPairs 와 같은 규칙으로 FAQ 항목 수를 센다.
 * 헤더가 정확히 "질문 | 답변" 인 :::table 만 FAQPage 구조화 데이터가 된다.
 */
function faqItemCount(body) {
  let max = 0;
  for (const m of String(body).matchAll(/:::table\r?\n([\s\S]*?)\r?\n:::/g)) {
    const rows = m[1].split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const head = (rows[0] || '').split('|').map((c) => c.trim());
    if (head.length !== 2 || !/질문/.test(head[0]) || !/답/.test(head[1])) continue;
    max = Math.max(max, rows.slice(1).filter((r) => r.split('|').length >= 2).length);
  }
  return max;
}

/* ---------- 규격 검사 ---------- */
function validate(topic, date, seenTitles, seenSlugs) {
  const file = `${topic.slug}.md`;
  const full = path.join(COLUMNS, file);
  if (!fs.existsSync(full)) return [`${file} 이 없습니다`];

  const fm = frontMatter(file);
  if (!fm) return [`${file}: frontmatter 를 읽을 수 없습니다`];
  const d = fm.data;
  const b = fm.body;
  const e = [];

  for (const k of ['title', 'description', 'category', 'date', 'slug', 'keywords', 'summary']) {
    if (d[k] === undefined || d[k] === '') e.push(`${k} 없음`);
  }
  if (e.length) return e.map((x) => `${file}: ${x}`);

  if (d.slug !== topic.slug) e.push(`slug 이 "${d.slug}" (배정 ${topic.slug})`);
  if (d.category !== topic.category) e.push(`category 가 "${d.category}" (배정 ${topic.category})`);
  if (String(d.date).slice(0, 10) !== date) e.push(`date 가 "${d.date}" (배정 ${date})`);
  if (seenSlugs.has(d.slug)) e.push(`slug 중복: ${d.slug}`);
  if (seenTitles.has(d.title)) e.push(`제목 중복: ${d.title}`);

  // check-seo.js 가 title 62자 초과를 경고한다. 사이트 접미사가 붙으므로 여유를 둔다.
  if (len(d.title) < 18 || len(d.title) > 42) e.push(`title 길이 ${len(d.title)}자 (18~42)`);
  if (!String(d.title).startsWith(topic.prefix)) e.push(`title 이 "${topic.prefix}" 로 시작하지 않습니다`);
  if (len(d.description) < 80 || len(d.description) > 160) e.push(`description 길이 ${len(d.description)}자 (80~160)`);
  if (len(d.summary) < 30 || len(d.summary) > 120) e.push(`summary 길이 ${len(d.summary)}자 (30~120)`);
  if (!Array.isArray(d.keywords) || d.keywords.length < 4) e.push('keywords 4개 미만');
  else if (!d.keywords.some((k) => String(k).includes('울산'))) e.push('keywords 에 울산 지역 키워드가 없습니다');

  if (len(b) < 3000) e.push(`본문이 짧습니다 (${len(b)}자, 최소 3000)`);
  if (len(b) > 9000) e.push(`본문이 너무 깁니다 (${len(b)}자)`);
  const h2 = (b.match(/^## /gm) || []).length;
  if (h2 < 6) e.push(`## 소제목이 ${h2}개 (최소 6개)`);
  if (/^# /m.test(b)) e.push('본문에 H1(#) 이 있습니다 — 제목은 frontmatter 가 맡습니다');
  if (/<[a-z]+[ >]/i.test(b)) e.push('본문에 HTML 태그가 있습니다 (마크다운·::: 블록만 씁니다)');

  // ::: 블록 검사. 닫히지 않으면 check-seo.js 가 "변환되지 않은 블록" 으로 빌드를 깬다.
  const opens = [...b.matchAll(/^:::([a-z]+)\s*$/gm)].map((m) => m[1]);
  const closes = (b.match(/^:::\s*$/gm) || []).length;
  if (opens.length !== closes) e.push(`::: 블록이 ${opens.length}개 열리고 ${closes}개 닫혔습니다`);
  for (const name of opens) if (!BLOCKS.includes(name)) e.push(`지원하지 않는 블록: :::${name}`);
  if (!opens.includes('summary')) e.push(':::summary 블록이 없습니다');
  if (!opens.includes('cta')) e.push(':::cta 블록이 없습니다');

  // FAQPage 구조화 데이터는 헤더가 정확히 "질문 | 답변" 인 표에서만 나온다.
  // 표를 아무 형식으로나 쓰면 검사는 통과하면서 리치 결과만 조용히 빠진다.
  const faq = faqItemCount(b);
  if (faq < 4) e.push(`"질문 | 답변" 헤더의 :::table 이 없거나 항목이 ${faq}개입니다 (최소 4개 — FAQ 구조화 데이터의 근거)`);

  for (const w of BANNED) if (b.includes(w) || String(d.title).includes(w) || String(d.description).includes(w)) e.push(`금지 표현: ${w}`);

  return e.map((x) => `${file}: ${x}`);
}

/* ---------- 프롬프트 ---------- */
function buildPrompt(topic, date, samples, titles, note) {
  return `너는 "법무법인 우린" 강성수 변호사(울산)의 법률 칼럼을 쓴다. 이번에 쓸 글은 1편이다.

## 먼저 읽을 것 (문체·구성·분량의 기준이다)
${samples.map((s) => `- content/columns/${s}`).join('\n')}

위 글들을 반드시 먼저 읽고, 같은 톤과 구조로 쓴다. 특히 :::summary 로 시작해
:::cta 로 끝나는 구성, 소제목 붙이는 방식, 문단 길이를 그대로 따른다.

## 이번 글
- 파일: content/columns/${topic.slug}.md
- category: "${topic.category}"
- slug: "${topic.slug}"
- date: "${date}"
- 제목 앞머리: "${topic.prefix}" 로 시작한다
- 주요 키워드: ${topic.keyword}
- 다룰 내용: ${topic.angle}

## frontmatter (--- 사이에 이 형식 그대로)
title: "${topic.prefix} ..."        # 전체 18~42자
description: "..."                   # 80~160자. 이 글에서 실제로 다루는 것. 제목 반복 금지
category: "${topic.category}"
date: "${date}"
slug: "${topic.slug}"
keywords: ["울산○○변호사", "...", "...", "..."]   # 4~6개, 울산 지역 키워드 포함
summary: "..."                       # 30~120자. 목록 카드에 보일 한 줄

## 본문 규칙
- 마크다운과 ::: 블록만 쓴다. HTML 태그 금지. H1(#) 금지 — \`## 소제목\` 부터 쓴다.
- 3,200~4,500자. \`## 소제목\` 6~8개.
- 쓸 수 있는 블록은 이것뿐이다: ${BLOCKS.map((b) => ':::' + b).join(', ')}
  여는 줄은 \`:::이름\`, 닫는 줄은 \`:::\` 이다. 반드시 짝을 맞춘다.
- **:::summary 로 시작하고 :::cta 로 끝낸다.**
- **아래 형태의 :::table 을 반드시 하나 넣는다.** 첫 줄 헤더가 정확히 \`질문 | 답변\` 이어야 한다.
  이 표만 FAQ 구조화 데이터(FAQPage)로 변환되며, 헤더가 다르면 검색 리치 결과가 통째로 빠진다.
\`\`\`
:::table
질문 | 답변
실제로 많이 묻는 질문? | 두세 문장으로 답한다.
… (질문 4~5개)
:::
\`\`\`
  비교표·절차표가 더 필요하면 :::table 을 추가로 써도 된다.
- 첫 문단에서 결론부터 말한다. 정의 → 실제 절차 → 갈리는 지점 → 준비할 것 순으로 이어 간다.
- 문체는 기존 칼럼과 같게. 독자에게 설명하는 존댓말이다.

## 절대 하지 말 것
- 결과를 약속하거나 단정하는 표현. "무죄를 받습니다", "승소 보장", "100%", "최고의", "1위" 금지.
  → "다투어 볼 수 있습니다", "이런 사정이 유리하게 고려됩니다" 처럼 쓴다.
- 법령 조문 번호와 판례 사건번호를 지어내지 않는다. 확실하지 않으면 번호 없이 내용만 설명한다.
- 없는 성공사례를 지어내지 않는다. 이 글은 사례가 아니라 정보성 칼럼이다.
- 상담 전화번호·주소를 본문에 새로 적지 않는다. :::cta 는 기존 글과 같은 형태로만 쓴다.

## 기존 칼럼 제목 (주제·표현이 겹치면 안 된다)
${titles.map((t) => `- ${t}`).join('\n')}
${note ? `\n## 직전 시도에서 걸린 문제 — 반드시 고쳐라\n${note}\n` : ''}
${topic.slug}.md 파일 하나만 쓰고, 파일명만 출력하고 끝내라. git 등 다른 명령은 실행하지 마라.`;
}

function runClaude(text) {
  for (let t = 1; t <= 3; t += 1) {
    const res = spawnSync(CLAUDE, [
      '-p', text, '--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Write,Glob,Grep',
    ], { cwd: ROOT, encoding: 'utf8', timeout: BATCH_TIMEOUT, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
    if (!res.error && res.status === 0) return res;
    const why = String(res.stderr || res.stdout || res.error?.message || '').trim().slice(-400);
    log(`  !! claude 호출 실패 (${res.status ?? 'error'}) ${t}/3 — ${why || '출력 없음'}`);
    if (t < 3) { log('  60초 쉬었다가 다시 부릅니다'); sleep(60000); }
  }
  return null;
}

/* ---------- 빌드 검증 ---------- */
/**
 * 예약분까지 전부 빌드해 SEO 검사를 통과하는지 보고, 생성된 산출물만 되돌린다.
 *
 * 되돌리는 방법이 중요하다. 예전에는 `git checkout -- .` 와 `git clean -fd` 를 그냥 불렀는데,
 * clean 은 "빌드가 만든 파일" 과 "사람이 방금 만든 파일" 을 구분하지 못한다.
 * 그래서 아직 커밋하지 않은 스크립트·배정표·워크플로 수정이 통째로 날아갔다(2026-09-12).
 *
 * 지금은 빌드 직전에 작업 트리 전체를 인덱스에 담아 둔다. 그러면
 *   checkout -- .  → 인덱스(=빌드 직전) 상태로 복원
 *   clean -fdq     → 빌드가 새로 만든 것만 제거(그 시점에 untracked 인 것은 빌드 산출물뿐)
 * 가 되어 사람이 만든 변경은 손대지 않는다. 마지막에 reset 으로 스테이징만 푼다.
 */
function buildVerify() {
  try { git(['add', '-A']); }
  catch (e) { return `git add 실패: ${String(e.stdout || e.message).slice(0, 200)}`; }

  let err = '';
  try {
    execFileSync(process.execPath, [path.join(HERE, 'build-content.js')], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PUBLISH_ALL: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    execFileSync(process.execPath, [path.join(HERE, 'normalize-html.js')], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    execFileSync(process.execPath, [path.join(HERE, 'check-seo.js')], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    err = String(e.stdout || '') + String(e.stderr || e.message || '');
  }

  try { git(['checkout', '--', '.']); } catch { }
  try { git(['clean', '-fdq']); } catch { }
  try { git(['reset', '--quiet']); } catch { }

  return err ? err.slice(-1200) : '';
}

/* ---------- 본체 ---------- */
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const GIT = argv.includes('--git');
const fi = argv.indexOf('--force');
const FORCE = fi >= 0 ? Math.max(1, Math.min(MAX_ADD, Number(argv[fi + 1]) || 1)) : 0;

// 개수를 세기 전에 원격을 먼저 반영한다.
// 발행 워크플로가 원격에서 커밋을 쌓으므로, 당겨오지 않으면 잔량도 마지막 예약일도 틀린다.
if (GIT) {
  try { git(['fetch', 'origin', 'main']); git(['merge', '--ff-only', 'origin/main']); log('원격 반영'); }
  catch (e) { fail('원격과 갈라짐 — 로컬 변경을 정리해야 합니다', String(e.stdout || e.message)); }
}

const all = existing();
const pending = all.filter((c) => String(c.date || '').slice(0, 10) > TODAY)
  .sort((a, b) => String(a.date).localeCompare(String(b.date)));
const lastAt = all.map((c) => String(c.date || '').slice(0, 10)).sort().at(-1) || TODAY;

log(`─── 큐 점검 (KST ${TODAY}) ─── 전체 ${all.length}편 · 예약 ${pending.length}편 · 마지막 예약일 ${lastAt}`);
if (CHECK) {
  pending.forEach((c) => console.log(`  ${String(c.date).slice(0, 10)}  ${c.slug}  ${c.title}`));
  process.exit(0);
}

const bank = JSON.parse(fs.readFileSync(BANK, 'utf8')).topics;
const usedSlugs = new Set(all.map((c) => c.slug));
const free = bank.filter((t) => !usedSlugs.has(t.slug));

const need = FORCE || (pending.length < THRESHOLD ? Math.min(MAX_ADD, TARGET - pending.length) : 0);
if (need <= 0) { log(`예약 ${pending.length}편 — 보충 불필요(기준 ${THRESHOLD})`); process.exit(0); }

if (!free.length) {
  fail('주제 배정표가 비었습니다', `content/topic-bank.json 에 새 주제를 추가해야 ${lastAt} 이후로 발행이 이어집니다.`);
}
if (free.length < need) log(`!! 배정표에 남은 주제가 ${free.length}개뿐입니다 — 곧 채워 넣어야 합니다`);

if (fs.existsSync(LOCK)) {
  if (Date.now() - fs.statSync(LOCK).mtimeMs < BATCH_TIMEOUT * 2) { log('이미 실행 중 — 종료'); process.exit(0); }
  unlock();
}
fs.writeFileSync(LOCK, stamp());

const targets = free.slice(0, Math.min(need, free.length));

// 하루 PER_DAY 편씩 배정한다. 워크플로는 date 가 도래한 글을 전부 내보내므로
// 같은 date 를 가진 글이 그날 함께 발행된다.
// 마지막 예약일부터 이어 붙이면 안 된다 — 그 날이 아직 PER_DAY 를 못 채웠을 수 있다.
// 그래서 날짜별 예약 편수를 세어, 덜 찬 날부터 메우고 다음 날로 넘어간다.
const perDate = new Map();
all.forEach((c) => {
  const d = String(c.date || '').slice(0, 10);
  if (d > TODAY) perDate.set(d, (perDate.get(d) || 0) + 1);
});

const plan = [];
let day = addDays(TODAY, 1);
for (const topic of targets) {
  while ((perDate.get(day) || 0) >= PER_DAY) day = addDays(day, 1);
  perDate.set(day, (perDate.get(day) || 0) + 1);
  plan.push({ topic, date: day });
}
log(`${plan.length}건 보충 시작 → ${plan[0].date} ~ ${plan[plan.length - 1].date}`);

const seenTitles = new Set(all.map((c) => c.title));
const seenSlugs = new Set(usedSlugs);
const written = [];

for (const { topic, date } of plan) {
  // 문체 기준으로 보여 줄 기존 글 — 같은 분야 2편 + 다른 분야 1편
  const sameCat = all.filter((c) => c.category === topic.category && len(c.body) > 3000).slice(0, 2).map((c) => c.file);
  const other = all.filter((c) => c.category !== topic.category && len(c.body) > 3500)[0];
  const samples = [...sameCat, other?.file].filter(Boolean).slice(0, 3);

  let note = '';
  let ok = false;
  for (let attempt = 0; attempt <= RETRY; attempt += 1) {
    if (attempt) log(`  재작성 ${attempt}회차 — ${topic.slug}`);
    try { fs.rmSync(path.join(COLUMNS, `${topic.slug}.md`)); } catch { }

    if (!runClaude(buildPrompt(topic, date, samples, [...seenTitles], note))) {
      fail('claude 를 세 번 불렀지만 모두 실패했습니다 (사용량 한도로 보입니다)',
        `여기까지 ${written.length}건은 남아 있습니다. 다시 실행하면 이어서 씁니다.`);
    }
    const errs = validate(topic, date, seenTitles, seenSlugs);
    if (!errs.length) { ok = true; break; }
    note = errs.map((x) => `- ${x}`).join('\n');
    log(`  !! 규격 불통과 ${topic.slug}: ${errs.slice(0, 3).join(' / ')}`);
  }
  if (!ok) {
    try { fs.rmSync(path.join(COLUMNS, `${topic.slug}.md`)); } catch { }
    log(`  건너뜀 — ${topic.slug} 를 ${RETRY + 1}회 시도했지만 규격을 통과하지 못했습니다`);
    continue;
  }

  const fm = frontMatter(`${topic.slug}.md`);
  seenTitles.add(fm.data.title);
  seenSlugs.add(fm.data.slug);
  written.push(`${topic.slug}.md`);
  try { fs.writeFileSync(LOCK, stamp()); } catch { }
  log(`  통과 ${date}  ${topic.slug} — ${fm.data.title} (FAQ ${faqItemCount(fm.body)}항목)`);
}

if (!written.length) fail('한 편도 규격을 통과하지 못했습니다');

log('빌드 검증 중 (예약분까지 전부 렌더 + SEO 검사)…');
const buildErr = buildVerify();
if (buildErr) {
  written.forEach((f) => { try { fs.rmSync(path.join(COLUMNS, f)); } catch { } });
  fail('새 초안이 빌드를 깨뜨려 전부 되돌렸습니다', buildErr);
}
log('빌드 검증 통과');

if (GIT) {
  try {
    git(['add', '--', 'content/columns']);
    git(['-c', 'core.autocrlf=false', 'commit', '-q', '-m', `칼럼 예약 보충: ${written.length}편 (${plan[0].date} ~)`]);
    git(['push', '-q', 'origin', 'main']);
    log('GitHub 푸시 완료 — publish-columns 가 매일 09:00 KST 에 한 편씩 발행');
  } catch (e) {
    fail('커밋·푸시 실패', String(e.stdout || e.stderr || e.message));
  }
}

log(`─── 보충 완료 · ${written.length}편 (배정표 잔여 ${free.length - written.length}개) ───`);
try { if (fs.existsSync(DESK)) fs.rmSync(DESK); } catch { }
unlock();
