"use client";

import Image from "next/image";
import { Icon } from "@/components/ui/icon";

const AVATAR_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAuQpkTMt0CQ3MPTnpexNn4DDJHVfCUQoX-WkT22pNn_i8iJORVB7IXqDSZkwzGjTv3Y3CPBti8A6RXk4sE0OqyRCYkuiRLdvCDt4VLuH2P11Yn9FZllDzQiOd42UHtYz6SpJAmjBcyhq9EdcDh5kq6lY_jO7iayA33KYHiTbjBAbE2Iwq4Vg3z22Ch3rI5mYTjgQMEy5tcHZiRBABab9CPpYPIxu0IVBDPIdBvvt2pcmvN0Mb7Or1bPE4hzgBQ4dbIbZoE2QdPUX4o";

type DashboardHeaderProps = {
  searchPlaceholder?: string;
  showQuickCreate?: boolean;
  showUserMeta?: boolean;
};

export function DashboardHeader({
  searchPlaceholder = "Search data, contacts, campaigns...",
  showQuickCreate = true,
  showUserMeta = false,
}: DashboardHeaderProps) {
  return (
    <header className="fixed top-0 right-0 z-40 ml-64 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-outline-variant bg-surface/80 px-margin-desktop shadow-sm backdrop-blur-md">
      <div className="flex flex-1 items-center gap-gutter">
        <div className="relative w-full max-w-md rounded-full focus-within:ring-2 focus-within:ring-secondary/20">
          <Icon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-full border-none bg-surface-container-low pl-12 pr-4 text-body-md focus:ring-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {showQuickCreate && (
          <button
            type="button"
            className="rounded-full bg-primary px-6 py-2 text-label-md font-bold text-on-primary transition-all hover:bg-primary/90"
          >
            Quick Create
          </button>
        )}
        <button
          type="button"
          className="relative rounded-full p-2 transition-colors hover:bg-surface-container-low"
        >
          <Icon name="notifications" className="text-on-surface" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full border-2 border-surface bg-error" />
        </button>
        <div className="ml-4 flex cursor-pointer items-center gap-3">
          {showUserMeta && (
            <div className="text-right">
              <p className="text-label-md font-bold text-ink">Alex Rivera</p>
              <p className="text-caption text-slate-text">Admin</p>
            </div>
          )}
          <Image
            src={AVATAR_URL}
            alt="User profile"
            width={40}
            height={40}
            className="rounded-full border border-outline-variant"
          />
        </div>
      </div>
    </header>
  );
}



