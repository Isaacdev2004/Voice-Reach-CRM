/* Auto-converted from stitch HTML */
"use client";

export function CampaignBuilderPage() {
  return (
    <>



      <section className="mt-16 p-lg max-w-[1224px] mx-auto w-full">
      <div className="mb-lg flex items-center justify-between">
      <div>
      <h2 className="font-headline-md text-headline-md text-primary">New Voice Campaign</h2>
      <p className="font-body-md text-slate-text">Create and launch an automated outbound reach-out program.</p>
      </div>
      <div className="flex items-center gap-3">
      <button className="px-6 py-2.5 rounded-full border border-outline-variant text-primary font-label-md hover:bg-surface-container transition-colors">Save as Draft</button>
      <button className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-label-md hover:bg-ink transition-colors">Next Step</button>
      </div>
      </div>

      <nav className="flex items-center justify-between bg-surface-container-lowest rounded-2xl p-sm card-shadow mb-xl">
      <div className="flex-1 flex flex-col items-center gap-2 border-b-2 border-primary pb-3">
      <span className="font-label-md text-primary">01</span>
      <span className="font-label-md text-primary">Campaign Details</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-2 border-b-2 border-outline-variant/30 pb-3 opacity-50">
      <span className="font-label-md text-on-surface-variant">02</span>
      <span className="font-label-md text-on-surface-variant">Voice Script</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-2 border-b-2 border-outline-variant/30 pb-3 opacity-50">
      <span className="font-label-md text-on-surface-variant">03</span>
      <span className="font-label-md text-on-surface-variant">Select Contacts</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-2 border-b-2 border-outline-variant/30 pb-3 opacity-50">
      <span className="font-label-md text-on-surface-variant">04</span>
      <span className="font-label-md text-on-surface-variant">Eligibility Review</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-2 border-b-2 border-outline-variant/30 pb-3 opacity-50">
      <span className="font-label-md text-on-surface-variant">05</span>
      <span className="font-label-md text-on-surface-variant">Schedule</span>
      </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

      <div className="lg:col-span-8 space-y-md">

      <div className="bg-surface-container-lowest rounded-[24px] p-lg card-shadow">
      <div className="flex items-center gap-4 mb-lg">
      <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
      <span className="material-symbols-outlined">settings_suggest</span>
      </div>
      <h3 className="font-headline-md text-primary">Step 1: Campaign Information</h3>
      </div>
      <div className="space-y-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
      <div className="flex flex-col gap-xs">
      <label className="font-label-md text-slate-text">Campaign Name</label>
      <input className="h-14 px-6 rounded-full border border-outline-variant/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all" placeholder="e.g. Q4 Renewal Outreach" type="text" />
      </div>
      <div className="flex flex-col gap-xs">
      <label className="font-label-md text-slate-text">Campaign Type</label>
      <select className="h-14 px-6 rounded-full border border-outline-variant/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center]">
      <option>Automated Outreach</option>
      <option>Direct Response</option>
      <option>Survey / Feedback</option>
      </select>
      </div>
      </div>
      <div className="flex flex-col gap-xs">
      <label className="font-label-md text-slate-text">Description</label>
      <textarea className="p-6 rounded-[24px] border border-outline-variant/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all resize-none" placeholder="Briefly describe the objective..." rows={3}></textarea>
      </div>
      </div>
      </div>

      <div className="bg-surface-container-lowest rounded-[24px] p-lg card-shadow opacity-60">
      <div className="flex items-center justify-between mb-lg">
      <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
      <span className="material-symbols-outlined">verified_user</span>
      </div>
      <h3 className="font-headline-md text-primary">Eligibility Review</h3>
      </div>
      <span className="bg-surface-container text-on-surface-variant text-[10px] px-3 py-1 rounded-[10px] font-bold tracking-widest">PENDING</span>
      </div>
      <div className="grid grid-cols-2 gap-md">
      <div className="p-md rounded-[20px] bg-tertiary-fixed/10 border border-tertiary-fixed/20 flex flex-col items-center text-center">
      <span className="text-[32px] font-bold text-on-tertiary-container">1,402</span>
      <span className="font-label-md text-on-tertiary-container">Eligible Contacts</span>
      </div>
      <div className="p-md rounded-[20px] bg-error-container/30 border border-error-container/50 flex flex-col items-center text-center">
      <span className="text-[32px] font-bold text-error">248</span>
      <span className="font-label-md text-error">Blocked</span>
      </div>
      </div>
      </div>
      </div>

      <div className="lg:col-span-4 space-y-md">

      <div className="bg-surface-container-lowest rounded-[24px] p-lg card-shadow">
      <h4 className="font-label-md text-primary mb-sm">Active Voice Script</h4>
      <div className="bg-surface-container-low rounded-xl p-sm border border-outline-variant/20 mb-md">
      <div className="flex items-center gap-3 mb-sm">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer hover:bg-ink transition-all">
      <span className="material-symbols-outlined filled">play_arrow</span>
      </div>
      <div>
      <p className="font-label-md font-bold">Standard Welcome v2</p>
      <p className="text-caption text-slate-text">0:45 • Male Voice AI</p>
      </div>
      </div>

      <div className="h-8 flex items-end gap-[2px] px-2 opacity-40">
      <div className="w-1 h-4 bg-primary rounded-full"></div>
      <div className="w-1 h-6 bg-primary rounded-full"></div>
      <div className="w-1 h-3 bg-primary rounded-full"></div>
      <div className="w-1 h-8 bg-primary rounded-full"></div>
      <div className="w-1 h-5 bg-primary rounded-full"></div>
      <div className="w-1 h-7 bg-primary rounded-full"></div>
      <div className="w-1 h-4 bg-primary rounded-full"></div>
      <div className="w-1 h-6 bg-primary rounded-full"></div>
      <div className="w-1 h-2 bg-primary rounded-full"></div>
      <div className="w-1 h-5 bg-primary rounded-full"></div>
      <div className="w-1 h-8 bg-primary rounded-full"></div>
      <div className="w-1 h-4 bg-primary rounded-full"></div>
      <div className="w-1 h-6 bg-primary rounded-full"></div>
      <div className="w-1 h-3 bg-primary rounded-full"></div>
      <div className="w-1 h-7 bg-primary rounded-full"></div>
      </div>
      </div>
      <p className="text-caption text-slate-text italic">"Hello, this is a message regarding your recent inquiry..."</p>
      </div>

      <div className="bg-white rounded-[24px] p-lg card-shadow border border-outline-variant/10">
      <h4 className="font-label-md text-primary mb-md">Blocking Distribution</h4>
      <div className="space-y-4">
      <div>
      <div className="flex justify-between text-caption mb-1">
      <span>National DNC Registry</span>
      <span className="font-bold">142</span>
      </div>
      <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
      <div className="bg-error w-[60%] h-full"></div>
      </div>
      </div>
      <div>
      <div className="flex justify-between text-caption mb-1">
      <span>No Express Consent</span>
      <span className="font-bold">86</span>
      </div>
      <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
      <div className="bg-warning w-[35%] h-full"></div>
      </div>
      </div>
      <div>
      <div className="flex justify-between text-caption mb-1">
      <span>Invalid Phone Number</span>
      <span className="font-bold">20</span>
      </div>
      <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
      <div className="bg-outline w-[10%] h-full"></div>
      </div>
      </div>
      </div>
      </div>

      <div className="relative h-48 rounded-[24px] overflow-hidden group cursor-pointer">
      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTfT--N2SvNNDT-DEVICwNEwkQHw5P9NTcdxjRjC9AUEYYW4Z3VdL6y-yOjg5CDKmTA7Agd7YNeuS-juaWVrHCuTf8ohAGCw2au99p2YH_hWfsyReqO8_OxkisX9sitlVBLm206Nv1ohIKce2kfg8UbTg4n9IbegSXh8icuzOFXIhfL7Cx9LuhbD8EDM-TmrU_9wmvYHyegqsnXnUKob7KmGTfKng0pYc_fdrRX6Gx9eSJ72R7oCDu_lN3lCjbYmEViU5_tCz32H2z" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-container/80 to-transparent flex flex-col justify-end p-md">
      <span className="text-white font-bold font-headline-md">Enterprise Ready</span>
      <span className="text-on-primary-container/80 text-caption">Scale your reach effortlessly with VR CRM AI integration.</span>
      </div>
      </div>
      </div>
      </div>
      </section>
    </>
  );
}
