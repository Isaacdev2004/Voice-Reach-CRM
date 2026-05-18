/* Auto-converted from stitch HTML */
"use client";

export function ContactManagementPage() {
  return (
    <>



      <div className="p-8 max-w-[1400px] w-full mx-auto space-y-8">

      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
      <div>
      <h2 className="text-headline-lg font-headline-lg text-ink tracking-tight">Contact Directory</h2>
      <p className="text-body-lg font-body-lg text-slate-text mt-2">Manage your leads and automated outreach sequences.</p>
      </div>
      <div className="flex gap-4">
      <button className="px-6 h-12 flex items-center gap-2 rounded-full border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors text-label-md font-label-md text-ink">
      <span className="material-symbols-outlined text-[20px]">upload</span>
                              Import CSV
                          </button>
      <button className="px-6 h-12 flex items-center gap-2 rounded-full bg-primary text-on-primary hover:bg-secondary transition-all shadow-md active:scale-95 text-label-md font-label-md">
      <span className="material-symbols-outlined text-[20px]">person_add</span>
                              Add Contact
                          </button>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-[24px] custom-shadow border border-white/40">
      <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-2xl bg-secondary/10 text-secondary">
      <span className="material-symbols-outlined">group</span>
      </div>
      <span className="text-on-tertiary-container text-[10px] font-bold uppercase bg-tertiary-fixed px-2 py-1 rounded-[10px]">+12.5%</span>
      </div>
      <p className="text-label-md font-label-md text-slate-text">Total Contacts</p>
      <h3 className="text-headline-md font-headline-md text-ink mt-1">24,512</h3>
      </div>
      <div className="bg-white p-6 rounded-[24px] custom-shadow border border-white/40">
      <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-2xl bg-on-tertiary-container/10 text-on-tertiary-container">
      <span className="material-symbols-outlined">verified_user</span>
      </div>
      <span className="text-on-tertiary-container text-[10px] font-bold uppercase bg-tertiary-fixed px-2 py-1 rounded-[10px]">98% Healthy</span>
      </div>
      <p className="text-label-md font-label-md text-slate-text">Consent Validated</p>
      <h3 className="text-headline-md font-headline-md text-ink mt-1">21,804</h3>
      </div>
      <div className="bg-white p-6 rounded-[24px] custom-shadow border border-white/40">
      <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-2xl bg-warning/10 text-warning">
      <span className="material-symbols-outlined">do_not_disturb_on</span>
      </div>
      </div>
      <p className="text-label-md font-label-md text-slate-text">DNC Registered</p>
      <h3 className="text-headline-md font-headline-md text-ink mt-1">1,402</h3>
      </div>
      <div className="bg-white p-6 rounded-[24px] custom-shadow border border-white/40">
      <div className="flex justify-between items-start mb-4">
      <div className="p-3 rounded-2xl bg-info/10 text-info">
      <span className="material-symbols-outlined">bolt</span>
      </div>
      </div>
      <p className="text-label-md font-label-md text-slate-text">Active Sequences</p>
      <h3 className="text-headline-md font-headline-md text-ink mt-1">428</h3>
      </div>
      </div>

      <div className="bg-white rounded-[24px] custom-shadow border border-white/40 overflow-hidden">

      <div className="p-6 border-b border-outline-variant flex flex-wrap gap-4 items-center justify-between">
      <div className="flex flex-wrap gap-3">
      <div className="relative min-w-[200px]">
      <select className="w-full h-11 pl-4 pr-10 rounded-full border border-outline-variant bg-surface text-label-md font-label-md appearance-none focus:ring-2 focus:ring-secondary/20 outline-none">
      <option>Consent Status: All</option>
      <option>Opt-In (Green)</option>
      <option>Pending (Yellow)</option>
      <option>Opt-Out (Red)</option>
      </select>
      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-text">expand_more</span>
      </div>
      <div className="relative min-w-[200px]">
      <select className="w-full h-11 pl-4 pr-10 rounded-full border border-outline-variant bg-surface text-label-md font-label-md appearance-none focus:ring-2 focus:ring-secondary/20 outline-none">
      <option>Lead Source: All</option>
      <option>Direct Website</option>
      <option>Referral</option>
      <option>Social Media</option>
      <option>External API</option>
      </select>
      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-text">expand_more</span>
      </div>
      <button className="h-11 px-5 rounded-full bg-surface-container-low border border-outline-variant text-label-md font-label-md text-slate-text flex items-center gap-2 hover:bg-surface-variant/20 transition-colors">
      <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                                  More Filters
                              </button>
      </div>
      <div className="flex items-center gap-2">
      <span className="text-caption font-caption text-slate-text mr-2">Showing 1-10 of 24,512</span>
      <div className="flex gap-1">
      <button className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface-container-low transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
      <button className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant bg-secondary text-on-secondary"><span className="text-label-md font-label-md">1</span></button>
      <button className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface-container-low transition-colors"><span className="text-label-md font-label-md">2</span></button>
      <button className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant hover:bg-surface-container-low transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
      </div>
      </div>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
      <thead>
      <tr className="bg-surface-container-low border-b border-outline-variant">
      <th className="px-6 py-4"><input className="rounded border-outline-variant text-secondary focus:ring-secondary" type="checkbox" /></th>
      <th className="px-6 py-4 text-label-md font-label-md text-slate-text uppercase tracking-wider">Name</th>
      <th className="px-6 py-4 text-label-md font-label-md text-slate-text uppercase tracking-wider">Phone</th>
      <th className="px-6 py-4 text-label-md font-label-md text-slate-text uppercase tracking-wider">Lead Source</th>
      <th className="px-6 py-4 text-label-md font-label-md text-slate-text uppercase tracking-wider">Consent Status</th>
      <th className="px-6 py-4 text-label-md font-label-md text-slate-text uppercase tracking-wider">DNC Status</th>
      <th className="px-6 py-4 text-label-md font-label-md text-slate-text uppercase tracking-wider">Last Activity</th>
      <th className="px-6 py-4 text-label-md font-label-md text-slate-text uppercase tracking-wider"></th>
      </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/50">

      <tr className="hover:bg-surface-container-lowest transition-colors group">
      <td className="px-6 py-5"><input className="rounded border-outline-variant text-secondary focus:ring-secondary" type="checkbox" /></td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-primary-container text-primary-fixed flex items-center justify-center font-bold text-xs">JM</div>
      <div>
      <p className="text-body-md font-bold text-ink">Jordan Michaels</p>
      <p className="text-caption font-caption text-slate-text">j.michaels@example.com</p>
      </div>
      </div>
      </td>
      <td className="px-6 py-5 text-body-md font-body-md text-ink">+1 (555) 234-8901</td>
      <td className="px-6 py-5">
      <span className="text-caption font-caption text-slate-text px-3 py-1 bg-surface-container rounded-full">Web Form</span>
      </td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-2 text-on-tertiary-container bg-tertiary-fixed/30 px-3 py-1 rounded-[10px] w-fit">
      <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
      <span className="text-[10px] font-bold uppercase">OPT-IN</span>
      </div>
      </td>
      <td className="px-6 py-5">
      <span className="text-caption font-caption text-on-surface-variant">Clear</span>
      </td>
      <td className="px-6 py-5">
      <p className="text-body-md font-body-md text-ink">Call Answered</p>
      <p className="text-caption font-caption text-slate-text">2 hours ago</p>
      </td>
      <td className="px-6 py-5 text-right">
      <button className="p-2 rounded-full hover:bg-surface-container text-slate-text transition-colors">
      <span className="material-symbols-outlined">more_vert</span>
      </button>
      </td>
      </tr>

      <tr className="hover:bg-surface-container-lowest transition-colors group">
      <td className="px-6 py-5"><input className="rounded border-outline-variant text-secondary focus:ring-secondary" type="checkbox" /></td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">SK</div>
      <div>
      <p className="text-body-md font-bold text-ink">Sarah Koenig</p>
      <p className="text-caption font-caption text-slate-text">skoenig@podcast.fm</p>
      </div>
      </div>
      </td>
      <td className="px-6 py-5 text-body-md font-body-md text-ink">+1 (555) 902-1144</td>
      <td className="px-6 py-5">
      <span className="text-caption font-caption text-slate-text px-3 py-1 bg-surface-container rounded-full">Referral</span>
      </td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-2 text-warning bg-warning/10 px-3 py-1 rounded-[10px] w-fit">
      <span className="w-2 h-2 rounded-full bg-warning"></span>
      <span className="text-[10px] font-bold uppercase">PENDING</span>
      </div>
      </td>
      <td className="px-6 py-5">
      <span className="text-caption font-caption text-on-surface-variant">Clear</span>
      </td>
      <td className="px-6 py-5">
      <p className="text-body-md font-body-md text-ink">Email Opened</p>
      <p className="text-caption font-caption text-slate-text">Yesterday, 4:15 PM</p>
      </td>
      <td className="px-6 py-5 text-right">
      <button className="p-2 rounded-full hover:bg-surface-container text-slate-text transition-colors">
      <span className="material-symbols-outlined">more_vert</span>
      </button>
      </td>
      </tr>

      <tr className="hover:bg-surface-container-lowest transition-colors group">
      <td className="px-6 py-5"><input className="rounded border-outline-variant text-secondary focus:ring-secondary" type="checkbox" /></td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-error-container text-on-error-container flex items-center justify-center font-bold text-xs">RT</div>
      <div>
      <p className="text-body-md font-bold text-ink">Robert Taggart</p>
      <p className="text-caption font-caption text-slate-text">rob@taggart.com</p>
      </div>
      </div>
      </td>
      <td className="px-6 py-5 text-body-md font-body-md text-ink">+1 (555) 345-0092</td>
      <td className="px-6 py-5">
      <span className="text-caption font-caption text-slate-text px-3 py-1 bg-surface-container rounded-full">API Import</span>
      </td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-2 text-danger bg-danger/10 px-3 py-1 rounded-[10px] w-fit">
      <span className="w-2 h-2 rounded-full bg-danger"></span>
      <span className="text-[10px] font-bold uppercase">OPT-OUT</span>
      </div>
      </td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-1 text-danger font-bold text-[10px]">
      <span className="material-symbols-outlined text-[14px]">block</span>
                                              ACTIVE
                                          </div>
      </td>
      <td className="px-6 py-5">
      <p className="text-body-md font-body-md text-ink">DNC Request</p>
      <p className="text-caption font-caption text-slate-text">3 days ago</p>
      </td>
      <td className="px-6 py-5 text-right">
      <button className="p-2 rounded-full hover:bg-surface-container text-slate-text transition-colors">
      <span className="material-symbols-outlined">more_vert</span>
      </button>
      </td>
      </tr>

      <tr className="hover:bg-surface-container-lowest transition-colors group">
      <td className="px-6 py-5"><input className="rounded border-outline-variant text-secondary focus:ring-secondary" type="checkbox" /></td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-bold text-xs">EL</div>
      <div>
      <p className="text-body-md font-bold text-ink">Elena Lopez</p>
      <p className="text-caption font-caption text-slate-text">elena@techflow.io</p>
      </div>
      </div>
      </td>
      <td className="px-6 py-5 text-body-md font-body-md text-ink">+1 (555) 781-9003</td>
      <td className="px-6 py-5">
      <span className="text-caption font-caption text-slate-text px-3 py-1 bg-surface-container rounded-full">LinkedIn</span>
      </td>
      <td className="px-6 py-5">
      <div className="flex items-center gap-2 text-on-tertiary-container bg-tertiary-fixed/30 px-3 py-1 rounded-[10px] w-fit">
      <span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
      <span className="text-[10px] font-bold uppercase">OPT-IN</span>
      </div>
      </td>
      <td className="px-6 py-5">
      <span className="text-caption font-caption text-on-surface-variant">Clear</span>
      </td>
      <td className="px-6 py-5">
      <p className="text-body-md font-body-md text-ink">SMS Sent</p>
      <p className="text-caption font-caption text-slate-text">5 hours ago</p>
      </td>
      <td className="px-6 py-5 text-right">
      <button className="p-2 rounded-full hover:bg-surface-container text-slate-text transition-colors">
      <span className="material-symbols-outlined">more_vert</span>
      </button>
      </td>
      </tr>
      </tbody>
      </table>
      </div>

      <div className="p-6 bg-surface-container-low flex items-center justify-between">
      <div className="flex items-center gap-4">
      <select className="h-9 px-3 rounded-lg border border-outline-variant bg-surface text-caption font-caption appearance-none focus:ring-1 focus:ring-secondary/20 outline-none">
      <option>Show 10</option>
      <option>Show 25</option>
      <option>Show 50</option>
      </select>
      <span className="text-caption font-caption text-slate-text">items per page</span>
      </div>
      <div className="flex items-center gap-2">
      <button className="h-9 px-4 rounded-full border border-outline-variant text-label-md font-label-md hover:bg-white transition-all disabled:opacity-50" disabled>Previous</button>
      <button className="h-9 px-4 rounded-full bg-primary text-on-primary text-label-md font-label-md shadow-sm">1</button>
      <button className="h-9 px-4 rounded-full border border-outline-variant text-label-md font-label-md hover:bg-white transition-all">2</button>
      <button className="h-9 px-4 rounded-full border border-outline-variant text-label-md font-label-md hover:bg-white transition-all">3</button>
      <span className="text-slate-text">...</span>
      <button className="h-9 px-4 rounded-full border border-outline-variant text-label-md font-label-md hover:bg-white transition-all">245</button>
      <button className="h-9 px-4 rounded-full border border-outline-variant text-label-md font-label-md hover:bg-white transition-all">Next</button>
      </div>
      </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-primary-container text-on-primary-container p-8 rounded-[32px] relative overflow-hidden flex flex-col justify-center">
      <div className="relative z-10">
      <h4 className="text-headline-md font-headline-md text-white mb-3">Optimize your contact outreach with Smart Routing</h4>
      <p className="text-body-md font-body-md text-on-primary-container/80 max-w-xl mb-6">Based on your recent activity, 14% of your pending leads have the highest probability of conversion if contacted within the next 24 hours.</p>
      <button className="px-8 h-12 bg-tertiary-fixed text-on-tertiary-fixed font-bold rounded-full hover:bg-tertiary-fixed-dim transition-all active:scale-95">View Predicted Leads</button>
      </div>

      <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
      <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
      <span className="material-symbols-outlined text-[160px]">auto_awesome</span>
      </div>
      </div>
      <div className="bg-white p-8 rounded-[32px] custom-shadow border border-white/40 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-on-tertiary-container/10 text-on-tertiary-container flex items-center justify-center mb-6">
      <span className="material-symbols-outlined text-[32px]">security</span>
      </div>
      <h4 className="text-headline-md font-headline-md text-ink mb-2">Compliance Check</h4>
      <p className="text-body-md font-body-md text-slate-text mb-6">You have 128 contacts that require TCPA consent renewal before further automated calling.</p>
      <button className="w-full h-12 border border-outline-variant text-ink font-label-md rounded-full hover:bg-surface-container-low transition-all">Start Audit</button>
      </div>
      </div>
      </div>


    </>
  );
}
