"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Megaphone,
  Plus,
  Settings as SettingsIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { APP_NAME } from "@acuo/shared";
import { apiFetch } from "@/lib/api";
import { AnnouncementsPanel } from "@/components/AnnouncementsPanel";
import { ClassCalendar } from "@/components/ClassCalendar";
import { ClassOccurrenceModal } from "@/components/ClassOccurrenceModal";
import {
  StatusToggle,
  MemberProgramEnrollments,
} from "@/components/MemberDetails";


type TabKey =
  | "overview"
  | "members"
  | "programs"
  | "memberships"
  | "announcements"
  | "settings";

export default function GymPage() {
  const { gymId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gym, setGym] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [plansCount, setPlansCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const urlTab = (searchParams?.get("tab") as TabKey | null) || "overview";
  const [tab, setTab] = useState<TabKey>(urlTab);

  useEffect(() => {
    if (urlTab !== tab) setTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  function selectTab(next: TabKey) {
    setTab(next);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(`/gym/${gymId}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    if (!gymId) return;
    setLoading(true);
    (async () => {
      try {
        const [gymData, myGyms, programsData, profileData, plansData] = await Promise.all([
          apiFetch(`/gyms/${gymId}`),
          apiFetch("/gyms"),
          apiFetch(`/gyms/${gymId}/programs`).catch(() => []),
          apiFetch("/profile").catch(() => null),
          apiFetch(`/gyms/${gymId}/plans`).catch(() => []),
        ]);
        const memberData = (myGyms || []).find((m: any) => m.gym?.id === gymId);
        setGym(gymData);
        setMembership(memberData);
        setPrograms(programsData || []);
        setProfile(profileData);
        setPlansCount((plansData || []).length);
        const memberRoles: string[] = memberData?.roles || (memberData?.role ? [memberData.role] : []);
        if (memberRoles.includes("admin") || memberRoles.includes("coach")) {
          try {
            const membersData = await apiFetch(`/gyms/${gymId}/members`);
            setMembers(membersData || []);
          } catch (err) {
            console.error(err);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gymId]);

  async function reloadPrograms() {
    try {
      const data = await apiFetch(`/gyms/${gymId}/programs`);
      setPrograms(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function reloadMembers() {
    try {
      const data = await apiFetch(`/gyms/${gymId}/members`);
      setMembers(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <LoadingShell />;
  if (!gym) return <p className="text-[var(--color-ink-soft)]">Gym not found.</p>;

  const isAdmin = membership?.role === "admin";

  const tabs: {
    key: TabKey;
    label: string;
    icon: typeof Users;
    hidden?: boolean;
  }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "announcements", label: "Announcements", icon: Megaphone },
    { key: "members", label: "Members", icon: Users, hidden: !isAdmin },
    { key: "programs", label: "Programs", icon: Dumbbell },
    { key: "memberships", label: "Memberships", icon: CreditCard, hidden: !isAdmin },
    { key: "settings", label: "Settings", icon: SettingsIcon, hidden: !isAdmin },
  ];

  const adminOnlyTabs: TabKey[] = ["members", "memberships", "settings"];
  const activeTab: TabKey =
    adminOnlyTabs.includes(tab) && !isAdmin ? "overview" : tab;

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] gap-6 lg:gap-14">
      {/* Sidebar (desktop) + mobile chip tabs */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Link
          href="/dashboard"
          className="hidden lg:inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors no-underline mb-5"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          All gyms
        </Link>

        <GymIdentity gym={gym} membership={membership} />

        <nav
          aria-label="Gym navigation"
          className="hidden lg:flex flex-col gap-0.5 mt-6"
        >
          {tabs
            .filter((t) => !t.hidden)
            .map((t) => {
              const isActive = activeTab === t.key;
              const count =
                t.key === "members" && isAdmin
                  ? members.length
                  : t.key === "programs"
                    ? programs.length
                    : t.key === "memberships" && isAdmin
                      ? plansCount
                      : null;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => selectTab(t.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] transition-all ${
                    isActive
                      ? "text-primary font-medium"
                      : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-primary" />
                  )}
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2.2 : 1.75}
                    className={
                      isActive
                        ? "text-primary"
                        : "text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink-soft)]"
                    }
                  />
                  <span className="flex-1 text-left">{t.label}</span>
                  {count !== null && count > 0 && (
                    <span
                      className={`text-[11px] tabular-nums ${
                        isActive
                          ? "text-primary/70"
                          : "text-[var(--color-ink-muted)]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Mobile chip tabs */}
        <div
          role="tablist"
          className="lg:hidden -mx-4 px-4 overflow-x-auto scrollbar-none border-b border-[var(--color-rule)]"
        >
          <div className="flex gap-1 min-w-max pb-px">
            {tabs
              .filter((t) => !t.hidden)
              .map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectTab(t.key)}
                    className={`relative px-3 py-3 text-[13px] font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {t.label}
                    {isActive && (
                      <span className="absolute left-3 right-3 bottom-0 h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0">
        {activeTab === "overview" && (
          <OverviewPanel
            gym={gym}
            membership={membership}
            programs={programs}
            members={members}
            isAdmin={isAdmin}
            currentUserId={profile?.id || null}
            onNavigate={selectTab}
          />
        )}

        {activeTab === "members" && isAdmin && (
          <MembersPanel
            members={members}
            gymId={gymId as string}
            onReload={reloadMembers}
          />
        )}

        {activeTab === "programs" && (
          <ProgramsPanel
            programs={programs}
            isAdmin={isAdmin}
            gymId={gymId as string}
            onProgramCreated={reloadPrograms}
          />
        )}

        {activeTab === "memberships" && isAdmin && (
          <MembershipsPanel gymId={gymId as string} programs={programs} />
        )}

        {activeTab === "announcements" && (
          <AnnouncementsPanel gymId={gymId as string} canManage={isAdmin} />
        )}

        {activeTab === "settings" && isAdmin && (
          <SettingsPanel gym={gym} onSaved={(updated) => setGym(updated)} />
        )}
      </main>
    </div>
  );
}

/* -------------------- Shell pieces -------------------- */

function LoadingShell() {
  return (
    <div className="flex items-center gap-3 text-[var(--color-ink-muted)]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span className="text-[13px] text-[var(--color-ink-soft)]">Loading</span>
    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  meta,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h2 className="text-[20px] font-semibold leading-tight tracking-tight text-[var(--color-ink)]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {meta ? (
        <span className="text-[13px] text-[var(--color-ink-soft)] shrink-0">
          {meta}
        </span>
      ) : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

function GymIdentity({ gym, membership }: { gym: any; membership: any }) {
  return (
    <div className="flex items-center gap-3 pb-5 border-b border-[var(--color-rule)]">
      <div className="w-11 h-11 rounded-md bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
        {gym.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gym.logo_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-lg font-semibold text-[var(--color-ink-soft)]">
            {gym.name?.[0]?.toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-tight truncate text-[var(--color-ink)]">
          {gym.name}
        </div>
        {membership?.role && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                membership.status === "active" ? "bg-primary" : "bg-[var(--color-ink-muted)]"
              }`}
            />
            <span className="text-[12px] capitalize text-[var(--color-ink-soft)]">
              {membership.role}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Overview (Dashboard) -------------------- */

function OverviewPanel({
  gym,
  membership,
  programs,
  members,
  isAdmin,
  currentUserId,
  onNavigate,
}: {
  gym: any;
  membership: any;
  programs: any[];
  members: any[];
  isAdmin: boolean;
  currentUserId: string | null;
  onNavigate: (t: TabKey) => void;
}) {
  const memberRoles: string[] =
    membership?.roles || (membership?.role ? [membership.role] : []);
  const canManage =
    memberRoles.includes("admin") || memberRoles.includes("coach");

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <section className="flex flex-col gap-8">
      <PanelHeader
        eyebrow="Dashboard"
        title="Overview"
        subtitle={dateLabel}
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MembersCard members={members} onClick={isAdmin ? () => onNavigate("members") : undefined} />
        <ProgramsCard programs={programs} onClick={() => onNavigate("programs")} />
      </div>

      {/* Calendar */}
      <section>
        <div className="mb-4">
          <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-ink)]">
            Schedule
          </h2>
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
            All scheduled classes
          </p>
        </div>
        <GymCalendar
          gymId={gym.id}
          currentUserId={currentUserId}
          canManage={canManage}
          members={members}
        />
      </section>
    </section>
  );
}

function MembersCard({ members, onClick }: { members: any[]; onClick?: () => void }) {
  const roleTallies = useMemo(() => {
    const tally = { admin: 0, coach: 0, member: 0 };
    for (const m of members) {
      const roles: string[] = m.roles || (m.role ? [m.role] : []);
      for (const r of roles) {
        if (r in tally) tally[r as keyof typeof tally]++;
      }
    }
    return tally;
  }, [members]);

  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      className="group relative flex flex-col rounded-lg p-5 text-left transition-colors bg-[var(--color-bg-card)] border border-[var(--color-rule)] hover:border-[var(--color-rule-strong)] cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-medium text-[var(--color-ink-soft)]">Members</span>
        <Users size={14} strokeWidth={1.75} className="text-[var(--color-ink-muted)]" />
      </div>
      <span className="text-[28px] leading-none font-semibold tabular-nums text-[var(--color-ink)]">
        {members.length}
      </span>
      <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-[var(--color-rule)]">
        {roleTallies.admin > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--color-ink-soft)]">Admins</span>
            <span className="tabular-nums font-medium text-[var(--color-ink)]">{roleTallies.admin}</span>
          </div>
        )}
        {roleTallies.coach > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--color-ink-soft)]">Coaches</span>
            <span className="tabular-nums font-medium text-[var(--color-ink)]">{roleTallies.coach}</span>
          </div>
        )}
        {roleTallies.member > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--color-ink-soft)]">Members</span>
            <span className="tabular-nums font-medium text-[var(--color-ink)]">{roleTallies.member}</span>
          </div>
        )}
      </div>
      {onClick && (
        <ArrowUpRight
          size={14}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-ink-soft)]"
        />
      )}
    </Comp>
  );
}

function ProgramsCard({ programs, onClick }: { programs: any[]; onClick?: () => void }) {
  const sorted = useMemo(
    () => [...programs].sort((a, b) => (b.enrollment_count ?? 0) - (a.enrollment_count ?? 0)),
    [programs],
  );
  const top = sorted.slice(0, 3);

  return (
    <button
      className="group relative flex flex-col rounded-lg p-5 text-left transition-colors bg-[var(--color-bg-card)] border border-[var(--color-rule)] hover:border-[var(--color-rule-strong)] cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-medium text-[var(--color-ink-soft)]">Programs</span>
        <Dumbbell size={14} strokeWidth={1.75} className="text-[var(--color-ink-muted)]" />
      </div>
      <span className="text-[28px] leading-none font-semibold tabular-nums text-[var(--color-ink)]">
        {programs.length}
      </span>
      {top.length > 0 && (
        <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-[var(--color-rule)]">
          {top.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-[11px]">
              <span className="truncate text-[var(--color-ink-soft)]">{p.name}</span>
              <span className="tabular-nums font-medium text-[var(--color-ink)] ml-2 shrink-0">
                {p.enrollment_count ?? 0}
              </span>
            </div>
          ))}
          {programs.length > 3 && (
            <div className="text-[10px] text-[var(--color-ink-muted)]">
              +{programs.length - 3} more
            </div>
          )}
        </div>
      )}
      <ArrowUpRight
        size={14}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-ink-soft)]"
      />
    </button>
  );
}

/* -------------------- Calendar (gym-wide) -------------------- */

function GymCalendar({
  gymId,
  currentUserId,
  canManage,
  members,
}: {
  gymId: string;
  currentUserId: string | null;
  canManage: boolean;
  members: any[];
}) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ cls: any; date: string } | null>(null);

  useEffect(() => {
    if (!gymId) return;
    (async () => {
      try {
        const data = await apiFetch(`/gyms/${gymId}/classes`);
        setClasses(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [gymId]);

  return (
    <>
      <ClassCalendar
        classes={classes}
        loading={loading}
        groupByProgram
        onClassClick={(cls, date) => setSelected({ cls, date })}
      />
      {selected && (
        <ClassOccurrenceModal
          cls={selected.cls}
          date={selected.date}
          gymId={gymId}
          currentUserId={currentUserId}
          canManage={canManage}
          members={members}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

/* -------------------- Members -------------------- */

const MEMBER_PAGE_SIZES = [10, 50, 100] as const;

function MembersPaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[var(--color-ink-muted)]">Show</span>
        <div className="inline-flex gap-0.5 p-0.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)]">
          {MEMBER_PAGE_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => onPageSizeChange(s)}
              className={`h-6 px-2 rounded text-[11px] font-medium tabular-nums transition-colors ${
                pageSize === s
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[var(--color-ink-muted)] tabular-nums">
          {start}–{end} of {total}
        </span>
        <div className="flex gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="h-7 w-7 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-[12px]"
          >
            ‹
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="h-7 w-7 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-[12px]"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

function MembersPanel({
  members,
  gymId,
  onReload,
}: {
  members: any[];
  gymId: string;
  onReload: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "admin" | "coach" | "member"
  >("all");
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const roles: string[] = m.roles || [];
      if (roleFilter !== "all" && !roles.includes(roleFilter)) return false;
      if (!q) return true;
      const name = `${m.profile?.first_name ?? ""} ${m.profile?.last_name ?? ""}`.toLowerCase();
      const email = (m.profile?.email ?? m.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, query, roleFilter]);

  const counts = useMemo(() => {
    const c = { all: members.length, admin: 0, coach: 0, member: 0 };
    for (const m of members) {
      const roles: string[] = m.roles || [];
      if (roles.includes("admin")) c.admin++;
      if (roles.includes("coach")) c.coach++;
      if (roles.includes("member")) c.member++;
    }
    return c;
  }, [members]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, roleFilter]);

  return (
    <section className="space-y-5">
      <PanelHeader
        eyebrow="Roster"
        title="Members"
        subtitle="Click a row to see details and manage roles."
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.25} />
            Add member
          </button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full h-10 pl-9 pr-3 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[13px] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10 transition-colors"
          />
        </div>
        <div className="inline-flex items-center rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-sunken)] p-0.5">
          {(
            [
              { key: "all", label: "All" },
              { key: "admin", label: "Admin" },
              { key: "coach", label: "Coach" },
              { key: "member", label: "Member" },
            ] as const
          ).map((f) => {
            const active = roleFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setRoleFilter(f.key)}
                className={`h-8 px-3 rounded text-[12px] font-medium transition-all inline-flex items-center gap-1.5 ${
                  active
                    ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
                    : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                }`}
              >
                {f.label}
                <span
                  className={`inline-flex items-center h-4 min-w-4 px-1 rounded-full text-[10px] tabular-nums ${
                    active
                      ? "bg-[var(--color-ink)] text-white"
                      : "bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)]"
                  }`}
                >
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              {members.length === 0
                ? "No members yet."
                : "No members match the current filters."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]">
                <th className="text-left px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Member
                </th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Roles
                </th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Programs
                </th>
                <th className="text-left px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Membership
                </th>
                <th className="text-right px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((m) => {
                const memberRoles: string[] = m.roles || [];
                const isActive = m.status === "active";
                const enrollments: any[] = m.program_enrollments || [];
                const activeEnrollments = enrollments.filter(
                  (e) => e.status === "active",
                );
                return (
                  <tr
                    key={m.id}
                    onClick={() =>
                      router.push(`/gym/${gymId}/members/${m.user_id}`)
                    }
                    className="border-b border-[var(--color-rule)] last:border-b-0 hover:bg-[var(--color-bg-sunken)] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-bg-soft)] ring-1 ring-[var(--color-rule)] flex items-center justify-center overflow-hidden shrink-0">
                          {m.profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.profile.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[11px] font-semibold text-[var(--color-ink-soft)]">
                              {(m.profile?.first_name?.[0] || "").toUpperCase()}
                              {(m.profile?.last_name?.[0] || "").toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-medium text-[var(--color-ink)] truncate">
                            {m.profile?.first_name} {m.profile?.last_name}
                          </div>
                          <div className="text-[11.5px] text-[var(--color-ink-muted)] truncate">
                            {m.profile?.email || m.email || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {memberRoles.map((role: string) => (
                          <span
                            key={role}
                            className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium border capitalize bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)] border-[var(--color-rule)]"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {enrollments.length === 0 ? (
                        <span className="text-[12px] text-[var(--color-ink-muted)]">
                          —
                        </span>
                      ) : (
                        <span className="text-[12.5px] tabular-nums text-[var(--color-ink-soft)]">
                          {activeEnrollments.length} active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const subs: any[] = m.subscriptions || [];
                        const activeSubs = subs.filter((s) => s.status === "active");
                        if (activeSubs.length === 0) {
                          return (
                            <span className="text-[12px] text-[var(--color-ink-muted)]">—</span>
                          );
                        }
                        return (
                          <span className="text-[12.5px] tabular-nums text-[var(--color-ink-soft)]">
                            {activeSubs.length} active
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium border ${
                          isActive
                            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule)]"
                            : "bg-[var(--color-bg-soft)] text-[var(--color-ink-muted)] border-[var(--color-rule)]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive
                              ? "bg-[var(--color-accent)]"
                              : "bg-[var(--color-ink-faint)]"
                          }`}
                        />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {filtered.length > MEMBER_PAGE_SIZES[0] && (
          <MembersPaginationBar
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        )}
      </div>

      {showAdd && (
        <AddMemberModal
          gymId={gymId}
          onClose={() => setShowAdd(false)}
          onAdded={async () => {
            setShowAdd(false);
            await onReload();
          }}
        />
      )}
    </section>
  );
}

function AddMemberModal({
  gymId,
  onClose,
  onAdded,
}: {
  gymId: string;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<Array<"member" | "coach" | "admin">>([
    "member",
  ]);
  const [gender, setGender] = useState<
    "male" | "female" | "other" | "prefer_not_to_say"
  >("male");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(r: "member" | "coach" | "admin") {
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || saving) return;
    if (roles.length === 0) {
      setError("Select at least one role.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/gyms/${gymId}/members`, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          roles,
          gender,
        }),
      });
      await onAdded();
    } catch (err: any) {
      setError(err?.message || "Failed to add member");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(10,10,10,0.45)] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-title"
    >
      <div
        className="w-full max-w-md bg-[var(--color-bg-card)] rounded-2xl shadow-[var(--shadow-lifted)] border border-[var(--color-rule)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-[var(--color-rule)]">
          <div>
            <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-accent)] font-medium mb-1">
              New member
            </div>
            <h3
              id="add-member-title"
              className="font-display text-2xl font-semibold tracking-tight leading-tight"
            >
              Add a member
            </h3>
            <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
              They must already have a {APP_NAME} account.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-md border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="am-email" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
              Email address
            </label>
            <input
              id="am-email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Initial roles</label>
            <div className="flex flex-wrap gap-1.5">
              {(["member", "coach", "admin"] as const).map((r) => {
                const active = roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    aria-pressed={active}
                    className={`h-8 px-3.5 rounded-full text-[13px] font-medium capitalize border transition-colors ${
                      active
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule-strong)]"
                        : "bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] border-[var(--color-rule)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)]"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {r}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              Select one or more. You can change roles anytime from the members
              table.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Gender</label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                  {
                    value: "prefer_not_to_say",
                    label: "Prefer not to say",
                  },
                ] as const
              ).map((opt) => {
                const active = gender === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    aria-pressed={active}
                    className={`h-8 px-3.5 rounded-full text-[13px] font-medium border transition-colors ${
                      active
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] border-[var(--color-accent-rule-strong)]"
                        : "bg-[var(--color-bg-card)] text-[var(--color-ink-soft)] border-[var(--color-rule)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-faint)]"
                    }`}
                  >
                    {active ? "✓ " : ""}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !email.trim() || roles.length === 0}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Adding…" : "Add member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------- Programs -------------------- */

function ProgramsPanel({
  programs,
  isAdmin,
  gymId,
  onProgramCreated,
}: {
  programs: any[];
  isAdmin: boolean;
  gymId: string;
  onProgramCreated?: () => void | Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <section>
      <PanelHeader
        eyebrow="Library"
        title="Programs"
        subtitle={
          isAdmin
            ? "Click a program to manage memberships and recurring classes."
            : "Programs offered by this gym."
        }
        action={
          isAdmin ? (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
            >
              <Plus size={14} strokeWidth={2.25} />
              New program
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <NewProgramModal
          gymId={gymId}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await onProgramCreated?.();
          }}
        />
      )}

      {programs.length === 0 ? (
        <div className="border border-[var(--color-rule)] rounded-xl p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
            <Dumbbell size={16} className="text-[var(--color-ink-muted)]" strokeWidth={1.75} />
          </div>
          <p className="text-[var(--color-ink-soft)] text-sm">
            {isAdmin
              ? "No programs yet. Create your first program to start adding classes and memberships."
              : "This gym has not published any programs yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {programs.map((program) => {
            const href = isAdmin
              ? `/gym/${gymId}/admin/programs/${program.id}/edit`
              : `/gym/${gymId}/programs/${program.id}`;
            const fmt = (d: string) =>
              new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            const range = program.start_date
              ? program.end_date
                ? `${fmt(program.start_date)} — ${fmt(program.end_date)}`
                : `${fmt(program.start_date)} — Ongoing`
              : null;
            return (
              <Link
                key={program.id}
                href={href}
                className="group relative block border border-[var(--color-rule)] rounded-xl p-5 bg-[var(--color-bg-card)] hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-soft)] transition-all no-underline text-[var(--color-ink)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {range && (
                      <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] tabular-nums mb-1.5">
                        {range}
                      </div>
                    )}
                    <h3 className="font-display text-lg font-semibold leading-tight tracking-tight">
                      {program.name}
                    </h3>
                    {program.description && (
                      <p className="text-[13px] text-[var(--color-ink-soft)] mt-1.5 line-clamp-2 leading-relaxed">
                        {program.description}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight
                    size={16}
                    strokeWidth={1.75}
                    className="text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* -------------------- New Program modal -------------------- */

function NewProgramModal({
  gymId,
  onClose,
  onCreated,
}: {
  gymId: string;
  onClose: () => void;
  onCreated: (programId: string) => void | Promise<void>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch(`/gyms/${gymId}/programs`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });
      await onCreated(created?.id);
      if (created?.id) {
        router.push(`/gym/${gymId}/admin/programs/${created.id}/edit`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create program");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(10,10,10,0.45)] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-program-title"
    >
      <div
        className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-2xl shadow-[var(--shadow-lifted)] border border-[var(--color-rule)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-[var(--color-rule)]">
          <div>
            <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-accent)] font-medium mb-1">
              New program
            </div>
            <h3 id="new-program-title" className="font-display text-2xl font-semibold tracking-tight leading-tight">
              Create program
            </h3>
            <p className="text-[13px] text-[var(--color-ink-soft)] mt-1">
              Add a container for classes, memberships, and workouts.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-md border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="np-name" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
              Program name
            </label>
            <input
              id="np-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Strength & Conditioning"
              className="h-10 rounded-md border border-[var(--color-rule-strong)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="np-desc" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
              Description <span className="font-normal">(optional)</span>
            </label>
            <textarea
              id="np-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this program is about, who it's for, etc."
              rows={3}
              className="rounded-md border border-[var(--color-rule-strong)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="np-start" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                Start date
              </label>
              <input
                id="np-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-md border border-[var(--color-rule-strong)] px-3 text-sm bg-[var(--color-bg-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="np-end" className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
                End date <span className="font-normal">(optional)</span>
              </label>
              <input
                id="np-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-md border border-[var(--color-rule-strong)] px-3 text-sm bg-[var(--color-bg-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Creating…" : "Create & continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------- Memberships (gym-level) -------------------- */

type MembershipFormState = {
  name: string;
  price: string;
  type: "monthly" | "annual" | "count";
  class_count: string;
  program_ids: string[];
};

const emptyMembershipForm: MembershipFormState = {
  name: "",
  price: "",
  type: "monthly",
  class_count: "",
  program_ids: [],
};

// Parse a user-typed dollar amount into integer cents (e.g. "19.99" → 1999).
function parsePriceToCents(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const dollars = parseFloat(cleaned);
  if (!Number.isFinite(dollars) || dollars < 0) return 0;
  return Math.round(dollars * 100);
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function MembershipsPanel({
  gymId,
  programs,
}: {
  gymId: string;
  programs: any[];
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MembershipFormState>(emptyMembershipForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "monthly" | "annual" | "count">("all");

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  async function loadPlans() {
    setLoading(true);
    try {
      const data = await apiFetch(`/gyms/${gymId}/plans`);
      setPlans(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyMembershipForm);
    setShowForm(false);
    setError(null);
  }

  function startCreate() {
    setForm(emptyMembershipForm);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      price_cents: parsePriceToCents(form.price),
      type: form.type,
      class_count:
        form.type === "count" ? parseInt(form.class_count) || null : null,
      program_ids: form.program_ids,
    };
    try {
      await apiFetch(`/gyms/${gymId}/plans`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      resetForm();
      loadPlans();
    } catch (err: any) {
      setError(err?.message || "Failed to save membership");
    } finally {
      setSaving(false);
    }
  }

  function toggleProgram(programId: string) {
    setForm((prev) => ({
      ...prev,
      program_ids: prev.program_ids.includes(programId)
        ? prev.program_ids.filter((id) => id !== programId)
        : [...prev.program_ids, programId],
    }));
  }

  function renderForm() {
    return (
      <div className="rounded-xl p-5 mb-4 border bg-[var(--color-bg-card)] border-[var(--color-rule)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-rule)]" />
          <h3 className="font-display text-base font-semibold tracking-tight">
            New membership
          </h3>
        </div>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_9rem] gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Name</label>
              <input
                className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                placeholder="e.g. Monthly Unlimited"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)] pointer-events-none tabular-nums">
                  $
                </span>
                <input
                  inputMode="decimal"
                  placeholder="99.00"
                  className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] pl-6 pr-3 text-sm w-full tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                  value={form.price}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*(?:\.\d{0,2})?$/.test(v)) {
                      setForm({ ...form, price: v });
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Billing</label>
            <div className="flex gap-1.5 p-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] w-fit">
              {(["monthly", "annual", "count"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`h-7 px-3 rounded text-xs font-medium capitalize transition-colors ${
                    form.type === t
                      ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-sm"
                      : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {t === "count" ? "Class pack" : t}
                </button>
              ))}
            </div>
            {form.type === "count" && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  inputMode="numeric"
                  placeholder="10"
                  className="h-9 w-24 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
                  value={form.class_count}
                  onChange={(e) => setForm({ ...form, class_count: e.target.value })}
                />
                <span className="text-[13px] text-[var(--color-ink-muted)]">classes included</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">Applies to programs</label>
            {programs.length === 0 ? (
              <span className="text-xs text-[var(--color-ink-muted)]">
                No programs yet. Without a program this plan grants gym-wide access.
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {programs.map((p) => {
                  const checked = form.program_ids.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProgram(p.id)}
                      className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-colors ${
                        checked
                          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                          : "border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              Leave empty for gym-wide access (no program filter).
            </span>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={resetForm}
              className="h-9 px-3 rounded-md text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-soft)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Add membership"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <p className="text-[var(--color-ink-soft)]">Loading memberships…</p>;

  const programsById = new Map<string, any>(programs.map((p) => [p.id, p]));
  const filteredPlans =
    typeFilter === "all" ? plans : plans.filter((p) => p.type === typeFilter);
  const typeCounts = {
    all: plans.length,
    monthly: plans.filter((p) => p.type === "monthly").length,
    annual: plans.filter((p) => p.type === "annual").length,
    count: plans.filter((p) => p.type === "count").length,
  };
  const totalSubscribers = plans.reduce(
    (sum, p) => sum + (p.subscriber_count || 0),
    0,
  );
  const billingLabel = (t: string) =>
    t === "monthly" ? "/ month" : t === "annual" ? "/ year" : "one-time";

  return (
    <section>
      <PanelHeader
        eyebrow="Billing"
        title="Memberships"
        subtitle="Pricing plans members can subscribe to. Each can apply to one or more programs."
        action={
          !showForm ? (
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-medium hover:bg-[var(--color-accent-rich)] transition-colors"
            >
              <Plus size={14} strokeWidth={2.25} />
              New membership
            </button>
          ) : undefined
        }
      />

      {plans.length > 0 && (
        <div className="grid grid-cols-3 border border-[var(--color-rule)] rounded-xl overflow-hidden mb-5 bg-[var(--color-bg-card)]">
          <div className="px-5 py-3.5 border-r border-[var(--color-rule)]">
            <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] font-medium">Plans</div>
            <div className="font-display text-2xl font-semibold tabular-nums mt-0.5">{plans.length}</div>
          </div>
          <div className="px-5 py-3.5 border-r border-[var(--color-rule)]">
            <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] font-medium">Active subscribers</div>
            <div className="font-display text-2xl font-semibold tabular-nums mt-0.5">{totalSubscribers}</div>
          </div>
          <div className="px-5 py-3.5">
            <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] font-medium">Programs linked</div>
            <div className="font-display text-2xl font-semibold tabular-nums mt-0.5">{programs.length}</div>
          </div>
        </div>
      )}

      {showForm && renderForm()}

      {plans.length > 0 && !showForm && (
        <div className="flex gap-1.5 p-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-bg-soft)] w-fit mb-4">
          {(["all", "monthly", "annual", "count"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`h-7 px-3 rounded text-xs font-medium capitalize transition-colors flex items-center gap-1.5 ${
                typeFilter === t
                  ? "bg-[var(--color-bg-card)] text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}
            >
              {t === "count" ? "Class pack" : t === "all" ? "All" : t}
              <span
                className={`tabular-nums text-[10px] px-1.5 rounded-full ${
                  typeFilter === t
                    ? "bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]"
                    : "bg-[var(--color-bg-card)] text-[var(--color-ink-muted)]"
                }`}
              >
                {typeCounts[t]}
              </span>
            </button>
          ))}
        </div>
      )}

      {plans.length === 0 && !showForm ? (
        <div className="border border-[var(--color-rule)] rounded-xl p-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center mb-3">
            <CreditCard size={16} className="text-[var(--color-ink-muted)]" strokeWidth={1.75} />
          </div>
          <p className="text-[var(--color-ink-soft)] text-sm">
            No memberships yet. Add one so members can subscribe.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPlans.map((plan) => (
            <Link
              key={plan.id}
              href={`/gym/${gymId}/admin/memberships/${plan.id}/edit`}
              className="group relative border border-[var(--color-rule)] rounded-xl p-5 bg-[var(--color-bg-card)] hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-soft)] transition-all flex flex-col"
            >
              <ArrowUpRight
                size={14}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-ink-soft)]"
              />
              <div className="flex items-start justify-between gap-3 pr-5">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] font-medium capitalize">
                    {plan.type === "count" ? "Class pack" : plan.type}
                  </div>
                  <h3 className="font-display text-lg font-semibold leading-tight tracking-tight mt-0.5">
                    {plan.name}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-[11px] font-semibold tabular-nums">
                  <Users size={10} strokeWidth={2.25} />
                  {plan.subscriber_count || 0}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 mt-4">
                <span className="font-display text-3xl font-semibold tabular-nums tracking-tight">
                  {formatPrice(plan.price_cents)}
                </span>
                <span className="text-xs text-[var(--color-ink-muted)]">
                  {billingLabel(plan.type)}
                </span>
                {plan.type === "count" && plan.class_count && (
                  <span className="text-xs text-[var(--color-ink-soft)] ml-1">
                    · {plan.class_count} classes
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--color-rule)] flex-1">
                <div className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] font-medium mb-2">
                  Programs
                </div>
                <div className="flex flex-wrap gap-1">
                  {(plan.program_ids || []).length === 0 ? (
                    <span className="text-xs text-[var(--color-ink-muted)]">
                      Gym-wide access
                    </span>
                  ) : (
                    (plan.program_ids as string[]).map((pid) => (
                      <span
                        key={pid}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-[var(--color-rule)] bg-[var(--color-bg-soft)] text-[var(--color-ink-soft)]"
                      >
                        {programsById.get(pid)?.name || "Unknown"}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------- Settings -------------------- */

function SettingsPanel({
  gym,
  onSaved,
}: {
  gym: any;
  onSaved: (updated: any) => void;
}) {
  const [name, setName] = useState<string>(gym?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAt, setSuccessAt] = useState<number | null>(null);

  useEffect(() => {
    setName(gym?.name || "");
  }, [gym?.id, gym?.name]);

  const dirty = name.trim() !== (gym?.name || "").trim();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch(`/gyms/${gym.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: trimmed }),
      });
      onSaved(updated);
      setSuccessAt(Date.now());
    } catch (err: any) {
      setError(err?.message || "Failed to update gym");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-lg">
      <PanelHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Update your gym's details."
      />

      <form
        onSubmit={handleSave}
        className="border border-[var(--color-rule)] rounded-xl bg-[var(--color-bg-card)] p-5 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] font-medium">
            Gym name
          </label>
          <input
            className="h-10 rounded-md border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/15 focus:border-[var(--color-ink)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}
        {successAt && !error && (
          <div className="rounded-md border border-[var(--color-accent-rule)] bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-sm px-3 py-2">
            Settings saved.
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving || !dirty || !name.trim()}
            className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-rich)] disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
