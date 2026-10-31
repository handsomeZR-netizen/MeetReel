import type { Person } from '../data/demo'

export function Avatar({ person, size = 32, muted = false }: { person?: Person; size?: number; muted?: boolean }) {
  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
    background: muted ? '#F1F1EF' : person?.bg ?? '#F1F5F9',
    color: muted ? '#A1A1AA' : person?.fg ?? '#475569',
  }
  return <span className="avatar" style={style}>{person?.short ?? '?'}</span>
}
