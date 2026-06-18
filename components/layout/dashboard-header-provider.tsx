"use client";

import { AddCalendarEventModal } from "@/components/crm/add-calendar-event-modal";
import { AddContactModal } from "@/components/crm/add-contact-modal";
import { ImportCsvModal } from "@/components/crm/import-csv-modal";
import { QuickNoteModal } from "@/components/crm/quick-note-modal";
import { StandaloneTaskModal } from "@/components/crm/standalone-task-modal";
import { Modal } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/activity/format";
import type { ActivityLogEntry } from "@/lib/activity/types";
import { useClerk, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ContactHit = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string;
};

type DashboardHeaderContextValue = {
  openQuickCreate: () => void;
  openNewTask: () => void;
  openNewEvent: () => void;
  openNewNote: () => void;
};

const DashboardHeaderContext = createContext<DashboardHeaderContextValue | null>(null);

export function useDashboardHeader() {
  const ctx = useContext(DashboardHeaderContext);
  if (!ctx) throw new Error("useDashboardHeader must be used within DashboardHeaderProvider");
  return ctx;
}

const NOTIFICATIONS_READ_KEY = "vr-notifications-read";

function loadReadNotificationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadNotificationIds(ids: Set<string>) {
  localStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify([...ids]));
}

type DashboardHeaderProviderProps = {
  children: ReactNode;
  searchPlaceholder?: string;
  showQuickCreate?: boolean;
  onMenuClick?: () => void;
};

export function DashboardHeaderProvider({
  children,
  searchPlaceholder = "Search data, contacts, campaigns...",
  showQuickCreate = true,
  onMenuClick,
}: DashboardHeaderProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [contactHits, setContactHits] = useState<ContactHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [importCsvOpen, setImportCsvOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ActivityLogEntry[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const [profileOpen, setProfileOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setReadIds(loadReadNotificationIds());
  }, []);

  useEffect(() => {
    if (!newEventOpen) return;
    void fetch("/api/integrations/google/status")
      .then((r) => r.json())
      .then((data) => setGoogleConnected(Boolean(data.connected)))
      .catch(() => setGoogleConnected(false));
  }, [newEventOpen]);

  const headerActions = {
    openQuickCreate: () => setQuickCreateOpen(true),
    openNewTask: () => setNewTaskOpen(true),
    openNewEvent: () => setNewEventOpen(true),
    openNewNote: () => setNewNoteOpen(true),
  };

  const applySearchToUrl = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const runContactSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setContactHits([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { contacts?: ContactHit[] };
      setContactHits((data.contacts ?? []).slice(0, 6));
    } catch {
      setContactHits([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setSearchOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      applySearchToUrl(value);
      void runContactSearch(value);
    }, 300);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applySearchToUrl(query);
    setSearchOpen(false);
    if (pathname === "/dashboard" && query.trim()) {
      router.push(`/dashboard/contacts?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      const data = (await res.json()) as { entries?: ActivityLogEntry[] };
      setNotifications((data.entries ?? []).slice(0, 12));
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    if (notificationsOpen) void loadNotifications();
  }, [notificationsOpen, loadNotifications]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(t)) setNotificationsOpen(false);
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllNotificationsRead = () => {
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    setReadIds(next);
    saveReadNotificationIds(next);
  };

  const markNotificationRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadNotificationIds(next);
  };

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Account";
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const avatarUrl = user?.imageUrl;

  const quickLinks = [
    { label: "Contacts", href: "/dashboard/contacts", icon: "person" },
    { label: "Campaigns", href: "/dashboard/campaigns", icon: "campaign" },
    { label: "Activity logs", href: "/dashboard/activity", icon: "history" },
    { label: "Settings", href: "/dashboard/settings", icon: "settings" },
  ].filter((l) =>
    query.trim() ? l.label.toLowerCase().includes(query.toLowerCase()) : true,
  );

  return (
    <DashboardHeaderContext.Provider value={headerActions}>
      <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center gap-2 border-b border-outline-variant bg-surface/80 px-4 shadow-sm backdrop-blur-md lg:left-64 lg:w-[calc(100%-16rem)] lg:gap-4 lg:px-margin-desktop">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-full p-2 text-ink transition-colors hover:bg-surface-container-low lg:hidden"
          aria-label="Open navigation menu"
        >
          <Icon name="menu" className="text-[24px]" />
        </button>

        <form className="flex min-w-0 flex-1 items-center" onSubmit={handleSearchSubmit}>
          <div ref={searchRef} className="relative w-full max-w-md">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-on-surface-variant sm:left-4"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-full border-none bg-surface-container-low pl-10 pr-3 text-body-md focus:ring-2 focus:ring-rose-gold/20 sm:pl-12 sm:pr-4"
              aria-label="Search dashboard"
              aria-expanded={searchOpen}
              autoComplete="off"
            />
            {searchOpen && (query.trim() || contactHits.length > 0) ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] max-h-[360px] overflow-y-auto rounded-2xl border border-outline-variant/20 bg-ivory py-2 shadow-card">
                {searching ? (
                  <p className="px-4 py-3 text-[13px] text-taupe">Searching…</p>
                ) : null}
                {contactHits.length > 0 ? (
                  <div className="border-b border-outline-variant/10 pb-2">
                    <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-taupe">
                      Contacts
                    </p>
                    {contactHits.map((c) => (
                      <Link
                        key={c.id}
                        href={`/dashboard/contacts/${c.id}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-champagne"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-champagne text-[12px] font-semibold text-taupe">
                          {c.first_name[0]}
                          {c.last_name?.[0] ?? ""}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-ink">
                            {c.first_name} {c.last_name ?? ""}
                          </p>
                          <p className="truncate text-[12px] text-taupe">{c.phone ?? c.email}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : query.trim().length >= 2 && !searching ? (
                  <p className="px-4 py-2 text-[13px] text-taupe">No contacts found</p>
                ) : null}
                <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-taupe">
                  Go to
                </p>
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-[14px] text-ink hover:bg-champagne"
                  >
                    <Icon name={link.icon} className="text-[18px] text-rose-gold-deep" />
                    {link.label}
                  </Link>
                ))}
                {query.trim() ? (
                  <button
                    type="submit"
                    className="mx-2 mt-2 w-[calc(100%-16px)] rounded-full bg-rose-gold/15 py-2 text-[13px] font-medium text-rose-gold-deep hover:bg-rose-gold/25"
                  >
                    Search &quot;{query}&quot; on this page
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </form>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {showQuickCreate ? (
            <>
              <button
                type="button"
                onClick={() => setQuickCreateOpen(true)}
                className="hidden rounded-full bg-rose-gold px-5 py-2 text-label-md font-bold text-ivory transition-all hover:opacity-95 sm:inline-flex"
              >
                Quick Create
              </button>
              <button
                type="button"
                onClick={() => setQuickCreateOpen(true)}
                className="inline-flex rounded-full bg-rose-gold p-2.5 text-ivory transition-all hover:opacity-95 sm:hidden"
                aria-label="Quick create"
              >
                <Icon name="add" className="text-[22px]" />
              </button>
            </>
          ) : null}

          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((o) => !o)}
              className="relative rounded-full p-2 transition-colors hover:bg-surface-container-low"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Icon name="notifications" className="text-on-surface" />
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>
            {notificationsOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-outline-variant/20 bg-ivory shadow-card">
                <div className="flex items-center justify-between border-b border-outline-variant/10 px-4 py-3">
                  <p className="font-medium text-ink">Notifications</p>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-[12px] font-medium text-rose-gold-deep hover:underline"
                    >
                      Mark all read
                    </button>
                  ) : null}
                </div>
                <ul className="max-h-[320px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-6 text-center text-[13px] text-taupe">No notifications</li>
                  ) : (
                    notifications.map((n) => {
                      const unread = !readIds.has(n.id);
                      return (
                        <li key={n.id}>
                          <Link
                            href={n.href ?? "/dashboard/activity"}
                            onClick={() => {
                              markNotificationRead(n.id);
                              setNotificationsOpen(false);
                            }}
                            className={cn(
                              "block border-b border-outline-variant/5 px-4 py-3 hover:bg-champagne",
                              unread && "bg-rose-gold/5",
                            )}
                          >
                            <p className="text-[13px] font-medium text-ink">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-text">{n.body}</p>
                            <p className="mt-1 text-[11px] text-taupe">
                              {formatRelativeTime(n.createdAt)}
                            </p>
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
                <Link
                  href="/dashboard/activity"
                  onClick={() => setNotificationsOpen(false)}
                  className="block border-t border-outline-variant/10 py-3 text-center text-[13px] font-medium text-rose-gold-deep hover:bg-champagne"
                >
                  View all activity
                </Link>
              </div>
            ) : null}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-surface-container-low sm:pr-2"
              aria-label="Account menu"
              aria-expanded={profileOpen}
            >
              <div className="hidden text-right sm:block">
                <p className="text-label-md font-bold text-ink">{displayName}</p>
                <p className="text-caption text-slate-text">Account</p>
              </div>
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={40}
                  height={40}
                  className="rounded-full border border-outline-variant object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-champagne font-semibold text-ink">
                  {displayName[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <Icon
                name={profileOpen ? "expand_less" : "expand_more"}
                className="hidden text-[20px] text-taupe sm:block"
              />
            </button>
            {profileOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-outline-variant/20 bg-ivory py-2 shadow-card">
                <div className="border-b border-outline-variant/10 px-4 py-3">
                  <p className="truncate font-medium text-ink">{displayName}</p>
                  <p className="truncate text-[12px] text-taupe">{displayEmail}</p>
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-[14px] text-ink hover:bg-champagne"
                >
                  <Icon name="person" className="text-[18px] text-taupe" />
                  Profile & settings
                </Link>
                <Link
                  href="/dashboard/settings?tab=billing"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-[14px] text-ink hover:bg-champagne"
                >
                  <Icon name="workspace_premium" className="text-[18px] text-taupe" />
                  Billing
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    void signOut({ redirectUrl: "/" });
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] text-error hover:bg-error/5"
                >
                  <Icon name="logout" className="text-[18px]" />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {children}

      <Modal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        title="Quick create"
        description="Start something new without leaving your current page."
        icon="add_circle"
        size="md"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Calendar event",
              icon: "event",
              action: () => {
                setQuickCreateOpen(false);
                setNewEventOpen(true);
              },
            },
            {
              label: "New task",
              icon: "task_alt",
              action: () => {
                setQuickCreateOpen(false);
                setNewTaskOpen(true);
              },
            },
            {
              label: "Add note",
              icon: "sticky_note_2",
              action: () => {
                setQuickCreateOpen(false);
                setNewNoteOpen(true);
              },
            },
            {
              label: "Add contact",
              icon: "person_add",
              action: () => {
                setQuickCreateOpen(false);
                setAddContactOpen(true);
              },
            },
            {
              label: "Import CSV",
              icon: "upload_file",
              action: () => {
                setQuickCreateOpen(false);
                setImportCsvOpen(true);
              },
            },
            {
              label: "New campaign",
              icon: "campaign",
              action: () => {
                setQuickCreateOpen(false);
                router.push("/dashboard/campaigns");
              },
            },
            {
              label: "Voice script",
              icon: "mic",
              action: () => {
                setQuickCreateOpen(false);
                router.push("/dashboard/voice-scripts");
              },
            },
            {
              label: "Automation",
              icon: "auto_mode",
              action: () => {
                setQuickCreateOpen(false);
                router.push("/dashboard/automations");
              },
            },
            {
              label: "View calendar",
              icon: "calendar_month",
              action: () => {
                setQuickCreateOpen(false);
                router.push("/dashboard/calendar");
              },
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant/15 bg-champagne/40 p-4 text-center transition-colors hover:border-rose-gold/30 hover:bg-champagne"
            >
              <Icon name={item.icon} className="text-[28px] text-rose-gold-deep" />
              <span className="text-[13px] font-medium text-ink">{item.label}</span>
            </button>
          ))}
        </div>
      </Modal>

      <AddContactModal
        open={addContactOpen}
        onClose={() => setAddContactOpen(false)}
        onSuccess={() => router.refresh()}
      />
      <ImportCsvModal
        open={importCsvOpen}
        onClose={() => setImportCsvOpen(false)}
        onSuccess={() => router.refresh()}
      />
      <StandaloneTaskModal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onSaved={() => router.refresh()}
      />
      <AddCalendarEventModal
        open={newEventOpen}
        onClose={() => setNewEventOpen(false)}
        defaultDate={new Date()}
        connected={googleConnected}
        onCreated={() => router.refresh()}
      />
      <QuickNoteModal
        open={newNoteOpen}
        onClose={() => setNewNoteOpen(false)}
        onSaved={() => router.refresh()}
      />
    </DashboardHeaderContext.Provider>
  );
}
