/* Auto-converted from stitch HTML */
"use client";

export function AutomationWorkflowsPage() {
  return (
    <>



      <div className="flex-1 overflow-hidden relative bg-background workflow-canvas">

      <div className="absolute bottom-10 right-10 flex flex-col gap-2 z-20">
      <button className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
      <span className="material-symbols-outlined">add</span>
      </button>
      <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-xs font-bold">100%</div>
      <button className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
      <span className="material-symbols-outlined">remove</span>
      </button>
      <button className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors mt-2">
      <span className="material-symbols-outlined">center_focus_strong</span>
      </button>
      </div>

      <div className="h-full w-full flex flex-col items-center space-y-16 overflow-auto">

      <div className="relative z-10">
      <div className="bg-white p-6 rounded-2xl shadow-[0px_20px_40px_-12px_rgba(0,0,0,0.08)] border border-orange-200 w-72 transition-transform hover:scale-105">
      <div className="flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
      <span className="material-symbols-outlined text-xl">person_add</span>
      </span>
      <span className="text-xs font-extrabold uppercase tracking-tighter text-orange-600">Trigger</span>
      </div>
      <h4 className="font-bold text-on-surface">New Contact Upload</h4>
      <p className="text-sm text-on-surface-variant mt-1">Source: Main Website Form</p>
      <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-between items-center">
      <span className="text-[10px] text-on-surface-variant">Last activity: 2m ago</span>
      <span className="material-symbols-outlined text-sm text-on-surface-variant cursor-pointer">settings</span>
      </div>
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 h-16 w-px node-connector"></div>
      </div>

      <div className="relative z-10">
      <div className="bg-white p-6 rounded-2xl shadow-[0px_20px_40px_-12px_rgba(0,0,0,0.08)] border border-indigo-200 w-72 transition-transform hover:scale-105">
      <div className="flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
      <span className="material-symbols-outlined text-xl">voicemail</span>
      </span>
      <span className="text-xs font-extrabold uppercase tracking-tighter text-indigo-600">Action</span>
      </div>
      <h4 className="font-bold text-on-surface">Send Ringless Voicemail</h4>
      <p className="text-sm text-on-surface-variant mt-1">File: Welcome_Message_v2.mp3</p>
      <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-between items-center">
      <span className="text-[10px] text-on-surface-variant">Retry enabled (3x)</span>
      <span className="material-symbols-outlined text-sm text-on-surface-variant cursor-pointer">settings</span>
      </div>
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 h-16 w-px node-connector"></div>
      </div>

      <div className="relative z-10">
      <div className="bg-white p-6 rounded-2xl shadow-[0px_20px_40px_-12px_rgba(0,0,0,0.08)] border border-purple-200 w-72 transition-transform hover:scale-105">
      <div className="flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
      <span className="material-symbols-outlined text-xl">schedule</span>
      </span>
      <span className="text-xs font-extrabold uppercase tracking-tighter text-purple-600">Delay</span>
      </div>
      <h4 className="font-bold text-on-surface">Wait 24 Hours</h4>
      <p className="text-sm text-on-surface-variant mt-1">Until: Next business day</p>
      <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-between items-center">
      <span className="text-[10px] text-on-surface-variant">Timezone: UTC-5</span>
      <span className="material-symbols-outlined text-sm text-on-surface-variant cursor-pointer">settings</span>
      </div>
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 h-16 w-px node-connector"></div>
      </div>

      <div className="relative z-10">
      <div className="bg-white p-6 rounded-2xl shadow-[0px_20px_40px_-12px_rgba(0,0,0,0.08)] border border-pink-200 w-72 transition-transform hover:scale-105">
      <div className="flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
      <span className="material-symbols-outlined text-xl">call_split</span>
      </span>
      <span className="text-xs font-extrabold uppercase tracking-tighter text-pink-600">Decision</span>
      </div>
      <h4 className="font-bold text-on-surface">If No Response?</h4>
      <p className="text-sm text-on-surface-variant mt-1">Check: Last 24 hours activity</p>
      </div>

      <div className="absolute top-full left-1/2 -translate-x-1/2 w-[400px] flex justify-between mt-16 px-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-px bg-outline-variant/30"></div>
      <div className="absolute top-0 left-4 w-px h-16 node-connector"></div>
      <div className="absolute top-0 right-4 w-px h-16 node-connector"></div>

      <div className="w-44 bg-white p-4 rounded-xl border border-emerald-100 shadow-md">
      <div className="flex items-center gap-2 mb-2">
      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
      <span className="text-[10px] font-bold text-emerald-600 uppercase">Yes / Success</span>
      </div>
      <p className="text-xs font-bold">End Workflow</p>
      </div>

      <div className="w-44 bg-white p-4 rounded-xl border border-danger/20 shadow-md">
      <div className="flex items-center gap-2 mb-2">
      <span className="w-2 h-2 rounded-full bg-danger"></span>
      <span className="text-[10px] font-bold text-danger uppercase">No / Fail</span>
      </div>
      <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-sm text-emerald-600">sms</span>
      <p className="text-xs font-bold">Send SMS</p>
      </div>
      </div>
      </div>
      </div>

      <div className="py-20">
      <button className="w-10 h-10 rounded-full border-2 border-dashed border-outline-variant hover:border-secondary hover:text-secondary flex items-center justify-center transition-all group">
      <span className="material-symbols-outlined">add</span>
      </button>
      </div>
      </div>
      </div>

    </>
  );
}
