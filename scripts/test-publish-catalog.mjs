import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyCatalogPatch} from './publish-catalog.mjs';

const base=JSON.parse(await readFile(new URL('../catalog.json',import.meta.url),'utf8'));
const now=new Date('2026-10-27T23:59:00.000Z');
const patch=opportunities=>({stream:'curated',checkedAt:now.toISOString(),outcome:'success',summary:'Reviewed public scholarship sources.',opportunities});
const fresh=()=>{const {sheet,...facts}=base.opportunities[0];return {...facts,id:'curated-fixture-2027',url:'https://example.org/curated-fixture-2027',cycle:'2027 fixture',stream:'original',checkedOn:'2026-10-27'};};

test('curated additions preserve every feed and existing record',()=>{
 const before=structuredClone(base);
 const result=applyCatalogPatch(base,patch([fresh()]),now);
 assert.equal(result.added,1);
 assert.equal(result.updated,0);
 assert.deepEqual(result.catalog.streams,base.streams);
 assert.deepEqual(result.catalog.opportunities.slice(0,-1),base.opportunities);
 assert.equal(result.catalog.revision,base.revision+1);
 assert.deepEqual(base,before);
});

test('curated verified corrections preserve ownership and sheet provenance',()=>{
 const old=base.opportunities.find(o=>o.sheet);
 const correction={...old,summary:'Organizer-verified public correction.',checkedOn:'2026-10-27',stream:'original'};
 delete correction.sheet;
 const result=applyCatalogPatch(base,patch([correction]),now);
 const saved=result.catalog.opportunities.find(o=>o.id===old.id);
 assert.equal(result.updated,1);
 assert.equal(saved.summary,correction.summary);
 assert.equal(saved.stream,old.stream);
 assert.deepEqual(saved.sheet,old.sheet);
 assert.deepEqual(result.catalog.streams,base.streams);
});

test('curated mode rejects false ownership, provenance, private fields and review dates',()=>{
 assert.throws(()=>applyCatalogPatch(base,patch([{...fresh(),stream:'internships'}]),now));
 assert.throws(()=>applyCatalogPatch(base,patch([{...fresh(),sheet:base.opportunities.find(o=>o.sheet).sheet}]),now));
 assert.throws(()=>applyCatalogPatch(base,patch([{...fresh(),notes:'private'}]),now));
 assert.throws(()=>applyCatalogPatch(base,patch([{...fresh(),checkedOn:'2026-10-26'}]),now));
 assert.throws(()=>applyCatalogPatch(base,{...patch([]),checkedAt:'2026-10-28T01:00:00.000Z'},now));
});

test('cycle, stale research and duplicate guards remain active',()=>{
 const old=base.opportunities[0];
 assert.throws(()=>applyCatalogPatch(base,patch([{...old,cycle:'another cycle',checkedOn:'2026-10-27'}]),now));
 const newer=structuredClone(base);newer.opportunities[0].checkedOn='2026-10-28';
 assert.throws(()=>applyCatalogPatch(newer,patch([{...old,checkedOn:'2026-10-27'}]),now));
 assert.throws(()=>applyCatalogPatch(base,patch([fresh(),fresh()]),now));
});

test('ordinary discovery still advances only its own feed and cannot edit other feeds',()=>{
 const stream='internships';
 const entry={...fresh(),stream};
 const input={...patch([entry]),stream};
 const result=applyCatalogPatch(base,input,now);
 assert.equal(result.catalog.streams.find(s=>s.id===stream).checkedAt,now.toISOString());
 for(const prior of base.streams.filter(s=>s.id!==stream))assert.deepEqual(result.catalog.streams.find(s=>s.id===prior.id),prior);
 const sheet=base.opportunities.find(o=>o.stream==='spreadsheet');
 assert.throws(()=>applyCatalogPatch(base,{...input,opportunities:[{...sheet,checkedOn:'2026-10-27'}]},now));
});
