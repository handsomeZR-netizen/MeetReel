import type { FileKind } from '@/data/extras'

const formats = { pdf: ['PDF', '#BE3541'], doc: ['DOC', '#315DAA'], xls: ['XLS', '#237348'], ppt: ['PPT', '#B45B2C'], md: ['MD', '#52525B'], img: ['IMG', '#137B8A'] } as const

export function FileIcon({ kind }: { kind: FileKind }) {
  const [label, color] = formats[kind]
  return <span aria-hidden="true" className="relative block size-11 flex-none transition-transform duration-200 group-hover:-translate-y-0.5">
    <img src={`${import.meta.env.BASE_URL}assets/generated/document-folder.png`} alt="" className="size-full object-contain" />
    <span className="absolute -right-0.5 bottom-0 rounded border border-white/80 px-1 text-[8px] leading-[13px] font-bold tracking-wide text-white shadow-sm" style={{ background: color }}>{label}</span>
  </span>
}
