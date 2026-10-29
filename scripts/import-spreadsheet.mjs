import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {catalogSchema,catalogEntrySchema,sheetRowSchema} from './catalog-schema.mjs';
import {publish} from './publish-catalog.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const words=text=>text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
const publicKeys=['title','category','deadline','milestone','programDates','funding','location','eligibility','materials','url'];
const overrideKeys=['organization','summary','eligibility','reward','levels','deadlineDate','deadlineAt','sourceDeadline','confidence','opensOn','sourceState','sourceNote','checkedOn','sourceUrl'];
const years=text=>{
 const out=new Set(text.match(/20\d{2}/g)||[]);
 for(const m of text.matchAll(/(20\d{2})\s*[-–/]\s*(\d{2})(?!\d)/g))out.add(m[1].slice(0,2)+m[2]);
 return out;
};
const sameCycle=(a,b)=>{
 const x=years(a),y=years(b);if(x.size&&y.size&&![...x].some(v=>y.has(v)))return false;
 const seasons=t=>new Set((t.toLowerCase().replaceAll('autumn','fall').match(/\b(spring|summer|fall|winter|q[1-4])\b/g)||[]));
 const p=seasons(a),q=seasons(b);if(p.size&&q.size&&![...p].some(v=>q.has(v)))return false;
 const rounds=t=>(t.toLowerCase().match(/\b(?:round|phase|open)\s*(?:[1-9]\d*|[ivx]+)\b/g)||[]).map(words);
 const r=rounds(a),s=rounds(b);if((r.length||s.length)&&!r.some(v=>s.includes(v)))return false;
 return true;
};
const link=raw=>{const u=new URL(raw);u.protocol='https:';u.hostname=u.hostname.replace(/^www\./,'');u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/.test(k))u.searchParams.delete(k);u.pathname=u.pathname.toLowerCase().replace(/\/(?:submission|apply)\/?$/,'').replace(/\/+$/,'');u.searchParams.sort();return u.href;};
const titleWords=text=>new Set(words(text).split(' ').filter(w=>w.length>2&&!/^(20\d\d|program|programme|summer|scholarship|competition|internship|the|and|for)$/.test(w)));
const similarity=(a,b)=>{const x=titleWords(a),y=titleWords(b);return x.size&&y.size?2*[...x].filter(w=>y.has(w)).length/(x.size+y.size):0;};

export function categorize(row){
 const text=(row.title+' '+row.category).toLowerCase();
 if(/stock pitch|finance competition|bount(?:y|ies)|casmi/.test(text))return 'Finance & bounties';
 if(/travel (grant|award|support)|conference.*(grant|travel)|recognition travel/.test(text))return 'Grants & funding';
 if(/professional development|medical professional conference|policy seminar|group psychotherapy training/.test(text))return 'Conferences & networking';
 if(/education scholarship|nursing scholarship|scholarship|completion (aid|fund)|hertz fellowship/.test(text))return 'Scholarships';
 if(/internship|paid clinical.experience/.test(text))return 'Internships';
 if(/research award|research grant|institutional.*grant|founder grant|e.team program|development awards|\bgrants?\b/.test(text))return 'Grants & funding';
 if(/research|\breu\b|\bsurf\b|\bsurge\b|\bsurp\b|amgen|summer scholars|doctoral|postdoc|graduate fellowship/.test(text))return 'Research programs';
 if(/leadership|civic|policy fellowship|social.impact.*fellowship|hansen|dalai lama|millennium/.test(text))return 'Travel & leadership';
 if(/pitch|business (model|plan)|startup|venture|accelerator|founder fellowship|z fellows|hult prize/.test(text))return 'Startup competitions';
 if(/sales|strategy case|mckinsey/.test(text))return 'Career & sales';
 if(/challenge|competition|hackathon|innovation|design/.test(text))return 'Innovation challenges';
 return 'Career & sales';
}

function levels(row,category){
 const text=(row.title+' '+row.eligibility).toLowerCase(),out=[];
 if(/high.school|\bhs senior/.test(text))out.push('High school');
 if(/undergrad|bachelor|community.college|college.student|college juniors|university student/.test(text))out.push('Undergraduate');
 if(/\bgraduate\b|\bgrad\b|ph\.?d|doctoral|master|\bmba\b|medical student/.test(text))out.push('Graduate');
 if(/early.career|recent.graduat|postdoctoral/.test(text))out.push('Early career');
 if(/licensed|\brn\b|professional|practicing|nurs(es|ing students and)/.test(text))out.push('Professional');
 if(/founder|entrepreneur|startup|business owner/.test(text)||category==='Startup competitions')out.push('Founder');
 if(/organization|institutional|university.directed|nonprofit/.test(text))out.push('Organization');
 return [...new Set(out.length?out:['All levels'])];
}

export function planDates(raw){
 const dates=raw.match(/\b20\d\d-\d\d-\d\d\b/g)||[];
 const valid=d=>Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(dates.some(d=>!valid(d)))return {deadlineDate:'',opensOn:''};
 const opening=raw.match(/(?:opens?|opening)\s+(20\d\d-\d\d-\d\d)/i)?.[1]||'';
 const close=raw.match(/(?:closes?|closing)\s+(20\d\d-\d\d-\d\d)/i)?.[1];
 if(/discrepan|conflict|disagree|not officially confirmed|not yet posted|likely|local host timeline|competition closes|reported|year inconsistency|^\s*~|^\s*expected/i.test(raw))return {deadlineDate:'',opensOn:opening};
 if(/^(?:cycle\s+)?(?:application\s+)?opens?\b/i.test(raw)&&!close)return {deadlineDate:'',opensOn:opening||dates[0]||''};
 return {deadlineDate:close||(/\(U\.S\. students\)/i.test(raw)?[...dates].sort()[0]:dates[0])||'',opensOn:opening};
}

function publicRow(input){
 if(!input||typeof input!=='object'||Object.keys(input).some(k=>!publicKeys.includes(k)&&k!=='row'))throw Error('Rows may contain only the ten public fact columns and an optional diagnostic row number.');
 const selected=Object.fromEntries(publicKeys.map(k=>[k,input[k]??'']));
 for(const k of publicKeys){
  selected[k]=String(selected[k]).replace(/\([^)]*Grambling qualifies[^)]*\)/gi,'').trim();
  if(/TradeAgent|confirmation email|my application|password|api[_ -]?key|ignore (all |previous )?instructions/i.test(selected[k]))throw Error('A public fact contains private or unrelated instructions.');
 }
 const row=sheetRowSchema.parse(selected),u=new URL(row.url);
 if(/docs\.google\.com$/i.test(u.hostname)||[...u.searchParams.keys()].some(k=>/token|secret|password|email|auth|access.?key/i.test(k)))throw Error('Use an organizer/source URL without private identifiers.');
 return row;
}

const aliasRules=[[/\bilaunch\b/i,'ilaunch'],[/\be.fest\b(?!.*development)/i,'efest'],[/\bbyu\b/i,'byu'],[/bianca caragliano/i,'stock'],[/riding forward/i,'regions']];
function matchRow(rows,row,key){
 const prior=rows.find(o=>o.sheet?.key===key);if(prior)return prior;
 const candidates=rows.filter(o=>o.sourceState!=='Directory'&&sameCycle(row.title,o.cycle+' '+o.title));
 const named=candidates.filter(o=>words(o.title)===words(row.title)||words(o.sheet?.fields.title||'')===words(row.title));
 if(named.length===1)return named[0];
 for(const [pattern,id] of aliasRules)if(pattern.test(row.title)){const x=candidates.find(o=>o.id===id);if(x)return x;}
 const exact=candidates.filter(o=>link(o.url)===link(row.url));
 const useful=exact.filter(o=>similarity(row.title,o.title)>=.35||!o.sheet&&exact.length===1);
 if(useful.length===1)return useful[0];
 const close=candidates.map(o=>({o,score:similarity(row.title,o.title)})).filter(x=>x.score>=.85).sort((a,b)=>b.score-a.score);
 return close.length&&(!close[1]||close[0].score-close[1].score>.1)?close[0].o:null;
}

function derived(row,key){
 const category=categorize(row),dates=planDates(row.deadline),year=[...years(row.title)].join('–');
 const summary=[row.category,row.programDates&&'Program dates: '+row.programDates,row.location&&'Location / format: '+row.location,row.milestone&&'Next milestone: '+row.milestone].filter(Boolean).join('. ');
 return {id:'sheet-'+words(row.title).replaceAll(' ','-').slice(0,65)+'-'+key.slice(0,12),title:row.title,organization:new URL(row.url).hostname.replace(/^www\./,''),category,levels:levels(row,category),tags:['Spreadsheet',...words(row.category).split(' ').filter(x=>x.length>3).slice(0,7)],url:row.url,sourceUrl:row.url,summary,eligibility:row.eligibility||'Confirm current public eligibility with the organizer.',reward:row.funding||'Support and any application fees need confirmation.',value:3,effort:category==='Startup competitions'?12:5,...dates,deadlineAt:'',sourceDeadline:row.deadline?'Spreadsheet reports: '+row.deadline:'The spreadsheet does not provide a confirmed application cutoff.',confidence:dates.deadlineDate?'Date only':'Unknown',cycle:(year||'Intake unconfirmed')+' · '+row.title,sourceState:'Needs verification',sourceNote:'Imported from the connected spreadsheet. Organizer details have not been independently confirmed. Any listed date is a planning marker; confirm the cutoff, funding, fees and eligibility before applying.',checkedOn:'',suggestedTasks:['Verify eligibility, costs and the official application deadline',...(row.materials?['Review required materials: '+row.materials.slice(0,900)]:[]),...(row.milestone?['Review next milestone: '+row.milestone.slice(0,900)]:[])],stream:'spreadsheet'};
}

export function prepareSpreadsheetPatch(base,snapshot){
 const feed=catalogSchema.parse(base);
 if(!snapshot||Object.keys(snapshot).some(k=>!['rows','checkedAt','complete','overrides'].includes(k))||!Array.isArray(snapshot.rows)||typeof snapshot.complete!=='boolean'||!Number.isFinite(Date.parse(snapshot.checkedAt)))throw Error('Provide rows, an actual checkedAt timestamp, complete and optional verified overrides.');
 if(snapshot.rows.length>1000)throw Error('Source exceeds the current 1,000-opportunity limit.');
 const checkedAt=new Date(snapshot.checkedAt).toISOString(),rows=structuredClone(feed.opportunities),seen=new Set(),patchRows=[],issues=[],counts={sourceRows:snapshot.rows.length,added:0,matched:0,changed:0,removed:0,duplicates:0};
 for(let i=0;i<snapshot.rows.length;i++){
  const input=snapshot.rows[i];let row;
  try{row=publicRow(input);}catch{issues.push({row:input?.row||i+2,reason:'Missing or invalid public facts; review the source row.'});continue;}
  const key=hash([link(row.url),words(row.title)]),fingerprint=hash(row),old=matchRow(rows,row,key);
  if(old&&seen.has(old.id)){counts.duplicates++;continue;}
  const override=snapshot.overrides?.[row.title];
  if(override&&(typeof override!=='object'||Object.keys(override).some(k=>!overrideKeys.includes(k))||!override.checkedOn||!override.sourceNote||!override.sourceUrl))throw Error('Verified overrides need reviewed public fields, supporting URL, checkedOn and sourceNote.');
  if(old){
   seen.add(old.id);counts.matched++;
   if(old.sheet?.hash===fingerprint&&old.sheet.present&&!override)continue;
  }
  const source=old?(old.stream==='spreadsheet'&&!old.checkedOn?{...derived(row,key),id:old.id,cycle:old.cycle}:structuredClone(old)):derived(row,key);
  const next=catalogEntrySchema.parse({...source,...override,tags:[...new Set([...source.tags,'Spreadsheet'])],sheet:{key:old?.sheet?.key||key,hash:fingerprint,checkedAt,present:true,fields:row,...(override?{verifiedAt:checkedAt}:{})}});
  if(old){rows[rows.findIndex(o=>o.id===old.id)]=next;counts.changed++;}else{rows.push(next);seen.add(next.id);counts.added++;}
  patchRows.push(next);
 }
 // A complete read can mark a row absent, but never deletes an application or infers closure.
 if(snapshot.complete&&!issues.length)for(const old of rows){if(old.sheet?.present&&!seen.has(old.id)){const next={...old,sheet:{...old.sheet,present:false,checkedAt}};patchRows.push(next);counts.removed++;}}
 const summary=`Read ${counts.sourceRows} spreadsheet opportunities: ${counts.added} new, ${counts.matched} matched to tracked records, ${counts.changed} source records changed, ${counts.removed} no longer listed.${issues.length?' '+issues.length+' rows need review.':''}`;
 return {patch:{stream:'spreadsheet',checkedAt,outcome:issues.length?'error':'success',summary,opportunities:patchRows},report:{...counts,issues},sourceDigest:hash(snapshot.rows.map(publicSafe=>Object.fromEntries(publicKeys.map(k=>[k,publicSafe[k]||'']))).sort((a,b)=>a.title.localeCompare(b.title)))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{
  if(!process.argv[2])throw Error('Usage: node scripts/import-spreadsheet.mjs /absolute/public-snapshot.json [--publish]');
  const base=JSON.parse(await readFile('catalog.json','utf8')),snapshot=JSON.parse(await readFile(path.resolve(process.argv[2]),'utf8'));
  const result=prepareSpreadsheetPatch(base,snapshot);
  if(process.argv.includes('--publish')){let report;const publication=await publish(fresh=>{const current=prepareSpreadsheetPatch(fresh,snapshot);report=current.report;return current.patch;});console.log(JSON.stringify({report,...publication}));}
  else{const destination=path.resolve(process.argv[2]+'.patch.json');await writeFile(destination,JSON.stringify(result.patch,null,2)+'\n');console.log(JSON.stringify({report:result.report,patchPath:destination}));}
 }catch(error){console.error(error.message);process.exitCode=1;}
}
