import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Workbook, SpreadsheetFile, Presentation, PresentationFile } from '@oai/artifact-tool';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const out=path.join(root,'web/public/files');
const items=JSON.parse(await fs.readFile(path.join(here,'content.json'),'utf8'));
const qa=path.join(here,'qa'); await fs.mkdir(qa,{recursive:true});
for(const item of items.filter(x=>x.rows)) {
  const wb=Workbook.create(); const s=wb.worksheets.add('演示资料');
  s.getRange('A1:E1').merge();s.getRange('A1').values=[[item.name.replace('.xlsx','')]];
  s.getRange('A2:E2').merge();s.getRange('A2').values=[['演示资料 · 根据虚构会议场景整理；待核实项不代表实际权益或统计结果。']];
  s.getRange('A4:E9').values=item.rows;
  s.getRange('A1:E9').format.font={name:'Microsoft YaHei',size:11};
  s.getRange('A1:E9').format.columnWidth=25;
  s.getRange('A1:E9').format.rowHeight=30;
  s.getRange('A1:E1').format.font={size:18,bold:true};
  s.getRange('A4:E4').format={fill:'#273449',font:{bold:true,color:'#FFFFFF'}};
  if(item.name.startsWith('10')) s.getRange('B5').format.numberFormat='0%';
  wb.recalculate();
  console.log((await wb.inspect({kind:'region',sheetId:s.id,range:'A4:E9',maxChars:1200})).ndjson);
  await (await SpreadsheetFile.exportXlsx(wb)).save(path.join(out,item.name));
  try{await fs.writeFile(path.join(qa,item.name+'.png'),new Uint8Array(await (await wb.render({sheetName:s.name,range:'A1:E9',scale:1,format:'png'})).arrayBuffer()));}catch(e){console.log('Render:',e.message)}
}
const deck=items.find(x=>x.name.endsWith('.pptx'));
const p=Presentation.create({slideSize:{width:1280,height:720}});
for(const [i,[title,body]] of deck.sections.entries()) {
  const slide=p.slides.add();slide.background.fill='#F5F6F8';
  function text(value,y,height,size,color,bold=false){const shape=slide.shapes.add({geometry:'textbox',position:{left:90,top:y,width:1100,height},fill:'none',line:{fill:'none',width:0}});shape.text=value;shape.text.style={fontFamily:'Microsoft YaHei',fontSize:size,color,bold};}
  text('会映 · 门店培训 / 演示资料',60,40,19,'#737B87');
  text(title,160,100,48,'#202937',true);
  text(body,300,260,28,'#445064');
  text(`草稿待审核 · 2026.10.30                                              ${i+1} / ${deck.sections.length}`,635,35,17,'#737B87');
  try{await fs.writeFile(path.join(qa,`slide-${i+1}.png`),new Uint8Array(await (await p.export({slide,format:'png',scale:1})).arrayBuffer()));}catch(e){console.log('Slide render:',e.message)}
}
const skill='C:/Users/86151/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations';
const candidate=path.join(qa,'candidate.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:path.join(out,deck.name),pythonExecutable:'C:/Users/86151/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],verifyArtifactToolImport:true,receiptPath:path.join(qa,'pptx-validation.json')});
const manifest={};for(const name of await fs.readdir(out)){if(name.endsWith('.html'))continue;manifest[name]={size:`${Math.max(1,Math.round((await fs.stat(path.join(out,name))).size/1024))} KB`};}
await fs.writeFile(path.join(root,'web/src/data/file-manifest.json'),JSON.stringify(manifest,null,2));
console.log('All files exported.');
