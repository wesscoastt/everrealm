// Run after scripts/mc/export.ts (node scripts/mc/seadeep.cjs): the export lays the open sea at SEA_FLOOR.
// Verandah's open sea shelved down like the world's own (world/terrain.ts seaBed: SEA-3 less 0.12 a block out from
// the shore, to 9, floor 3), never raised; the bed sand with a third gravel, as the world's own sea floor.
const fs=require('fs'),zlib=require('zlib');
const names=(()=>{const s=fs.readFileSync('src/world/blocks.ts','utf8');const b=s.slice(s.indexOf('export enum B {')+15,s.indexOf('}',s.indexOf('export enum B {')));return b.replace(/\/\/.*$/gm,'').split(',').map(x=>x.trim()).filter(Boolean)})();
const id=(n)=>{const i=names.indexOf(n);if(i<0)throw n;return i};
const W=id('Water'),ST=id('Stone'),SA=id('Sand'),GR=id('Gravel');const SEA=16;
const NATW=new Set(['Stone','Sand','Gravel','Dirt','Granite','Clay','DeepStone','Water','Loam'].map(id));
const files=fs.readdirSync('public/mcland').filter(f=>/^-?\d+_-?\d+\.bin$/.test(f));
const data=new Map();let X0=1e9,Z0=1e9,X1=-1e9,Z1=-1e9;
for(const fn of files){const [cx,cz]=fn.replace('.bin','').split('_').map(Number);X0=Math.min(X0,cx*32);Z0=Math.min(Z0,cz*32);X1=Math.max(X1,cx*32+31);Z1=Math.max(Z1,cz*32+31);
 const f=zlib.inflateRawSync(fs.readFileSync('public/mcland/'+fn));let p=0;const cols=[];for(let c=0;c<1024;c++){const n=f[p++];const r=[];for(let q=0;q<n;q++)r.push([f[p++],f[p++],f[p++]]);cols.push(r)}data.set(fn,{cx,cz,cols,rest:f.subarray(p)})}
const Wd=X1-X0+1,Dd=Z1-Z0+1;const sea=new Uint8Array(Wd*Dd),have=new Uint8Array(Wd*Dd);
for(const {cx,cz,cols} of data.values())for(let c=0;c<1024;c++){const x=cx*32+(c%32),z=cz*32+Math.floor(c/32),i=(x-X0)+(z-Z0)*Wd;have[i]=1;const r=cols[c];
 let top=-1,tb=0,nat=true;for(const [y,l,b] of r){if(!NATW.has(b))nat=false;if(y+l-1>top){top=y+l-1;tb=b}}
 if(nat&&tb===W&&top===SEA-1)sea[i]=1}
// distance from anything not open sea (land, piers, wrecks): 4-neighbour BFS
const dist=new Uint16Array(Wd*Dd).fill(65535);const q=new Int32Array(Wd*Dd);let qh=0,qt=0;
for(let i=0;i<Wd*Dd;i++)if(have[i]&&!sea[i]){dist[i]=0;q[qt++]=i}
while(qh<qt){const i=q[qh++],x=i%Wd,z=(i/Wd)|0;if(dist[i]>120)continue;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=Wd||zz>=Dd)continue;const j=xx+zz*Wd;if(dist[j]===65535&&have[j]){dist[j]=dist[i]+1;q[qt++]=j}}}
const hsh=(x,z,k)=>{let h=(x*374761393+z*668265263+k*2147483647)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296};
const smooth=(x,z)=>(Math.sin(x*0.043+1.7)+Math.sin(z*0.051+0.3)+Math.sin((x+z)*0.027+2.1))/6+0.5;
const DRY=process.argv.includes('--dry');let changed=0,files2=0;
for(const [fn,d] of data){let ch=false;for(let c=0;c<1024;c++){const x=d.cx*32+(c%32),z=d.cz*32+Math.floor(c/32),i=(x-X0)+(z-Z0)*Wd;if(!sea[i])continue;
  const off=dist[i]===65535?200:dist[i];const want=Math.round(Math.max(3,SEA-3-Math.min(9,off*0.12)-smooth(x,z)*3));
  let bed=-1;for(const [y,l,b] of d.cols[c])if(b!==W)bed=Math.max(bed,y+l-1);
  if(want>=bed)continue;
  d.cols[c]=[[0,want,ST],[want,1,hsh(x,z,4)<0.3?GR:SA],[want+1,SEA-1-want,W]];changed++;ch=true}
 if(ch&&!DRY){files2++;const parts=[];for(const r of d.cols){parts.push(r.length);for(const [y,l,b] of r)parts.push(y,l,b)}fs.writeFileSync('public/mcland/'+fn,zlib.deflateRawSync(Buffer.concat([Buffer.from(parts),d.rest]),{level:9}))}}
console.log({changed,files:files2,dry:DRY,seaCols:sea.reduce((a,b)=>a+b,0)});
