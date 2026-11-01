// 风格四：3D 等距。暮色里一座漂浮的小岛，20 个条目是岛上的 20 块方砖：与你无关的压平进地面，与你有关的长成发光的柱子。
// CSS 3D 正交投影（不加透视）；平面文字按同一套投影算出屏幕位置，用引线挂在柱子顶上，保证看得清。
import type { CSSProperties, ReactNode } from 'react'
import { ITEM_TYPES } from '@/data/model'
import { ACT, beatWindow, stripDays, tc, weekdayShort, type ReelSpec } from './spec'
import { FONT, Grain, Layer, actLife, avatarSrc, clamp, count, ease, lerp, life, prog, rise, rnd } from './kit'
import { L } from '@/lib/i18n'

const TILT = 57
const PITCH = 104
const TILE = 80
const INK = '#2A2340'
const MUTE = '#776F8E'

const rad = (d: number) => (d * Math.PI) / 180
/** 岛上的点 (x, y, z) → 屏幕偏移，和 CSS 的 rotateX(TILT) rotateZ(phi) 一致 */
function proj(x: number, y: number, z: number, phi: number): [number, number] {
  const p = rad(phi)
  const xr = x * Math.cos(p) - y * Math.sin(p)
  const yr = x * Math.sin(p) + y * Math.cos(p)
  return [xr, yr * Math.cos(rad(TILT)) - z * Math.sin(rad(TILT))]
}

/** f < 1 压暗，f > 1 提亮 */
function tone(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, f >= 1 ? v + (255 - v) * (f - 1) : v * f)))
  return `rgb(${c(n >> 16)} ${c((n >> 8) & 255)} ${c(n & 255)})`
}

/** 方块：顶面 + 看得见的两个侧面，带光照渐变和接触阴影；透明度只能加在面上，加在外层会把 3D 拍平 */
function Block({ x, y, z = 0, w, d = w, h, color, glow = 0, o = 1, r = 6, ao = true }: { x: number; y: number; z?: number; w: number; d?: number; h: number; color: string; glow?: number; o?: number; r?: number; ao?: boolean }) {
  const face: CSSProperties = { position: 'absolute', backfaceVisibility: 'hidden', opacity: o }
  return (
    <>
      {ao && <div style={{ position: 'absolute', left: x - w / 2 - 10, top: y - d / 2 + 4, width: w + 26, height: d + 22, transform: 'translateZ(0.6px)', background: `radial-gradient(closest-side, rgb(40 22 70 / ${0.32 * o}), transparent)`, pointerEvents: 'none' }} />}
      <div style={{ position: 'absolute', left: x - w / 2, top: y - d / 2, width: w, height: d, transformStyle: 'preserve-3d', transform: `translateZ(${z}px)` }}>
        <div style={{ ...face, left: 0, top: d, width: w, height: h, transformOrigin: 'top', transform: 'rotateX(90deg)', background: `linear-gradient(180deg, ${tone(color, 0.66)}, ${tone(color, 0.84)})` }} />
        <div style={{ ...face, left: 0, top: 0, width: h, height: d, transformOrigin: 'left', transform: 'rotateY(-90deg)', background: `linear-gradient(90deg, ${tone(color, 0.54)}, ${tone(color, 0.7)})` }} />
        <div style={{
          ...face, left: 0, top: 0, width: w, height: d, transform: `translateZ(${h}px)`, borderRadius: r,
          background: `linear-gradient(135deg, ${tone(color, 1.22)}, ${color} 70%)`,
          boxShadow: glow ? `0 0 ${46 * glow}px ${14 * glow}px rgb(255 226 190 / ${0.6 * glow}), inset 0 0 0 2px rgb(255 255 255 / ${0.4 + 0.4 * glow})` : 'inset 0 0 0 1.5px rgb(255 255 255 / 30%)',
        }} />
      </div>
    </>
  )
}

function World({ cx, cy, phi, children }: { cx: number; cy: number; phi: number; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0, transformStyle: 'preserve-3d', transformOrigin: '0 0', transform: `rotateX(${TILT}deg) rotateZ(${phi}deg)` }}>
      {children}
    </div>
  )
}

/** 浮岛：奶油色的台面 + 下面一层更窄的岩石 */
function Island({ w, d }: { w: number; d: number }) {
  return (
    <>
      <Block x={0} y={0} z={-104} w={w - 90} d={d - 90} h={48} color="#7B6A9E" r={10} ao={false} />
      <Block x={0} y={0} z={-56} w={w} d={d} h={56} color="#F4EADF" r={14} ao={false} />
    </>
  )
}

/** 引线标签：从柱顶拉一根线到旁边的卡片 */
function Tag({ at, cx, cy, phi, dx = 46, dy = -70, o, children, w = 220 }: { at: [number, number, number]; cx: number; cy: number; phi: number; dx?: number; dy?: number; o: number; children: ReactNode; w?: number }) {
  if (o <= 0.01) return null
  const [X, Y] = proj(at[0], at[1], at[2], phi)
  const x0 = cx + X, y0 = cy + Y
  const left = dx < 0
  return (
    <>
      <svg width={1280} height={720} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: o, pointerEvents: 'none' }}>
        <circle cx={x0} cy={y0} r={4} fill="#fff" />
        <line x1={x0} y1={y0} x2={x0 + dx * o} y2={y0 + dy * o} stroke="rgb(255 255 255 / 85%)" strokeWidth={1.6} />
      </svg>
      <div style={{ position: 'absolute', left: x0 + dx, top: y0 + dy, transform: `translate(${left ? '-100%' : '0'}, -50%)`, width: 'max-content', maxWidth: w, opacity: o, padding: '8px 13px', borderRadius: 12, background: 'rgb(255 255 255 / 94%)', color: INK, fontSize: 15.5, fontWeight: 600, lineHeight: 1.35, boxShadow: '0 10px 24px -10px rgb(30 15 60 / 55%)' }}>{children}</div>
    </>
  )
}

const STARS = Array.from({ length: 34 }, (_, i) => [rnd(i) * 1280, rnd(i + 99) * 300, 0.6 + rnd(i + 7) * 1.6] as const)

export function IsoReel({ s, t }: { s: ReelSpec; t: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT.sans, color: '#fff', overflow: 'hidden', background: 'linear-gradient(180deg, #120D33 0%, #33256F 40%, #9C5E9E 74%, #F3B096 100%)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 35% at 50% 100%, rgb(255 214 170 / 55%), transparent 70%)' }} />
      {STARS.map(([x, y, r], i) => <div key={i} style={{ position: 'absolute', left: x, top: y, width: r * 2, height: r * 2, borderRadius: '50%', background: '#fff', opacity: 0.35 + 0.45 * Math.abs(Math.sin(t * 1.3 + i)) }} />)}
      <Board s={s} t={t} />
      <Titles s={s} t={t} />
      <Next s={s} t={t} />
      <Outro s={s} t={t} />
      <Grain t={t} opacity={0.07} />
    </div>
  )
}

const KEPT = ['#FF9C6B', '#53D3A8', '#6FA8FF', '#F58BC8', '#FFC94D', '#A98BFF']
const cellOf = (i: number) => [((i % 5) - 2) * PITCH, (Math.floor(i / 5) - 1.5) * PITCH] as const

/** 浮岛和方砖：片头升起 → 筛选 → 逐条时当前那根柱子长高；整段连续，参数随 t 变 */
function Board({ s, t }: { s: ReelSpec; t: number }) {
  const [F] = ACT.filter
  const [I, IZ] = ACT.items
  const o = Math.min(clamp(prog(t, 0, 0.5)), 1 - prog(t, IZ - 0.45, IZ))
  if (o <= 0) return null
  const up = ease.out(prog(t, 0.1, 1.8))
  const phi = -45 + Math.sin(t * 0.2) * 8
  const side = ease.inOut(prog(t, I - 0.4, I + 0.6))
  const bob = Math.sin(t * 1.1) * 6
  const cx = lerp(640, 390, side), cy = lerp(415, 450, side) + lerp(300, 0, up) + bob
  const n = s.beats.length
  const beatIdx = s.beats.findIndex((_, i) => { const [a, z] = beatWindow(i, n); return t >= a && t < z })
  let dropK = 0
  const tags: ReactNode[] = []
  const blocks = s.meeting.items.map((it, i) => {
    const [x, y] = cellOf(i)
    const kept = s.kept.indexOf(it.id)
    const ap = ease.back(prog(t, F + 0.05 + i * 0.04, F + 0.55 + i * 0.04))
    let h = 4 + 26 * ap, color = '#D9CFE6', glow = 0
    if (kept < 0) {
      const k = dropK++
      const sink = ease.inOut(prog(t, F + 1.5 + k * 0.05, F + 2.2 + k * 0.05))
      h = lerp(h, 3, sink)
      color = sink > 0.5 ? '#C9BCD6' : color
    } else {
      const g = ease.out(prog(t, F + 1.6 + kept * 0.12, F + 2.6 + kept * 0.12))
      color = g > 0.15 ? KEPT[kept % KEPT.length] : color
      h = lerp(h, 120, g)
      glow = g
      const bi = s.beats.findIndex(b => b.entry.item.id === it.id)
      let on = 0
      if (beatIdx >= 0) {
        const [a, zz] = beatWindow(beatIdx, n)
        on = bi === beatIdx ? ease.out(prog(t, a, a + 0.7)) * (1 - ease.in(prog(t, zz - 0.45, zz))) : 0
        h = lerp(h, 60, side) + on * 170
        glow = lerp(glow, 0.15, side) + on * 0.85
      }
      const lo = ease.out(prog(t, F + 2.7 + kept * 0.15, F + 3.3 + kept * 0.15)) * (1 - prog(t, I - 0.4, I))
      const [X] = proj(x, y, 0, phi)
      if (lo > 0) tags.push(<Tag key={it.id} at={[x, y, h]} cx={cx} cy={cy} phi={phi} dx={X > 40 ? 50 : -50} dy={-64 - kept * 6} o={lo}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: KEPT[kept % KEPT.length], marginRight: 7, verticalAlign: 1 }} />{it.title}</Tag>)
      if (on > 0.05) tags.push(<Tag key={`b${it.id}`} at={[x, y, h]} cx={cx} cy={cy} phi={phi} dx={-40} dy={-50} o={on} w={80}>{String(bi + 1).padStart(2, '0')}</Tag>)
    }
    return <Block key={it.id} x={x} y={y} w={TILE} h={h} color={color} glow={glow} o={clamp(ap * 2)} />
  })
  return (
    <Layer o={o} style={{ transform: `scale(${lerp(1, 0.86, side)})`, transformOrigin: `${cx}px ${cy}px` }}>
      <World cx={cx} cy={cy} phi={phi}>
        <Island w={5 * PITCH + 70} d={4 * PITCH + 70} />
        {blocks}
      </World>
      <World cx={cx + 470 - side * 120} cy={cy - 210 + Math.sin(t * 1.4 + 1) * 10} phi={phi}>
        <Block x={0} y={0} w={44} h={44} color="#B9A6FF" ao={false} o={up} />
      </World>
      <World cx={cx - 480} cy={cy - 120 + Math.sin(t * 1.2 + 2) * 12} phi={phi}>
        <Block x={0} y={0} w={34} h={34} color="#FF9C6B" ao={false} o={up * (1 - side)} />
      </World>
      {tags}
    </Layer>
  )
}

const CARD: CSSProperties = { background: 'rgb(255 255 255 / 95%)', color: INK, borderRadius: 28, boxShadow: '0 40px 80px -40px rgb(20 10 50 / 80%), inset 0 1px 0 #fff' }

/** 平贴在屏幕上的文字：片头标题、筛选计数、逐条卡片 */
function Titles({ s, t }: { s: ReelSpec; t: number }) {
  const [F] = ACT.filter
  const [I, IZ] = ACT.items
  const intro = actLife(t, 'intro', 0.5, 0.45)
  const filt = actLife(t, 'filter', 0.45, 0.45)
  const n = s.kept.length
  const m = s.meeting
  const shadow = '0 10px 30px rgb(20 10 60 / 55%)'
  return (
    <>
      <Layer o={intro}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 64, textAlign: 'center' }}>
          <div style={{ fontSize: 18, opacity: 0.8, letterSpacing: '0.24em', ...rise(ease.out(prog(t, 0.4, 1.1)), 8, 4) }}>{L('会映', 'MeetReel')} · {m.title}</div>
          <div style={{ fontSize: 86, fontWeight: 700, marginTop: 12, textShadow: shadow, letterSpacing: '-0.01em', ...rise(ease.out(prog(t, 0.6, 1.5)), 20, 12) }}>{L(`${s.person.name}的 30 秒`, `${s.person.name}’s 30 seconds`)}</div>
        </div>
      </Layer>
      <Layer o={filt}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 44, textAlign: 'center' }}>
          <div style={{ fontSize: 80, fontWeight: 700, fontVariantNumeric: 'tabular-nums', textShadow: shadow, lineHeight: 1.1 }}>{count(t, F + 1.5, F + 2.6, s.total, n)}<span style={{ fontSize: 30, marginLeft: 8 }}>{L('条', 'items')}</span></div>
          <div style={{ fontSize: 22, opacity: 0.92, marginTop: 6, textShadow: shadow }}>
            {t < F + 1.5 ? L(`这场直播的 ${s.total} 条要点`, `${s.total} key points in this stream`) : n ? L(`无关的 ${s.total - n} 条压平，有关的 ${n} 条长出来`, `${s.total - n} irrelevant ones flatten, your ${n} grow tall`) : L('整场都与你无关，全部压平', 'None of it is for you — everything flattens')}
          </div>
        </div>
      </Layer>
      {t >= I - 0.01 && t <= IZ + 0.01 && (s.beats.length ? s.beats.map((b, i) => {
        const [a, z] = beatWindow(i, s.beats.length)
        const o = life(t, a, z, 0.55, 0.45)
        if (o <= 0) return null
        const e = b.entry
        const p1 = ease.out(prog(t, a, a + 0.8))
        const p2 = ease.out(prog(t, a + 0.4, a + 1.2))
        const q = e.item.quote
        const k = Math.ceil(q.length * prog(t, a + 0.7, a + 2.0))
        const c = KEPT[i % KEPT.length]
        return (
          <Layer key={e.item.id} o={o}>
            <div style={{ ...CARD, position: 'absolute', left: 748, top: 70, width: 470, minHeight: 580, padding: '32px 34px', ...rise(p1, 24, 10) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: MUTE, fontWeight: 500 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: c, boxShadow: `0 0 12px ${c}` }} />
                <span style={{ fontFamily: FONT.mono }}>{String(i + 1).padStart(2, '0')} / {String(s.beats.length).padStart(2, '0')}</span>
                <span>· {ITEM_TYPES[e.item.type].label}</span>
                <span style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 999, fontWeight: 700, fontSize: 13.5, color: '#fff', background: e.tier === 'must' ? '#E2557A' : '#9A93B3' }}>{e.tier === 'must' ? L('必读', 'Must-read') : L('建议看', 'Suggested')}</span>
              </div>
              <div style={{ fontSize: e.item.title.length > 16 ? 30 : 36, fontWeight: 700, lineHeight: 1.28, marginTop: 20, letterSpacing: '-0.01em' }}>{e.item.title}</div>
              <div style={{ fontSize: 18.5, lineHeight: 1.7, marginTop: 14, color: '#4B4462', ...rise(p2, 10, 4) }}>{e.forYou}</div>
              <div style={{ marginTop: 20, padding: '16px 18px', borderRadius: 18, background: `linear-gradient(135deg, ${tone(c, 1.85)}, #F6F1FB)`, ...rise(p2, 10, 4) }}>
                <div style={{ fontSize: 19, lineHeight: 1.55, fontWeight: 600 }}>“{q.slice(0, k)}{k >= q.length ? '”' : ''}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <img src={avatarSrc(b.speaker.id)} alt="" style={{ width: 36, height: 36, borderRadius: 18, objectFit: 'cover' }} />
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{b.speaker.name}</span>
                  <span style={{ fontSize: 13, color: MUTE }}>{L('原话', 'Quote')} {tc(b.at)} · {L('示意头像', 'illustrative avatar')}</span>
                </div>
              </div>
              <div style={{ marginTop: 18, fontSize: 16, color: MUTE }}>{L('为什么发给你', 'Why you')} · <b style={{ color: INK }}>{e.why}</b></div>
              {i === s.beats.length - 1 && s.more > 0 && <div style={{ marginTop: 6, fontSize: 14, color: MUTE }}>{L(`另外 ${s.more} 条在卡片里`, `${s.more} more in the card`)}</div>}
            </div>
          </Layer>
        )
      }) : (
        <Layer o={life(t, I, IZ, 0.5, 0.45)}>
          <div style={{ ...CARD, position: 'absolute', left: 748, top: 230, width: 460, padding: '44px 40px', fontSize: 40, fontWeight: 700, lineHeight: 1.35 }}>{L('这场会，', 'This meeting:')}<br />{L('没有要你看的。', 'nothing for you.')}</div>
        </Layer>
      ))}
    </>
  )
}

function Next({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.next
  const o = actLife(t, 'next', 0.55, 0.45)
  if (o <= 0 || !s.next) return null
  const nx = s.next
  const phi = -38 + Math.sin(t * 0.3) * 4
  const cx = 640, cy = 470 + Math.sin(t * 1.1) * 5
  const days = nx.date ? stripDays(nx.date) : []
  const tiles = days.length ? days : ['']
  const hit = ease.back(prog(t, A + 1.0, A + 1.7))
  const card = ease.out(prog(t, A + 1.7, A + 2.4))
  const xOf = (i: number) => (i - (tiles.length - 1) / 2) * 112
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 58, textAlign: 'center', ...rise(ease.out(prog(t, A, A + 0.8)), 16, 8) }}>
        <div style={{ fontSize: 18, opacity: 0.8, letterSpacing: '0.3em' }}>{L('接下来', 'NEXT UP')}</div>
        <div style={{ fontSize: 36, fontWeight: 700, marginTop: 12, padding: '0 150px', lineHeight: 1.4, textShadow: '0 8px 24px rgb(20 10 60 / 50%)' }}>{nx.link}</div>
      </div>
      <World cx={cx} cy={cy} phi={phi}>
        <Block x={0} y={0} z={-30} w={tiles.length * 112 + 40} d={150} h={30} color="#F4EADF" r={12} ao={false} />
        {tiles.map((d, i) => {
          const on = d === nx.date || !days.length
          const ap = ease.out(prog(t, A + 0.3 + i * 0.07, A + 0.8 + i * 0.07))
          return <Block key={d || 'x'} x={xOf(i)} y={0} w={92} h={on ? 10 + 110 * hit : 10 + 8 * ap} color={on ? '#FF9C6B' : '#D9CFE6'} glow={on ? hit : 0} o={clamp(ap * 2)} />
        })}
      </World>
      {tiles.map((d, i) => {
        const on = d === nx.date || !days.length
        const [X, Y] = proj(xOf(i), 0, on ? 10 + 110 * hit : 18, phi)
        return (
          <div key={d || 'x'} style={{ position: 'absolute', left: cx + X, top: cy + Y - (on ? 18 : 44), transform: 'translate(-50%, -100%)', textAlign: 'center', opacity: clamp(prog(t, A + 0.5 + i * 0.07, A + 0.9 + i * 0.07)), textShadow: '0 4px 14px rgb(30 15 60 / 60%)' }}>
            {days.length ? (
              <>
                <div style={{ fontSize: on ? 15 : 12.5, opacity: 0.85 }}>{L('周', '')}{weekdayShort(d)}</div>
                <div style={{ fontSize: on ? 52 : 26, fontWeight: 700, lineHeight: 1.05 }}>{Number(d.slice(8))}</div>
              </>
            ) : <div style={{ fontSize: 34, fontWeight: 700 }}>{nx.dueLabel}</div>}
          </div>
        )
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 590, display: 'flex', justifyContent: 'center', ...rise(card, 16, 6) }}>
        <div style={{ ...CARD, borderRadius: 20, padding: '16px 26px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: '#FF9C6B', boxShadow: '0 0 12px #FF9C6B' }} />
          <span style={{ fontSize: 22, fontWeight: 700 }}>{nx.item.title}</span>
          <span style={{ fontSize: 15, color: MUTE }}>{nx.meeting.title.replace(/ · .*/, '')} · {nx.dueLabel}</span>
        </div>
      </div>
    </Layer>
  )
}

function Outro({ s, t }: { s: ReelSpec; t: number }) {
  const [A] = ACT.outro
  const o = clamp(ease.out(prog(t, A, A + 0.6)))
  if (o <= 0) return null
  const phi = -45 + Math.sin(t * 0.3) * 6
  const cx = 640, cy = 500 + Math.sin(t * 1.1) * 6
  const btn = [[L('确认', 'Confirm'), '#53D3A8'], [L('追问', 'Ask'), '#FF9C6B'], [L('不是我', 'Not me'), '#B9A6FF']] as const
  const hOf = (i: number) => 14 + 70 * clamp(ease.back(prog(t, A + 0.6 + i * 0.15, A + 1.2 + i * 0.15)))
  return (
    <Layer o={o}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center' }}>
        <div style={{ fontSize: 92, fontWeight: 700, textShadow: '0 12px 34px rgb(20 10 60 / 55%)', ...rise(ease.out(prog(t, A, A + 0.9)), 20, 12) }}>{L(`省下 ${s.savedMin} 分钟`, `${s.savedMin} min saved`)}</div>
        <div style={{ fontSize: 22, opacity: 0.92, marginTop: 12, ...rise(ease.out(prog(t, A + 0.5, A + 1.2)), 10, 4) }}>{L(`${s.total - s.kept.length} 条已经压平；有关的原话，随时回放`, `${s.total - s.kept.length} flattened; replay your quotes anytime`)}</div>
      </div>
      <World cx={cx} cy={cy} phi={phi}>
        <Block x={0} y={0} z={-74} w={380} d={130} h={34} color="#7B6A9E" r={10} ao={false} />
        <Block x={0} y={0} z={-40} w={470} d={200} h={40} color="#F4EADF" r={14} ao={false} />
        {btn.map(([b, c], i) => <Block key={b} x={(i - 1) * 140} y={0} w={92} h={hOf(i)} color={c} glow={i === 0 ? clamp(prog(t, A + 1.2, A + 1.8)) * 0.8 : 0} />)}
      </World>
      {btn.map(([b], i) => {
        const [X, Y] = proj((i - 1) * 140, 0, hOf(i), phi)
        const p = clamp(prog(t, A + 1.0 + i * 0.15, A + 1.4 + i * 0.15))
        return <div key={b} style={{ position: 'absolute', left: cx + X, top: cy + Y - 34, transform: 'translate(-50%, -100%)', padding: '8px 18px', borderRadius: 999, background: 'rgb(255 255 255 / 94%)', color: INK, fontSize: 20, fontWeight: 700, boxShadow: '0 10px 24px -10px rgb(30 15 60 / 60%)', ...rise(p, 10, 4) }}>{b}</div>
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', fontSize: 15, opacity: 0.8, letterSpacing: '0.24em' }}>{L('会映 MEETREEL', 'MEETREEL')}</div>
    </Layer>
  )
}
