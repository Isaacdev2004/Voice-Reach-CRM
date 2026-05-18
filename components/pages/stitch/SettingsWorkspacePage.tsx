/* Auto-converted from stitch HTML */
"use client";

import { useState } from "react";

export function SettingsWorkspacePage() {
  const [fullName, setFullName] = useState("Marcus Sterling");
  const [email, setEmail] = useState("marcus.s@voicereach.io");
  const [phone, setPhone] = useState("+1 (555) 000-1234");
  const [timezone, setTimezone] = useState("Eastern Standard Time (EST)");

  return (
    <>
      <div className="max-w-[1224px] mx-auto px-gutter py-lg">

      <div className="mb-xl">
      <h2 className="font-headline-lg text-headline-lg mb-2">Settings</h2>
      <p className="font-body-md text-body-md text-on-surface-variant">Manage your account preferences, team workspace, and API integrations.</p>
      </div>

      <div className="flex gap-8 mb-lg border-b border-outline-variant/30 overflow-x-auto whitespace-nowrap">
      <button className="font-label-md text-label-md pb-4 text-primary font-bold border-b-2 border-primary">Profile</button>
      <button className="font-label-md text-label-md pb-4 text-on-surface-variant hover:text-primary transition-colors">Workspace</button>
      <button className="font-label-md text-label-md pb-4 text-on-surface-variant hover:text-primary transition-colors">API Keys</button>
      <button className="font-label-md text-label-md pb-4 text-on-surface-variant hover:text-primary transition-colors">Team Management</button>
      <button className="font-label-md text-label-md pb-4 text-on-surface-variant hover:text-primary transition-colors">Billing</button>
      </div>

      <div className="grid grid-cols-12 gap-gutter">

      <div className="col-span-12 lg:col-span-8 space-y-gutter">

      <div className="bg-surface-container-lowest rounded-[24px] p-lg shadow-card border border-outline-variant/10">
      <div className="flex justify-between items-start mb-lg">
      <h3 className="font-headline-md text-headline-md">Personal Information</h3>
      <button className="font-label-md text-label-md text-secondary px-4 py-2 hover:bg-secondary/5 rounded-full transition-colors">Edit Profile</button>
      </div>
      <div className="flex items-center gap-lg mb-xl">
      <div className="relative">
      <img alt="User Profile" className="w-24 h-24 rounded-full object-cover border-4 border-surface-container-high" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWp1qIkBZjXiBRwbhi1cqbITpYK90OvSFOxW68-fHjF7GxTBDLLfZg_jDt_Pcha9L0sHC5J-_exYwfkemyd9ZIxO4v7wVmjbNrH5QVe-92uBlhQiA4y4RKqHro83BSuZB1ZLobJ35HJvCzD8mGZNOTHrZscVaI9UtY_IrgEFmDqPLBp2reStgqWhhuutPwLUKtIDzpP-bJGIQQtIsoKQJ4S58Ip4mQL_YLn0eXlGseRd7x8oDLNCG7EXrfaXc2Ez2HH_Y-VoIZrcIT" />
      <button className="absolute bottom-0 right-0 p-1.5 bg-white border border-outline-variant shadow-sm rounded-full flex items-center justify-center">
      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
      </button>
      </div>
      <div>
      <h4 className="font-headline-md text-[20px]">Marcus Sterling</h4>
      <p className="font-body-md text-body-md text-on-surface-variant">Senior CRM Administrator</p>
      </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
      <div className="space-y-2">
      <label className="font-label-md text-label-md text-slate-text">Full Name</label>
      <input
        className="w-full h-14 px-6 bg-white border border-outline-variant/30 rounded-full font-body-md text-body-md focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      </div>
      <div className="space-y-2">
      <label className="font-label-md text-label-md text-slate-text">Email Address</label>
      <input
        className="w-full h-14 px-6 bg-white border border-outline-variant/30 rounded-full font-body-md text-body-md focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      </div>
      <div className="space-y-2">
      <label className="font-label-md text-label-md text-slate-text">Phone Number</label>
      <input
        className="w-full h-14 px-6 bg-white border border-outline-variant/30 rounded-full font-body-md text-body-md focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      </div>
      <div className="space-y-2">
      <label className="font-label-md text-label-md text-slate-text">Timezone</label>
      <select
        className="w-full h-14 px-6 bg-white border border-outline-variant/30 rounded-full font-body-md text-body-md focus:ring-2 focus:ring-secondary/20 transition-all outline-none appearance-none"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
      >
      <option>Eastern Standard Time (EST)</option>
      <option>Pacific Standard Time (PST)</option>
      <option>Greenwich Mean Time (GMT)</option>
      </select>
      </div>
      </div>
      </div>

      <div className="bg-surface-container-lowest rounded-[24px] p-lg shadow-card border border-outline-variant/10">
      <div className="flex justify-between items-center mb-lg">
      <h3 className="font-headline-md text-headline-md">API Integrations</h3>
      <span className="font-label-md text-label-md text-on-surface-variant">2 Connected</span>
      </div>
      <div className="space-y-sm">

      <div className="flex items-center justify-between p-sm bg-surface-container-low rounded-[12px] border border-outline-variant/20">
      <div className="flex items-center gap-4">
      <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-lg text-red-600">
      <span className="material-symbols-outlined">call</span>
      </div>
      <div>
      <p className="font-label-md text-label-md font-bold">Twilio</p>
      <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-tertiary-fixed-dim"></div>
      <p className="font-caption text-caption text-on-tertiary-container">Connected</p>
      </div>
      </div>
      </div>
      <button className="font-label-md text-label-md px-6 py-2 border border-outline-variant/50 rounded-full hover:bg-surface-container-highest transition-colors">Configure</button>
      </div>

      <div className="flex items-center justify-between p-sm bg-surface-container-low rounded-[12px] border border-outline-variant/20">
      <div className="flex items-center gap-4">
      <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded-lg text-blue-600">
      <span className="material-symbols-outlined">mail</span>
      </div>
      <div>
      <p className="font-label-md text-label-md font-bold">SendGrid</p>
      <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-tertiary-fixed-dim"></div>
      <p className="font-caption text-caption text-on-tertiary-container">Connected</p>
      </div>
      </div>
      </div>
      <button className="font-label-md text-label-md px-6 py-2 border border-outline-variant/50 rounded-full hover:bg-surface-container-highest transition-colors">Configure</button>
      </div>

      <div className="flex items-center justify-between p-sm bg-white rounded-[12px] border border-outline-variant/20">
      <div className="flex items-center gap-4">
      <div className="w-12 h-12 flex items-center justify-center bg-purple-50 rounded-lg text-purple-600">
      <span className="material-symbols-outlined">chat</span>
      </div>
      <div>
      <p className="font-label-md text-label-md font-bold">Slack Notifications</p>
      <p className="font-caption text-caption text-on-surface-variant">Not connected</p>
      </div>
      </div>
      <button className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2 rounded-full hover:opacity-90 transition-opacity">Connect</button>
      </div>
      </div>
      </div>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-gutter">

      <div className="bg-surface-container-lowest rounded-[24px] p-lg shadow-card border border-outline-variant/10">
      <h3 className="font-headline-md text-headline-md mb-lg">Workspace Team</h3>
      <div className="space-y-lg">
      <div className="flex -space-x-3">
      <img alt="Team member" className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBd7IQKKt5DGNNK7im2DeUX01UVqhYwFjTK5vYsFctrMnYbdmmMy1EpBU_EMqxRT8ZdWOr497Vrm-txtkm0oiYGgrMU6kS-7CF1nlWbmUYzN98Mx1J351fHuID9AhjvG3VXrfwCeWFeR3Mva8Pl1YdAJKh0XHGGHq5iu9dm6DrnfhXuHYYGeSH8B4X6HU1PM_t5dJ1LM2GYZqpfourPNikct0U_NwGTQC8CJUzvG8iSKMgPkJMriT9GmjHuN4FIRtEE8eeufYaWoSR5" />
      <img alt="Team member" className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDh3HT-4npGZoDbyB4DOcbMGhG5YloR44jNUtCmQ4Dik-AgUQXnQIJAUTP3AY9MxggMmEUr_OTonByA_pRi_4PEOznTBVgLH11efwl2Wyeul9uFkzvRlOAo6UBoBHPbtq0WpuOyhQyttio7mZ2pox6rdx0SetpfKjw5kFFCXNEtythEdrcAbmrrUFD8itmJgBjUR29IeQOREMj7qkOzlFEaynjJ10JOqsyNauNurHRxhyVgbNkkprCExlAdbYn-VECzOojEG1-p5755" />
      <img alt="Team member" className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8rNUHSUQ48yB2qatVIa_TLzm-gFt0TSxWnhviqmykmIwxHomPPjAew3uCzofkxHYBR7nFyzlk5ukyXrD5MxDKWwEs3Ez6pChKfyJZWvfFNsK2CyVAE14xZVvLlg2YshBociIhckJfM7ToFATuuRH-gVzJ7Kzuura7UvOPaFxHUq_iPnFgkkz_y9A0mwGf2SGEnyJ7wUBiDWAopVIQoVCx-pr2bPiP1VSgFDWhBFyCQyhPBnkU3vJC1x8_Nc1u8IQ-tlAehBir4BBi" />
      <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container-highest flex items-center justify-center font-label-md text-caption">+12</div>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant">There are currently 15 active members in the 'Enterprise CRM' workspace.</p>
      <button className="w-full py-4 px-6 border border-outline-variant/50 rounded-full font-label-md text-label-md hover:bg-surface-container-low transition-colors">Manage Team</button>
      </div>
      </div>

      <div className="bg-primary-container text-on-primary-fixed rounded-[24px] p-lg shadow-card">
      <div className="flex items-center gap-3 mb-lg">
      <span className="material-symbols-outlined text-tertiary-fixed-dim">verified_user</span>
      <h3 className="font-headline-md text-headline-md text-white">Security</h3>
      </div>
      <ul className="space-y-lg">
      <li className="flex items-center justify-between">
      <span className="font-label-md text-label-md text-on-primary-container">Two-factor Auth</span>
      <span className="bg-tertiary-fixed-dim text-on-tertiary-fixed px-3 py-1 rounded-full font-caption text-caption uppercase font-bold tracking-wider">Enabled</span>
      </li>
      <li className="flex items-center justify-between">
      <span className="font-label-md text-label-md text-on-primary-container">Login Alerts</span>
      <span className="bg-tertiary-fixed-dim text-on-tertiary-fixed px-3 py-1 rounded-full font-caption text-caption uppercase font-bold tracking-wider">Active</span>
      </li>
      <li className="flex items-center justify-between">
      <span className="font-label-md text-label-md text-on-primary-container">Last Login</span>
      <span className="font-caption text-caption text-on-primary-fixed-variant">2 hours ago</span>
      </li>
      </ul>
      </div>

      <div className="bg-white rounded-[24px] p-lg shadow-card border border-outline-variant/10">
      <h3 className="font-label-md text-label-md font-bold mb-lg text-slate-text uppercase tracking-widest">Plan Details</h3>
      <div className="mb-lg">
      <p className="font-headline-md text-[20px] mb-1">Enterprise Plus</p>
      <p className="font-body-md text-body-md text-on-surface-variant">$499.00 / month</p>
      </div>
      <div className="w-full bg-surface-container-low h-2 rounded-full mb-2 overflow-hidden">
      <div className="bg-secondary h-full w-[72%]"></div>
      </div>
      <p className="font-caption text-caption text-on-surface-variant mb-xl">72,000 / 100,000 Voice Minutes used</p>
      <button className="w-full py-4 px-6 bg-secondary text-on-secondary rounded-full font-label-md text-label-md hover:bg-secondary-container transition-colors shadow-sm">Upgrade Plan</button>
      </div>
      </div>

      <div className="col-span-12">
      <div className="bg-surface-container-lowest rounded-[24px] p-lg shadow-card border border-outline-variant/10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-xl">
      <div>
      <h3 className="font-headline-md text-headline-md mb-2">Team Management</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">Manage roles, permissions, and status of your workspace members.</p>
      </div>
      <button className="bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-full flex items-center gap-2 hover:opacity-90 transition-opacity">
      <span className="material-symbols-outlined text-[20px]">add</span>
                                      Invite Member
                                  </button>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
      <thead>
      <tr className="border-b border-outline-variant/30">
      <th className="text-left py-4 px-4 font-label-md text-label-md text-slate-text uppercase tracking-wider">User</th>
      <th className="text-left py-4 px-4 font-label-md text-label-md text-slate-text uppercase tracking-wider">Role</th>
      <th className="text-left py-4 px-4 font-label-md text-label-md text-slate-text uppercase tracking-wider">Status</th>
      <th className="text-left py-4 px-4 font-label-md text-label-md text-slate-text uppercase tracking-wider">Last Active</th>
      <th className="text-right py-4 px-4 font-label-md text-label-md text-slate-text uppercase tracking-wider">Action</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/10">
      <tr>
      <td className="py-6 px-4">
      <div className="flex items-center gap-3">
      <img alt="Marcus" className="w-10 h-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCm3S3egIq2IOQ_Kf9MFaN3lJpE7bAZzTu_WU2IyH12ovexfXNMT91goGMB42UA2zlfdXzJbk08bVNQKjl3gGxFhvkmDk08ZJnudZZjbYbH7v8Ve8siqxBc5rfV7zjno69MQx9dE7VPAxCPUtOfeNabIosI0AQO6xZNpW1tm_LtoJyyGFvkqtMwqOh-3WSAdgJadkVtriMpPSzWNagT9m5wK6fWUkwTH2A6OLV8I-3u03BqC0bvGJaiYDhdJJMZQZyYQi_FF-Im6V03" />
      <div>
      <p className="font-label-md text-label-md font-bold">Marcus Sterling</p>
      <p className="font-caption text-caption text-on-surface-variant">marcus.s@voicereach.io</p>
      </div>
      </div>
      </td>
      <td className="py-6 px-4 font-body-md text-body-md">Workspace Owner</td>
      <td className="py-6 px-4">
      <span className="bg-tertiary-fixed-dim/20 text-on-tertiary-container px-3 py-1 rounded-[10px] font-caption text-caption uppercase font-bold">Active</span>
      </td>
      <td className="py-6 px-4 font-body-md text-body-md text-on-surface-variant">Now</td>
      <td className="py-6 px-4 text-right">
      <button className="material-symbols-outlined text-outline hover:text-primary">more_vert</button>
      </td>
      </tr>
      <tr>
      <td className="py-6 px-4">
      <div className="flex items-center gap-3">
      <img alt="Elena" className="w-10 h-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9W1fAXkSeb-CXdYlvOYf-5nZozM299kEuePxfTVQUEn3M8mvBB_qiOo2yGV5kTkY5QaZylhv2JN3JsIkw4mgHFjyRn--85JkpaLTl4LLnLYGxZNKefU7p6LHQ_lGcMsrhoAOhWqSeuuBq1E8NsdG9zbPpaCqNwILjggLDsfZ2Q59fF6byykUX_20GbjK15wkS_kD_I_q8X498taxddImIZXNRdP0CvgYKA33z136-9V12ZxI3hltLjvl0DeLqWKqvRv3X1fsJGmBg" />
      <div>
      <p className="font-label-md text-label-md font-bold">Elena Rodriguez</p>
      <p className="font-caption text-caption text-on-surface-variant">elena.r@voicereach.io</p>
      </div>
      </div>
      </td>
      <td className="py-6 px-4 font-body-md text-body-md">Admin</td>
      <td className="py-6 px-4">
      <span className="bg-tertiary-fixed-dim/20 text-on-tertiary-container px-3 py-1 rounded-[10px] font-caption text-caption uppercase font-bold">Active</span>
      </td>
      <td className="py-6 px-4 font-body-md text-body-md text-on-surface-variant">45 mins ago</td>
      <td className="py-6 px-4 text-right">
      <button className="material-symbols-outlined text-outline hover:text-primary">more_vert</button>
      </td>
      </tr>
      <tr>
      <td className="py-6 px-4">
      <div className="flex items-center gap-3">
      <img alt="James" className="w-10 h-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDP0pISUobue9AnFV0pRfxRpXPfGTNNIHpUaB0yYbuQ3m9sSodzN7BYORKaMAn5WisVyAuN54Utn1FhXhlLPoGSnlnytIyn8p-sJpcAL1aFbA-RBHOvokU-TIV9BtO6aMFygWxNqH2930RshKv5OvI9U8Jx9gg4iPwW5JNCjUF8mN6rada6XMCjFVPQ1XhUbDZm4PjdVzqvqjpiDNoXrP5y7KHPLBjJsWHZbxYX7t_vQtxlIB4CVaP6BTw2uIBzFKZzWRmYLgTJ9KYD" />
      <div>
      <p className="font-label-md text-label-md font-bold">James Wilson</p>
      <p className="font-caption text-caption text-on-surface-variant">j.wilson@voicereach.io</p>
      </div>
      </div>
      </td>
      <td className="py-6 px-4 font-body-md text-body-md">Billing Manager</td>
      <td className="py-6 px-4">
      <span className="bg-tertiary-fixed-dim/20 text-on-tertiary-container px-3 py-1 rounded-[10px] font-caption text-caption uppercase font-bold">Active</span>
      </td>
      <td className="py-6 px-4 font-body-md text-body-md text-on-surface-variant">Yesterday</td>
      <td className="py-6 px-4 text-right">
      <button className="material-symbols-outlined text-outline hover:text-primary">more_vert</button>
      </td>
      </tr>
      <tr>
      <td className="py-6 px-4">
      <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
      <span className="material-symbols-outlined text-on-surface-variant">person_outline</span>
      </div>
      <div>
      <p className="font-label-md text-label-md font-bold">Sarah Chen</p>
      <p className="font-caption text-caption text-on-surface-variant">sarah.c@voicereach.io</p>
      </div>
      </div>
      </td>
      <td className="py-6 px-4 font-body-md text-body-md">User</td>
      <td className="py-6 px-4">
      <span className="bg-warning/20 text-warning px-3 py-1 rounded-[10px] font-caption text-caption uppercase font-bold">Pending</span>
      </td>
      <td className="py-6 px-4 font-body-md text-body-md text-on-surface-variant">-</td>
      <td className="py-6 px-4 text-right">
      <button className="material-symbols-outlined text-outline hover:text-primary">more_vert</button>
      </td>
      </tr>
      </tbody>
      </table>
      </div>
      </div>
      </div>
      </div>

      <div className="mt-xl flex justify-end gap-4">
      <button className="px-8 py-4 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">Discard Changes</button>
      <button className="px-10 py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:opacity-90 shadow-lg transition-all">Save All Changes</button>
      </div>
      </div>
    </>
  );
}
