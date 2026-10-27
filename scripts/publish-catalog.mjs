import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {catalogSchema,catalogEntrySchema,catalogStreamSchema} from './catalog-schema.mjs';

const repository='https://github.com/Chris-Selorm-Gadze/opportunity-desk-pages.git';
const canonical=raw=>{const u=new URL(raw);u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/.test(k))u.searchParams.delete(k);u.pathname=u.pathname.replace(/\/+$/,'')||'/';u.searchParams.sort();return u.href;};
const identity=entry=>canonical(entry.url)+'|'+entry.cycle;

export function applyCatalogPatch(base,input,now=new Date()){
 const feed=catalogSchema.parse(base);
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['stream','checkedAt','outcome','summary','opportunities'].includes(k)))throw Error('Use only public catalog patch fields.');
 if(!Array.isArray(input.opportunities))throw Error('opportunities must be an array of complete public entries.');
 const curated=input.stream==='curated';
 const prior=feed.streams.find(s=>s.id===input.stream);
 const research={checkedAt:input.checkedAt,outcome:input.outcome,summary:input.summary};
 const stream=curated?{id:'curated',...catalogStreamSchema.omit({id:true,label:true}).parse(research)}:catalogStreamSchema.parse({id:input.stream,label:prior?.label||(input.stream==='travel'?'Sponsored travel & leadership':input.stream==='internships'?'Internships':input.stream==='spreadsheet'?'Connected spreadsheet':'Trading & finance'),...research});
 if(Date.parse(stream.checkedAt)>now.getTime()+300000)throw Error('Research timestamp is in the future.');
 if(prior&&Date.parse(stream.checkedAt)<Date.parse(prior.checkedAt))throw Error('A newer research run is already published. Review it before retrying.');
 const entries=input.opportunities.map(o=>catalogEntrySchema.parse(o));
 if(curated&&entries.some(o=>o.checkedOn!==stream.checkedAt.slice(0,10)))throw Error('Curated entries need the actual review date.');
 if(new Set(entries.map(o=>o.id)).size!==entries.length||new Set(entries.map(identity)).size!==entries.length)throw Error('Duplicate patch entries.');
 const rows=structuredClone(feed.opportunities);let added=0,updated=0;
 for(const entry of entries){
  const match=rows.findIndex(o=>o.id===entry.id||identity(o)===identity(entry));
  if(match<0){if(entry.stream!==(curated?'original':stream.id))throw Error('New entries must belong to this research stream.');if(curated&&entry.sheet)throw Error('Curated additions cannot invent spreadsheet provenance.');rows.push(entry);added++;}
  else{
   const old=rows[match];if(old.cycle!==entry.cycle)throw Error('A new application cycle requires a new ID.');
   if(curated&&entry.sheet&&!old.sheet)throw Error('Curated research cannot invent spreadsheet provenance.');
   if(!curated&&old.stream!==stream.id&&old.stream!=='original'&&stream.id!=='spreadsheet')throw Error('Preserve the other research stream’s entries.');
   const metadataOnly=stream.id==='spreadsheet'&&old.stream!=='spreadsheet'&&entry.sheet?.verifiedAt!==stream.checkedAt;
   if(!metadataOnly&&entry.checkedOn<old.checkedOn)throw Error('Refusing to replace newer source research.');
   const next=metadataOnly?{...old,tags:[...new Set([...old.tags,'Spreadsheet'])],sheet:entry.sheet}:{...entry,id:old.id,stream:old.stream,...(stream.id!=='spreadsheet'&&old.sheet?{sheet:old.sheet}:{})};if(JSON.stringify(next)!==JSON.stringify(old))updated++;
   rows[match]=next;
  }
 }
 if(new Set(rows.map(identity)).size!==rows.length)throw Error('Duplicate opportunity URL and cycle.');
 const result=catalogSchema.parse({...feed,revision:feed.revision+1,updatedAt:now.toISOString(),streams:curated?feed.streams:[...feed.streams.filter(s=>s.id!==stream.id),stream].sort((a,b)=>a.id.localeCompare(b.id)),opportunities:rows});
 return {catalog:result,added,updated};
}

function git(cwd,args){
 const result=spawnSync('git',args,{cwd,encoding:'utf8',timeout:120000,maxBuffer:4000000});
 if(result.error||result.status!==0)throw Error('Git '+args[0]+' failed: '+(result.stderr||result.error?.message||'unknown failure').slice(0,1500));
 return result.stdout.trim();
}

export async function publish(inputOrFactory,{dryRun=false}={}){
 let lastError;
 for(let attempt=1;attempt<=3;attempt++){
  const temporary=await mkdtemp(path.join(tmpdir(),'opportunity-catalog-'));
  try{
   // Each attempt uses a fresh, owned clone. Unfinished user work is never touched.
   git(temporary,['clone','--depth','1','--single-branch','--branch','main',repository,'repo']);
   const checkout=path.join(temporary,'repo');
   const base=JSON.parse(await readFile(path.join(checkout,'catalog.json'),'utf8'));
   const input=typeof inputOrFactory==='function'?await inputOrFactory(base):inputOrFactory;
   const result=applyCatalogPatch(base,input);
   if(dryRun)return {dryRun:true,revision:result.catalog.revision,added:result.added,updated:result.updated,count:result.catalog.opportunities.length};
   await writeFile(path.join(checkout,'catalog.json'),JSON.stringify(result.catalog,null,2)+'\n');
   git(checkout,['config','user.name','Opportunity Desk']);
   git(checkout,['config','user.email','182828739+Chris-Selorm-Gadze@users.noreply.github.com']);
   git(checkout,['add','--','catalog.json']);
   git(checkout,['commit','-m','Update '+input.stream+' opportunity research']);
   const commit=git(checkout,['rev-parse','HEAD']);
   // Existing Git credential-helper access handles authentication. No tokens here.
   git(checkout,['push','origin','HEAD:main']);
   git(checkout,['fetch','--depth','1','origin','main']);
   const persisted=catalogSchema.parse(JSON.parse(git(checkout,['show','FETCH_HEAD:catalog.json'])));
   const stream=persisted.streams.find(s=>s.id===input.stream);
   const confirmed=input.stream==='curated'?input.opportunities.every(entry=>{const expected=result.catalog.opportunities.find(o=>o.id===entry.id||identity(o)===identity(entry));return expected&&persisted.opportunities.some(o=>JSON.stringify(o)===JSON.stringify(expected));}):stream&&Date.parse(stream.checkedAt)>=Date.parse(input.checkedAt);
   if(persisted.revision<result.catalog.revision||!confirmed)throw Error('Remote readback did not confirm the published research.');
   return {commit,revision:persisted.revision,added:result.added,updated:result.updated,count:persisted.opportunities.length,stream:input.stream,publishedToRepository:true,pagesDeployment:'queued',url:'https://chris-selorm-gadze.github.io/opportunity-desk-pages/'};
  }catch(error){lastError=error;if(!/push failed/.test(error.message)||attempt===3)throw error;}
  finally{await rm(temporary,{recursive:true,force:true});}
 }
 throw lastError;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{if(!process.argv[2])throw Error('Usage: node scripts/publish-catalog.mjs /absolute/public-update.json [--dry-run]');const input=JSON.parse(await readFile(path.resolve(process.argv[2]),'utf8'));console.log(JSON.stringify(await publish(input,{dryRun:process.argv.includes('--dry-run')})));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
