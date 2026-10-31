import { useCallback, useEffect, useRef, useState } from 'react'

export interface Clock {
  t: number
  playing: boolean
  speed: number
  duration: number
  play: () => void
  pause: () => void
  toggle: () => void
  restart: () => void
  seek: (t: number) => void
  setSpeed: (s: number) => void
}

/**
 * 演示时钟：动画和视频回放都由同一个 t（秒）推导，可暂停、倍速、拖动。
 * stopAt：播到这里自动停下（智能分发里用来等主持人确认）。
 */
export function useClock(duration: number, init: { t?: number; playing?: boolean; speed?: number; stopAt?: number | null } = {}): Clock {
  const [t, setT] = useState(init.t ?? 0)
  const [playing, setPlaying] = useState(init.playing ?? false)
  const [speed, setSpeedState] = useState(init.speed ?? 1)
  const ref = useRef({ t: init.t ?? 0, speed: init.speed ?? 1, stopAt: init.stopAt ?? null })
  ref.current.stopAt = init.stopAt ?? null

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const stop = ref.current.stopAt
      const cap = stop != null && ref.current.t < stop ? stop : duration
      const next = Math.min(cap, ref.current.t + dt * ref.current.speed)
      ref.current.t = next
      setT(next)
      if (next >= cap) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration])

  const seek = useCallback((v: number) => {
    const next = Math.max(0, Math.min(duration, v))
    ref.current.t = next
    setT(next)
  }, [duration])

  const restart = useCallback(() => {
    seek(0)
    setPlaying(true)
  }, [seek])

  const toggle = useCallback(() => {
    if (ref.current.t >= duration) restart()
    else setPlaying(p => !p)
  }, [duration, restart])

  const setSpeed = useCallback((s: number) => {
    ref.current.speed = s
    setSpeedState(s)
  }, [])

  const play = useCallback(() => {
    if (ref.current.t >= duration) seek(0)
    setPlaying(true)
  }, [duration, seek])
  const pause = useCallback(() => setPlaying(false), [])

  return { t, playing, speed, duration, seek, restart, toggle, setSpeed, play, pause }
}
