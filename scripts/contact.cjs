const sharp=require('sharp');const out=process.argv[2];
(async()=>{const W=240,H=300,cols=6;const ids=[...Array(65)].map((_,i)=>i+1);
for(let s=0;s<3;s++){const chunk=ids.slice(s*24,s*24+24);const rows=Math.ceil(chunk.length/cols);
const comps=[];for(let k=0;k<chunk.length;k++){const id=chunk[k];
const buf=await sharp('raw/'+id+'.png').resize(W,H,{fit:'contain',background:'#222'}).flatten({background:'#222'}).png().toBuffer();
const x=(k%cols)*W,y=Math.floor(k/cols)*H;comps.push({input:buf,left:x,top:y});
comps.push({input:Buffer.from(`<svg width="60" height="34"><rect width="60" height="34" fill="red"/><text x="6" y="26" font-size="26" fill="white" font-family="Arial" font-weight="bold">${id}</text></svg>`),left:x,top:y});}
await sharp({create:{width:cols*W,height:rows*H,channels:3,background:'#000'}}).composite(comps).jpeg({quality:70}).toFile(out+'/sheet'+s+'.jpg');}})();
