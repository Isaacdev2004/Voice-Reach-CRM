import React from 'react';
export const usePathname = () => location.pathname;
const nativeReplace=history.replaceState.bind(history);
history.replaceState=(...args)=>{nativeReplace(...args);window.dispatchEvent(new Event('review:navigation'));};
const navigate=(url,replace)=>{history[replace?'replaceState':'pushState']({},'',url);window.dispatchEvent(new Event('review:navigation'));};
const reviewRouter={push:(url)=>navigate(url,false),replace:(url)=>navigate(url,true),refresh:()=>{}};
export const useRouter=()=>reviewRouter;
export const useSearchParams=()=>{
 const query=React.useSyncExternalStore(callback=>{window.addEventListener('review:navigation',callback);window.addEventListener('popstate',callback);return()=>{window.removeEventListener('review:navigation',callback);window.removeEventListener('popstate',callback)}},()=>location.search);
 return React.useMemo(()=>new URLSearchParams(query),[query]);
};
const user = {firstName:'Alex',lastName:'Morgan',fullName:'Alex Morgan',primaryEmailAddress:{emailAddress:'review@example.test'},emailAddresses:[], imageUrl:'',update:async()=>{}};
export const useUser = () => {
 const [,rerender]=React.useState(0);
 React.useEffect(()=>{const changed=()=>rerender(v=>v+1);window.addEventListener('review:auth',changed);return()=>window.removeEventListener('review:auth',changed)},[]);
 return {user:{...user,id:window.__owner || 'owner_a'},isLoaded:true,isSignedIn:true};
};
export const useClerk = () => ({signOut:async()=>{},openUserProfile:()=>{window.__securityOpened=true}});
