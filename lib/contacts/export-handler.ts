import { ExportRequest, ExportError, selectExportContacts, exportFingerprint, csvStream } from "./export";
import type { OwnedContact } from "./read-snapshot";
type Dependencies={requireOwnerId:()=>Promise<string>;readContacts:(owner:string)=>Promise<OwnedContact[]>;now?:()=>Date};
const headers={"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Vary":"Cookie, Authorization"};
function failure(error:string,status:number){return Response.json({success:false,error},{status,headers});}
export function createContactExportHandler(deps:Dependencies){
 return async(request:Request)=>{
  try{
   const owner=await deps.requireOwnerId();
   if(!owner)throw new Error("Unauthorized");
   const origin=request.headers.get("origin");
   if((origin&&origin!==new URL(request.url).origin)||request.headers.get("sec-fetch-site")==="cross-site")return failure("Export must be requested from your MyARI workspace.",403);
   if(!request.headers.get("content-type")?.startsWith("application/json"))return failure("Invalid export request.",400);
   if(Number(request.headers.get("content-length")||0)>2500000)return failure("Choose fewer selected contacts, or export all contacts.",413);
   const raw=await request.text();
   if(Buffer.byteLength(raw,"utf8")>2500000)return failure("Choose fewer selected contacts, or export all contacts.",413);
   const parsed=ExportRequest.safeParse(JSON.parse(raw));
   if(!parsed.success)return failure("Check your export options and select contacts again.",400);
   const input=parsed.data;
   const all=await deps.readContacts(owner);
   if(all.some(row=>row.owner_id!==owner))return failure("Unable to verify your complete contact export. Please retry.",503);
   const rows=selectExportContacts(all,input.selection,(deps.now?.()??new Date()).getTime());
   const fingerprint=exportFingerprint(owner,rows);
   if(input.action==="preview")return Response.json({success:true,count:rows.length,fingerprint},{headers});
   if(!rows.length)return failure("No contacts match this export. Adjust your filters or add contacts.",422);
   if(input.expectedCount!==rows.length||input.fingerprint!==fingerprint)return failure("Your contacts changed since the count was shown. Refresh the export count and confirm again.",409);
   const date=(deps.now?.()??new Date()).toISOString().slice(0,10);
   return new Response(csvStream(rows),{headers:{...headers,"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="myari-contacts-'+date+'.csv"',"X-Export-Count":String(rows.length)}});
  }catch(e){
   if(e instanceof ExportError)return failure(e.message,e.status);
   if(e instanceof Error&&e.message==="Unauthorized")return failure("Sign in to export your contacts.",401);
   if(e instanceof SyntaxError)return failure("Invalid export request.",400);
   // Never log contact rows, filter values, CSV content or underlying database errors.
   return failure("Contact export could not be completed. Your contacts are unchanged; please retry.",503);
  }
 };
}
