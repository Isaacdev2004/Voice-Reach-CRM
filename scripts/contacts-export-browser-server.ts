import http from "node:http";
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from "node:fs";
import {build} from "esbuild";
import {createContactExportHandler} from "../lib/contacts/export-handler";
import type {OwnedContact} from "../lib/contacts/read-snapshot";
async function main(){
const id=(n:number)=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
const contacts:OwnedContact[]=[
{id:id(1),owner_id:"synthetic-agent-a",first_name:"Zoë",last_name:"García",email:"zoe@example.test",phone:"00123456789",type:"Active Lead",source:"Referral",category:"Residential",dnc:false},
{id:id(2),owner_id:"synthetic-agent-a",first_name:"李",last_name:"明",email:null,phone:"0000123",type:"Cold Lead",source:"Web",category:"Residential",dnc:false},
{id:id(3),owner_id:"synthetic-agent-a",first_name:"Amira",last_name:"Hassan",email:"amira@example.test",phone:"",type:"Past Client",source:"Referral",category:"Commercial",dnc:false},
];
const handler=createContactExportHandler({requireOwnerId:async()=>"synthetic-agent-a",readContacts:async owner=>contacts.filter(c=>c.owner_id===owner),now:()=>new Date("2026-11-02T12:00:00Z")});
mkdirSync("/tmp/csv-ui",{recursive:true});
const entry=`import React from "react";import {createRoot} from "react-dom/client";import {ContactPageActions} from "${process.cwd()}/components/crm/contact-page-actions";
createRoot(document.getElementById("root")).render(<main style={{padding:"clamp(16px,4vw,48px)",fontFamily:"Arial,sans-serif",color:"#42372c",minHeight:"100vh",background:"#faf7f1"}}><p style={{fontSize:12,color:"#75695a"}}>Synthetic browser acceptance fixture · Actual Contacts export components</p><h1 style={{fontFamily:"Georgia,serif",fontSize:36,margin:"20px 0"}}>Your relationships, elevated.</h1><ContactPageActions variant="compact" exportContext={{filters:{q:"",search:"",segment:"active-lead",category:"all",type:"all",source:"all",compliance:"all",activity:"all",sort:"name-asc"},selectedIds:["${id(1)}"]}}/><section style={{marginTop:32,padding:24,border:"1px solid #e8ddce",borderRadius:20,background:"white"}}><h2 style={{fontFamily:"Georgia,serif",fontSize:24}}>Contacts · 3 synthetic records</h2><p>Zoë García · 李 明 · Amira Hassan</p></section></main>);`;
writeFileSync("/tmp/csv-ui/entry.tsx",entry);
await build({entryPoints:["/tmp/csv-ui/entry.tsx"],outfile:"/tmp/csv-ui/app.js",bundle:true,jsx:"automatic",platform:"browser",nodePaths:[process.cwd()+"/node_modules"],tsconfig:process.cwd()+"/tsconfig.json",plugins:[{name:"synthetic-router",setup(b){b.onResolve({filter:/^next\/navigation$/},()=>({path:"router",namespace:"fixture"}));b.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:"export const useRouter=()=>({push(){},refresh(){}});",loader:"js"}));}}]});
http.createServer(async(req,res)=>{
 if(req.url==="/app.js"){res.setHeader("Content-Type","text/javascript");res.end(readFileSync("/tmp/csv-ui/app.js"));return;}
 if(req.url==="/style.css"){res.setHeader("Content-Type","text/css");let css="";try{for(const name of readdirSync(".next/static/css"))css+=readFileSync(".next/static/css/"+name,"utf8");}catch{}res.end(css);return;}
 if(req.url==="/api/contacts/export"){
 const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
 const request=new Request("http://127.0.0.1:3333/api/contacts/export",{method:"POST",headers:req.headers as Record<string,string>,body:Buffer.concat(chunks)});
 const result=await handler(request);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
 }
 res.setHeader("Content-Type","text/html");res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="/style.css"/><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined&display=swap" rel="stylesheet"/><style>body{font-family:Inter,Arial,sans-serif}.material-symbols-outlined{font-family:"Material Symbols Outlined";font-weight:normal;font-style:normal;font-feature-settings:"liga"}</style></head><body class="font-sans antialiased"><div id="root"></div><script src="/app.js"></script></body></html>');
}).listen(3333,"127.0.0.1",()=>console.log("CSV_BROWSER_FIXTURE_READY"));

}
void main();
