// Run after scripts/mc/export.ts, before seadeep.cjs (node scripts/mc/sinkbars.cjs).
// Sand bars and spits run out from Verandah's shores (owner 2026-11-05: "make sure no sand bars surround any of the
// land; it should blend seamlessly into the world water"): bare ground at the sea's level more than six blocks
// from real land (grass, anything grown or built) goes under, to the sea bed shelving away as the world's own does.
const fs=require('fs'),zlib=require('zlib');
const names=(()=>{const s=fs.readFileSync('src/world/blocks.ts','utf8');const b=s.slice(s.indexOf('export enum B {')+15,s.indexOf('}',s.indexOf('export enum B {')));return b.replace(/\/\/.*$/gm,'').split(',').map(x=>x.trim()).filter(Boolean)})();
const id=(n)=>{const i=names.indexOf(n);if(i<0)throw n;return i};const W=id('Water'),ST=id('Stone'),SA=id('Sand'),GR=id('Gravel');const SEA=16;
const BARE=new Set(['Sand','Gravel','Dirt','Clay','Stone','Granite','Loam'].map(id));
const files=fs.readdirSync('public/mcland').filter(f=>/^-?\d+_-?\d+\.bin$/.test(f));
const data=new Map();let X0=1e9,Z0=1e9,X1=-1e9,Z1=-1e9;
for(const fn of files){const [cx,cz]=fn.replace('.bin','').split('_').map(Number);X0=Math.min(X0,cx*32);Z0=Math.min(Z0,cz*32);X1=Math.max(X1,cx*32+31);Z1=Math.max(Z1,cz*32+31);
 const f=zlib.inflateRawSync(fs.readFileSync('public/mcland/'+fn));let p=0;const cols=[];for(let c=0;c<1024;c++){const n=f[p++];const r=[];for(let q=0;q<n;q++)r.push([f[p++],f[p++],f[p++]]);cols.push(r)}data.set(fn,{cx,cz,cols,rest:f.subarray(p)})}
const Wd=X1-X0+1,Dd=Z1-Z0+1;const kind=new Uint8Array(Wd*Dd);
for(const d of data.values())for(let c=0;c<1024;c++){const x=d.cx*32+(c%32),z=d.cz*32+Math.floor(c/32),i=(x-X0)+(z-Z0)*Wd;let top=-1,tb=0,bare=true;
 for(const [y,l,b] of d.cols[c]){if(y+l-1>top){top=y+l-1;tb=b}if(!BARE.has(b)&&b!==W)bare=false}
 kind[i]=(top<0||tb===W)?1:(BARE.has(tb)&&top<=SEA&&top>=SEA-3?2:3)}
const dist=new Uint16Array(Wd*Dd).fill(65535);const q=new Int32Array(Wd*Dd);let qh=0,qt=0;
for(let i=0;i<Wd*Dd;i++)if(kind[i]===3){dist[i]=0;q[qt++]=i}
while(qh<qt){const i=q[qh++],x=i%Wd,z=(i/Wd)|0;if(dist[i]>150)continue;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=Wd||zz>=Dd)continue;const j=xx+zz*Wd;if(dist[j]===65535&&kind[j]){dist[j]=dist[i]+1;q[qt++]=j}}}
// only what the open sea reaches: flooded in from the import's edge through sea and bare ground, never through land
// (a dug field inland with its water channels is a farm, not a sand bar)
const reach=new Uint8Array(Wd*Dd);const rq=[];
for(let x=0;x<Wd;x++)for(const z of [0,Dd-1]){const i=x+z*Wd;if(kind[i]===1&&!reach[i]){reach[i]=1;rq.push(i)}}
for(let z=0;z<Dd;z++)for(const x of [0,Wd-1]){const i=x+z*Wd;if(kind[i]===1&&!reach[i]){reach[i]=1;rq.push(i)}}
while(rq.length){const i=rq.pop(),x=i%Wd,z=(i/Wd)|0;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=Wd||zz>=Dd)continue;const j=xx+zz*Wd;if(!reach[j]&&(kind[j]===1||kind[j]===2)){reach[j]=1;rq.push(j)}}}
const hsh=(x,z,k)=>{let h=(x*374761393+z*668265263+k*2147483647)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296};
const smooth=(x,z)=>(Math.sin(x*0.043+1.7)+Math.sin(z*0.051+0.3)+Math.sin((x+z)*0.027+2.1))/6+0.5;
// a bar or a spit is small; a wide flat of sand at the sea's level is land the owner had, and stays (more than 400
// columns of it together)
const cand=new Uint8Array(Wd*Dd);for(let i=0;i<Wd*Dd;i++)if(kind[i]===2&&dist[i]>6&&reach[i])cand[i]=1;
const big=new Uint8Array(Wd*Dd);const seen=new Uint8Array(Wd*Dd);
for(let i=0;i<Wd*Dd;i++){if(!cand[i]||seen[i])continue;const st=[i],comp=[];seen[i]=1;while(st.length){const j=st.pop();comp.push(j);const x=j%Wd,z=(j/Wd)|0;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=Wd||zz>=Dd)continue;const k=xx+zz*Wd;if(cand[k]&&!seen[k]){seen[k]=1;st.push(k)}}}if(comp.length>400)for(const j of comp)big[j]=1}
const DRY=process.argv.includes('--dry');let sunk=0,nf=0;const where=new Map();
for(const [fn,d] of data){let ch=false;for(let c=0;c<1024;c++){const x=d.cx*32+(c%32),z=d.cz*32+Math.floor(c/32),i=(x-X0)+(z-Z0)*Wd;if(!cand[i]||big[i])continue;
  const off=dist[i]===65535?200:dist[i]-6;const want=Math.min(SEA-3,Math.round(Math.max(3,SEA-3-Math.min(9,off*0.12)-smooth(x,z)*3)));
  d.cols[c]=[[0,want,ST],[want,1,hsh(x,z,4)<0.3?GR:SA],[want+1,SEA-1-want,W]];sunk++;ch=true;const k=Math.floor(x/128)*128+','+Math.floor(z/128)*128;where.set(k,(where.get(k)||0)+1)}
 if(ch&&!DRY){nf++;const parts=[];for(const r of d.cols){parts.push(r.length);for(const [y,l,b] of r)parts.push(y,l,b)}fs.writeFileSync('public/mcland/'+fn,zlib.deflateRawSync(Buffer.concat([Buffer.from(parts),d.rest]),{level:9}))}}
console.log({sunk,files:nf,dry:DRY});console.log([...where].sort((a,b)=>b[1]-a[1]).slice(0,12).map(e=>e.join(' ')).join(' | '));
