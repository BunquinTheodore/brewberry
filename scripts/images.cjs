// Converts raw/*.png into responsive WebP sets in public/img and writes src/images.json
const sharp = require('sharp'); const fs = require('fs');
const MAP = {
 1:'case-muffins',2:'case-pastries',3:'ube-cheese-buns',4:'ube-cheese-buns-2',5:'choco-muffins',6:'yema-buns',
 7:'pain-choco',8:'croissant-white',9:'croissant-rack',10:'pain-choco-2',11:'pain-choco-3',12:'pain-choco-4',
 14:'story-barista-counter',15:'place-neon-night',16:'story-soft-opening',17:'story-selfie',18:'place-exterior-dusk',
 19:'people-group-1',20:'people-long-table',21:'latte-cookies-cream',22:'matcha-tower',23:'offer-student-promo',
 24:'iced-latte-cheesecake',25:'cappuccino-basque',26:'latte-flatlay',27:'summer-sips-trio',28:'nachos',29:'spread-table',
 30:'choco-domes',31:'people-group-2',32:'people-family',33:'people-friends',34:'people-night',35:'people-graduation',
 36:'story-team-thumbs',37:'iced-drinks-window',38:'team-thumbs-2',39:'spread-closeup',40:'drinks-buns',41:'offer-summer-sips',
 42:'story-staff-selfie',43:'story-staff-table',44:'brownie-crumble',45:'egg-tarts',46:'smores-croissant',47:'people-window-guest',
 48:'pastry-spread',49:'people-family-night',50:'cakes-showcase',51:'ube-flatlay',52:'ube-sofa',53:'ube-pastillas-poster',
 54:'focaccia',55:'training-class',56:'training-barista',57:'training-milk',58:'training-graduates',59:'training-demo',
 60:'training-student-drink',61:'training-dose',62:'training-tamp',63:'pet-kitten-drinks',64:'pet-kitten-counter'};
const WIDTHS=[480,960,1600];
(async()=>{fs.mkdirSync('public/img',{recursive:true});const out={};
for(const [id,name] of Object.entries(MAP)){const img=sharp('raw/'+id+'.png');const m=await img.metadata();
 const ws=WIDTHS.filter(w=>w<m.width).concat(m.width<1600?[m.width]:[]).filter((v,i,a)=>a.indexOf(v)===i);
 for(const w of ws){await sharp('raw/'+id+'.png').resize({width:w}).flatten({background:'#1a120d'}).webp({quality:70,effort:5}).toFile(`public/img/${name}-${w}.webp`);}
 const {dominant}=await sharp('raw/'+id+'.png').stats();
 out[name]={w:m.width,h:m.height,widths:ws,color:`rgb(${dominant.r},${dominant.g},${dominant.b})`};}
// logo: key out the cream background
const {data,info}=await sharp('raw/13.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4){const l=(data[i]+data[i+1]+data[i+2])/3;const a=Math.max(0,Math.min(255,(235-l)*2.2));data[i+3]=Math.min(data[i+3],a);}
const keyed=sharp(data,{raw:info});await keyed.clone().trim().png().toFile('public/img/logo-dark.png');
// light version: invert to cream for dark backgrounds
const inv=Buffer.from(data);for(let i=0;i<inv.length;i+=4){inv[i]=246;inv[i+1]=239;inv[i+2]=227;}
await sharp(inv,{raw:info}).trim().png().toFile('public/img/logo-light.png');
await sharp('public/img/logo-light.png').resize(600).webp({quality:85}).toFile('public/img/logo-light.webp');
await sharp('public/img/logo-dark.png').resize(600).webp({quality:85}).toFile('public/img/logo-dark.webp');
await sharp('raw/13.png').resize(512,512).png().toFile('public/icon-512.png');
await sharp('raw/13.png').resize(180,180).png().toFile('public/apple-touch-icon.png');
await sharp('raw/13.png').resize(48,48).png().toFile('public/favicon.png');
await sharp('raw/50.png').resize(1200,630,{fit:'cover'}).jpeg({quality:78}).toFile('public/og.jpg');
fs.mkdirSync('src',{recursive:true});fs.writeFileSync('src/images.json',JSON.stringify(out,null,1));console.log(Object.keys(out).length,'images');})();
