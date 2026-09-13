/**
 * 새로 발행된 주소를 IndexNow 로 알린다.
 *
 *   node scripts/submit-indexnow.mjs            최근 3일 안에 바뀐 주소
 *   node scripts/submit-indexnow.mjs --days 7   기간을 바꾼다
 *   node scripts/submit-indexnow.mjs --all      사이트맵 전체 (되도록 쓰지 말 것)
 *   node scripts/submit-indexnow.mjs --dry      보낼 목록만 출력
 *
 * 왜 필요한가
 *   사이트에 IndexNow 키 파일(91a7...txt)은 놓여 있었지만 아무도 쏘지 않고 있었다.
 *   그래서 새 칼럼이 올라가도 크롤러가 올 때까지 기다리는 수밖에 없었다.
 *
 * 어디로 쏘나
 *   - api.indexnow.org (허브). Bing·Yandex·Seznam 등이 여기서 받아 간다.
 *   - searchadvisor.naver.com (네이버 직행). 허브만으로는 네이버 반영이 느려서 따로 쏜다.
 *   구글은 IndexNow 를 받지 않는다. 구글은 사이트맵과 크롤링으로 들어온다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://ulsanlawyer.kr';
const HOST = 'ulsanlawyer.kr';
const KEY = '91a7460f8c9b4e8db4f2a13d67a0c5e2';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;

const ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://searchadvisor.naver.com/indexnow',
];

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const ALL = argv.includes('--all');
const di = argv.indexOf('--days');
const DAYS = di >= 0 ? Math.max(1, Number(argv[di + 1]) || 3) : 3;

// 키 파일이 실제로 있어야 한다. 없으면 색인 서버가 403 을 준다.
const keyFile = path.join(ROOT, `${KEY}.txt`);
if (!fs.existsSync(keyFile) || fs.readFileSync(keyFile, 'utf8').trim() !== KEY) {
  console.error(`IndexNow 키 파일이 없거나 내용이 키와 다릅니다: ${KEY}.txt`);
  process.exit(1);
}

const sitemapPath = path.join(ROOT, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error('sitemap.xml 이 없습니다. 먼저 빌드하세요.');
  process.exit(1);
}
const xml = fs.readFileSync(sitemapPath, 'utf8');

const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: (m[1].match(/<loc>(.*?)<\/loc>/) || [])[1] || '',
  lastmod: (m[1].match(/<lastmod>(.*?)<\/lastmod>/) || [])[1] || '',
})).filter((e) => e.loc.startsWith(SITE));

const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
const urls = (ALL ? entries : entries.filter((e) => !e.lastmod || e.lastmod.slice(0, 10) >= cutoff))
  .map((e) => e.loc);

if (!urls.length) {
  console.log(`알릴 주소가 없습니다 (최근 ${DAYS}일 기준). 종료합니다.`);
  process.exit(0);
}

console.log(`${urls.length}건${ALL ? ' (전체)' : ` (최근 ${DAYS}일)`}`);
urls.slice(0, 10).forEach((u) => console.log(`  ${u}`));
if (urls.length > 10) console.log(`  … 외 ${urls.length - 10}건`);

if (DRY) process.exit(0);

const payload = JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls });

let failed = 0;
for (const endpoint of ENDPOINTS) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: payload,
    });
    // 200·202 는 접수, 429 는 너무 잦음(치명적 아님).
    const ok = res.status === 200 || res.status === 202;
    console.log(`${ok ? 'OK  ' : '실패'} ${endpoint} → ${res.status} ${res.statusText}`);
    if (!ok && res.status !== 429) failed += 1;
  } catch (error) {
    console.log(`실패 ${endpoint} → ${error.message}`);
    failed += 1;
  }
}

// 한 곳이라도 받았으면 성공으로 본다. 색인 제출 실패로 발행 워크플로를 깨뜨리지 않는다.
if (failed === ENDPOINTS.length) {
  console.error('모든 엔드포인트가 실패했습니다.');
  process.exit(1);
}
