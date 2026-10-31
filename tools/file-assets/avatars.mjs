import sharp from 'sharp';
import path from 'node:path';
const source='C:/Users/86151/.codex/generated_images/01a1921c-b1e5-7223-817e-80275fac82f9';
const output='D:/desktop/sukesong/web/public/assets/generated';
const files={hanzong:'2f014942-c50e-4882-a8ed-4a365686d334',songlan:'6c140cf6-74a6-4f12-a05b-8c983a558b31',chengcheng:'8f7aa4cb-26a0-4f9d-a007-36752211d0d1',gaoyuan:'057747d7-70e0-4b23-9bea-bb3242a67360',dengkai:'38c0f647-f7a7-4f51-a58e-046581c2aae7',weiran:'50529400-0992-4669-97e7-6c2162fb6b38',xunuo:'0e795cf9-dd43-45c9-ba81-09a002856cd3',linxia:'1001bb7a-b90c-4e33-b7a7-0f94e965248c',tangchuan:'2a7cb90f-fa5c-4992-b647-8c428b0b85f0',leijun:'db644438-fe68-441e-9a2e-7fee265ea5a2',houjinglei:'c08f12bf-30bd-4673-bb24-8849fb9eaeda',dingzhi:'e0b4dc9f-10a9-4f1e-8c56-365e125f8f33',shuangge:'401e3133-9c17-400a-a713-5416640ee426'};
for(const [id,file] of Object.entries(files)){
 await sharp(path.join(source,`exec-${file}.png`)).resize(256,256).webp({quality:88}).toFile(path.join(output,`${id}.webp`));
}
console.log(`Saved ${Object.keys(files).length} optimized avatars`);
