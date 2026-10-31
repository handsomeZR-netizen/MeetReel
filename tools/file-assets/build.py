"""Build demo attachments and readable local previews; preserve existing source files."""
from pathlib import Path
import json, html, shutil
from urllib.parse import quote
from docx import Document
from docx.shared import Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'web/public/files'
OUT.mkdir(parents=True, exist_ok=True)
NOTE = '演示资料：依据会映项目中的虚构会议场景整理，不代表真实业务记录。未提供的数据保留为待核实。'
docs = [
 {'name':'驾驶评分 × 积分试点方案.docx','sections':[
 ('试点目的','车主运营月会提出驾驶行为评分打开率为 6%。本方案通过新车主试点，验证评分入口引导与积分激励能否提升参与度。'),
 ('实施安排','程橙负责积分方案，11 月 10 日前提交韩总。高远负责交付当天的评分开通引导，并将说明纳入培训课程。'),
 ('规则待评审','试点规模、周期、积分额度、预算与退出规则尚未确定。正式上线前需明确参与者授权、数据使用范围和异常积分处理。'),
 ('验收方式','记录获邀人数、开通人数、评分页访问人数和积分兑换人数；统一统计周期和去重口径后再比较。不得将试点效果作为已实现结果。')]},
 {'name':'安委会常设方案（草案）.docx','sections':[
 ('方案目的','安全周会提出将安全评审设为项目进入下一阶段的必要关口。本草案供下月经营会讨论，尚未批准。'),
 ('评审机制','项目负责人提交风险与验证材料，安全部组织评审。未通过的项目完成整改与复核后，再提交阶段准入申请。'),
 ('组织职责','宋岚负责常设方案；魏然牵头补充座椅夹手工况；唐川整理评审记录；许诺拟定 OTA 大版本功能安全复核流程。'),
 ('资源与待办','场景中的资源提议为追加 2 个编制、预算约 80 万元，属于待审批建议。11 月 7 日前形成座椅安全检查清单与相关记录。')]},
 {'name':'座椅夹手投诉工单.pdf','sections':[
 ('工单性质','演示编号 DEMO-SEAT-001。来自项目虚构安全周会，用于展示问题跟踪，不包含真实客户身份信息。'),
 ('问题描述','场景记录：电动座椅回位时发生儿童手部被夹情况，开发阶段未覆盖该工况。车型、车辆编号、发生时间、伤情和检测结论均待核实。'),
 ('处理安排','魏然牵头补充开发阶段安全检查清单，唐川配合整理评审记录，计划于 11 月 7 日前提交一版。'),
 ('闭环要求','补齐复现条件、风险评估、整改方案与验证结果后再判定是否关闭。当前状态：待调查，不预设技术根因。')]},
 {'name':'门店安全话术卡（草稿）.pptx','sections':[
 ('门店安全话术卡','内部培训草稿 · 演示资料\n江晚负责内容，计划 11 月 5 日前印到门店。'),
 ('先了解客户关心什么','建议开场：您更关心日常用车、驾驶辅助，还是家人乘坐安全？\n围绕客户的问题，使用已核实的产品资料逐项说明。'),
 ('如何回应竞品比较','建议回应：可以按同一测试条件和配置逐项比较，我为您核对资料。\n未确认的竞品表述不直接复述，不使用无出处的绝对化结论。'),
 ('交付与问题反馈','交付时统一说明已确认的功能边界与操作步骤。\n高远安排门店场地；具体体验流程须在内部评审后执行。\n遇到未确认的问题，记录并交由产品或安全团队回复。')]},
 {'name':'购车权益对比表 v3.xlsx','rows':[
 ['权益项目','本方状态','竞品状态','负责人','核实说明'],
 ['购车优惠','待核实','待核实','邓凯','以正式活动条款为准'],
 ['交付权益','待核实','会议提及加码','林夏','补充来源和适用条件'],
 ['车主培训','待核实','待核实','高远','确认场地和参与规则'],
 ['素材更新','待审核','直播后补充','林夏','保留日期与原始出处']]},
 {'name':'10 月车主 App 数据.xlsx','rows':[
 ['指标','场景记录','统计口径','负责人','备注'],
 ['驾驶评分打开率',0.06,'分母与去重口径待确认','程橙','项目虚构会议原话'],
 ['线下培训场次','60 多场','今年累计，非单月','高远','场地是主要瓶颈'],
 ['月活用户数','待提供','自然月去重用户','程橙','未提供原始明细'],
 ['积分试点','方案待提交','新车主试点','程橙','11 月 10 日前提交']]}
]
for item in docs:
    name = item['name']
    if name.endswith('.docx'):
        d = Document()
        normal = d.styles['Normal']; normal.font.name = 'Microsoft YaHei'; normal.font.size = Pt(11)
        normal.element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
        for style in d.styles:
            for border in list(style.element.iter(qn('w:pBdr'))): border.getparent().remove(border)
        d.styles['Title'].font.color.rgb = RGBColor(0,0,0)
        d.styles['Title'].font.name = 'Microsoft YaHei'
        d.styles['Title'].element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
        d.add_heading(name.rsplit('.',1)[0],0)
        d.add_paragraph(NOTE)
        for title, body in item['sections']:
            d.add_heading(title,2); d.add_paragraph(body)
        d.add_paragraph('来源：web/src/data/meetings.ts 中的虚构会议场景。')
        d.save(OUT/name)
    elif name.endswith('.pdf'):
        pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
        style = ParagraphStyle('body',fontName='STSong-Light',fontSize=11,leading=19,spaceAfter=14)
        heading = ParagraphStyle('title',parent=style,fontSize=20,leading=28)
        content=[Paragraph(name[:-4],heading),Paragraph(NOTE,style)]
        for title,body in item['sections']:
            content.extend([Paragraph(title,heading),Paragraph(body,style)])
        SimpleDocTemplate(str(OUT/name),title=name[:-4],author='会映演示',topMargin=45,bottomMargin=45).build(content)

(Path(__file__).parent/'content.json').write_text(json.dumps(docs,ensure_ascii=False,indent=2),encoding='utf-8')

def preview(name, body):
    title=html.escape(name)
    page=f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
<style>body{{margin:0;background:#f4f5f7;color:#24262c;font:16px/1.85 system-ui,"Microsoft YaHei",sans-serif}}main{{max-width:900px;margin:40px auto;padding:40px;background:white;border-radius:20px;box-shadow:0 8px 40px #00000008}}header{{display:flex;gap:20px;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:20px}}h1{{font-size:24px;line-height:1.5}}h2{{font-size:19px;margin-top:28px}}a{{flex-shrink:0;background:#24262c;color:white;border-radius:9px;padding:8px 16px;text-decoration:none}}p{{white-space:pre-wrap}}table{{border-collapse:collapse;width:100%;font-size:14px}}td,th{{border:1px solid #ddd;padding:10px;text-align:left}}th{{background:#f2f4f8}}.note{{color:#777;font-size:13px}}@media(max-width:700px){{main{{margin:12px;padding:20px}}header{{display:block}}.table{{overflow:auto}}}}</style>
<main><header><h1>{title}</h1><a href="{quote(name)}" download="{title}">下载原文件</a></header>{body}</main></html>'''
    (OUT/(name+'.html')).write_text(page,encoding='utf-8')

for item in docs:
    body='<p class="note">'+NOTE+'</p>'
    if 'sections' in item:
        body+=''.join('<h2>'+html.escape(t)+'</h2><p>'+html.escape(b)+'</p>' for t,b in item['sections'])
    else:
        body+='<div class="table"><table>'+''.join('<tr>'+''.join(f'<{ "th" if i==0 else "td"}>{html.escape("6%" if v==0.06 else str(v))}</{ "th" if i==0 else "td"}>' for v in row)+'</tr>' for i,row in enumerate(item['rows']))+'</table></div>'
    preview(item['name'],body)

originals=list((ROOT/'data/cases/xiaomi-safety/kb').glob('*'))+list((ROOT/'data').glob('*【得到大脑】.md'))
for p in originals:
    if p.suffix not in ('.docx','.md','.pdf'): continue
    name='得到大脑转写（原文）.md' if '【得到大脑】' in p.name else p.name
    shutil.copy2(p,OUT/name)
    if p.suffix=='.docx':
        d=Document(p); body=''.join('<p>'+html.escape(x.text)+'</p>' for x in d.paragraphs)
        for t in d.tables:
            body+='<div class="table"><table>'+''.join('<tr>'+''.join('<td>'+html.escape(c.text)+'</td>' for c in row.cells)+'</tr>' for row in t.rows)+'</table></div>'
    elif p.suffix=='.md': body='<p>'+html.escape(p.read_text(encoding='utf-8'))+'</p>'
    else: body=f'<iframe title="PDF 预览" src="{quote(name)}" style="width:100%;height:80vh;border:0"></iframe>'
    preview(name,body)
print('Documents and previews prepared')
