# Fisherman Dave: the characters' looks

The owner's notes on the concept art they sent 2026-11-11 (the pictures are described in docs/OWED.md 97w).

Becky White as a Ghost/.test(l))return;let o;try{o=JSON.parse(l)}catch{return}if(o.type!=='user')return;const c=o.message&&o.message.content;const parts=typeof c==='string'?[c]:Array.isArray(c)?c.filter(p=>p.type==='text').map(p=>p.text):[];texts.push(...parts)});
r.on('close',()=>{
 const pick=(re)=>texts.filter(t=>re.test(t)).sort((a,b)=>b.length-a.length)[0];
 const clean=(t)=>t.replace(/<\/?pasted_content[^>]*>/g,'').replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g,'').replace(/This is how Claude Code surfaces[\s\S]*$/,'').replace(/^The user sent a new message while you were working:\s*/,'').trim();
 const save=(n,h,t)=>{if(!t){console.log('missing',n);return}fs.writeFileSync('docs/briefs/'+n,'# '+h+'\n\nThe owner\'s brief, word for word, as sent 2026-11-11 (docs/OWED.md 97).\n\n'+clean(t)+'\n');console.log(n,clean(t).length)};
 const dave=pick(/FISHERMAN DAVE & BECKY WHITE/), mc=pick(/MORALITY, ALIGNMENT/), art=pick(/Becky White as a Ghost/);
 save('fisherman-dave.md','Fisherman Dave and Becky White',dave);
 if(mc){const a=mc.indexOf('EVERREALM — MORALITY'),b=mc.indexOf('EVERREALM — COMPLETE COMPANION');save('morality.md','Morality, alignment and world reputation',mc.slice(a,b>a?b:undefined));if(b>0)save('companions.md','Companions overhauled',mc.slice(b));}
 save('fisherman-dave-art.md','Fisherman Dave: the characters\' looks (concept art was attached in the conversation; described in docs/OWED.md 97w)',art);
});
EOF
node .walker/briefs.cjs; head -c 600 docs/briefs/companions.md; echo; tail -c 300 docs/briefs/morality.md
