// 风格一：Apple 发布会。黑底、大字、渐变字、玻璃卡，镜头慢慢推近；信息靠排版和留白说话。
import type { CSSProperties } from 'react'
import { ITEM_TYPES } from '@/data/model'
import { Face } from '@/components/common/bits'
import { ACT, beatWindow, stripDays, tc, weekdayShort, type ReelSpec } from './spec'
import { Layer, actLife, clamp, count, ease, lerp, life, prog } from './kit'

const SANS = '"Inter Variable", -apple-system, "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif'
const GRAD: CSSProperties = { backgroundImage: 'linear-gradient(92deg, #ffffff 0%, #e4d8ff 48%, #ffb8d6 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
const GLASS: CSSProperties = { background: 'linear-gradient(160deg, rgb(255 255 255 / 9%), rgb(255 255 255 / 3%))', border: '1px solid rgb(255 255 255 / 10%)', boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 12%)' }
const GRAY = '#8E8E93'

export function AppleReel({ s, t }: { s: ReelSpec; t: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', fontFamily: SANS, color: '#F5F5F7', overflow: 'hidden' }}>
      <Glow t={t} />
      <Intro s={s} t={t} />
      <Filter s={s} t={t} />
      <Items s={s} t={t} />
      <Next s={s} t={t} />
      <Outro s={s} t={t} />
    </div>
  )
}

function Glow({ t }: { t: number }) {
  const x = 50 + Math.sin(t / 5) * 18
  const y = 78 + Math.cos(t / 7) * 8
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 55% at ${x}% ${y}%, rgb(111 76 196 / 38%), transparent 70%)` }} />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 40% 40% at ${100 - x}% 12%, rgb(214 92 150 / 16%), transparent 70%)` }} />
    </>
  )
}

function Intro({ s, t }: { s: ReelSpec; t: number }) {
  const o = actLife(t, 'intro', 0.3, 0.5)
  const a = ease.out(prog(t, 0.1, 0.9))
  const b = ease.out(prog(t, 0.35, 1.7))
  const c = ease.out(prog(t, 1.0, 1.9))
  const m = s.meeting
  return (
    <Layer o={o} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${lerp(1, 1.04, prog(t, 0, 3.5))})` }}>
      <div style={{ fontSize: 22, color: GRAY, letterSpacing: '0.04em', opacity: a, transform: `translateY(${lerp(12, 0, a)}px)` }}>会映 MeetReel · 只讲和你有关的</div>
      <div style={{ ...GRAD, fontSize: 150, fontWeight: 700, lineHeight: 1.15, marginTop: 14, letterSpacing: `${lerp(0.25, -0.02, b)}em`, opacity: b, filter: `blur(${lerp(14, 0, b)}px)`, transform: `translateY(${lerp(30, 0, b)}px)` }}>
        {s.person.name}的 30 秒
      </div>
      <div style={{ fontSize: 26, color: '#A1A1A6', marginTop: 22, opacity: c }}>
        {m.title} · {Number(m.date.slice(5, 7))} 月 {Number(m.date.slice(8))} 日 · 共 {Math.floor(m.duration / 60)} 分 {m.duration % 60} 秒
      </div>
    </Layer>
  )
}

// 20 块玻璃砖：与你无关的暗下去，与你有关的亮起来、移到正中
function Filter({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.filter
  const o = actLife(t, 'filter', 0.4, 0.5)
  if (o <= 0) return null
  const items = s.meeting.items
  const n = s.kept.length
  const cols = 5, w = 196, h = 76, gx = 18, gy = 16
  const x0 = (1280 - (cols * w + (cols - 1) * gx)) / 2, y0 = 262
  const sc = Math.min(1.22, (1180 - (n - 1) * 20) / Math.max(1, n * w))
  const tw = w * sc, total = n * tw + (n - 1) * 20
  let dropIdx = 0
  const num = count(t, A + 1.5, A + 3.1, s.total, n)
  const phase = t < A + 1.5 ? 0 : t < A + 3.1 ? 1 : 2
  const caption = phase === 0 ? `这场直播，${s.total} 条要点。`
    : phase === 1 ? '和你有关的……'
    : n ? `${n} 条与你有关。其余 ${s.total - n} 条，已经帮你省掉。` : '这场直播和你无关，没有打扰你。'
  const capO = phase === 0 ? life(t, A, A + 1.5, 0.4, 0.25) : phase === 1 ? life(t, A + 1.5, A + 3.1, 0.25, 0.25) : ease.out(prog(t, A + 3.1, A + 3.5))
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ ...GRAD, fontSize: 96, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num}<span style={{ fontSize: 40, marginLeft: 8 }}>条</span></div>
        <div style={{ fontSize: 26, color: '#C7C7CC', marginTop: 16, opacity: capO }}>{caption}</div>
      </div>
      {items.map((it, i) => {
        const kept = s.kept.indexOf(it.id)
        const r = Math.floor(i / cols), c = i % cols
        const gxPos = x0 + c * (w + gx), gyPos = y0 + r * (h + gy)
        const ap = ease.out(prog(t, A + 0.1 + i * 0.035, A + 0.5 + i * 0.035))
        let x = gxPos, y = gyPos, scale = lerp(0.9, 1, ap), op = ap, blur = 0, glow = 0
        if (kept < 0) {
          const d = ease.inOut(prog(t, A + 1.5 + dropIdx * 0.07, A + 2.1 + dropIdx * 0.07))
          dropIdx++
          op = ap * lerp(1, 0.1, d) * (1 - prog(t, A + 3.2, A + 3.7))
          scale *= lerp(1, 0.92, d)
          blur = d * 3
        } else {
          const mv = ease.inOut(prog(t, A + 3.1 + kept * 0.1, A + 4.1 + kept * 0.1))
          x = lerp(gxPos, (1280 - total) / 2 + kept * (tw + 20) - (w - tw) / 2, mv)
          y = lerp(gyPos, 400, mv)
          scale = lerp(scale, sc, mv)
          glow = ease.out(prog(t, A + 1.6, A + 2.6))
        }
        const ty = ITEM_TYPES[it.type]
        return (
          <div key={it.id} style={{
            position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 16, padding: '11px 14px', opacity: op,
            transform: `scale(${scale})`, filter: blur ? `blur(${blur}px)` : undefined, ...GLASS,
            boxShadow: glow ? `inset 0 1px 0 rgb(255 255 255 / 14%), 0 0 0 1.5px rgb(205 180 255 / ${0.85 * glow}), 0 0 ${36 * glow}px rgb(160 110 255 / ${0.5 * glow})` : GLASS.boxShadow,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: GRAY }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: ty.color }} />{ty.label}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.35, marginTop: 4, color: kept >= 0 ? '#fff' : '#D1D1D6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</div>
          </div>
        )
      })}
    </Layer>
  )
}

function Items({ s, t }: { s: ReelSpec; t: number }) {
  const [A, B] = ACT.items
  if (t < A - 0.01 || t > B + 0.01) return null
  if (!s.beats.length) {
    const o = life(t, A, B, 0.6, 0.5)
    return (
      <Layer o={o} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...GRAD, fontSize: 84, fontWeight: 700 }}>没有需要你看的。</div>
        <div style={{ fontSize: 26, color: '#A1A1A6', marginTop: 20 }}>{s.total} 条都与你无关，会映没有打扰你。</div>
      </Layer>
    )
  }
  return (
    <>
      {s.beats.map((b, i) => {
        const [a, z] = beatWindow(i, s.beats.length)
        const o = life(t, a, z, 0.55, 0.45)
        if (o <= 0) return null
        const e = b.entry
        const p1 = ease.out(prog(t, a, a + 0.8))
        const p2 = ease.out(prog(t, a + 0.35, a + 1.1))
        const p3 = ease.out(prog(t, a + 0.9, a + 1.6))
        const q = e.item.quote
        const k = Math.ceil(q.length * prog(t, a + 0.6, a + 2.0))
        const last = i === s.beats.length - 1
        return (
          <Layer key={e.item.id} o={o} style={{ transform: `scale(${lerp(1, 1.03, prog(t, a, z))})` }}>
            <div style={{ position: 'absolute', left: 96, top: 120, width: 660 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18, color: GRAY }}>
                <span style={{ fontFamily: '"JetBrains Mono Variable", monospace' }}>{String(i + 1).padStart(2, '0')} / {String(s.beats.length).padStart(2, '0')}</span>
                <span style={{ padding: '3px 12px', borderRadius: 999, fontSize: 15, fontWeight: 600, ...(e.tier === 'must' ? { background: '#F5F5F7', color: '#000' } : { border: '1px solid #48484A', color: '#D1D1D6' }) }}>{e.tier === 'must' ? '必读' : '建议看'}</span>
                <span style={{ fontSize: 15 }}>{ITEM_TYPES[e.item.type].label} · {e.item.topic}</span>
              </div>
              <div style={{ ...GRAD, fontSize: e.item.title.length > 12 ? 46 : 54, fontWeight: 700, lineHeight: 1.16, marginTop: 22, letterSpacing: '-0.01em', opacity: p1, transform: `translateY(${lerp(26, 0, p1)}px)` }}>{e.item.title}</div>
              <div style={{ fontSize: 23, lineHeight: 1.6, color: '#C7C7CC', marginTop: 24, opacity: p2, transform: `translateY(${lerp(16, 0, p2)}px)` }}>{e.forYou}</div>
            </div>
            <div style={{ position: 'absolute', left: 96, top: 604, fontSize: 19, opacity: p3, display: 'flex', gap: 14 }}>
              <span style={{ color: GRAY }}>为什么发给你</span><span style={{ color: '#F5F5F7' }}>{e.why}</span>
            </div>
            <div style={{ position: 'absolute', left: 810, top: 150, width: 380, minHeight: 360, borderRadius: 30, padding: '30px 32px', ...GLASS, opacity: p2, transform: `translateX(${lerp(30, 0, p2)}px)` }}>
              <div style={{ ...GRAD, fontSize: 84, lineHeight: 0.6, fontWeight: 700, height: 40 }}>“</div>
              <div style={{ fontSize: 25, lineHeight: 1.55, color: '#fff', minHeight: 156 }}>{q.slice(0, k)}<span style={{ opacity: k < q.length ? 1 : 0, color: '#c9b6ff' }}>▍</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26 }}>
                <Face p={b.speaker} size={50} />
                <div style={{ lineHeight: 1.35 }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{b.speaker.name}</div>
                  <div style={{ fontSize: 13, color: GRAY, maxWidth: 210, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.speaker.role}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, fontSize: 14, color: GRAY, display: 'flex', justifyContent: 'space-between' }}>
                <span>▶ 原话 <span style={{ fontFamily: '"JetBrains Mono Variable", monospace', color: '#D1D1D6' }}>{tc(b.at)}</span></span>
                <span>示意头像</span>
              </div>
            </div>
            {last && s.more > 0 && <div style={{ position: 'absolute', right: 90, top: 604, fontSize: 18, color: GRAY, opacity: p3 }}>卡片里还有 {s.more} 条 →</div>}
          </Layer>
        )
      })}
    </>
  )
}

function Next({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.next
  const o = actLife(t, 'next', 0.5, 0.45)
  if (o <= 0 || !s.next) return null
  const nx = s.next
  const p1 = ease.out(prog(t, A, A + 0.8))
  const p2 = ease.out(prog(t, A + 0.5, A + 1.4))
  const hit = ease.back(prog(t, A + 1.3, A + 2.0))
  const card = ease.out(prog(t, A + 1.8, A + 2.6))
  const days = nx.date ? stripDays(nx.date) : []
  const cw = 128, gap = 16, x0 = (1280 - (7 * cw + 6 * gap)) / 2
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', top: 92, left: 0, right: 0, textAlign: 'center', opacity: p1, transform: `translateY(${lerp(14, 0, p1)}px)` }}>
        <div style={{ fontSize: 20, color: GRAY, letterSpacing: '0.06em' }}>接下来</div>
        <div style={{ ...GRAD, fontSize: 42, fontWeight: 700, marginTop: 14, padding: '0 120px', lineHeight: 1.3 }}>{nx.link}</div>
      </div>
      {nx.date ? days.map((d, i) => {
        const on = d === nx.date
        const ap = ease.out(prog(t, A + 0.4 + i * 0.06, A + 0.9 + i * 0.06))
        return (
          <div key={d} style={{
            position: 'absolute', left: x0 + i * (cw + gap), top: 300, width: cw, height: 150, borderRadius: 24, textAlign: 'center', paddingTop: 26,
            opacity: ap * p2, transform: `translateY(${lerp(20, 0, ap)}px) scale(${on ? lerp(1, 1.1, hit) : 1})`,
            ...(on ? { background: `linear-gradient(150deg, rgb(124 92 255 / ${hit}), rgb(255 111 168 / ${hit}))`, boxShadow: `0 20px 60px -10px rgb(160 100 255 / ${0.6 * hit})`, border: '1px solid rgb(255 255 255 / 20%)' } : GLASS),
          }}>
            <div style={{ fontSize: 17, color: on ? '#fff' : GRAY }}>周{weekdayShort(d)}</div>
            <div style={{ fontSize: 50, fontWeight: 700, marginTop: 6, color: on ? '#fff' : '#D1D1D6' }}>{Number(d.slice(8))}</div>
          </div>
        )
      }) : (
        <div style={{ position: 'absolute', left: 440, top: 300, width: 400, height: 150, borderRadius: 28, display: 'grid', placeItems: 'center', fontSize: 40, fontWeight: 700, opacity: p2, background: `linear-gradient(150deg, rgb(124 92 255 / ${hit}), rgb(255 111 168 / ${hit}))`, border: '1px solid rgb(255 255 255 / 15%)' }}>{nx.dueLabel}</div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 500, display: 'flex', justifyContent: 'center', opacity: card, transform: `translateY(${lerp(-24, 0, card)}px)` }}>
        <div style={{ ...GLASS, borderRadius: 22, padding: '18px 28px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ width: 22, height: 22, borderRadius: 11, border: '2px solid #c9b6ff' }} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{nx.item.title}</div>
            <div style={{ fontSize: 16, color: GRAY, marginTop: 4 }}>{nx.meeting.title} · {nx.dueLabel}</div>
          </div>
        </div>
      </div>
    </Layer>
  )
}

function Outro({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.outro
  const o = clamp(ease.out(prog(t, A, A + 0.6)))
  if (o <= 0) return null
  const p1 = ease.out(prog(t, A, A + 0.9))
  const btn = ['确认', '追问', '不是我']
  return (
    <Layer o={o} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 150 }}>
      <div style={{ ...GRAD, fontSize: 112, fontWeight: 700, letterSpacing: '-0.02em', opacity: p1, filter: `blur(${lerp(10, 0, p1)}px)` }}>省下 {s.savedMin} 分钟。</div>
      <div style={{ fontSize: 25, color: '#A1A1A6', marginTop: 18, opacity: ease.out(prog(t, A + 0.5, A + 1.2)) }}>
        {s.total - s.kept.length} 条与你无关，已经帮你挡掉；和你有关的，原话随时能回放。
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 64 }}>
        {btn.map((b, i) => {
          const p = ease.back(prog(t, A + 1.0 + i * 0.15, A + 1.6 + i * 0.15))
          return (
            <span key={b} style={{ padding: '16px 38px', borderRadius: 999, fontSize: 24, fontWeight: 600, opacity: clamp(p), transform: `scale(${lerp(0.8, 1, p)})`, ...(i === 0 ? { background: '#F5F5F7', color: '#000' } : { ...GLASS, color: '#F5F5F7' }) }}>{b}</span>
          )
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 46, fontSize: 18, color: '#636366', letterSpacing: '0.08em' }}>会映 MeetReel</div>
    </Layer>
  )
}
