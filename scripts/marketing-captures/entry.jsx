import React,{useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {DashboardShell} from '../../components/layout/dashboard-shell';
import {VoiceScriptsStudioPage} from '../../components/pages/stitch/VoiceScriptsStudioPage';
import {AdvancedAnalyticsPage} from '../../components/pages/stitch/AdvancedAnalyticsPage';
import {useAiAssistant} from '../../components/ai/ai-assistant-context';
window.__owner='owner_a';
function OpenAssistant(){const {openAssistant}=useAiAssistant();useEffect(()=>{openAssistant({task:'email_writer',context:{contactName:'Morgan Reed',tone:'professional',goal:'Follow up after a buyer consultation'},brief:'Draft a warm follow-up after a buyer consultation. Ask Morgan which neighborhoods they would like to explore. Do not assume a budget or timeline.'})},[openAssistant]);return null;}
createRoot(document.getElementById('root')).render(<DashboardShell>{location.pathname.endsWith('/analytics')?<AdvancedAnalyticsPage/>:<><VoiceScriptsStudioPage/>{location.pathname.endsWith('/assistant')?<OpenAssistant/>:null}</>}</DashboardShell>);
