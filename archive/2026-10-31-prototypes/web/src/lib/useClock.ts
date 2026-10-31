import { useCallback, useEffect, useRef, useState } from 'react'

export interface Clock {
  t: number
  playing: boolean
  speed: number
  play: () => void
  pause: () => void
  toggle: () => void
  restart: () => void
  seek: (t: number) => void
  setSpeed: (s: number) => void
}

/** 演示时钟：所有动画都由同一个 t（秒）推导，可暂停、倍速、拖动 */
export function useClock(duration: number): Clock {
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState(1)
  const ref = useRef({ t: 0, speed: 1 })

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const next = Math.min(duration, ref.current.t + dt * ref.current.speed)
      ref.current.t = next
      setT(next)
      if (next >= duration) {
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

  return {
    t, playing, speed, seek, restart, toggle, setSpeed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
  }
}
