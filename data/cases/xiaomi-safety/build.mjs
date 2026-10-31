// 小米汽车安全直播案例：从得到大脑导出的转写 + 手写的账本 / 路由 / 简报，生成前后端都能直接用的数据并校验。
// 用法：node data/cases/xiaomi-safety/build.mjs
// 产出：meeting.json（web/src/data/meetings.ts 的 Meeting 结构）、transcript.json 和 gold.json（需求文档第 8 节契约，给后端和评测）。

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../..')
const load = f => JSON.parse(readFileSync(resolve(HERE, f), 'utf8'))
const save = (f, v) => writeFileSync(resolve(HERE, f), JSON.stringify(v, null, 2) + '\n')

const C = load('case.json')
const P = load('people.json')
const L = load('ledger.json')
const B = load('briefs.json')

const errors = []
const check = (ok, msg) => { if (!ok) errors.push(msg) }

const hms = s => { const [h, m, x] = s.split(':').map(Number); return h * 3600 + m * 60 + x }
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// ---------- 转写 ----------

const md = readFileSync(resolve(ROOT, C.sourceDoc), 'utf8').replace(/\r\n/g, '\n')
const body = md.slice(md.indexOf('\n# 原文') + 1).split('\n').slice(1)

const raw = []
for (let i = 0; i < body.length; i++) {
  const head = body[i].match(/^\S+ (.+?) \[(\d\d:\d\d:\d\d)\]$/u)
  if (!head) continue
  let j = i + 1
  while (j < body.length && !body[j].trim()) j++
  raw.push({ label: head[1], at: head[2], text: body[j].trim() })
  i = j
}
check(raw.length > 0, '原文里没解析出任何发言段')

const spkOf = Object.fromEntries(C.speakerMap.map(s => [s.label, s]))
const fixAt = Object.fromEntries(C.speakerFixes.map(f => [f.at, f]))
const fixCount = Object.fromEntries(C.textFixes.map(f => [f.from, 0]))

const segments = raw.map((r, i) => {
  const map = spkOf[r.label]
  check(!!map, `发言段 ${r.at} 的说话人「${r.label}」不在 speakerMap 里`)
  let text = r.text
  for (const f of C.textFixes) {
    const n = text.split(f.from).length - 1
    if (n) { text = text.split(f.from).join(f.to); fixCount[f.from] += n }
  }
  const fix = fixAt[r.at]
  if (fix) check(fix.from === r.label, `speakerFixes ${r.at} 写的原标签是 ${fix.from}，转写里是 ${r.label}`)
  const start = hms(r.at)
  const next = raw[i + 1] ? hms(raw[i + 1].at) : C.video.duration
  return {
    id: `x${String(i + 1).padStart(2, '0')}`,
    speaker: fix ? fix.to : map?.person,
    start,
    end: Math.round(Math.max(start + 0.3, next - 0.2) * 10) / 10,
    text,
    ...(text !== r.text ? { raw: r.text } : {}),
    spk: map?.spk,
    label: r.label,
  }
})

for (const f of C.speakerFixes) check(segments.some(s => mmss(s.start) === f.at.slice(3)), `speakerFixes ${f.at} 没对上任何发言段`)
for (const [from, n] of Object.entries(fixCount)) check(n > 0, `textFixes「${from}」在转写里一次都没出现`)
segments.forEach((s, i) => i && check(s.start >= segments[i - 1].start, `发言段 ${s.id} 时间倒退`))

// ---------- 人 ----------

const speakerIds = P.speakers.map(p => p.id)
const recipientIds = P.recipients.map(p => p.id)
const allIds = [...speakerIds, ...recipientIds]
check(new Set(allIds).size === allIds.length, 'people.json 里有重复的 id')
for (const s of segments) check(speakerIds.includes(s.speaker), `发言段 ${s.id} 的说话人 ${s.speaker} 不在 speakers 里`)
check(speakerIds.includes(C.host), `host ${C.host} 不在 speakers 里`)
check(recipientIds.includes(C.dispatcher), `dispatcher ${C.dispatcher} 不在 recipients 里`)

// ---------- 章节 ----------

C.chapters.forEach((c, i) => {
  check(c.start < c.end, `章节「${c.name}」起止颠倒`)
  if (i) check(c.start === C.chapters[i - 1].end, `章节「${c.name}」和上一章没接上`)
})
check(C.chapters[0].start === 0 && C.chapters.at(-1).end >= C.video.duration, '章节没有覆盖整段视频')

// ---------- 账本 ----------

const TYPES = ['decision', 'action', 'change', 'risk', 'question', 'info']
const segIndex = Object.fromEntries(segments.map((s, i) => [s.id, i]))

const items = L.items.map(x => {
  const hits = segments.filter(s => s.text.includes(x.quote))
  check(hits.length === 1, `${x.id} 的原话「${x.quote}」命中 ${hits.length} 段，应为 1 段`)
  check(TYPES.includes(x.type), `${x.id} 的类型 ${x.type} 不合法`)
  const { quote, ...rest } = x
  return { ...rest, meeting: C.id, owner: null, due: null, seg: hits[0]?.id, quote, sensitivity: 'public' }
})
check(new Set(items.map(i => i.id)).size === items.length, 'ledger.json 里有重复的条目 id')

const quoteSpan = it => {
  const s = segments[segIndex[it.seg]]
  const from = s.text.indexOf(it.quote)
  const t = i => s.start + (i / s.text.length) * (s.end - s.start)
  return { start: Math.round(t(from) * 10) / 10, end: Math.round(t(from + it.quote.length) * 10) / 10 }
}

// ---------- 路由 ----------

const tierOf = reasons => (reasons.some(r => C.routingRules.tierByReason[r] === 'must') ? 'must' : 'should')
const pairs = new Set()
for (const r of L.routes) {
  check(items.some(i => i.id === r.item), `路由引用了不存在的条目 ${r.item}`)
  check(recipientIds.includes(r.person), `路由 ${r.item} → ${r.person}：收件人必须是 recipients（不给真人发简报）`)
  check(r.reasons.every(k => k in C.routingRules.tierByReason), `路由 ${r.item} → ${r.person} 的理由不合法`)
  check(r.tier === tierOf(r.reasons), `路由 ${r.item} → ${r.person} 的级别应为 ${tierOf(r.reasons)}`)
  const key = `${r.item}|${r.person}`
  check(!pairs.has(key), `路由 ${key} 重复`)
  pairs.add(key)
}
for (const it of items) check(L.routes.some(r => r.item === it.id), `条目 ${it.id} 没有发给任何人`)

// ---------- 简报 ----------

// 数字必须出自原话：facts、forYou、headline 里的数字要能在条目所在段前后两段里找到（中文数字也算）
const CN = { 一: '1', 两: '2', 二: '2', 三: '3', 四: '4', 五: '5', 六: '6', 七: '7', 八: '8', 九: '9', 十: '10' }
const norm = s => s + ' ' + s.replace(/[一两二三四五六七八九十]/g, c => CN[c])
const nearText = it => {
  const i = segIndex[it.seg]
  return norm(segments.slice(Math.max(0, i - 2), i + 3).map(s => s.text).join(' '))
}
const allText = norm(segments.map(s => s.text).join(' '))
const numbersIn = s => s.match(/\d+(?:\.\d+)?/g) ?? []

const routesOf = pid => L.routes.filter(r => r.person === pid)
for (const b of B.briefs) {
  check(recipientIds.includes(b.person), `简报给了非收件人 ${b.person}`)
  check(b.readSeconds <= 60, `${b.person} 的简报超过 60 秒`)
  for (const n of numbersIn(b.headline)) check(allText.includes(n), `${b.person} 的标题里的数字 ${n} 在转写里找不到`)
  const seen = new Set()
  for (const e of b.entries) {
    const r = routesOf(b.person).find(x => x.item === e.item)
    check(!!r, `${b.person} 的简报里有 ${e.item}，但路由没发给他`)
    if (r) check(r.tier === e.tier && r.reasons.join() === e.reasons.join(), `${b.person} / ${e.item} 的级别或理由和路由不一致`)
    check(!seen.has(e.item), `${b.person} 的简报里 ${e.item} 出现了两次`)
    seen.add(e.item)
    const it = items.find(i => i.id === e.item)
    if (!it) continue
    const near = nearText(it)
    for (const v of [e.forYou, ...Object.values(e.facts ?? {})])
      for (const n of numbersIn(v)) check(near.includes(n), `${b.person} / ${e.item} 里的数字 ${n} 不在原话附近`)
  }
  for (const r of routesOf(b.person)) check(seen.has(r.item), `路由 ${r.item} → ${b.person} 没出现在简报里`)
  const order = { must: 0, should: 1 }
  b.entries.forEach((e, i) => i && check(order[e.tier] >= order[b.entries[i - 1].tier], `${b.person} 的简报里建议看排在了必读前面`))
}
for (const q of B.quiet) {
  const rs = routesOf(q.person)
  check(rs.every(r => r.tier !== 'must'), `${q.person} 有必读条目，不能标成不打扰`)
  check(rs.map(r => r.item).sort().join() === [...q.digest].sort().join(), `${q.person} 的日报条目和路由不一致`)
}
const covered = [...B.briefs, ...B.quiet].map(b => b.person)
for (const pid of recipientIds) check(covered.filter(x => x === pid).length === 1, `收件人 ${pid} 应该恰好有一份简报或不打扰记录`)
for (const pid of recipientIds) {
  const hasMust = routesOf(pid).some(r => r.tier === 'must')
  check(hasMust === B.briefs.some(b => b.person === pid), `${pid}：有必读就推简报，没有就不打扰`)
}

if (errors.length) {
  console.error(`校验失败（${errors.length} 处）：\n- ` + errors.join('\n- '))
  process.exit(1)
}

// ---------- 产出 ----------

const meeting = {
  id: C.id,
  title: C.title,
  project: C.project.id,
  date: C.date,
  time: C.time,
  duration: Math.round(C.video.duration),
  host: C.host,
  attendees: speakerIds,
  related: recipientIds,
  source: C.source,
  summary: C.summary,
  chapters: C.chapters,
  segments: segments.map(({ label, ...s }) => s),
  items,
  routes: L.routes,
  status: 'ready',
  confirmed: [],
  // 以下是这场新增的字段，web 端现有类型里没有，用到时再加
  dispatcher: C.dispatcher,
  video: C.video,
  sourceDoc: C.sourceDoc,
  speakerMap: C.speakerMap,
  speakerFixes: C.speakerFixes,
  textFixes: C.textFixes.map(f => ({ ...f, count: fixCount[f.from] })),
}
save('meeting.json', meeting)

const personName = Object.fromEntries([...P.speakers, ...P.recipients].map(p => [p.id, p.name]))

save('transcript.json', {
  meeting_id: C.id,
  title: C.title,
  source: 'getnotes_export',
  started_at: null,
  speakers: [...new Map(C.speakerMap.map(s => [s.spk, { spk: s.spk, person_id: s.person, confidence: s.confidence }])).values()],
  segments: segments.map(s => ({
    seg_id: s.id,
    spk: s.spk,
    ...(s.speaker !== C.speakerMap.find(m => m.spk === s.spk).person ? { person_id: s.speaker } : {}),
    start: s.start,
    end: s.end,
    text: s.text,
    ...(s.raw ? { raw_text: s.raw } : {}),
  })),
})

save('gold.json', {
  meeting_id: C.id,
  _note: '评测标准答案（需求文档 8.2 / 8.4）。routing 里没列出的（条目, 人）组合都算 none；本场全部公开，permission 都是 allow。',
  items: items.map(it => ({
    item_id: it.id,
    meeting_id: C.id,
    type: it.type,
    title: it.title,
    detail: it.detail ?? null,
    topic: it.topic,
    owner: null,
    due: null,
    speaker: personName[segments[segIndex[it.seg]].speaker],
    sources: [{ seg_id: it.seg, quote: it.quote, ...quoteSpan(it) }],
    sensitivity: 'public',
    visible_to: null,
    redacted_view: null,
    flags: it.flags ?? [],
  })),
  routing: L.routes.map(r => ({
    item_id: r.item,
    person_id: r.person,
    tier: r.tier,
    reasons: r.reasons.map(k => `${k}:${r.basis.slice(r.basis.indexOf(':') + 1)}`),
    permission: 'allow',
  })),
  quiet: B.quiet.map(q => q.person),
})

const byType = items.reduce((a, i) => ({ ...a, [i.type]: (a[i.type] ?? 0) + 1 }), {})
console.log(`OK  ${segments.length} 段发言 · ${items.length} 条条目 ${JSON.stringify(byType)} · ${L.routes.length} 条路由 · ${B.briefs.length} 份简报 · ${B.quiet.length} 人不打扰`)
console.log(`    说话人修正 ${C.speakerFixes.length} 处；转写纠错 ${Object.entries(fixCount).map(([k, n]) => `${k}×${n}`).join('、')}`)
