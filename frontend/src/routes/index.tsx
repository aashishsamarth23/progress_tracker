import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Atom, FlaskConical, Leaf, Bug, Plus, Check, Trash2, RotateCcw,
  Target, BookOpen, Inbox, Radar, Sparkles, Calendar, TrendingUp,
  AlertTriangle, ChevronDown, ChevronRight, PartyPopper, Flame, LayoutDashboard
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "NEET Progress Tracker" }] }),
  component: Index,
});

/* ---------------- API LAYER ---------------- */
const API_BASE = "https://progress-tracker-2z5q.onrender.com";

type TaskStatus = "completed" | "pending";
type SubjectName = "Physics" | "Chemistry" | "Botany" | "Zoology";

interface MasterTask { task_id: string; name: string; status: TaskStatus; is_relevant?: boolean }
interface Chapter { chapter_id: string; name: string; completion_percentage: number; tasks: MasterTask[]; is_flagged?: boolean; }
interface SubjectData { overall_progress: number; color_theme: string; chapters: Chapter[] }
interface DailyDay { date: string; chapter_id: string; chapter_name: string; tasks: MasterTask[] }
interface BacklogDay { original_date: string; chapter_id: string; chapter_name: string; tasks: MasterTask[] }
interface MockTest { date: string; score: number; flagged_chapter_ids: string[] }

interface ProgressState {
  subjects: Record<SubjectName, SubjectData>;
  daily_target: DailyDay[];
  backlog: BacklogDay[];
  mock_tests: MockTest[];
}

const today = () => new Date().toISOString().slice(0, 10);

async function apiCall<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

const SUBJECT_META: Record<SubjectName, any> = {
  Physics:   { icon: Atom,         text: "text-red-500",   bg: "bg-red-50",   ring: "ring-red-200",   bar: "bg-red-500",   dot: "bg-red-500",   hex: "#ef4444" },
  Chemistry: { icon: FlaskConical, text: "text-blue-500",  bg: "bg-blue-50",  ring: "ring-blue-200",  bar: "bg-blue-500",  dot: "bg-blue-500",  hex: "#3b82f6" },
  Botany:    { icon: Leaf,         text: "text-green-500", bg: "bg-green-50", ring: "ring-green-200", bar: "bg-green-500", dot: "bg-green-500", hex: "#22c55e" },
  Zoology:   { icon: Bug,          text: "text-amber-500", bg: "bg-amber-50", ring: "ring-amber-200", bar: "bg-amber-500", dot: "bg-amber-500", hex: "#f59e0b" },
};
const SUBJECTS: SubjectName[] = ["Physics", "Chemistry", "Botany", "Zoology"];

/* ---------------- ROOT COMPONENT ---------------- */
type ViewKey = "overview" | "daily" | "syllabus" | "backlog" | "radar";

function Index() {
  const [state, setState] = useState<ProgressState | null>(null);
  const [view, setView] = useState<ViewKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchState = () => {
    apiCall<ProgressState>("/api/progress", { method: "GET" })
      .then((data) => { setState(data); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchState(); }, []);

  const stats = useMemo(() => {
    if (!state || !state.subjects) return { avg: 0, done: 0, total: 0, backlogCount: 0, flagged: 0 };
    const allChapters = SUBJECTS.flatMap((s) => state.subjects[s]?.chapters || []);
    const avg = allChapters.length ? Math.round(allChapters.reduce((a, c) => a + c.completion_percentage, 0) / allChapters.length) : 0;
    const todaysTargets = state.daily_target.filter(t => t.date === today());
    const allDailyTasks = todaysTargets.flatMap(t => t.tasks);
    const done = allDailyTasks.filter((t) => t.status === "completed").length;
    const total = allDailyTasks.length;
    const backlogCount = state.backlog.reduce((a, d) => a + d.tasks.filter((t) => t.status !== "completed").length, 0);
    const flagged = allChapters.filter((c) => c.is_flagged).length;
    return { avg, done, total, backlogCount, flagged };
  }, [state]);

  if (loading) return <div className="mt-20 text-center text-slate-400">Loading mission control…</div>;
  if (error || !state || !state.subjects) return <div className="mt-20 text-center text-red-500">Awaiting database initialization from backend...</div>;
  
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-[1400px] gap-6 p-4 lg:p-6">
        <Sidebar view={view} setView={setView} stats={stats} />
        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          <TopBar stats={stats} />
          <div className="mt-6">
            {view === "overview" && <OverviewView    state={state} setView={setView} stats={stats} />}
            {view === "daily"    && <DailyTargetView state={state} refresh={fetchState} />}
            {view === "syllabus" && <SyllabusView    state={state} refresh={fetchState} />}
            {view === "backlog"  && <BacklogView     state={state} refresh={fetchState} />}
            {view === "radar"    && <RadarView       state={state} refresh={fetchState} />}
          </div>
        </main>
      </div>
      <MobileNav view={view} setView={setView} />
    </div>
  );
}

/* ---------------- DASHBOARD COMPONENTS ---------------- */
function Sidebar({ view, setView, stats }: any) {
  const items = [
    { key: "overview", label: "Dashboard",      icon: LayoutDashboard },
    { key: "daily",    label: "Daily Target",   icon: Target },
    { key: "syllabus", label: "Master Syllabus",icon: BookOpen, badge: `${stats.avg}%` },
    { key: "backlog",  label: "Backlog",        icon: Inbox,    badge: stats.backlogCount || undefined },
    { key: "radar",    label: "Weakness Radar", icon: Radar,    badge: stats.flagged || undefined },
  ];
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-2 sticky top-6 self-start">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div><p className="text-sm font-semibold leading-tight">Hi Lashreen</p><p className="text-xs text-slate-500">RE-NEET 2026 Mission Control</p></div>
        </div>
      </div>
      <nav className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
        {items.map((it) => (
          <button key={it.key} onClick={() => setView(it.key as ViewKey)} className={`group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition ${view === it.key ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
            <span className="flex items-center gap-3"><it.icon className={`h-4 w-4 ${view === it.key ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`} />{it.label}</span>
            {it.badge && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${view === it.key ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>{it.badge}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function MobileNav({ view, setView }: any) {
  const items = [
    { key: "overview", label: "Home",     icon: LayoutDashboard },
    { key: "daily",    label: "Daily",    icon: Target },
    { key: "syllabus", label: "Syllabus", icon: BookOpen },
    { key: "backlog",  label: "Backlog",  icon: Inbox },
    { key: "radar",    label: "Radar",    icon: Radar },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-3 pb-safe lg:hidden">
      {items.map((it) => (
        <button key={it.key} onClick={() => setView(it.key as ViewKey)} className={`flex flex-col items-center gap-1 transition-colors ${view === it.key ? "text-indigo-600" : "text-slate-400"}`}>
          <it.icon className={`h-5 w-5 ${view === it.key ? "scale-110" : ""}`} strokeWidth={view === it.key ? 2.5 : 2} />
          <span className="text-[10px] font-semibold tracking-wide">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function TopBar({ stats }: any) {
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Today</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{dateLabel}</h1>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Target className="h-4 w-4" /></div><div><p className="text-[11px] uppercase tracking-wider text-slate-400">Today</p><p className="text-base font-bold leading-tight">{stats.done}/{stats.total || 0}</p></div></div>
        <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><TrendingUp className="h-4 w-4" /></div><div><p className="text-[11px] uppercase tracking-wider text-slate-400">Syllabus</p><p className="text-base font-bold leading-tight">{stats.avg}%</p></div></div>
        <div className="hidden md:block min-w-[180px]">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>Daily focus</span><span className="font-semibold text-slate-700">{pct}%</span></div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

function OverviewView({ state, setView, stats }: any) {
  const dailyPct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const CircularProgress = ({ pct, color, size = 120, stroke = 12 }: any) => {
    const radius = (size - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (pct / 100) * circumference;
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="transparent" className="text-slate-100" />
          <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={stroke} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
        </svg>
        <span className="absolute text-xl font-bold text-slate-800">{pct}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Overall Mastery</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-[200px]">Combined completion of all relevant tasks across the 4 subjects.</p>
              <button onClick={() => setView("syllabus")} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">View Syllabus <ChevronRight className="w-4 h-4" /></button>
            </div>
            <CircularProgress pct={stats.avg} color="#6366f1" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Today's Velocity</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-[200px]">{stats.done} out of {stats.total} tasks completed so far today.</p>
              <button onClick={() => setView("daily")} className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">Open Daily Target <ChevronRight className="w-4 h-4" /></button>
            </div>
            <CircularProgress pct={dailyPct} color="#10b981" />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Subject Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SUBJECTS.map((s) => {
            const data = state.subjects[s];
            const meta = SUBJECT_META[s];
            return (
              <div key={s} className="flex items-center gap-4">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${meta.bg} ${meta.text}`}><meta.icon className="h-6 w-6" /></div>
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-2"><span className="font-semibold text-slate-800">{s}</span><span className="text-sm font-bold text-slate-600">{data.overall_progress}%</span></div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full transition-all duration-1000 rounded-full" style={{ width: `${data.overall_progress}%`, backgroundColor: meta.hex }} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div onClick={() => setView("radar")} className="cursor-pointer group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 to-white p-6 ring-1 ring-rose-100 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-500 group-hover:scale-110 transition-transform"><Radar className="h-5 w-5" /></div><div><h3 className="font-semibold text-slate-900">Weakness Radar</h3><p className="text-sm text-slate-500">Flagged Chapters</p></div></div>
            <span className="text-3xl font-bold text-rose-500">{stats.flagged}</span>
          </div>
        </div>
        <div onClick={() => setView("backlog")} className="cursor-pointer group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-white p-6 ring-1 ring-slate-200 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-200 text-slate-600 group-hover:scale-110 transition-transform"><Inbox className="h-5 w-5" /></div><div><h3 className="font-semibold text-slate-900">The Backlog</h3><p className="text-sm text-slate-500">Pending Tasks</p></div></div>
            <span className="text-3xl font-bold text-slate-600">{stats.backlogCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- DAILY TARGET VIEW ---------------- */
function DailyTargetView({ state, refresh }: { state: ProgressState; refresh: () => void }) {
  const [subject, setSubject] = useState<SubjectName>("Physics");
  const chapters = state.subjects[subject].chapters;
  const [chapterId, setChapterId] = useState(chapters[0]?.chapter_id || "");
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [newTasks, setNewTasks] = useState<Record<string, string>>({});
  
  const dateStr = today();
  const todaysTargets = state.daily_target.filter(t => t.date === dateStr);
  const total = todaysTargets.reduce((acc, t) => acc + t.tasks.length, 0);
  const done = todaysTargets.reduce((acc, t) => acc + t.tasks.filter(x => x.status === "completed").length, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;

  useEffect(() => { setChapterId(state.subjects[subject].chapters[0]?.chapter_id || ""); }, [subject, state.subjects]);
  useEffect(() => { setOpenGroups(todaysTargets.map(t => t.chapter_id)); }, [todaysTargets.length]);

  const toggleGroup = (id: string) => setOpenGroups(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const importChapter = async () => {
    if (!chapterId) return;
    await apiCall("/api/daily/add", { method: "POST", body: JSON.stringify({ date_str: dateStr, subject, chapter_id: chapterId }) }).catch(() => {});
    refresh();
  };

  const addCustom = async (targChapterId: string) => {
    const txt = newTasks[targChapterId];
    if (!txt?.trim()) return;
    await apiCall("/api/daily/add", { method: "POST", body: JSON.stringify({ date_str: dateStr, subject, chapter_id: targChapterId, custom_task_name: txt.trim() }) }).catch(() => {});
    setNewTasks(prev => ({ ...prev, [targChapterId]: "" }));
    refresh();
  };

  const toggleTask = async (chapter_id: string, task_id: string, currentStatus: string) => {
    const next = currentStatus === "completed" ? "pending" : "completed";
    if (next === "completed") toast.success("Boom! One more down.");
    await apiCall("/api/daily/task", { method: "PUT", body: JSON.stringify({ date_str: dateStr, chapter_id, task_id, status: next }) }).catch(() => {});
    refresh();
  };

  const deleteTask = async (chapter_id: string, task_id: string) => {
    await apiCall(`/api/daily/task/${dateStr}/${chapter_id}/${task_id}`, { method: "DELETE" }).catch(() => {});
    toast.success("Deleted from daily target.");
    refresh();
  };

  const wrapUp = async () => {
    toast.success("Day wrapped! Synced & Cleared.");
    await apiCall("/api/daily/wrap-up", { method: "POST", body: JSON.stringify({ date_str: dateStr }) }).catch(() => {});
    refresh();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" /><h2 className="text-lg font-semibold">Today's Mission</h2></div>
            <span className="text-xs text-slate-400">{done} of {total} complete</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>

          <div className="mt-6 space-y-4">
            {todaysTargets.length === 0 && <EmptyState icon={PartyPopper} title="All clear!" sub="Import a chapter from the right to set your targets for today." />}
            
            {todaysTargets.map((group) => {
              const subjName = Object.keys(state.subjects).find(s => state.subjects[s as SubjectName].chapters.some(c => c.chapter_id === group.chapter_id)) || "Physics";
              const meta = SUBJECT_META[subjName as SubjectName];
              const isOpen = openGroups.includes(group.chapter_id);
              
              return (
                <div key={group.chapter_id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <button onClick={() => toggleGroup(group.chapter_id)} className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 ${isOpen ? "bg-slate-50 border-b border-slate-100" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`grid h-8 w-8 place-items-center rounded-lg ${meta.bg} ${meta.text}`}><meta.icon className="h-4 w-4" /></div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">{group.chapter_name}</h3>
                        <p className="text-[11px] font-medium text-slate-500">{group.tasks.filter(t => t.status === "completed").length} / {group.tasks.length} done</p>
                      </div>
                    </div>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </button>
                  
                  {isOpen && (
                    <div className="p-2 space-y-1">
                      {group.tasks.map((t) => {
                        const isDone = t.status === "completed";
                        return (
                          <div key={t.task_id} className={`group flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-slate-50 ${isDone ? "opacity-70" : ""}`}>
                            <button onClick={() => toggleTask(group.chapter_id, t.task_id, t.status)} className={`grid h-5 w-5 place-items-center rounded-md border transition ${isDone ? `${meta.bar} border-transparent text-white scale-110` : "border-slate-300 hover:border-slate-900"}`}>
                              {isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            </button>
                            <span className={`flex-1 text-sm text-slate-700 transition-all ${isDone ? "line-through text-slate-400" : ""}`}>{t.name}</span>
                            
                            {/* Hover-to-Delete Button */}
                            <button onClick={() => deleteTask(group.chapter_id, t.task_id)} className="opacity-0 group-hover:opacity-100 rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all" title="Delete Task">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      <div className="flex gap-2 px-3 pt-2 pb-1">
                        <input value={newTasks[group.chapter_id] || ""} onChange={(e) => setNewTasks(p => ({ ...p, [group.chapter_id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addCustom(group.chapter_id)} placeholder="Add task to this chapter..." className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-slate-900 focus:bg-white focus:outline-none" />
                        <button onClick={() => addCustom(group.chapter_id)} className="rounded-lg bg-slate-100 px-2.5 text-slate-600 hover:bg-slate-200"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={wrapUp} disabled={total === 0} className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            Wrap Up Day (Sync & Clear) →
          </button>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <h3 className="text-sm font-semibold text-slate-900">Import Master Chapter</h3>
          <p className="mt-0.5 text-xs text-slate-500">Pull a chapter's master checklist into today's mission.</p>
          <div className="mt-4 space-y-3">
            <SubjectSelect value={subject} onChange={setSubject} />
            <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none">
              {chapters.map((c) => <option key={c.chapter_id} value={c.chapter_id}>{c.name}</option>)}
            </select>
            <button onClick={importChapter} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              <Plus className="h-4 w-4" /> Import to Today
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- MASTER SYLLABUS ---------------- */
function SyllabusView({ state, refresh }: { state: ProgressState; refresh: () => void }) {
  const [tab, setTab] = useState<SubjectName>("Physics");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newTaskStr, setNewTaskStr] = useState("");
  const meta = SUBJECT_META[tab];

  const updateTaskStatus = async (chapter_id: string, task_id: string, currentStatus: string) => {
    const next = currentStatus === "completed" ? "pending" : "completed";
    await apiCall("/api/master/task", { method: "PUT", body: JSON.stringify({ subject: tab, chapter_id, task_id, status: next }) }).catch(() => {});
    refresh();
  };

  const deleteMasterTask = async (chapter_id: string, task_id: string) => {
    await apiCall(`/api/master/task/${tab}/${chapter_id}/${task_id}`, { method: "DELETE" }).catch(() => {});
    refresh();
  };

  const addMasterTask = async (chapter_id: string) => {
    if (!newTaskStr.trim()) return;
    await apiCall("/api/master/task/add", { method: "POST", body: JSON.stringify({ subject: tab, chapter_id, task_name: newTaskStr.trim() }) }).catch(() => {});
    setNewTaskStr("");
    refresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
        {SUBJECTS.map((s) => {
          const m = SUBJECT_META[s];
          return (
            <button key={s} onClick={() => { setTab(s); setOpenId(null); }} className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${tab === s ? `${m.bg} ${m.text} ring-1 ${m.ring}` : "text-slate-500 hover:bg-slate-50"}`}>
              <m.icon className="h-4 w-4" /> {s}
            </button>
          );
        })}
      </div>

      <Card>
        <div className="space-y-2">
          {state.subjects[tab].chapters.map((ch) => {
            const open = openId === ch.chapter_id;
            return (
              <div key={ch.chapter_id} className="rounded-xl border border-slate-100 bg-white transition hover:border-slate-200">
                <button onClick={() => setOpenId(open ? null : ch.chapter_id)} className="flex w-full items-center gap-4 px-4 py-3 text-left">
                  {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <span className="flex-1 text-sm font-medium text-slate-900">{ch.name}</span>
                  <div className="hidden sm:block w-40">
                    <div className="flex items-center justify-between text-[11px] text-slate-500"><span>Progress</span><span className="font-semibold">{ch.completion_percentage}%</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${meta.bar} transition-all duration-500`} style={{ width: `${ch.completion_percentage}%` }} />
                    </div>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                    {ch.tasks.map((t) => {
                      const done = t.status === "completed";
                      return (
                        <div key={t.task_id} className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50">
                          <button onClick={() => updateTaskStatus(ch.chapter_id, t.task_id, t.status)} className={`grid h-5 w-5 place-items-center rounded-md border transition ${done ? `${meta.bar} border-transparent text-white` : "border-slate-300"}`}>
                            {done && <Check className="h-3 w-3" strokeWidth={3} />}
                          </button>
                          <span className={`flex-1 text-sm ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>{t.name}</span>
                          <button onClick={() => deleteMasterTask(ch.chapter_id, t.task_id)} className="opacity-0 group-hover:opacity-100 rounded-md p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      );
                    })}
                    <div className="flex gap-2 px-3 pt-2">
                      <input value={newTaskStr} onChange={(e) => setNewTaskStr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMasterTask(ch.chapter_id)} placeholder="Add permanent task to syllabus..." className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-slate-900 focus:bg-white focus:outline-none" />
                      <button onClick={() => addMasterTask(ch.chapter_id)} className="rounded-lg bg-slate-100 px-2.5 text-slate-600 hover:bg-slate-200"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- BACKLOG (WITH DELETION) ---------------- */
function BacklogView({ state, refresh }: { state: ProgressState; refresh: () => void }) {
  const moveToToday = async (task: MasterTask, chapter_id: string, original_date: string) => {
    toast.success("Migrated back to today!");
    await apiCall("/api/backlog/move", { method: "POST", body: JSON.stringify({ original_date, target_date: today(), chapter_id, task_id: task.task_id }) }).catch(() => {});
    refresh();
  };

  const deleteFromBacklog = async (original_date: string, chapter_id: string, task_id: string) => {
    await apiCall(`/api/backlog/task/${original_date}/${chapter_id}/${task_id}`, { method: "DELETE" }).catch(() => {});
    toast.success("Deleted from backlog.");
    refresh();
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white"><Inbox className="h-4 w-4" /></div>
        <div><h2 className="text-lg font-semibold">Backlog Manager</h2><p className="text-xs text-slate-500">Unfinished tasks from previous days.</p></div>
      </div>

      {state.backlog.length === 0 ? (
        <EmptyState icon={Sparkles} title="Backlog clear!" sub="You're staying on top of everything. Keep that momentum." />
      ) : (
        <div className="space-y-5 animate-in fade-in duration-500">
          {state.backlog.map((g, idx) => {
            const subjectName = Object.keys(state.subjects).find(s => state.subjects[s as SubjectName].chapters.some(c => c.chapter_id === g.chapter_id)) || "Physics";
            const m = SUBJECT_META[subjectName as SubjectName];
            return (
              <div key={`${g.original_date}-${g.chapter_id}-${idx}`}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{new Date(g.original_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} — {g.chapter_name}</p>
                <ul className="space-y-2">
                  {g.tasks.map((t) => (
                    <li key={t.task_id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
                      <span className={`flex items-center gap-2 text-xs font-medium ${m.text}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{subjectName}</span>
                      <span className="flex-1 text-sm text-slate-700">{t.name}</span>
                      
                      <div className="flex gap-2">
                        <button onClick={() => moveToToday(t, g.chapter_id, g.original_date)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition">
                          Move to Today
                        </button>
                        {/* New Delete Button */}
                        <button onClick={() => deleteFromBacklog(g.original_date, g.chapter_id, t.task_id)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 hover:border-red-200" title="Delete forever">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ---------------- WEAKNESS RADAR (RESTORED FULLY) ---------------- */
function RadarView({ state, refresh }: { state: ProgressState; refresh: () => void }) {
  const [date, setDate] = useState(today());
  const [score, setScore] = useState<number>(0);
  const [picked, setPicked] = useState<string[]>([]);

  const allChapters = SUBJECTS.flatMap((s) => state.subjects[s].chapters.map((c) => ({ ...c, subject: s as SubjectName })));
  const flagged = allChapters.filter((c) => c.is_flagged);

  const togglePick = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const logTest = async () => {
    if (picked.length === 0) { toast.error("Pick at least one chapter to flag"); return; }
    toast.success(`Test logged · ${picked.length} chapter${picked.length > 1 ? "s" : ""} added to radar`);
    await apiCall("/api/radar/mock-test", { method: "POST", body: JSON.stringify({ date_str: date, score, flagged_chapter_ids: picked }) }).catch(() => {});
    setPicked([]); setScore(0);
    refresh();
  };

  const unflag = async (subject: SubjectName, chapterId: string) => {
    toast.success("Resolved! Weak spot defeated.");
    await apiCall(`/api/radar/unflag/${subject}/${chapterId}`, { method: "PUT" }).catch(() => {});
    refresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-500"><Radar className="h-4 w-4" /></div>
          <div>
            <h2 className="text-lg font-semibold">Log Mock Test</h2>
            <p className="text-xs text-slate-500">Be honest about where you struggled. That's where growth lives.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none" />
          </Field>
          <Field label="Score (out of 720)">
            <input type="number" value={score || ""} onChange={(e) => setScore(Number(e.target.value))} placeholder="e.g. 640" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none" />
          </Field>
          <Field label="Picked">
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{picked.length} chapters</div>
          </Field>
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Chapters I struggled with</p>
        <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-100 p-2">
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {allChapters.map((c) => {
              const m = SUBJECT_META[c.subject];
              const on = picked.includes(c.chapter_id);
              return (
                <button
                  key={c.chapter_id}
                  onClick={() => togglePick(c.chapter_id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${on ? `${m.bg} ${m.text} ring-1 ${m.ring}` : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                  <span className="flex-1">{c.name}</span>
                  {on && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={logTest} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          Log Test & Flag Weaknesses
        </button>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <h3 className="text-sm font-semibold">Red Alert · Active Weak Spots</h3>
        </div>
        {flagged.length === 0 ? (
          <div className="mt-4"><EmptyState icon={Sparkles} title="Radar is clear." sub="No active weak spots. Log your next mock to keep sharpening." /></div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {flagged.map((c) => {
              const m = SUBJECT_META[c.subject];
              return (
                <div key={c.chapter_id} className={`rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/70 to-white p-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`flex items-center gap-2 text-xs font-medium ${m.text}`}><m.icon className="h-3.5 w-3.5" />{c.subject}</p>
                      <h4 className="mt-1 text-sm font-semibold text-slate-900">{c.name}</h4>
                    </div>
                    <button onClick={() => unflag(c.subject, c.chapter_id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">Resolve</button>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {c.tasks.filter((t) => t.is_relevant !== false).map((t) => (
                      <li key={t.task_id} className="flex items-center gap-2 text-xs text-slate-600">
                        <span className={`grid h-3.5 w-3.5 place-items-center rounded-sm border ${t.status === "completed" ? `${m.bar} border-transparent text-white` : "border-slate-300"}`}>
                          {t.status === "completed" && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                        </span>
                        <span className={t.status === "completed" ? "line-through text-slate-400" : ""}>{t.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- SHARED COMPONENTS ---------------- */
function Card({ children }: { children: React.ReactNode }) { return <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">{children}</div>; }

function SubjectSelect({ value, onChange }: any) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {SUBJECTS.map((s) => {
        const m = SUBJECT_META[s];
        return (
          <button key={s} onClick={() => onChange(s)} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium transition ${value === s ? `${m.bg} ${m.text} ring-1 ${m.ring}` : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
            <m.icon className="h-4 w-4" />{s}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: any) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-500"><Icon className="h-5 w-5" /></div>
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500 max-w-xs">{sub}</p>
    </div>
  );
}

/* Restored Field Component for RadarView! */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}