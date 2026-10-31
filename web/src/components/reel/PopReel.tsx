// 风格三：波普漫画。经典四色（蓝、黄、红、米白）+ 45° 斜排网点、粗黑描边、旁白框、对白气泡、拟声字。
// 主体是一轮网点“月亮”（这场会）：20 个小圆片绕着它，“嗖”地飞走 17 个，剩下的变红、放大、贴上标签。
import type { CSSProperties, ReactNode } from 'react'
import { ACT, beatWindow, tc, weekdayShort, type ReelSpec } from './spec'
import { FONT, Layer, PaperGrain, actLife, avatarSrc, clamp, count, ease, lerp, life, prog, rnd } from './kit'

const INK = '#151515'
const BLUE = '#2D6BE0'
const DEEP = '#1D4BB0'
const YEL = '#FFD43B'
const RED = '#EF4B3F'
const CREAM = '#FFF4DC'
const PINK = '#FF9DB8'

/** 45° 斜排网点 */
const dots = (bg: string, dot: string, size = 16, r = 3) =>
  `radial-gradient(circle, ${dot} ${r}px, transparent ${r + 0.7}px) 0 0 / ${size}px ${size}px, radial-gradient(circle, ${dot} ${r}px, transparent ${r + 0.7}px) ${size / 2}px ${size / 2}px / ${size}px ${size}px, ${bg}`
const LINE = (w = 6): CSSProperties => ({ border: `${w}px solid ${INK}` })
const HARD = (d = 10): CSSProperties => ({ boxShadow: `${d}px ${d}px 0 ${INK}` })
/** 漫画字：黑描边 + 硬投影 */
const LETTER = (stroke: number, shadow = 6, sc = INK): CSSProperties => ({
  fontFamily: FONT.comic, WebkitTextStroke: `${stroke}px ${INK}`, paintOrder: 'stroke fill', textShadow: `${shadow}px ${shadow}px 0 ${sc}`,
})

export function PopReel({ s, t }: { s: ReelSpec; t: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: FONT.comic, color: INK, background: CREAM }}>
      <Intro s={s} t={t} />
      <Filter s={s} t={t} />
      <Items s={s} t={t} />
      <Next s={s} t={t} />
      <Outro s={s} t={t} />
      <PaperGrain opacity={0.18} />
    </div>
  )
}

function burst(cx: number, cy: number, r1: number, r2: number, n: number, seed: number, rot = 0) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2
    const r = (i % 2 ? r2 : r1) * (0.86 + rnd(seed + i) * 0.28)
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`)
  }
  return pts.join(' ')
}

function Burst({ x, y, r, fill, children, scale = 1, rot = 0, seed = 1, spikes = 14 }: { x: number; y: number; r: number; fill: string; children?: ReactNode; scale?: number; rot?: number; seed?: number; spikes?: number }) {
  if (scale <= 0.01) return null
  return (
    <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, transform: `rotate(${rot}deg) scale(${scale})` }}>
      <svg width={r * 2} height={r * 2} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <polygon points={burst(r, r, r, r * 0.68, spikes, seed)} fill={INK} transform="translate(8 8)" />
        <polygon points={burst(r, r, r, r * 0.68, spikes, seed)} fill={fill} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  )
}

function Caption({ x, y, children, bg = YEL, size = 28, rot = 0, o = 1, style }: { x: number; y: number; children: ReactNode; bg?: string; size?: number; rot?: number; o?: number; style?: CSSProperties }) {
  if (o <= 0.01) return null
  return <div style={{ position: 'absolute', left: x, top: y, background: bg, padding: '10px 20px 8px', fontSize: size, lineHeight: 1.25, ...LINE(5), ...HARD(6), transform: `rotate(${rot}deg)`, opacity: o, whiteSpace: 'nowrap', ...style }}>{children}</div>
}

/** 网点月亮：这场会 */
function Moon({ cx, cy, r, t, o = 1 }: { cx: number; cy: number; r: number; t: number; o?: number }) {
  return (
    <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', opacity: o, ...LINE(6), ...HARD(12), overflow: 'hidden', background: YEL }}>
      <div style={{ position: 'absolute', inset: -20, background: dots('transparent', 'rgb(239 75 63 / 30%)', 18, 4.5), transform: `rotate(${t * 6}deg)` }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 70% 70%, transparent 55%, rgb(239 120 30 / 35%) 56%)' }} />
    </div>
  )
}

const STARS = [[120, 560], [300, 120], [520, 640], [610, 90], [1180, 120], [1210, 560], [760, 650], [460, 300]]
const Star = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <svg width={40} height={40} style={{ position: 'absolute', left: x - 20, top: y - 20, transform: `scale(${s})` }}><path d="M20 0 L24 16 L40 20 L24 24 L20 40 L16 24 L0 20 L16 16 Z" fill="#fff" /></svg>
)

function Intro({ s, t }: { s: ReelSpec; t: number }) {
  const o = actLife(t, 'intro', 0.12, 0.4)
  const pop = ease.back(prog(t, 0.25, 0.8))
  const m = s.meeting
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', inset: 22, ...LINE(6), background: dots(BLUE, 'rgb(255 255 255 / 16%)', 16, 2.6), overflow: 'hidden' }}>
        {STARS.map(([x, y], i) => <Star key={i} x={x - 22} y={y - 22} s={0.5 + 0.4 * Math.abs(Math.sin(t * 2 + i))} />)}
        <Moon cx={880} cy={360} r={220} t={t} o={clamp(prog(t, 0, 0.4))} />
      </div>
      <Caption x={58} y={52} size={30} rot={-1} o={clamp(prog(t, 0.05, 0.3))}>与此同时，在小米的直播间里……</Caption>
      <div style={{ position: 'absolute', left: 92, top: 180, transform: `scale(${pop}) rotate(${-6 + Math.sin(t * 3) * 1.2}deg) skewX(-6deg)`, transformOrigin: '20% 60%' }}>
        <div style={{ fontSize: 96, color: '#fff', ...LETTER(4, 6) }}>{s.person.name}的</div>
        <div style={{ fontSize: 196, lineHeight: 1, color: YEL, ...LETTER(7, 0), textShadow: `8px 8px 0 ${RED}, 15px 15px 0 ${INK}` }}>30 秒！</div>
      </div>
      <Burst x={700} y={150} r={70} fill={RED} scale={ease.back(prog(t, 1.2, 1.6))} rot={-10} seed={3}>
        <span style={{ fontSize: 44, color: '#fff', ...LETTER(3, 3) }}>叮！</span>
      </Burst>
      <Caption x={790} y={628} bg="#fff" size={24} rot={1.5} o={ease.out(prog(t, 1.4, 1.9))}>会映替你看完了 {Math.floor(m.duration / 60)} 分 {m.duration % 60} 秒</Caption>
    </Layer>
  )
}

function Filter({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.filter
  const o = actLife(t, 'filter', 0.15, 0.4)
  if (o <= 0) return null
  const items = s.meeting.items
  const n = s.kept.length
  const cx = 640, cy = 378, R = 256
  const phase = t < A + 1.5 ? 0 : t < A + 3.0 ? 1 : 2
  const cap = phase === 0 ? `这场直播，一共 ${s.total} 条……` : phase === 1 ? '跟你有关的？' : n ? `只有 ${n} 条！` : '一条都没有！'
  const sfx = ease.back(prog(t, A + 1.6, A + 2.0)) * (1 - prog(t, A + 2.8, A + 3.1))
  const lab = ease.back(prog(t, A + 3.5, A + 4.0))
  let k = 0
  const lines: ReactNode[] = []
  const tokens = items.map((it, i) => {
    const a0 = -Math.PI / 2 + (i / items.length) * Math.PI * 2
    const kept = s.kept.indexOf(it.id)
    const ap = ease.back(prog(t, A + 0.1 + i * 0.03, A + 0.45 + i * 0.03))
    let a = a0, r = R, size = 38, fill = '#fff', op = 1, num = String(i + 1)
    if (kept < 0) {
      const kk = k++
      const fly = ease.in(prog(t, A + 1.6 + kk * 0.04, A + 2.4 + kk * 0.04))
      r = R + fly * 700
      op = 1 - prog(t, A + 2.2 + kk * 0.04, A + 2.4 + kk * 0.04)
      if (fly > 0.02 && op > 0) {
        for (let j = 0; j < 3; j++) {
          const off = (j - 1) * 0.06
          const r1 = r - 30 - j * 10, r2 = r1 - 60 - fly * 60
          lines.push(<line key={`${it.id}${j}`} x1={cx + Math.cos(a + off) * r1} y1={cy + Math.sin(a + off) * r1} x2={cx + Math.cos(a + off) * r2} y2={cy + Math.sin(a + off) * r2} stroke={INK} strokeWidth={4} strokeLinecap="round" opacity={op} />)
        }
      }
    } else {
      const lit = ease.back(prog(t, A + 1.7 + kept * 0.12, A + 2.1 + kept * 0.12))
      const mv = ease.inOut(prog(t, A + 3.0, A + 3.7))
      // 留下的几枚从正下方开始均匀排开，避开顶上的旁白框
      a = lerp(a0, Math.PI / 2 + (kept / n) * Math.PI * 2, mv)
      size = lerp(38, 64, lit)
      fill = lit > 0.3 ? RED : '#fff'
      num = lit > 0.3 ? String(kept + 1) : num
    }
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    if (op <= 0) return null
    return (
      <div key={it.id}>
        <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: fill, ...LINE(4), boxShadow: `4px 4px 0 ${INK}`, opacity: op, transform: `scale(${ap})`, display: 'grid', placeItems: 'center', fontSize: size * 0.48, color: fill === RED ? '#fff' : INK }}>{num}</div>
        {kept >= 0 && lab > 0.01 && (() => {
          const right = Math.cos(a) > 0.2 || Math.sin(a) > 0.9, left = !right && Math.cos(a) < -0.2
          const lx = right ? x + 46 : left ? x - 46 : x
          const ly = y - 26
          const room = right ? 1236 - lx : left ? lx - 44 : 420
          return (
            <div style={{ position: 'absolute', left: lx, top: ly, transform: `translateX(${right ? 0 : left ? -100 : -50}%) scale(${lab})`, transformOrigin: right ? 'left center' : left ? 'right center' : 'center top', background: '#fff', padding: '6px 14px 4px', fontSize: 22, ...LINE(4), boxShadow: `5px 5px 0 ${INK}`, width: 'max-content', maxWidth: Math.min(300, room), lineHeight: 1.3 }}>{it.title}</div>
          )
        })()}
      </div>
    )
  })
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', inset: 22, ...LINE(6), background: dots('#FFE6EE', 'rgb(239 75 63 / 16%)', 18, 3.2), overflow: 'hidden' }} />
      <div style={{ position: 'absolute', inset: 28, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -28, top: -28, width: 1280, height: 720 }}>
          <Moon cx={cx} cy={cy} r={170} t={t} />
          <div style={{ position: 'absolute', left: cx - 170, top: cy - 104, width: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 150, lineHeight: 1, color: INK }}>{count(t, A + 1.6, A + 3.0, s.total, n)}</div>
            <div style={{ fontSize: 34, marginTop: 2 }}>条</div>
          </div>
          <svg width={1280} height={720} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>{lines}</svg>
          {tokens}
          {sfx > 0.01 && <div style={{ position: 'absolute', right: 70, top: 120, fontSize: 130, color: '#fff', ...LETTER(6, 8), transform: `rotate(-14deg) skewX(-10deg) scale(${sfx})` }}>嗖——！</div>}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 46, display: 'flex', justifyContent: 'center' }}>
        <div key={phase} style={{ background: YEL, padding: '10px 26px 8px', fontSize: 36, ...LINE(5), ...HARD(7), transform: `rotate(-1deg) scale(${ease.back(prog(t, phase === 0 ? A : phase === 1 ? A + 1.5 : A + 3.0, (phase === 0 ? A : phase === 1 ? A + 1.5 : A + 3.0) + 0.35))})` }}>{cap}</div>
      </div>
    </Layer>
  )
}

/** 对白气泡：圆角矩形 + 一条尾巴，一笔描边 */
function balloon(x: number, y: number, w: number, h: number, r: number, tx: number, tipX: number, tipY: number) {
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${tx + 26} L${tipX},${tipY} L${tx - 18},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`
}

function Items({ s, t }: { s: ReelSpec; t: number }) {
  const [A, B] = ACT.items
  if (t < A - 0.01 || t > B + 0.01) return null
  if (!s.beats.length) {
    return (
      <Layer o={life(t, A, B, 0.25, 0.4)}>
        <div style={{ position: 'absolute', inset: 22, ...LINE(6), background: dots(YEL, 'rgb(239 75 63 / 22%)', 18, 3.5) }} />
        <Burst x={640} y={360} r={230} fill="#fff" seed={9} spikes={18} scale={ease.back(prog(t, A, A + 0.5))}>
          <span style={{ fontSize: 60, lineHeight: 1.3 }}>这一话，<br />没你的戏份！</span>
        </Burst>
      </Layer>
    )
  }
  const n = s.beats.length
  return (
    <>
      {s.beats.map((b, i) => {
        const [a, z] = beatWindow(i, n)
        const o = life(t, a, z, 0.15, 0.3)
        if (o <= 0) return null
        const e = b.entry
        const inL = ease.back(prog(t, a, a + 0.45))
        const inR = ease.back(prog(t, a + 0.12, a + 0.6))
        const bal = ease.back(prog(t, a + 0.45, a + 0.85))
        const q = e.item.quote
        const k = Math.ceil(q.length * prog(t, a + 0.7, a + 1.9))
        const tag = ease.back(prog(t, a + 0.9, a + 1.25))
        const why = ease.out(prog(t, a + 1.3, a + 1.7))
        const len = e.item.title.length
        const bg = [['#8CCBF7', 'rgb(255 255 255 / 32%)'], ['#FFB3C7', 'rgb(255 255 255 / 34%)'], ['#A9E5BB', 'rgb(255 255 255 / 34%)']][i % 3]
        return (
          <Layer key={e.item.id} o={o}>
            <div style={{ position: 'absolute', left: 22, top: 22, width: 548, height: 676, ...LINE(6), background: dots(bg[0], bg[1], 16, 3), overflow: 'hidden', transform: `translateX(${lerp(-620, 0, inL)}px)` }}>
              <svg width={548} height={676} style={{ position: 'absolute', left: -6, top: -6, overflow: 'visible' }}>
                <polygon points={burst(200, 520, 190, 140, 16, i + 5)} fill={YEL} stroke={INK} strokeWidth={4} />
              </svg>
              <div style={{ position: 'absolute', left: 80, top: 400, width: 240, height: 240, borderRadius: '50%', overflow: 'hidden', ...LINE(6), ...HARD(8), background: '#fff' }}>
                <img src={avatarSrc(b.speaker.id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.1) saturate(1.15)' }} />
              </div>
              <Caption x={330} y={560} size={30} rot={-2}>{b.speaker.name}说</Caption>
              <Caption x={330} y={620} bg="#fff" size={17} style={{ fontFamily: FONT.sans, fontWeight: 600, padding: '4px 10px 3px', borderWidth: 3, boxShadow: `3px 3px 0 ${INK}` }}>原话 {tc(b.at)} · 示意头像</Caption>
            </div>
            <div style={{ position: 'absolute', left: 22, top: 22, width: 548, height: 676, pointerEvents: 'none', transform: `translateX(${lerp(-620, 0, inL)}px)` }}>
              <svg width={548} height={676} style={{ position: 'absolute', inset: 0, overflow: 'visible', transform: `scale(${bal})`, transformOrigin: '200px 380px' }}>
                <path d={balloon(34, 40, 474, 270, 70, 200, 190, 395)} fill="#fff" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
              </svg>
              <div style={{ position: 'absolute', left: 74, top: 76, width: 400, height: 200, display: 'grid', placeItems: 'center', textAlign: 'center', fontSize: q.length > 20 ? 32 : 38, lineHeight: 1.35, opacity: clamp(bal * 2) }}>“{q.slice(0, k)}{k >= q.length ? '”' : ''}</div>
            </div>
            <div style={{ position: 'absolute', left: 592, top: 22, width: 666, height: 676, ...LINE(6), background: dots('#FFFDF5', 'rgb(45 107 224 / 8%)', 14, 2.4), transform: `translateX(${lerp(720, 0, inR)}px)`, padding: '108px 48px 0' }}>
              <Caption x={-6} y={-6} size={28} style={{ boxShadow: 'none' }}>第 {i + 1} 格 · 对你来说……</Caption>
              <div style={{ fontSize: len > 16 ? 46 : 56, lineHeight: 1.3 }}>
                <span style={{ background: `linear-gradient(transparent 58%, ${YEL} 58%, ${YEL} 92%, transparent 92%)`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{e.item.title}</span>
              </div>
              <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 24, lineHeight: 1.7, marginTop: 24, color: '#2A2A2A' }}>{e.forYou}</div>
              <div style={{ position: 'absolute', left: 44, right: 44, bottom: 40, background: BLUE, color: '#fff', padding: '14px 20px 12px', fontSize: 26, ...LINE(5), ...HARD(6), opacity: why, transform: `translateY(${lerp(16, 0, why)}px)` }}>为什么是你？{e.why}</div>
              {i === n - 1 && s.more > 0 && <div style={{ position: 'absolute', right: 48, bottom: 128, fontSize: 20, color: '#555' }}>还有 {s.more} 格在卡片里 →</div>}
            </div>
            <Burst x={1140} y={500} r={80} fill={e.tier === 'must' ? RED : YEL} seed={i + 21} scale={tag} rot={12}>
              <span style={{ fontSize: e.tier === 'must' ? 40 : 30, color: e.tier === 'must' ? '#fff' : INK, ...(e.tier === 'must' ? LETTER(3, 3) : {}) }}>{e.tier === 'must' ? '必读！' : '瞄一眼'}</span>
            </Burst>
          </Layer>
        )
      })}
    </>
  )
}

function Next({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.next
  const o = actLife(t, 'next', 0.15, 0.4)
  if (o <= 0 || !s.next) return null
  const nx = s.next
  const drop = ease.back(prog(t, A + 0.15, A + 0.7))
  const sfx = ease.back(prog(t, A + 0.65, A + 1.0)) * (1 - prog(t, A + 2.4, A + 2.7))
  const card = ease.back(prog(t, A + 1.3, A + 1.8))
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', inset: 22, ...LINE(6), background: dots(YEL, 'rgb(239 75 63 / 24%)', 18, 3.6) }} />
      <div style={{ position: 'absolute', left: 120, top: 110, width: 370, height: 490, background: '#fff', ...LINE(6), ...HARD(14), transform: `translateY(${lerp(-760, 0, drop)}px) rotate(-5deg)`, textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ background: RED, color: '#fff', fontSize: 50, padding: '12px 0 8px', borderBottom: `6px solid ${INK}`, ...LETTER(2, 0) }}>{nx.date ? `${Number(nx.date.slice(5, 7))} 月` : '截止'}</div>
        {nx.date ? (
          <>
            <div style={{ fontSize: 270, lineHeight: 1.08 }}>{Number(nx.date.slice(8))}</div>
            <div style={{ fontSize: 44 }}>周{weekdayShort(nx.date)}</div>
          </>
        ) : <div style={{ fontSize: 60, padding: '120px 20px 0', lineHeight: 1.25 }}>{nx.dueLabel}</div>}
      </div>
      <Burst x={500} y={130} r={88} fill={RED} seed={33} scale={sfx} rot={14}>
        <span style={{ fontSize: 56, color: '#fff', ...LETTER(3, 4) }}>咚！</span>
      </Burst>
      <Caption x={576} y={92} size={32} rot={-2} o={clamp(prog(t, A + 0.2, A + 0.4))}>下一话预告！</Caption>
      <div style={{ position: 'absolute', left: 576, top: 176, width: 620, background: '#fff', ...LINE(6), ...HARD(10), padding: '28px 32px 24px', fontSize: 38, lineHeight: 1.45, transform: `scale(${ease.back(prog(t, A + 0.5, A + 0.95))})`, transformOrigin: 'left top' }}>{nx.link}</div>
      <div style={{ position: 'absolute', left: 610, top: 446, width: 560, background: BLUE, color: '#fff', ...LINE(6), ...HARD(10), padding: '20px 26px 16px', transform: `scale(${card}) rotate(1.5deg)` }}>
        <div style={{ fontSize: 32, ...LETTER(2, 3) }}>★ {nx.item.title}</div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 19, marginTop: 8, opacity: 0.9 }}>{nx.meeting.title.replace(/ · .*/, '')} · {nx.dueLabel}</div>
      </div>
    </Layer>
  )
}

function Outro({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.outro
  const o = clamp(prog(t, A, A + 0.2))
  if (o <= 0) return null
  const pop = ease.back(prog(t, A + 0.1, A + 0.6))
  const btns: [string, string][] = [['确认！', YEL], ['追问？', '#fff'], ['不是我', PINK]]
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', inset: 22, ...LINE(6), overflow: 'hidden', background: `repeating-conic-gradient(from ${t * 10}deg at 50% 46%, ${BLUE} 0deg 10deg, ${DEEP} 10deg 20deg)` }}>
        <div style={{ position: 'absolute', inset: 0, background: dots('transparent', 'rgb(255 255 255 / 10%)', 16, 2.6) }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 56, textAlign: 'center', fontSize: 86, color: YEL, ...LETTER(5, 7), transform: `scale(${pop}) rotate(-2deg)` }}>省下 {s.savedMin} 分钟！</div>
      <div style={{ position: 'absolute', left: 500, top: 196, width: 280, height: 280, borderRadius: '50%', background: dots(YEL, 'rgb(239 75 63 / 26%)', 16, 3.4), ...LINE(8), ...HARD(12), display: 'grid', placeItems: 'center', fontSize: 170, transform: `scale(${pop}) rotate(${lerp(-40, 0, pop)}deg)` }}>完</div>
      {btns.map(([b, bg], i) => {
        const p = ease.back(prog(t, A + 0.8 + i * 0.15, A + 1.2 + i * 0.15))
        return <div key={b} style={{ position: 'absolute', left: 220 + i * 300, top: 530, width: 240, textAlign: 'center', background: bg, ...LINE(6), ...HARD(9), fontSize: 42, padding: '14px 0 10px', transform: `scale(${p}) rotate(${[-4, 2, -2][i]}deg)` }}>{b}</div>
      })}
      <Caption x={500} y={648} bg="#fff" size={22} o={clamp(prog(t, A + 1.6, A + 2))}>会映 MeetReel · 下一话见</Caption>
    </Layer>
  )
}
