// Phase-0 vault-retriever quality spike. Standalone, read-only. Walks the REAL Business Planning
// vault (*.md), ranks by BM25 relevance x recency for each of Russell's 2 real decisions, prints
// top-K with dates so a human can judge "are these the notes I'd reach for, and are they current?"
// No deps, no Electron, no run-loop. This is the in-process approach the runtime would use.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';
import { homedir } from 'node:os';

const VAULT = join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
const TODAY = new Date('2026-06-01');          // passed in, not Date.now (determinism)
const HALFLIFE_DAYS = 120;
const K = 8;

const STOP = new Set(('a an the of to in on for and or but with at by from as is are was were be been being this that ' +
  'it its we our you your i my they their he she them out up down über into over under not no do does how what which ' +
  'who whom whose when where why all any can will would should could about more most some such than then there here').split(' '));

function tokenize(s) {
  return (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length >= 3 && !STOP.has(t));
}

// --- walk vault for *.md ---
function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (extname(e.name) === '.md') acc.push(p);
  }
  return acc;
}

function noteDate(path, body) {
  // 1) date in filename  2) frontmatter date/last-updated/updated  3) mtime
  const fn = basename(path).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (fn) return new Date(`${fn[1]}-${fn[2]}-${fn[3]}`);
  const fm = body.slice(0, 600).match(/(?:date|last-updated|updated|created):\s*['"]?(\d{4}-\d{2}-\d{2})/i);
  if (fm) return new Date(fm[1]);
  try { return statSync(path).mtime; } catch { return new Date('2020-01-01'); }
}
function title(path, body) {
  const h1 = body.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : basename(path, '.md').replace(/[_-]+/g, ' ');
}

const files = walk(VAULT);
const docs = files.map((p) => {
  let body = '';
  try { body = readFileSync(p, 'utf8'); } catch {}
  const t = title(p, body);
  const toks = tokenize(t + ' ' + t + ' ' + body);   // title double-weighted
  const tf = {};
  for (const w of toks) tf[w] = (tf[w] || 0) + 1;
  return { path: relative(VAULT, p), title: t, len: toks.length, tf, date: noteDate(p, body),
    archived: p.includes('/_archive/'), body };
});

// --- BM25 index ---
const N = docs.length;
const avgdl = docs.reduce((s, d) => s + d.len, 0) / N;
const df = {};
for (const d of docs) for (const w of Object.keys(d.tf)) df[w] = (df[w] || 0) + 1;
const idf = (w) => Math.log(1 + (N - (df[w] || 0) + 0.5) / ((df[w] || 0) + 0.5));
const k1 = 1.5, b = 0.75;
function bm25(qToks, d) {
  let s = 0;
  for (const w of qToks) {
    const f = d.tf[w] || 0; if (!f) continue;
    s += idf(w) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / avgdl));
  }
  return s;
}
function recency(d) {
  const age = Math.max(0, (TODAY - d.date) / 86400000);
  return Math.exp(-age / HALFLIFE_DAYS);            // 1.0 today -> ~0.37 at 120d
}

function rank(label, query) {
  const q = tokenize(query);
  const scored = docs.map((d) => {
    const rel = bm25(q, d);
    const rec = recency(d);
    const archPenalty = d.archived ? 0.35 : 1;
    return { d, rel, rec, score: rel * (0.4 + 0.6 * rec) * archPenalty };
  }).filter((x) => x.rel > 0).sort((a, b) => b.score - a.score);

  console.log(`\n================ ${label} ================`);
  console.log(`(query terms: ${q.slice(0, 16).join(', ')})`);
  scored.slice(0, K).forEach((x, i) => {
    const dt = x.d.date.toISOString().slice(0, 10);
    const snip = (x.d.body.replace(/^---[\s\S]*?---/, '').replace(/[#*>`\[\]]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 130);
    console.log(`${String(i + 1).padStart(2)}. [${dt}] ${x.d.title}`);
    console.log(`    ${x.d.path}  (rel ${x.rel.toFixed(1)} x rec ${x.rec.toFixed(2)}${x.d.archived ? ', ARCHIVED' : ''})`);
    console.log(`    ${snip}…`);
  });
}

console.log(`Vault: ${VAULT}\nIndexed ${N} markdown notes (avg ${avgdl.toFixed(0)} tokens). Ranking BM25 x recency(halflife ${HALFLIFE_DAYS}d).`);
console.log(`NOTE: this indexes .md only — org/financial data also lives in .xlsx/.docx (AM_Org_Master, Headcount, cash models) the md-retriever does NOT read.`);

rank('DECISION 1 — Org chart / company restructuring',
  'org chart company organizational structure reporting lines GTM revenue AM account management sales org restructuring headcount roles who does what teams reorg leadership');

rank('DECISION 2 — Expense reduction targets for solvency / EBITDA',
  'expense reduction cost cut targets amount EBITDA positive cash flow positive solvency runway burn rate revenue model minimum goals 2026 2027 budget reductions');
