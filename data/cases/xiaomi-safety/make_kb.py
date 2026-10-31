# 生成小米安全专场案例的知识库资料：PDF 纪要、DOCX 对标表、MD 拆解、直播截图和首页海报帧。
# 用法（仓库根目录）：python data/cases/xiaomi-safety/make_kb.py .   需要 reportlab、python-docx、ffmpeg
import json, subprocess, sys
from pathlib import Path

root = Path(sys.argv[1])
case = root / 'data/cases/xiaomi-safety'
kb = case / 'kb'
kb.mkdir(exist_ok=True)
m = json.loads((case / 'meeting.json').read_text(encoding='utf-8'))
people = json.loads((case / 'people.json').read_text(encoding='utf-8'))
names = {p['id']: p['name'] for p in people['speakers'] + people['recipients']}
seg = {s['id']: s for s in m['segments']}
TYPE = {'decision': '决议', 'action': '待办', 'change': '变更', 'risk': '风险', 'question': '问题', 'info': '信息'}

def mmss(t):
    t = int(t)
    return f'{t // 60:02d}:{t % 60:02d}'

def qtime(it):
    s = seg[it['seg']]
    i = max(0, s['text'].find(it['quote']))
    return s['start'] + i / max(1, len(s['text'])) * (s['end'] - s['start'])

items = sorted(m['items'], key=qtime)

# ---------- PDF 纪要 ----------
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
F = 'STSong-Light'
h1 = ParagraphStyle('h1', fontName=F, fontSize=18, leading=26, spaceAfter=6)
h2 = ParagraphStyle('h2', fontName=F, fontSize=13, leading=20, spaceBefore=10, spaceAfter=4)
body = ParagraphStyle('b', fontName=F, fontSize=10, leading=16)
small = ParagraphStyle('s', fontName=F, fontSize=8.5, leading=13, textColor=colors.HexColor('#666666'))
cell = ParagraphStyle('c', fontName=F, fontSize=8.5, leading=12.5)

doc = SimpleDocTemplate(str(kb / '小米汽车安全专场_会映纪要.pdf'), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=48, bottomMargin=48,
                        title='小米汽车安全专场直播 · 会映纪要', author='会映 MeetReel')
story = [
    Paragraph('小米汽车安全专场直播 · 安全体系', h1),
    Paragraph(f'会映纪要 · 录像 {mmss(m["duration"])} · {len(m["segments"])} 段发言 · {len(items)} 条账本 · 发言人：雷军、侯静雷、丁志、爽哥', small),
    Paragraph('每条都附原话和录像时间，可在会映里点原话回到那一秒。本纪要只整理直播里说过的话，不替发言人补充。', small),
    Spacer(1, 8),
    Paragraph('摘要', h2),
    Paragraph(m['summary'], body),
    Paragraph('章节', h2),
    Paragraph('　'.join(f'{mmss(c["start"])} {c["name"]}' for c in m['chapters']), body),
    Paragraph('账本', h2),
]
rows = [[Paragraph(x, cell) for x in ['时间', '类型', '条目', '原话（发言人）']]]
for it in items:
    s = seg[it['seg']]
    flag = f'〔{"、".join(it["flags"])}〕' if it.get('flags') else ''
    rows.append([
        Paragraph(mmss(qtime(it)), cell),
        Paragraph(TYPE[it['type']], cell),
        Paragraph(f'{it["title"]}{flag}', cell),
        Paragraph(f'“{it["quote"]}”（{names[s["speaker"]]}）', cell),
    ])
t = Table(rows, colWidths=[40, 34, 190, 235], repeatRows=1)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F2F3F5')),
    ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#DDDDDD')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story += [t, Spacer(1, 10), Paragraph('来源：直播录像（B 站转载）与得到大脑转写；说话人和热词已校正，原文保留在会映里。', small)]
doc.build(story)

# ---------- DOCX 对标表 ----------
from docx import Document
from docx.shared import Pt
from docx.oxml.ns import qn

d = Document()
st = d.styles['Normal']
st.font.name = 'Microsoft YaHei'
st.font.size = Pt(10)
st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
d.add_heading('竞品安全体系对标表（小米汽车 vs 我们）', level=1)
d.add_paragraph('整理：江晚（竞品研究组） · 2026-10-31 · 依据：小米汽车安全专场直播（原话见会映）与本周三场内部会议')
d.add_paragraph('说明：“对方”一列只写直播原话里的事实；“我们”一列来自内部会议记录，属于内部信息。')
byid = {it['id']: it for it in items}
def src(i):
    it = byid[i]
    return f'{mmss(qtime(it))} {names[seg[it["seg"]]["speaker"]]}'
rows = [
    ('安全目标', f'“做同档最安全的车”（{src("xm_06")}）', '暂无对外统一的安全目标口径', '江晚：门店安全话术卡里统一口径（11/5）'),
    ('安全组织', '安全委员会是最高安全决策组织，覆盖设计、研发、工程、制造', '安委会只做事后通报（10/28 安全周会）', '宋岚：下月经营会提安委会常设方案'),
    ('评审机制', '所有环节业务评估后还要过安委会评估；安全有一票否决权', '评审里没有否决权，项目能带着安全问题往下走', '宋岚：让安全评审变成一道关'),
    ('团队规模', '安全相关团队超过 3500 人（爽哥说、侯静雷确认）', '—', '韩总关注：投入规模'),
    ('开发安全', '全域安全部：4 大场景、19 个安全领域；举例座椅夹手、生态链产品二次伤害', '电动座椅回位夹手投诉，开发阶段缺工况', '魏然：11/7 前补进开发阶段安全检查清单'),
    ('用车安全', '交付是安全工作下一阶段的开始，安全预防团队接手', '交付环节安全讲法散，客户记不住', '高远：试驾加主动安全体验环节'),
    ('车主培训', '2025 年线下高阶驾驶安全培训 484 场、10620 人', '今年 60 多场，场地是瓶颈（10/29 车主运营月会）', '高远：排门店场地'),
    ('车主激励', '新车主 90 天安全打卡，连续打满 4000 积分；App 安全分 2.0', '驾驶评分打开率只有 6%；评分和积分挂钩试点', '程橙：11/10 前出积分方案'),
    ('购车权益', '交付权益加送价值 699 元的智能双表盘', '权益对比表待更新（10/30 门店销售周会）', '邓凯：更新权益对比表'),
]
tb = d.add_table(rows=1, cols=4)
tb.style = 'Light Grid Accent 1'
for i, h in enumerate(['维度', '对方（直播原话）', '我们（内部会议）', '动作 · 负责人']):
    tb.rows[0].cells[i].text = h
for r in rows:
    cs = tb.add_row().cells
    for i, v in enumerate(r):
        cs[i].text = v
d.add_paragraph()
d.add_paragraph(f'待核实：“应该是行业内首个完成万人级培训的车企”（{src("xm_18")}）为绝对化表述，直播未给出处，物料引用前先核实。')
d.save(kb / '竞品安全体系对标表.docx')

# ---------- MD 拆解 ----------
md = ['# 安全体系拆解：目标 · 组织 · 机制', '',
      '> 竞品研究组笔记 · 2026-10-31 · 依据小米汽车安全专场直播（第一部分）。只引用直播原话，评论单独标“我们的看法”。', '',
      '## 三个词', '',
      '直播里侯静雷把安全体系拆成三个词：', '',
      '- **目标**：要达成的功能——“做同档最安全的车”。',
      '- **组织**：谁来承接——安全委员会是最高安全决策组织；全域安全部、安全预防团队等分工。',
      '- **机制**：组织之间怎么协作——所有环节过安全评估，安全有一票否决权。', '',
      '## 原话索引', '']
for it in items:
    s = seg[it['seg']]
    md.append(f'- `{mmss(qtime(it))}` **{it["title"]}** —— “{it["quote"]}”（{names[s["speaker"]]}）')
md += ['', '## 我们的看法', '',
       '1. 对方的重点不是单项技术，而是**评审机制**：否决权让安全从“建议”变成“关卡”。这正好对上 10/28 安全周会里宋岚提的问题。',
       '2. “同档最安全”是按价位段比较的定位，门店会被问到，话术卡要先准备。',
       '3. 培训规模（484 场、10620 人）和我们差一个数量级，瓶颈在场地。',
       '4. 本段**没有**电子安全（第二部分），也只讲了三个事故预防团队中的两个，后续片段接入后补齐。', '']
(kb / '安全体系拆解_目标组织机制.md').write_text('\n'.join(md), encoding='utf-8')

# ---------- 直播截图 ----------
video = root / m['video']['path'] if 'video' in m else root / 'data/video/196d80ece5e9f2c22fd9f93f35b988c2.mp4'
shots = [(21, '直播截图_00-21_开场两部分'), (330, '直播截图_05-30_安全委员会'), (520, '直播截图_08-40_安全预防团队')]
for t, name in shots:
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(t), '-i', str(video), '-frames:v', '1', '-q:v', '3', '-vf', 'scale=540:-1', str(kb / f'{name}.jpg')], check=True)
# 封面（首页和回放的海报帧）
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', '330', '-i', str(video), '-frames:v', '1', '-q:v', '3', '-vf', 'scale=360:-1', str(case / 'poster.jpg')], check=True)
print('ok', sorted(p.name for p in kb.iterdir()))
