// A one-off patch of the exported chunks (2026-11-06); export.ts and edits.ts now do the same on a fresh export.
// Patch the exported Verandah chunks in place (the same rules as scripts/mc/export.ts and edits.ts now make):
// the rock stacks off the port cleared to open sea; ice melted (water below the sea's level, nothing above);
// water standing above the sea over open sea taken down to it.
const fs=require('fs'),zlib=require('zlib');
const names=(()=>{const s=fs.readFileSync('src/world/blocks.ts','utf8');const b=s.slice(s.indexOf('export enum B {')+15,s.indexOf('}',s.indexOf('export enum B {')));return b.replace(/\/\/.*$/gm,'').split(',').map(x=>x.trim()).filter(Boolean)})();
const id=(n)=>{const i=names.indexOf(n);if(i<0)throw n;return i};
const A=0,W=id('Water'),I=id('Ice'),S=id('Stone'),SAND=id('Sand');const SEA=16;
const BOX=[-2872,1816,-2843,1833];
const DRY=process.argv.includes('--dry');let nBox=0,nIce=0,nHigh=0;
for(const fn of fs.readdirSync('public/mcland')){const m=fn.match(/^(-?\d+)_(-?\d+)\.bin$/);if(!m)continue;const cx=+m[1],cz=+m[2];
 const f=zlib.inflateRawSync(fs.readFileSync('public/mcland/'+fn));let p=0;const cols=[];
 for(let c=0;c<1024;c++){const n=f[p++];const r=[];for(let q=0;q<n;q++)r.push([f[p++],f[p++],f[p++]]);cols.push(r)}
 const rest=f.subarray(p);let changed=false;
 for(let c=0;c<1024;c++){const x=cx*32+(c%32),z=cz*32+Math.floor(c/32);let r=cols[c];
  if(x>=BOX[0]&&x<=BOX[2]&&z>=BOX[1]&&z<=BOX[3]){cols[c]=[[0,8,S],[8,1,SAND],[9,7,W]];nBox++;changed=true;continue}
  // expand to cells
  const cell=new Uint8Array(112);for(const [y,l,b] of r)for(let k=0;k<l;k++)cell[y+k]=b;
  let ch=false;
  for(let y=0;y<112;y++)if(cell[y]===I){cell[y]=y<SEA?W:A;nIce++;ch=true}
  // the solid ground under the water at the top: if it's below the sea, the column is open sea
  let top=-1;for(let y=111;y>=0;y--)if(cell[y]!==A){top=y;break}
  if(top>=SEA&&cell[top]===W){let g=top;while(g>=0&&(cell[g]===W||cell[g]===A))g--;if(g<SEA-1){for(let y=SEA;y<=top;y++){if(cell[y]===W){cell[y]=A;nHigh++;ch=true}}}}
  if(ch){changed=true;const out=[];let y=0;while(y<112){if(cell[y]===A){y++;continue}let l=1;while(y+l<112&&cell[y+l]===cell[y]&&l<255)l++;out.push([y,l,cell[y]]);y+=l}cols[c]=out}}
 if(changed&&!DRY){const parts=[];for(const r of cols){parts.push(r.length);for(const [y,l,b] of r)parts.push(y,l,b)}const buf=Buffer.concat([Buffer.from(parts),rest]);fs.writeFileSync('public/mcland/'+fn,zlib.deflateRawSync(buf,{level:9}))}}
console.log({nBox,nIce,nHigh,dry:DRY});
// the ladders, door and lamps that hung off the stacks
const sf='src/data/mcSigns.ts';let s=fs.readFileSync(sf,'utf8');const mm=s.match(/(export const MC_THINGS[^=]*= )(\[.*?\]);/s);const T=JSON.parse(mm[2]);
const keep=T.filter(t=>!(t[1]>=BOX[0]&&t[1]<=BOX[2]+1&&t[3]>=BOX[1]&&t[3]<=BOX[3]+1));console.log('things in the box',T.length-keep.length);
if(!DRY&&keep.length!==T.length){s=s.replace(mm[0],mm[1]+JSON.stringify(keep)+';');fs.writeFileSync(sf,s)}
