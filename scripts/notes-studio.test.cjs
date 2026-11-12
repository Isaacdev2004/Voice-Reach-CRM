const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./campaign-audit/harness.cjs');
const {readStudioPanels,studioStorageKey}=fixture().load('lib/notes/studio-layout');
test('first visit is editor-first and malformed preferences cannot open drawers',()=>{
 for(const value of [null,'','bad','{}','{"library":"true","planner":false}'])assert.deepEqual(readStudioPanels(value),{library:false,planner:false});
});
test('all independent drawer combinations round-trip, including the previous approved design preferences',()=>{
 for(const library of [true,false])for(const planner of [true,false])assert.deepEqual(readStudioPanels(JSON.stringify({library,planner})),{library,planner});
 assert.deepEqual(readStudioPanels('{"library":true,"context":false}'),{library:true,planner:false});
});
test('drawer preferences are namespaced by the authenticated account',()=>{
 assert.notEqual(studioStorageKey('owner_a'),studioStorageKey('owner_b'));assert.match(studioStorageKey('owner_a'),/owner_a$/);
});
test('every existing template remains schema-compatible in basic and advanced workspaces',()=>{
 const f=fixture(), {TEMPLATES,SaveSchema}=f.load('lib/notes/workspace'), {templateDraft}=f.load('lib/notes/template-draft'),{canSaveBasic}=f.load('lib/notes/compatibility');
 for(const t of TEMPLATES)for(const advanced of [true,false]){
  const d=templateDraft(t,advanced);
  assert.equal(SaveSchema.safeParse({id:null,clientKey:'00000000-0000-4000-8000-000000000123',expectedRevision:0,...d}).success,true);
  if(!advanced)assert.equal(canSaveBasic(d.metadata,d.kind),true);
 }
});
