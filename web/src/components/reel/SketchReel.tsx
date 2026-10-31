// 风格二：手绘便利贴。方格纸、霞鹜文楷、rough.js 的线一笔笔画出来：无关的打叉掉下去，有关的圈起来。
import type { CSSProperties, ReactNode } from 'react'
import { Face } from '@/components/common/bits'
import { NOTE_COLORS } from '@/components/sketch/Briefs'
import { ACT, beatWindow, stripDays, tc, weekdayShort, type ReelSpec } from './spec'
import { Layer, RoughT, actLife, clamp, count, ease, lerp, life, prog, rnd } from './kit'

const HAND = '"LXGW WenKai", "KaiTi", "STKaiti", serif'
const INK = '#2B2A28'
const RED = '#E03131'
const PAPER: CSSProperties = {
  background: `repeating-linear-gradient(0deg, transparent 0 39px, rgb(110 140 190 / 13%) 39px 40px),
    repeating-linear-gradient(90deg, transparent 0 39px, rgb(110 140 190 / 13%) 39px 40px),
    radial-gradient(ellipse at 50% 40%, #FFFDF7, #F3EDDF)`,
}

export function SketchReel({ s, t }: { s: ReelSpec; t: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, ...PAPER, fontFamily: HAND, color: INK, overflow: 'hidden' }}>
      <Intro s={s} t={t} />
      <Filter s={s} t={t} />
      <Items s={s} t={t} />
      <Next s={s} t={t} />
      <Outro s={s} t={t} />
    </div>
  )
}

function Note({ x, y, w, h, color, rot = 0, children, style, tape = true }: { x: number; y: number; w: number; h: number; color: string; rot?: number; children?: ReactNode; style?: CSSProperties; tape?: boolean }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: color, transform: `rotate(${rot}deg)`, boxShadow: '0 1px 1px rgb(0 0 0 / 8%), 0 14px 24px -14px rgb(60 40 20 / 45%)', borderRadius: 3, ...style }}>
      {tape && <div style={{ position: 'absolute', left: '50%', top: -14, width: Math.min(140, w * 0.4), height: 30, marginLeft: -Math.min(70, w * 0.2), background: 'rgb(255 255 255 / 55%)', transform: 'rotate(-3deg)', boxShadow: '0 1px 2px rgb(0 0 0 / 8%)' }} />}
      {children}
    </div>
  )
}

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width={1280} height={720} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>{children}</svg>
)

function Intro({ s, t }: { s: ReelSpec; t: number }) {
  const o = actLife(t, 'intro', 0.15, 0.5)
  const slap = ease.back(prog(t, 0.1, 0.6))
  const m = s.meeting
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${lerp(1.3, 1, slap)})`, opacity: clamp(prog(t, 0.1, 0.3)), transformOrigin: '640px 330px' }}>
        <Note x={360} y={150} w={560} h={340} color="#FFF3B0" rot={-3}>
          <div style={{ padding: '58px 48px 0' }}>
            <div style={{ fontSize: 24, opacity: 0.6 }}>会映帮你看完了 {Math.floor(m.duration / 60)} 分 {m.duration % 60} 秒</div>
            <div style={{ fontSize: 76, fontWeight: 700, marginTop: 10, lineHeight: 1.15 }}>{s.person.name}的 30 秒</div>
            <div style={{ fontSize: 27, marginTop: 30, opacity: ease.out(prog(t, 1.1, 1.8)) }}>{m.title} · {m.date.slice(5).replace('-', '/')}</div>
          </div>
        </Note>
      </div>
      <Svg>
        <RoughT shape={{ kind: 'path', d: 'M420 335 C 560 352, 720 322, 860 330' }} opts={{ stroke: RED, strokeWidth: 4 }} p={prog(t, 0.9, 1.5)} seed={3} />
        <RoughT shape={{ kind: 'path', d: 'M1010 120 l12 28 l30 3 l-23 19 l8 30 l-27 -16 l-26 16 l8 -30 l-23 -19 l30 -3 z' }} opts={{ stroke: '#F59F00', strokeWidth: 3 }} p={prog(t, 1.4, 2.1)} seed={5} />
      </Svg>
    </Layer>
  )
}

function Filter({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.filter
  const o = actLife(t, 'filter', 0.3, 0.5)
  if (o <= 0) return null
  const n = s.kept.length
  const cols = 5, w = 176, h = 82, gx = 26, gy = 24
  const x0 = (1280 - (cols * w + (cols - 1) * gx)) / 2, y0 = 222
  const sc = Math.min(1.3, (1160 - (n - 1) * 26) / Math.max(1, n * w))
  const tw = w * sc, total = n * tw + (n - 1) * 26
  let k = 0
  const phase = t < A + 1.4 ? 0 : 1
  const num = count(t, A + 1.4, A + 3.0, s.total, n)
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', top: 64, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 60, fontWeight: 700 }}>
          {s.total} 条要点
          <span style={{ opacity: phase, margin: '0 18px' }}>→</span>
          <span style={{ opacity: phase, color: RED }}>{num} 条和你有关</span>
        </div>
        <div style={{ fontSize: 26, marginTop: 6, opacity: ease.out(prog(t, A + 3.2, A + 3.7)) }}>
          {n ? `其余 ${s.total - n} 条划掉，不来打扰你` : '这场直播和你无关，一条都没打扰你'}
        </div>
      </div>
      {s.meeting.items.map((it, i) => {
        const kept = s.kept.indexOf(it.id)
        const r = Math.floor(i / cols), c = i % cols
        const ap = ease.back(prog(t, A + 0.05 + i * 0.04, A + 0.45 + i * 0.04))
        let x = x0 + c * (w + gx), y = y0 + r * (h + gy) + lerp(-40, 0, ap), rot = rnd(i + 3) * 5 - 2.5, scale = 1, op = clamp(ap * 2)
        let mark: ReactNode = null
        if (kept < 0) {
          const kk = k++
          const xp = prog(t, A + 1.4 + kk * 0.06, A + 1.75 + kk * 0.06)
          const fall = ease.in(prog(t, A + 2.6 + kk * 0.035, A + 3.3 + kk * 0.035))
          y += fall * 480
          rot += fall * (rnd(i) > 0.5 ? 30 : -30)
          op *= 1 - fall
          mark = (
            <>
              <RoughT shape={{ kind: 'line', x1: 18, y1: 14, x2: w - 18, y2: h - 12 }} opts={{ stroke: RED, strokeWidth: 3.5 }} p={xp * 2} seed={i + 11} />
              <RoughT shape={{ kind: 'line', x1: w - 18, y1: 14, x2: 18, y2: h - 12 }} opts={{ stroke: RED, strokeWidth: 3.5 }} p={xp * 2 - 1} seed={i + 31} />
            </>
          )
        } else {
          const mv = ease.inOut(prog(t, A + 3.0 + kept * 0.1, A + 3.9 + kept * 0.1))
          x = lerp(x, (1280 - total) / 2 + kept * (tw + 26) - (w - tw) / 2, mv)
          y = lerp(y, 410, mv)
          scale = lerp(1, sc, mv)
          rot = lerp(rot, (kept % 2 ? 2 : -2), mv)
          mark = <RoughT shape={{ kind: 'ellipse', x: w / 2, y: h / 2, w: w + 34, h: h + 30 }} opts={{ stroke: RED, strokeWidth: 3.5, roughness: 1.6 }} p={prog(t, A + 1.6 + kept * 0.12, A + 2.3 + kept * 0.12)} seed={i + 51} />
        }
        return (
          <div key={it.id} style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: op, transform: `rotate(${rot}deg) scale(${scale})` }}>
            <Note x={0} y={0} w={w} h={h} color={NOTE_COLORS[i % NOTE_COLORS.length]} tape={false}>
              <div style={{ padding: '10px 12px', fontSize: 16, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</div>
            </Note>
            <svg width={w} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>{mark}</svg>
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
    return (
      <Layer o={life(t, A, B, 0.5, 0.5)}>
        <Note x={330} y={180} w={620} h={300} color="#D3F9D8" rot={-2}>
          <div style={{ padding: '70px 50px', fontSize: 52, fontWeight: 700, lineHeight: 1.3 }}>这场会，<br />没有要你看的。</div>
        </Note>
      </Layer>
    )
  }
  return (
    <>
      {s.beats.map((b, i) => {
        const [a, z] = beatWindow(i, s.beats.length)
        const o = life(t, a, z, 0.35, 0.4)
        if (o <= 0) return null
        const e = b.entry
        const slap = ease.back(prog(t, a, a + 0.55))
        const p2 = ease.out(prog(t, a + 0.5, a + 1.1))
        const q = e.item.quote
        const k = Math.ceil(q.length * prog(t, a + 0.7, a + 2.0))
        const hl = ease.inOut(prog(t, a + 1.5, a + 2.2))
        const rot = i % 2 ? 1.5 : -1.5
        return (
          <Layer key={e.item.id} o={o}>
            <div style={{ position: 'absolute', inset: 0, transform: `translateX(${lerp(-90, 0, slap)}px)`, transformOrigin: '400px 330px' }}>
              <Note x={84} y={104} w={620} h={470} color={NOTE_COLORS[(i * 3 + 1) % NOTE_COLORS.length]} rot={rot}>
                <div style={{ padding: '42px 44px 0' }}>
                  <div style={{ fontSize: 22, opacity: 0.55 }}>第 {i + 1} 张 · 共 {s.beats.length} 张{s.more && i === s.beats.length - 1 ? `（卡片里还有 ${s.more} 张）` : ''}</div>
                  <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.22, marginTop: 14 }}>{e.item.title}</div>
                  <div style={{ fontSize: 25, lineHeight: 1.6, marginTop: 20, color: '#45433E', opacity: p2 }}>{e.forYou}</div>
                </div>
              </Note>
            </div>
            <Svg>
              <RoughT shape={{ kind: 'rect', x: 560, y: 128, w: 120, h: 52 }} opts={{ stroke: RED, strokeWidth: 3 }} p={prog(t, a + 0.4, a + 0.9)} seed={i + 71} />
              <RoughT shape={{ kind: 'path', d: 'M770 110 Q 760 100 780 98 L 1170 96 Q 1192 96 1192 118 L 1194 318 Q 1194 338 1172 338 L 860 340 L 818 392 L 828 340 L 786 340 Q 764 340 764 318 Z' }} opts={{ stroke: INK, strokeWidth: 2.6, roughness: 1.1 }} p={prog(t, a + 0.3, a + 0.9)} seed={i + 81} />
              <RoughT shape={{ kind: 'ellipse', x: 852, y: 448, w: 94, h: 90 }} opts={{ stroke: INK, strokeWidth: 2.4 }} p={prog(t, a + 0.5, a + 1.0)} seed={i + 91} />
            </Svg>
            <div style={{ position: 'absolute', left: 568, top: 133, width: 110, textAlign: 'center', fontSize: 28, fontWeight: 700, color: RED, transform: 'rotate(-4deg)', opacity: clamp(prog(t, a + 0.7, a + 0.9)) }}>{e.tier === 'must' ? '必读' : '建议看'}</div>
            <div style={{ position: 'absolute', left: 796, top: 122, width: 376, fontSize: 28, lineHeight: 1.5 }}>
              “{q.slice(0, k)}{k >= q.length ? '”' : ''}
              <div style={{ fontSize: 18, opacity: 0.5, marginTop: 10 }}>原话 {tc(b.at)}</div>
            </div>
            <div style={{ position: 'absolute', left: 820, top: 418 }}><Face p={b.speaker} size={64} /></div>
            <div style={{ position: 'absolute', left: 912, top: 422, lineHeight: 1.35 }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{b.speaker.name}</div>
              <div style={{ fontSize: 17, opacity: 0.6, width: 290, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.speaker.role} · 示意头像</div>
            </div>
            <div style={{ position: 'absolute', left: 790, top: 528, width: 420, fontSize: 24, lineHeight: 1.5, opacity: clamp(prog(t, a + 1.3, a + 1.6)) }}>
              <span style={{ opacity: 0.6 }}>为什么给你：</span>
              <span style={{ backgroundImage: 'linear-gradient(transparent 55%, rgb(255 222 70 / 75%) 55%)', backgroundSize: `${hl * 100}% 100%`, backgroundRepeat: 'no-repeat' }}>{e.why}</span>
            </div>
          </Layer>
        )
      })}
    </>
  )
}

function Next({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.next
  const o = actLife(t, 'next', 0.4, 0.45)
  if (o <= 0 || !s.next) return null
  const nx = s.next
  const days = nx.date ? stripDays(nx.date) : []
  const cw = 136, x0 = (1280 - 7 * cw) / 2, y = 250
  const di = days.indexOf(nx.date ?? '')
  const slap = ease.back(prog(t, A + 1.9, A + 2.4))
  const nxX = Math.max(40, Math.min(1280 - 440, (di >= 0 ? x0 + di * cw + cw / 2 : 640) - 200))
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 26, opacity: 0.55 }}>接下来</div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8, padding: '0 110px', lineHeight: 1.35 }}>{nx.link}</div>
      </div>
      <Svg>
        {nx.date ? days.map((d, i) => (
          <RoughT key={d} shape={{ kind: 'rect', x: x0 + i * cw + 6, y, w: cw - 12, h: 130 }} opts={{ stroke: INK, strokeWidth: 2.2, roughness: 1.2 }} p={prog(t, A + 0.3 + i * 0.08, A + 0.7 + i * 0.08)} seed={i + 101} />
        )) : <RoughT shape={{ kind: 'rect', x: 440, y, w: 400, h: 130 }} opts={{ stroke: INK, strokeWidth: 2.4 }} p={prog(t, A + 0.3, A + 0.9)} seed={121} />}
        {di >= 0 && <RoughT shape={{ kind: 'ellipse', x: x0 + di * cw + cw / 2, y: y + 76, w: 112, h: 92 }} opts={{ stroke: RED, strokeWidth: 4, roughness: 1.8 }} p={prog(t, A + 1.2, A + 1.8)} seed={131} />}
      </Svg>
      {nx.date ? days.map((d, i) => (
        <div key={d} style={{ position: 'absolute', left: x0 + i * cw, top: y + 14, width: cw, textAlign: 'center', opacity: clamp(prog(t, A + 0.5 + i * 0.08, A + 0.8 + i * 0.08)) }}>
          <div style={{ fontSize: 22, opacity: 0.6 }}>周{weekdayShort(d)}</div>
          <div style={{ fontSize: 54, fontWeight: 700, color: d === nx.date ? RED : INK }}>{Number(d.slice(8))}</div>
        </div>
      )) : <div style={{ position: 'absolute', left: 440, top: y + 38, width: 400, textAlign: 'center', fontSize: 44, fontWeight: 700, color: RED }}>{nx.dueLabel}</div>}
      <div style={{ position: 'absolute', inset: 0, opacity: clamp(prog(t, A + 1.9, A + 2.05)), transform: `scale(${lerp(1.25, 1, slap)})`, transformOrigin: `${nxX + 200}px 500px` }}>
        <Note x={nxX} y={436} w={400} h={130} color="#FFF3B0" rot={2}>
          <div style={{ padding: '24px 26px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3 }}>{nx.item.title}</div>
            <div style={{ fontSize: 19, opacity: 0.6, marginTop: 6 }}>{nx.meeting.title.replace(/ · .*/, '')} · {nx.dueLabel}</div>
          </div>
        </Note>
      </div>
    </Layer>
  )
}

function Outro({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.outro
  const o = clamp(ease.out(prog(t, A, A + 0.5)))
  if (o <= 0) return null
  const btns = [['✓', '确认'], ['?', '追问'], ['✗', '不是我']]
  const bw = 210, gap = 40, bx = (1280 - (3 * bw + 2 * gap)) / 2
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', top: 130, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 96, fontWeight: 700 }}>省下 {s.savedMin} 分钟！</div>
        <div style={{ fontSize: 28, marginTop: 16, opacity: ease.out(prog(t, A + 0.6, A + 1.2)) }}>{s.total - s.kept.length} 条划掉了；有关的原话，随时点开回放</div>
      </div>
      <Svg>
        <RoughT shape={{ kind: 'path', d: 'M370 262 C 520 280, 760 250, 910 268' }} opts={{ stroke: RED, strokeWidth: 4.5 }} p={prog(t, A + 0.4, A + 1.0)} seed={141} />
        {btns.map((_, i) => <RoughT key={i} shape={{ kind: 'rect', x: bx + i * (bw + gap), y: 430, w: bw, h: 84 }} opts={{ stroke: INK, strokeWidth: 2.6, fill: i === 0 ? 'rgb(255 222 70 / 70%)' : undefined, fillStyle: 'hachure', hachureGap: 7 }} p={prog(t, A + 0.9 + i * 0.2, A + 1.4 + i * 0.2)} seed={i + 151} />)}
      </Svg>
      {btns.map(([ic, b], i) => (
        <div key={b} style={{ position: 'absolute', left: bx + i * (bw + gap), top: 448, width: bw, textAlign: 'center', fontSize: 36, fontWeight: 700, opacity: clamp(prog(t, A + 1.2 + i * 0.2, A + 1.5 + i * 0.2)) }}>{ic} {b}</div>
      ))}
      <div style={{ position: 'absolute', right: 110, bottom: 70, fontSize: 30, transform: 'rotate(-4deg)', opacity: ease.out(prog(t, A + 1.8, A + 2.4)) }}>—— 会映 MeetReel</div>
    </Layer>
  )
}
