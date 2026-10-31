from pathlib import Path
import json,zipfile
import pymupdf
from docx import Document
from openpyxl import load_workbook
root=Path(__file__).resolve().parents[2]
out=root/'web/public/files'
qa=root/'tools/file-assets/qa'
for f in out.glob('*.inspect.ndjson'):
    f.replace(qa/f.name)
manifest={}
for f in out.iterdir():
    if f.suffix not in ('.pdf','.docx','.xlsx','.pptx','.md'):continue
    manifest[f.name]={'size':f'{max(1,round(f.stat().st_size/1024))} KB'}
    assert (out/(f.name+'.html')).exists()
    if f.suffix in ('.docx','.xlsx','.pptx'):
        with zipfile.ZipFile(f) as z: assert z.testzip() is None
    if f.suffix=='.docx': assert Document(f).paragraphs
    if f.suffix=='.xlsx': assert load_workbook(f).active.max_row>=5
    if f.suffix=='.pdf':
        pdf=pymupdf.open(f);assert len(pdf)>0
        if f.name.startswith('座椅'):pdf[0].get_pixmap().save(qa/'complaint.png')
assert len(manifest)==10
(root/'web/src/data/file-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Validated 10 real documents and 10 preview pages')
