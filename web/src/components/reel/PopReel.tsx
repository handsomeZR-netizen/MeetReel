// 风格三：波普漫画。网点、粗黑边、旁白框和对白框、拟声字：无关的“嗖”地飞走，有关的贴上“你的！”。
import type { CSSProperties, ReactNode } from 'react'
import { ITEM_TYPES } from '@/data/model'
import { Face } from '@/components/common/bits'
import { ACT, beatWindow, tc, weekdayShort, type ReelSpec } from './spec'
import { Layer, actLife, clamp, ease, lerp, life, prog } from './kit'

const FONT = '"PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Inter Variable", sans-serif'
const K = '#111'
const YEL = '#FFD60A'
const RED = '#FF3B30'
const BLUE = '#2F6BFF'
const dots = (bg: string, dot = 'rgb(0 0 0 / 16%)', size = 14) => `radial-gradient(circle, ${dot} 2.3px, transparent 2.8px) 0 0 / ${size}px ${size}px, ${bg}`
const BOX: CSSProperties = { border: `5px solid ${K}`, boxShadow: `9px 9px 0 ${K}` }
const OUT = (w = 3): CSSProperties => ({ WebkitTextStroke: `${w}px ${K}`, paintOrder: 'stroke fill', textShadow: `5px 5px 0 ${K}` })

export function PopReel({ s, t }: { s: ReelSpec; t: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, color: K, overflow: 'hidden', background: '#fff' }}>
      <Intro s={s} t={t} />
      <Filter s={s} t={t} />
      <Items s={s} t={t} />
      <Next s={s} t={t} />
      <Outro s={s} t={t} />
    </div>
  )
}

function burst(cx: number, cy: number, r1: number, r2: number, n = 18, rot = 0) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2
    const r = i % 2 ? r2 : r1
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`)
  }
  return pts.join(' ')
}

function Caption({ x, y, children, bg = YEL, size = 26, rot = 0, o = 1 }: { x: number | string; y: number; children: ReactNode; bg?: string; size?: number; rot?: number; o?: number }) {
  return <div style={{ position: 'absolute', left: x, top: y, background: bg, padding: '10px 20px', fontSize: size, fontWeight: 900, ...BOX, boxShadow: `6px 6px 0 ${K}`, transform: `rotate(${rot}deg)`, opacity: o, whiteSpace: 'nowrap' }}>{children}</div>
}

function Intro({ s, t }: { s: ReelSpec; t: number }) {
  const o = actLife(t, 'intro', 0.1, 0.4)
  const pop = ease.back(prog(t, 0.15, 0.65))
  const wob = Math.sin(t * 4) * 1.5
  const m = s.meeting
  return (
    <Layer o={o} style={{ background: dots(BLUE, 'rgb(255 255 255 / 22%)') }}>
      <Caption x={56} y={44} o={clamp(prog(t, 0, 0.3))} rot={-1.5}>第 1 话 · {m.title}</Caption>
      <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }}>
        <g style={{ transform: `scale(${pop})`, transformOrigin: '640px 380px' }}>
          <polygon points={burst(640, 380, 330, 240, 20, t * 0.15)} fill={K} transform="translate(10 10)" />
          <polygon points={burst(640, 380, 330, 240, 20, t * 0.15)} fill={RED} stroke={K} strokeWidth={6} />
        </g>
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', transform: `scale(${pop}) rotate(${wob - 3}deg)` }}>
        <div style={{ fontSize: 72, fontWeight: 900, color: '#fff', ...OUT(4) }}>{s.person.name}的</div>
        <div style={{ fontSize: 150, fontWeight: 900, color: YEL, lineHeight: 1.05, ...OUT(6), textShadow: `8px 8px 0 ${K}` }}>30 秒！</div>
      </div>
      <Caption x={830} y={630} bg="#fff" size={22} o={ease.out(prog(t, 1.2, 1.7))} rot={1.5}>会映替你看完了 {Math.floor(m.duration / 60)} 分 {m.duration % 60} 秒</Caption>
    </Layer>
  )
}

function Filter({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.filter
  const o = actLife(t, 'filter', 0.2, 0.4)
  if (o <= 0) return null
  const n = s.kept.length
  const cols = 5, w = 170, h = 88, gx = 24, gy = 22
  const x0 = (1280 - (cols * w + (cols - 1) * gx)) / 2, y0 = 196
  const sc = Math.min(1.35, (1150 - (n - 1) * 30) / Math.max(1, n * w))
  const tw = w * sc, total = n * tw + (n - 1) * 30
  const phase = t < A + 1.5 ? 0 : t < A + 3.0 ? 1 : 2
  const cap = phase === 0 ? `这场直播，一共 ${s.total} 条！` : phase === 1 ? '跟你有关的，只有——' : n ? `${n} 条！剩下 ${s.total - n} 条？不来烦你！` : `${s.total} 条，一条都不用你看！`
  const sfx = ease.back(prog(t, A + 1.7, A + 2.1)) * (1 - prog(t, A + 2.9, A + 3.2))
  let k = 0
  return (
    <Layer o={o} style={{ background: dots(YEL, 'rgb(220 110 0 / 22%)') }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 46, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', background: '#fff', padding: '12px 28px', fontSize: 34, fontWeight: 900, ...BOX }}>{cap}</div>
      </div>
      {s.meeting.items.map((it, i) => {
        const kept = s.kept.indexOf(it.id)
        const r = Math.floor(i / cols), c = i % cols
        const ap = ease.back(prog(t, A + 0.05 + i * 0.03, A + 0.4 + i * 0.03))
        let x = x0 + c * (w + gx), y = y0 + r * (h + gy), rot = 0, scale = ap
        let op = clamp(ap * 3), sticker = 0
        if (kept < 0) {
          const kk = k++
          const fly = ease.in(prog(t, A + 1.6 + kk * 0.045, A + 2.2 + kk * 0.045))
          x += fly * (1400 - x)
          y -= fly * 120
          rot = fly * 35
          op *= 1 - prog(t, A + 2.1 + kk * 0.045, A + 2.3 + kk * 0.045)
        } else {
          sticker = ease.back(prog(t, A + 1.8 + kept * 0.12, A + 2.2 + kept * 0.12))
          const mv = ease.inOut(prog(t, A + 3.0 + kept * 0.1, A + 3.8 + kept * 0.1))
          x = lerp(x, (1280 - total) / 2 + kept * (tw + 30) - (w - tw) / 2, mv)
          y = lerp(y, 380, mv)
          scale = lerp(scale, sc, mv)
          rot = lerp(0, kept % 2 ? 2.5 : -2.5, mv)
        }
        const ty = ITEM_TYPES[it.type]
        return (
          <div key={it.id} style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: op, transform: `rotate(${rot}deg) scale(${scale})`, background: '#fff', border: `4px solid ${K}`, boxShadow: `5px 5px 0 ${K}` }}>
            <div style={{ background: ty.color, color: '#fff', fontSize: 13, fontWeight: 900, padding: '1px 8px', borderBottom: `3px solid ${K}` }}>{ty.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3, padding: '5px 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</div>
            {sticker > 0 && (
              <div style={{ position: 'absolute', right: -22, top: -26, background: RED, color: '#fff', fontSize: 20, fontWeight: 900, padding: '4px 10px', border: `4px solid ${K}`, borderRadius: 999, transform: `rotate(12deg) scale(${sticker})` }}>你的！</div>
            )}
          </div>
        )
      })}
      {sfx > 0 && <div style={{ position: 'absolute', right: 70, top: 290, fontSize: 150, fontWeight: 900, fontStyle: 'italic', color: '#fff', ...OUT(6), transform: `rotate(-12deg) scale(${sfx})` }}>嗖——</div>}
    </Layer>
  )
}

const PANEL_BG = [RED, BLUE, '#8338EC', '#FF8C00']

function Items({ s, t }: { s: ReelSpec; t: number }) {
  const [A, B] = ACT.items
  if (t < A - 0.01 || t > B + 0.01) return null
  if (!s.beats.length) {
    return (
      <Layer o={life(t, A, B, 0.3, 0.4)} style={{ background: dots('#fff') }}>
        <div style={{ position: 'absolute', left: 240, top: 200, width: 800, padding: '50px 40px', background: YEL, ...BOX, textAlign: 'center', fontSize: 64, fontWeight: 900 }}>这一话，没你的戏份！</div>
      </Layer>
    )
  }
  return (
    <>
      {s.beats.map((b, i) => {
        const [a, z] = beatWindow(i, s.beats.length)
        const o = life(t, a, z, 0.2, 0.3)
        if (o <= 0) return null
        const e = b.entry
        const inL = ease.back(prog(t, a, a + 0.45))
        const inR = ease.back(prog(t, a + 0.15, a + 0.6))
        const q = e.item.quote
        const k = Math.ceil(q.length * prog(t, a + 0.5, a + 1.8))
        const tag = ease.back(prog(t, a + 0.9, a + 1.25))
        return (
          <Layer key={e.item.id} o={o} style={{ background: dots('#F4F1EA', 'rgb(0 0 0 / 7%)', 10) }}>
            <div style={{ position: 'absolute', left: 44, top: 48, width: 560, height: 620, background: dots(PANEL_BG[i % PANEL_BG.length], 'rgb(255 255 255 / 20%)'), ...BOX, transform: `translateX(${lerp(-700, 0, inL)}px) rotate(-1deg)`, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 28, top: 28, right: 28, background: '#fff', border: `5px solid ${K}`, borderRadius: 40, padding: '26px 30px', fontSize: 31, fontWeight: 900, lineHeight: 1.4, minHeight: 200 }}>
                “{q.slice(0, k)}{k >= q.length ? '”' : ''}
              </div>
              <svg width={560} height={620} style={{ position: 'absolute', inset: 0 }}><polygon points="150,262 186,262 126,330" fill="#fff" stroke={K} strokeWidth={5} strokeLinejoin="round" /><rect x={146} y={252} width={44} height={14} fill="#fff" /></svg>
              <div style={{ position: 'absolute', left: 50, top: 330, borderRadius: '50%', border: `6px solid ${K}`, boxShadow: `6px 6px 0 ${K}`, background: '#fff' }}><Face p={b.speaker} size={190} /></div>
              <Caption x={262} y={420} size={30}>{b.speaker.name}</Caption>
              <Caption x={262} y={486} bg="#fff" size={18}>原话 {tc(b.at)} · 示意头像</Caption>
            </div>
            <div style={{ position: 'absolute', left: 646, top: 48, width: 590, height: 620, background: '#fff', ...BOX, transform: `translateX(${lerp(700, 0, inR)}px) rotate(0.8deg)`, padding: '96px 40px 0' }}>
              <Caption x={-5} y={-5} size={22}>第 {i + 1} 格 · 对你意味着……</Caption>
              <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.25 }}>
                <span style={{ background: `linear-gradient(transparent 58%, ${YEL} 58%)` }}>{e.item.title}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.6, marginTop: 22, color: '#333' }}>{e.forYou}</div>
              <div style={{ position: 'absolute', left: 36, right: 36, bottom: 34, background: BLUE, color: '#fff', padding: '12px 18px', fontSize: 22, fontWeight: 800, border: `4px solid ${K}` }}>为什么是你？{e.why}</div>
            </div>
            {tag > 0 && (
              <div style={{ position: 'absolute', left: 1090, top: 10, width: 170, height: 170, transform: `rotate(14deg) scale(${tag})` }}>
                <svg width={170} height={170} style={{ position: 'absolute', inset: 0 }}><polygon points={burst(85, 85, 82, 60, 14)} fill={e.tier === 'must' ? RED : YEL} stroke={K} strokeWidth={5} /></svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: e.tier === 'must' ? 34 : 26, fontWeight: 900, color: e.tier === 'must' ? '#fff' : K, ...(e.tier === 'must' ? OUT(2) : {}) }}>{e.tier === 'must' ? '必读！' : '建议看'}</div>
              </div>
            )}
            {i === s.beats.length - 1 && s.more > 0 && <Caption x={940} y={676} bg="#fff" size={18}>卡片里还有 {s.more} 格 →</Caption>}
          </Layer>
        )
      })}
    </>
  )
}

function Next({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.next
  const o = actLife(t, 'next', 0.2, 0.4)
  if (o <= 0 || !s.next) return null
  const nx = s.next
  const drop = ease.back(prog(t, A + 0.3, A + 0.85))
  const sfx = ease.back(prog(t, A + 0.8, A + 1.1)) * (1 - prog(t, A + 2.2, A + 2.5))
  const card = ease.back(prog(t, A + 1.3, A + 1.8))
  return (
    <Layer o={o} style={{ background: dots(BLUE, 'rgb(255 255 255 / 20%)') }}>
      <Caption x={56} y={44} size={32} rot={-2}>下一话预告！</Caption>
      <div style={{ position: 'absolute', left: 120, top: 140, width: 380, height: 470, background: '#fff', ...BOX, transform: `translateY(${lerp(-700, 0, drop)}px) rotate(-4deg)`, textAlign: 'center' }}>
        <div style={{ background: RED, color: '#fff', fontSize: 40, fontWeight: 900, padding: '14px 0', borderBottom: `5px solid ${K}` }}>{nx.date ? `${Number(nx.date.slice(5, 7))} 月` : '截止'}</div>
        {nx.date ? (
          <>
            <div style={{ fontSize: 240, fontWeight: 900, lineHeight: 1.1, marginTop: 6 }}>{Number(nx.date.slice(8))}</div>
            <div style={{ fontSize: 40, fontWeight: 900 }}>周{weekdayShort(nx.date)}</div>
          </>
        ) : <div style={{ fontSize: 56, fontWeight: 900, padding: '120px 20px 0', lineHeight: 1.2 }}>{nx.dueLabel}</div>}
      </div>
      {sfx > 0 && <div style={{ position: 'absolute', left: 410, top: 100, fontSize: 110, fontWeight: 900, color: YEL, ...OUT(5), transform: `rotate(10deg) scale(${sfx})` }}>咚！</div>}
      <div style={{ position: 'absolute', left: 600, top: 170, width: 600, background: '#fff', ...BOX, padding: '26px 30px', fontSize: 36, fontWeight: 900, lineHeight: 1.4, opacity: clamp(prog(t, A + 0.6, A + 0.9)) }}>{nx.link}</div>
      <div style={{ position: 'absolute', left: 640, top: 430, width: 540, background: YEL, ...BOX, padding: '20px 26px', transform: `scale(${card}) rotate(1.5deg)` }}>
        <div style={{ fontSize: 30, fontWeight: 900 }}>★ {nx.item.title}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{nx.meeting.title.replace(/ · .*/, '')} · {nx.dueLabel}</div>
      </div>
    </Layer>
  )
}

function Outro({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.outro
  const o = clamp(prog(t, A, A + 0.25))
  if (o <= 0) return null
  const pop = ease.back(prog(t, A + 0.1, A + 0.6))
  const btns: [string, string][] = [['确认！', YEL], ['追问？', '#fff'], ['不是我', '#7DE2FC']]
  return (
    <Layer o={o} style={{ background: `repeating-conic-gradient(from ${t * 8}deg at 50% 46%, ${RED} 0deg 9deg, #FF5C52 9deg 18deg)` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 54, textAlign: 'center', fontSize: 78, fontWeight: 900, color: YEL, ...OUT(5), transform: `scale(${pop})` }}>省下 {s.savedMin} 分钟！</div>
      <div style={{ position: 'absolute', left: 510, top: 190, width: 260, height: 260, borderRadius: '50%', background: '#fff', ...BOX, display: 'grid', placeItems: 'center', fontSize: 150, fontWeight: 900, transform: `scale(${pop}) rotate(${lerp(-30, 0, pop)}deg)` }}>完</div>
      {btns.map(([b, bg], i) => {
        const p = ease.back(prog(t, A + 0.8 + i * 0.15, A + 1.2 + i * 0.15))
        return <div key={b} style={{ position: 'absolute', left: 250 + i * 290, top: 510, width: 230, textAlign: 'center', background: bg, ...BOX, fontSize: 38, fontWeight: 900, padding: '14px 0', transform: `scale(${p}) rotate(${[-4, 2, -2][i]}deg)` }}>{b}</div>
      })}
      <Caption x={530} y={650} bg="#fff" size={20} o={clamp(prog(t, A + 1.6, A + 2))}>会映 MeetReel · 下一话见</Caption>
    </Layer>
  )
}
