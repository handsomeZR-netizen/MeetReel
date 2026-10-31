// 会议的附加信息：地点、类型、相关文件、简报的阅读回执（mock）。
// 主案例的资料是真文件（data/cases/xiaomi-safety/kb/），知识库和成员简报里都能直接打开。
import type { PersonId } from './model'
import fileManifest from './file-manifest.json'

export type FileKind = 'doc' | 'pdf' | 'xls' | 'ppt' | 'md' | 'img'

export interface MeetingFile { name: string; kind: FileKind; owner: PersonId; date: string; size: string; url?: string; previewUrl?: string }

export interface MeetingExtra {
  place: string
  online: boolean
  kind: string
  files: MeetingFile[]
  /** 简报投递时间（主案例在演示里实时投递） */
  sentAt: string
  /** 谁什么时候读了简报 */
  readAt: Partial<Record<PersonId, string>>
}

const KB = import.meta.glob<string>('../../../data/cases/xiaomi-safety/kb/*', { eager: true, query: '?url', import: 'default' })
const kb = (name: string) => Object.entries(KB).find(([k]) => k.endsWith(`/${name}`))?.[1]
const DEDAO = Object.values(import.meta.glob<string>('../../../data/*【得到大脑】.md', { eager: true, query: '?url', import: 'default' }))[0]

export const EXTRAS: Record<string, MeetingExtra> = {
  xm_safety: {
    place: '直播（B 站转载）', online: true, kind: '竞品直播', sentAt: '10/31 刚刚',
    files: [
      { name: '小米汽车安全专场_会映纪要.pdf', kind: 'pdf', owner: 'jiangwan', date: '10/31 16:02', size: '7 KB', url: kb('小米汽车安全专场_会映纪要.pdf') },
      { name: '竞品安全体系对标表.docx', kind: 'doc', owner: 'jiangwan', date: '10/31 16:10', size: '38 KB', url: kb('竞品安全体系对标表.docx') },
      { name: '安全体系拆解_目标组织机制.md', kind: 'md', owner: 'linxia', date: '10/31 16:20', size: '4 KB', url: kb('安全体系拆解_目标组织机制.md') },
      { name: '得到大脑转写（原文）.md', kind: 'md', owner: 'jiangwan', date: '10/31 11:23', size: '21 KB', url: DEDAO },
      { name: '直播截图_00-21_开场两部分.jpg', kind: 'img', owner: 'linxia', date: '10/31 15:48', size: '43 KB', url: kb('直播截图_00-21_开场两部分.jpg') },
      { name: '直播截图_05-30_安全委员会.jpg', kind: 'img', owner: 'linxia', date: '10/31 15:48', size: '60 KB', url: kb('直播截图_05-30_安全委员会.jpg') },
      { name: '直播截图_08-40_安全预防团队.jpg', kind: 'img', owner: 'linxia', date: '10/31 15:48', size: '47 KB', url: kb('直播截图_08-40_安全预防团队.jpg') },
    ],
    readAt: {},
  },
  retail_weekly: {
    place: '门店运营中心 3F', online: false, kind: '周会', sentAt: '10/30 16:58',
    files: [
      { name: '购车权益对比表 v3.xlsx', kind: 'xls', owner: 'linxia', date: '10/30 15:20', size: '0.6 MB' },
      { name: '门店安全话术卡（草稿）.pptx', kind: 'ppt', owner: 'dengkai', date: '10/30 17:05', size: '3.2 MB' },
    ],
    readAt: { jiangwan: '10/30 17:20', gaoyuan: '10/30 17:02', linxia: '10/30 17:01', hanzong: '10/31 09:10' },
  },
  own_monthly: {
    place: '会议室 B205', online: true, kind: '月会', sentAt: '10/29 11:40',
    files: [
      { name: '10 月车主 App 数据.xlsx', kind: 'xls', owner: 'chengcheng', date: '10/29 09:30', size: '2.4 MB' },
      { name: '驾驶评分 × 积分试点方案.docx', kind: 'doc', owner: 'chengcheng', date: '10/29 10:10', size: '0.9 MB' },
    ],
    readAt: { jiangwan: '10/29 12:05', gaoyuan: '10/29 11:46', hanzong: '10/29 14:30', dengkai: '10/29 13:12' },
  },
  sf_weekly: {
    place: '安全部会议室', online: true, kind: '周会', sentAt: '10/28 15:20',
    files: [
      { name: '安委会常设方案（草案）.docx', kind: 'doc', owner: 'songlan', date: '10/28 13:40', size: '1.1 MB' },
      { name: '座椅夹手投诉工单.pdf', kind: 'pdf', owner: 'weiran', date: '10/27 18:20', size: '0.7 MB' },
    ],
    readAt: { jiangwan: '10/28 15:31', weiran: '10/28 15:22', xunuo: '10/28 16:05', hanzong: '10/28 18:40', tangchuan: '10/28 15:25' },
  },
}

// 本地真实附件及浏览器阅读页使用同一份文件清单，大小来自实际导出文件。
for (const meeting of Object.values(EXTRAS)) {
  for (const file of meeting.files) {
    const entry = fileManifest[file.name as keyof typeof fileManifest]
    if (entry && file.kind !== 'img') {
      file.url = `${import.meta.env.BASE_URL}files/${encodeURIComponent(file.name)}`
      file.previewUrl = `${file.url}.html`
      file.size = entry.size
    }
  }
}
