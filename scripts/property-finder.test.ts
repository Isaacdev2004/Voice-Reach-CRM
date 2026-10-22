import assert from "node:assert/strict";
import test from "node:test";
import { propertyBudget, savedPropertyCriteria, rememberPropertyClient, restoredPropertyClient } from "../lib/property-finder/criteria";
import { changedPropertyPreferences, parsePropertyPreferences, propertyPreferenceDraft, savedPropertyPreferenceLabels } from "../lib/property-finder/preferences";
import { PatchContactSchema } from "../lib/contacts/schemas";
import { zillowSearchUrl } from "../lib/property-finder/zillow";
import { PROPERTY_FINDER_ACTION_CARDS } from "../lib/property-finder/home-ui";
import type { ApiContact } from "../lib/hooks/use-contacts";

const contact = {id:"00000000-0000-4000-8000-000000000001",owner_id:"a",first_name:"Owned",phone:"+15555550101",preferred_area:" Winter Park, FL ",budget:"850000"} satisfies ApiContact & {owner_id:string};

test("existing Zillow paths support location/price only, safely encoding area without adding pretend filters",()=>{
  assert.equal(zillowSearchUrl({area:"Winter Park, FL",budget:850000}),"https://www.zillow.com/homes/for_sale/winter-park-fl/0-850000_price/");
  assert.equal(zillowSearchUrl({area:"",budget:null}),"https://www.zillow.com/homes/for_sale/");
  assert.equal(zillowSearchUrl({area:"123 Main Street 32789",budget:650000.2}),"https://www.zillow.com/homes/for_sale/123-main-street-32789/0-650000_price/");
  assert.ok(zillowSearchUrl({area:"https://malicious.test/?x=1"}).startsWith("https://www.zillow.com/homes/for_sale/"));
});

test("budget parsing preserves blanks and valid values; rejects invalid and negative data",()=>{
  assert.deepEqual(propertyBudget(""),{value:null,error:null});assert.equal(propertyBudget("850,000").value,850000);
  for(const value of ["-1","0","abc","Infinity"]){assert.ok(propertyBudget(value).error);assert.equal(propertyBudget(value).value,null);}
});

test("saved criteria derive only from actual fields, including preferences-only searches and valid zero values",()=>{
  const saved=savedPropertyCriteria(contact);assert.equal(saved.area,"Winter Park, FL");assert.equal(saved.budget,850000);assert.equal(saved.hasCriteria,true);
  assert.equal(savedPropertyCriteria({}).hasCriteria,false);
  assert.equal(savedPropertyCriteria({budget:-1}).hasCriteria,false);
  assert.equal(savedPropertyCriteria({preferred_beds:0}).hasCriteria,true);
  assert.deepEqual(savedPropertyPreferenceLabels({preferred_beds:0,preferred_garage_spaces:0}),["0 beds","0 garage spaces"]);
  assert.deepEqual(savedPropertyPreferenceLabels({}),[]);
});

test("optional fields validate, preserve omitted data and clear only explicitly edited preferences",()=>{
  const empty=propertyPreferenceDraft();assert.ok(Object.values(empty).every(value=>value===""));
  assert.ok(Object.values(parsePropertyPreferences(empty).data!).every(value=>value===null));
  const draft={...empty,squareFeet:"1,800",beds:"3",baths:"2.5",garageSpaces:"0",lotSquareFeet:"5000",propertyType:"Condo"};
  const parsed=parsePropertyPreferences(draft);assert.equal(parsed.error,null);assert.equal(parsed.data?.squareFeet,1800);assert.equal(parsed.data?.garageSpaces,0);
  assert.equal(parsePropertyPreferences({...draft,beds:"2.5"}).data,null);assert.equal(parsePropertyPreferences({...draft,baths:"-1"}).data,null);
  assert.equal(parsePropertyPreferences({...draft,lotSquareFeet:"0"}).data,null);
  assert.deepEqual(changedPropertyPreferences(contact,empty),{},"old area/budget-only saves require no new columns");
  assert.deepEqual(changedPropertyPreferences({...contact,preferred_beds:3},empty),{beds:null});
  assert.deepEqual(PatchContactSchema.parse({preferredArea:"Orlando",budget:500000}),{preferredArea:"Orlando",budget:500000});
  assert.equal(PatchContactSchema.safeParse({propertyPreferences:{beds:3,owner_id:"foreign"}}).success,false);
});

test("returning client context is isolated by authenticated owner and checked against current records",()=>{
  const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  rememberPropertyClient(storage,"a",contact.id);assert.equal(restoredPropertyClient(storage,"a",[contact])?.id,contact.id);
  assert.equal(restoredPropertyClient(storage,"b",[contact]),null);
  assert.equal(restoredPropertyClient(storage,"a",[]),null);
  values.set("myari:property-client:v1:b",contact.id);assert.equal(restoredPropertyClient(storage,"b",[contact]),null);
});

test("quick action destinations and campaign routes are preserved without unsupported client query context",()=>{
  assert.deepEqual(PROPERTY_FINDER_ACTION_CARDS.map(card=>card.href),["#client-workspace","#saved-searches","/dashboard/activity","/dashboard/campaigns#campaign-builder"]);
});
