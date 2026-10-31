import { Send, Workflow } from 'lucide-react'
import type { IconKey } from '../data/demo'
import claude from '../assets/models/claude-color.svg'
import deepseek from '../assets/models/deepseek-color.svg'
import modelscope from '../assets/models/modelscope-color.svg'
import qwen from '../assets/models/qwen-color.svg'

const SRC: Partial<Record<IconKey, string>> = { claude, deepseek, modelscope, qwen }

export function ModelIcon({ icon, size = 14 }: { icon: IconKey; size?: number }) {
  const src = SRC[icon]
  if (src) return <img className="model-icon" src={src} width={size} height={size} alt="" draggable={false} />
  const Icon = icon === 'send' ? Send : Workflow
  return <Icon className="model-icon model-icon--glyph" size={size} strokeWidth={2} />
}
