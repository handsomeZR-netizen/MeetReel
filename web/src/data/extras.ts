// 会议的附加信息：地点、类型、相关文件、简报的阅读回执（mock）。
import type { PersonId } from './model'

export type FileKind = 'doc' | 'pdf' | 'xls' | 'ppt'

export interface MeetingFile { name: string; kind: FileKind; owner: PersonId; date: string; size: string }

export interface MeetingExtra {
  place: string
  online: boolean
  kind: string
  files: MeetingFile[]
  /** 简报投递时间（双 11 那场在演示里实时投递） */
  sentAt: string
  /** 谁什么时候读了简报 */
  readAt: Partial<Record<PersonId, string>>
}

export const EXTRAS: Record<string, MeetingExtra> = {
  d11: {
    place: '会议室 A301', online: true, kind: '评审会', sentAt: '10/31 10:21',
    files: [
      { name: '双 11 活动方案 V3.0', kind: 'doc', owner: 'wangke', date: '10/31 09:20', size: '12.4 MB' },
      { name: '扩容方案对比（A / B）', kind: 'xls', owner: 'chenmo', date: '10/30 18:02', size: '1.6 MB' },
      { name: '优惠券法务意见', kind: 'pdf', owner: 'linzong', date: '10/30 11:15', size: '2.8 MB' },
    ],
    readAt: { linzong: '10/31 10:26', chenmo: '10/31 10:23', sunyue: '10/31 10:24', zhouning: '10/31 10:30' },
  },
  cx: {
    place: '会议室 B205', online: true, kind: '复盘会', sentAt: '10/30 11:08',
    files: [
      { name: '10 月 NPS 拆解', kind: 'xls', owner: 'wutong', date: '10/30 09:40', size: '3.1 MB' },
      { name: '退款工单抽样', kind: 'xls', owner: 'lilin', date: '10/29 17:22', size: '0.9 MB' },
      { name: '客户满意度复盘', kind: 'ppt', owner: 'yezhou', date: '10/30 09:55', size: '6.2 MB' },
    ],
    readAt: { wangke: '10/30 11:10', lilin: '10/30 11:15', chenmo: '10/30 13:02', linzong: '10/30 14:30' },
  },
  q4: {
    place: '大会议室', online: false, kind: 'OKR 对齐会', sentAt: '10/29 16:40',
    files: [
      { name: 'Q4 OKR 草案', kind: 'doc', owner: 'linzong', date: '10/29 10:00', size: '0.8 MB' },
      { name: 'Q4 IT 预算', kind: 'xls', owner: 'zhouning', date: '10/28 16:30', size: '1.2 MB' },
    ],
    readAt: { wangke: '10/29 16:52', sunyue: '10/29 17:01', zhaoyi: '10/29 19:20', zhouning: '10/29 16:45' },
  },
  app: {
    place: '会议室 A302', online: true, kind: '评审会', sentAt: '10/28 15:20',
    files: [
      { name: '会员小程序 2.0 PRD', kind: 'doc', owner: 'wangke', date: '10/27 20:10', size: '4.5 MB' },
      { name: '会员中心交互稿', kind: 'pdf', owner: 'tangyou', date: '10/28 11:00', size: '18.0 MB' },
    ],
    readAt: { tangyou: '10/28 15:25', zhaoyi: '10/28 15:40', lilin: '10/28 17:02' },
  },
  s618: {
    place: '线上会议', online: true, kind: '复盘会', sentAt: '10/20 17:10',
    files: [
      { name: '618 转化漏斗', kind: 'xls', owner: 'wutong', date: '10/20 14:00', size: '5.4 MB' },
      { name: '618 券核销明细', kind: 'xls', owner: 'maxiao', date: '10/20 15:10', size: '2.2 MB' },
    ],
    readAt: { wangke: '10/20 17:15', chenmo: '10/20 18:30', linzong: '10/21 09:05', wutong: '10/20 17:12' },
  },
}
