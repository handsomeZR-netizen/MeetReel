import { useCallback, useState } from 'react'
import { T_END } from '@web/data/demo'
import { useClock } from './useClock'

export type Stage = 'input' | 'run'

/**
 * 每个风格页的流程：输入 → 运行（演示时钟 0–20 秒）→ 完成。
 * 地址参数（方便总览页缩略图和现场跳转）：
 *   ?at=12     直接进入运行阶段，从第 12 秒开始播放
 *   ?still     配合 at 使用，停在那一帧不播放
 *   ?embed     嵌在总览页里，不显示风格切换器
 */
export function useDemo({ speed = 1, startDelay = 400 }: { speed?: number; startDelay?: number } = {}) {
  const [params] = useState(() => new URLSearchParams(location.search))
  const at = params.get('at')
  const still = params.has('still')
  const initialT = at != null ? Math.min(T_END, Math.max(0, Number(at) || 0)) : 0

  const clock = useClock(T_END, { t: initialT, playing: at != null && !still, speed })
  const [stage, setStage] = useState<Stage>(at != null ? 'run' : 'input')

  const start = useCallback(() => {
    clock.pause()
    clock.seek(0)
    setStage('run')
    setTimeout(clock.restart, startDelay)
  }, [clock, startDelay])

  const reset = useCallback(() => {
    clock.pause()
    clock.seek(0)
    setStage('input')
  }, [clock])

  return {
    clock,
    t: clock.t,
    stage,
    start,
    reset,
    running: stage === 'run',
    done: stage === 'run' && clock.t >= T_END,
    embed: params.has('embed'),
  }
}
