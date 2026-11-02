import assert from "node:assert/strict";
import { canonicalProperty,automaticTraffic,opaque,tokenHash,validToken,ownerEnabled } from "../lib/property-interest/model";
let checks=0;function check(v:unknown){assert.ok(v);checks++;}
check(canonicalProperty("https://www.zillow.com/homedetails/Home-FL/123_zpid/?utm_source=x").propertyKey==="zillow:123");
check(!canonicalProperty("https://www.zillow.com/homedetails/123_zpid/?foo=bar").url.includes("?"));
for(const u of ["http://www.zillow.com/homedetails/123_zpid/","https://evil.test/homedetails/123_zpid/","https://zillow.com.evil.test/homedetails/123_zpid/","https://www.zillow.com/homes/","https://a:b@www.zillow.com/homedetails/123_zpid/"]){assert.throws(()=>canonicalProperty(u));checks++;}
const a=opaque(),b=opaque();check(a!==b&&validToken(a));check(tokenHash(a).length===64&&!tokenHash(a).includes(a));
for(const h of [{"user-agent":"Googlebot"},{"user-agent":"Mozilla/5.0",purpose:"prefetch"},{"user-agent":"Mozilla/5.0","sec-gpc":"1"},{}])check(automaticTraffic(new Headers(h as Record<string,string>)));
check(!automaticTraffic(new Headers({"user-agent":"Mozilla/5.0"})));
process.env.VERCEL_ENV="production";process.env.PROPERTY_INTEREST_ENABLED="true";process.env.PROPERTY_INTEREST_OWNER_IDS="owner";
check(!ownerEnabled("owner"));process.env.VERCEL_ENV="preview";check(ownerEnabled("owner"));check(!ownerEnabled("foreign"));
console.log(JSON.stringify({passed:checks}));
