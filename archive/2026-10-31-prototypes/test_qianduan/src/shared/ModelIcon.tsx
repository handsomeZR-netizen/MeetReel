import { Send, Workflow } from 'lucide-react'
import type { IconKey } from '@web/data/demo'
import claude from '@web/assets/models/claude-color.svg'
import deepseek from '@web/assets/models/deepseek-color.svg'
import modelscope from '@web/assets/models/modelscope-color.svg'
import qwen from '@web/assets/models/qwen-color.svg'

const SRC: Partial<Record<IconKey, string>> = { claude, deepseek, modelscope, qwen }

/** 模型图标（Lobe Icons，见 web/src/assets/models/SOURCE.md）；非模型的用 lucide 图标 */
export function ModelIcon({ icon, size = 14, className }: { icon: IconKey; size?: number; className?: string }) {
  const src = SRC[icon]
  if (src) return <img className={className} src={src} width={size} height={size} alt="" draggable={false} style={{ display: 'block', flex: 'none' }} />
  const Icon = icon === 'send' ? Send : Workflow
  return <Icon className={className} size={size} strokeWidth={2} style={{ flex: 'none', opacity: 0.6 }} />
}
