import { DEMO_SEG_TIMES, PEOPLE, type Person } from '../data/demo'

export interface TSeg {
  id: string
  speaker: string
  person?: Person
  text: string
  at: string
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`

/** 把「姓名：发言」格式的文本切成发言段；没有冒号的行算作上一位发言人的续句 */
export function parseTranscript(text: string): TSeg[] {
  const segs: TSeg[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const m = /^([^：:\s]{1,12})\s*[：:]\s*(.+)$/.exec(line)
    if (!m && segs.length) {
      segs[segs.length - 1].text += line
      continue
    }
    const speaker = m ? m[1] : '发言人'
    const i = segs.length
    segs.push({
      id: `g${String(i + 1).padStart(2, '0')}`,
      speaker,
      person: PEOPLE.find(p => p.name === speaker),
      text: m ? m[2] : line,
      at: DEMO_SEG_TIMES[i] ?? fmt(i * 5.5),
    })
  }
  return segs
}
