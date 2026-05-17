import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Calendar, Coins, ShieldCheck, ShieldAlert, Compass, 
  CheckSquare, Square, MapPin, Activity as ActIcon, ClipboardList, Plus,
  Pencil, Trash2, X, Check, FileDown, Bell, Save
} from 'lucide-react';
import { sharingService } from '../services/sharingService';
import { checklistService } from '../services/checklistService';
import { destinationService } from '../services/destinationService';
import { activityService } from '../services/activityService';
import { expenseService } from '../services/expenseService';
import { travelPlanService } from '../services/travelPlanService';
import type { TravelPlan, ActivityStatus, ExpenseCategory, Destination, Activity, Expense } from '../models/types';
import { Button } from '../components/ui/Button';
import { TravelMap } from '../components/TravelMap';

const ACTIVITY_STATUSES: ActivityStatus[] = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];

const ACTIVITY_STATUS_MAP: Record<ActivityStatus, number> = { 'Planned': 0, 'Reserved': 1, 'Completed': 2, 'Cancelled': 3 };
const EXPENSE_CATEGORY_MAP: Record<ExpenseCategory, number> = { 'Transport': 0, 'Accommodation': 1, 'Food': 2, 'Tickets': 3, 'Shopping': 4, 'Other': 5 };

const STATUS_LABELS = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const CATEGORY_LABELS = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];

type ViewTab = 'overview' | 'destinations' | 'activities' | 'expenses' | 'checklist' | 'reminders' | 'map';

interface Reminder { id: string; text: string; datetime: string; fired: boolean; }

export const SharedPlanView = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);

  const isEditMode = searchParams.get('perm') === '1';

  // --- Creation Forms ---
  const [destForm, setDestForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });
  const [actForm, setActForm] = useState({ name: '', description: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });
  const [expForm, setExpForm] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });
  const [checkForm, setCheckForm] = useState({ title: '' });

  // --- Edit States ---
  const [editingPlan, setEditingPlan] = useState(false);
  const [planEditForm, setPlanEditForm] = useState({ name: '', description: '', startDate: '', endDate: '', budget: 0, notes: '' });

  const [editingDestId, setEditingDestId] = useState<number | null>(null);
  const [destEditForm, setDestEditForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });

  const [editingActId, setEditingActId] = useState<number | null>(null);
  const [actEditForm, setActEditForm] = useState({ name: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });

  const [editingExpId, setEditingExpId] = useState<number | null>(null);
  const [expEditForm, setExpEditForm] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });

  // --- Reminders ---
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderForm, setReminderForm] = useState({ text: '', datetime: '' });
  const reminderTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const validateAndFetchSharedPlan = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const authValidation = await sharingService.validateToken(token);
      if (!authValidation.isValid) throw new Error(authValidation.reason || "This token lacks validation structural alignment.");
      const planData = await sharingService.getSharedPlan(authValidation.travelPlanId, token);
      setPlan(planData);
    } catch (err: any) {
      setError(err.message || "This shared validation token has expired or is invalid.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { validateAndFetchSharedPlan(); }, [token]);

  // Load reminders safely once the plan exists
  useEffect(() => {
    if (plan) {
      try {
        const stored = JSON.parse(localStorage.getItem(`reminders_${plan.id}`) || '[]');
        setReminders(stored);
        stored.forEach((r: Reminder) => { if (!r.fired) scheduleNotification(r, plan.id); });
      } catch {}
    }
    return () => { reminderTimers.current.forEach(t => clearTimeout(t)); };
  }, [plan?.id]);

  const handleReload = async () => {
    if (!plan || !token) return;
    const planData = await sharingService.getSharedPlan(plan.id, token);
    setPlan(planData);
  };

  // --- Reminders Logic ---
  const saveReminders = (updated: Reminder[], planId: number) => {
    setReminders(updated);
    localStorage.setItem(`reminders_${planId}`, JSON.stringify(updated));
  };

  const scheduleNotification = (r: Reminder, planId: number) => {
    const ms = new Date(r.datetime).getTime() - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => {
      if (Notification.permission === 'granted') new Notification('Chronicles Reminder', { body: r.text });
      else alert(`Reminder: ${r.text}`);
      setReminders(prev => {
        const updated = prev.map(x => x.id === r.id ? { ...x, fired: true } : x);
        localStorage.setItem(`reminders_${planId}`, JSON.stringify(updated));
        return updated;
      });
    }, ms);
    reminderTimers.current.set(r.id, t);
  };

  const addReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !reminderForm.text.trim() || !reminderForm.datetime) return;
    const r: Reminder = { id: Date.now().toString(), text: reminderForm.text.trim(), datetime: reminderForm.datetime, fired: false };
    const updated = [...reminders, r];
    saveReminders(updated, plan.id);
    scheduleNotification(r, plan.id);
    if (Notification.permission === 'default') Notification.requestPermission();
    setReminderForm({ text: '', datetime: '' });
  };

  const deleteReminder = (rid: string) => {
    if (!plan) return;
    const t = reminderTimers.current.get(rid);
    if (t) clearTimeout(t);
    reminderTimers.current.delete(rid);
    saveReminders(reminders.filter(r => r.id !== rid), plan.id);
  };

  // --- PDF Export ---
  const handleExportPdf = () => {
    if (!plan) return;
    const lines: string[] = [];
    lines.push(`SHARED TRAVEL PLAN: ${plan.name}`);
    lines.push(`Period: ${plan.startDate?.substring(0, 10)} — ${plan.endDate?.substring(0, 10)}`);
    lines.push(`Budget: ${plan.budget} | Spent: ${plan.totalExpenses} | Remaining: ${plan.remainingBudget}`);
    if (plan.description) lines.push(`\nDescription: ${plan.description}`);
    if (plan.notes) lines.push(`Notes: ${plan.notes}`);

    if (plan.destinations?.length) {
      lines.push('\n--- DESTINATIONS ---');
      plan.destinations.forEach((d: any) => lines.push(`• ${d.name}: ${d.arrivalDate?.substring(0, 10)} → ${d.departureDate?.substring(0, 10)}`));
    }
    if (plan.activities?.length) {
      lines.push('\n--- ACTIVITIES ---');
      plan.activities.forEach((a: any) => lines.push(`• ${a.name} | ${a.date?.substring(0, 10)} @ ${a.date?.substring(11, 16)} | ${a.location || 'TBD'} | ${typeof a.status === 'number' ? STATUS_LABELS[a.status] : a.status}`));
    }
    if (plan.expenses?.length) {
      lines.push('\n--- EXPENSES ---');
      plan.expenses.forEach((e: any) => lines.push(`• ${e.name} (${typeof e.category === 'number' ? CATEGORY_LABELS[e.category] : e.category}): ${e.amount} Coins`));
    }
    if (plan.checklistItems?.length) {
      lines.push('\n--- CHECKLIST ---');
      plan.checklistItems.forEach((c: any) => lines.push(`[${c.isCompleted ? 'x' : ' '}] ${c.name}`));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.name.replace(/\s+/g, '_')}_shared_plan.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- CRUD Operations ---

  // Plan Edit
  const startEditPlan = () => {
    if (!plan || !isEditMode) return;
    setPlanEditForm({ name: plan.name, description: plan.description || '', startDate: plan.startDate?.substring(0, 10), endDate: plan.endDate?.substring(0, 10), budget: plan.budget, notes: plan.notes || '' });
    setEditingPlan(true);
  };

  const savePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !isEditMode) return;
    if (new Date(planEditForm.endDate) < new Date(planEditForm.startDate)) { alert("End date cannot precede start date."); return; }
    if (planEditForm.budget < 0) { alert("Budget cannot be negative."); return; }
    try {
      await travelPlanService.update(plan.id, planEditForm);
      setEditingPlan(false);
      await handleReload();
    } catch { alert("Failed to update plan."); }
  };

  // Destinations
  const addDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !isEditMode || !destForm.name || !destForm.arrivalDate || !destForm.departureDate) return;
    if (new Date(destForm.departureDate) < new Date(destForm.arrivalDate)) { alert("Departure cannot precede arrival."); return; }
    try {
      await destinationService.create(plan.id, { name: destForm.name, location: destForm.name, arrivalDate: destForm.arrivalDate, departureDate: destForm.departureDate, description: destForm.description || '', notes: '' });
      setDestForm({ name: '', arrivalDate: '', departureDate: '', description: '' });
      await handleReload();
    } catch { alert("Failed to log waypoint."); }
  };

  const startEditDest = (d: Destination) => {
    if (!isEditMode) return;
    setEditingDestId(d.id);
    setDestEditForm({ name: d.name, arrivalDate: d.arrivalDate?.substring(0, 10), departureDate: d.departureDate?.substring(0, 10), description: d.description || '' });
  };

  const saveDestEdit = async (e: React.FormEvent, destId: number) => {
    e.preventDefault();
    if (!plan || !isEditMode) return;
    if (new Date(destEditForm.departureDate) < new Date(destEditForm.arrivalDate)) { alert("Departure cannot precede arrival."); return; }
    try {
      await destinationService.update(plan.id, destId, { name: destEditForm.name, location: destEditForm.name, arrivalDate: destEditForm.arrivalDate, departureDate: destEditForm.departureDate, description: destEditForm.description, notes: '' });
      setEditingDestId(null);
      await handleReload();
    } catch { alert("Failed to update waypoint."); }
  };

  const deleteDest = async (destId: number) => {
    if (!plan || !isEditMode || !window.confirm("Remove this waypoint?")) return;
    try { await destinationService.delete(plan.id, destId); await handleReload(); } catch { alert("Failed to remove waypoint."); }
  };

  // Activities
  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !isEditMode || !actForm.name || !actForm.dateTime) return;
    try {
      await activityService.create(plan.id, { name: actForm.name, date: actForm.dateTime + ':00', time: null, location: actForm.location || 'TBD', description: actForm.description || '', estimatedCost: 0, status: actForm.status });
      setActForm({ name: '', description: '', dateTime: '', location: '', status: 'Planned' });
      await handleReload();
    } catch { alert("Failed to log activity vector."); }
  };

  const startEditAct = (a: Activity) => {
    if (!isEditMode) return;
    setEditingActId(a.id);
    setActEditForm({ name: a.name, dateTime: a.date?.substring(0, 16), location: a.location || '', status: typeof a.status === 'number' ? STATUS_LABELS[a.status] as ActivityStatus : a.status });
  };

  const saveActEdit = async (e: React.FormEvent, actId: number) => {
    e.preventDefault();
    if (!plan || !isEditMode) return;
    try {
      await activityService.update(plan.id, actId, { name: actEditForm.name, date: actEditForm.dateTime + ':00', time: null, location: actEditForm.location || 'TBD', status: actEditForm.status });
      setEditingActId(null);
      await handleReload();
    } catch { alert("Failed to update activity."); }
  };

  const deleteAct = async (actId: number) => {
    if (!plan || !isEditMode || !window.confirm("Remove this activity?")) return;
    try { await activityService.delete(plan.id, actId); await handleReload(); } catch { alert("Failed to remove activity."); }
  };

  // Expenses
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expForm.amount);
    if (!plan || !isEditMode || !expForm.name || amountNum <= 0) return;
    try {
      await expenseService.create(plan.id, { name: expForm.name, amount: amountNum, category: expForm.category, date: new Date().toISOString(), description: '' });
      setExpForm({ name: '', amount: '', category: 'Transport' });
      await handleReload();
    } catch { alert("Failed to audit resource coins."); }
  };

  const startEditExp = (e: Expense) => {
    if (!isEditMode) return;
    setEditingExpId(e.id);
    setExpEditForm({ name: e.name, amount: String(e.amount), category: typeof e.category === 'number' ? CATEGORY_LABELS[e.category] as ExpenseCategory : e.category });
  };

  const saveExpEdit = async (ev: React.FormEvent, expId: number) => {
    ev.preventDefault();
    if (!plan || !isEditMode) return;
    const amountNum = Number(expEditForm.amount);
    if (amountNum <= 0) { alert("Amount must be greater than zero."); return; }
    try {
      await expenseService.update(plan.id, expId, { name: expEditForm.name, amount: amountNum, category: expEditForm.category });
      setEditingExpId(null);
      await handleReload();
    } catch { alert("Failed to update expense."); }
  };

  const deleteExp = async (expId: number) => {
    if (!plan || !isEditMode || !window.confirm("Remove this expense?")) return;
    try { await expenseService.delete(plan.id, expId); await handleReload(); } catch { alert("Failed to remove expense."); }
  };

  // Checklist
  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !isEditMode || !checkForm.title.trim()) return;
    try { await checklistService.create(plan.id, checkForm.title.trim()); setCheckForm({ title: '' }); await handleReload(); }
    catch { alert("Failed to catalog packing item."); }
  };

  const handleToggleChecklist = async (itemId: number, currentStatus: boolean) => {
    if (!plan || !isEditMode) return;
    try { setToggleLoadingId(itemId); await checklistService.toggle(plan.id, itemId, !currentStatus); await handleReload(); }
    catch { alert("Unauthorized mutation rejected."); } finally { setToggleLoadingId(null); }
  };

  const deleteCheckItem = async (itemId: number) => {
    if (!plan || !isEditMode || !window.confirm("Remove this item?")) return;
    try { await checklistService.delete(plan.id, itemId); await handleReload(); } catch { alert("Failed to remove item."); }
  };

  if (loading) return <div className="min-h-screen bg-parchment flex items-center justify-center font-display text-rust animate-pulse">Decoding encrypted path matrix...</div>;
  if (error || !plan) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center p-4">
        <div className="bg-cream border-2 border-sepia p-6 max-w-md w-full text-center space-y-4 shadow-xl rounded-sm">
          <ShieldAlert className="w-12 h-12 text-rust mx-auto animate-bounce" />
          <h3 className="font-display text-xl uppercase text-ink">Scroll Matrix Sealed</h3>
          <p className="font-body text-sm text-ink-light">{error}</p>
          <Button onClick={() => navigate('/login')} className="w-full mt-2">Return to Town Square</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment text-ink font-body p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Header Panel */}
      <div className="bg-parchment-dark border-2 border-sepia p-6 rounded-sm shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-label uppercase text-gold tracking-widest mb-1">
            <Compass className="w-4 h-4 text-rust" /> Shared Explorer Journal
          </div>
          <h1 className="font-display text-3xl text-ink uppercase tracking-wide">{plan.name}</h1>
          <p className="text-xs font-functional text-ink-light mt-1 italic">{plan.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-display tracking-wider rounded-sm shadow-inner uppercase ${
            isEditMode ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-emerald-100 border-emerald-400 text-emerald-950'
          }`}>
            <ShieldCheck className="w-4 h-4" /> {isEditMode ? "Interactive Scribe Access" : "Spectator Reading Only"}
          </div>
          <Button variant="secondary" onClick={handleExportPdf} className="text-xs">
            <FileDown className="w-4 h-4" /> Export Ledger
          </Button>
        </div>
      </div>

      {/* Medieval Styled Navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-sepia/30">
        {(['overview', 'destinations', 'activities', 'expenses', 'checklist', 'reminders', 'map'] as ViewTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-display text-xs uppercase tracking-wider border border-b-0 rounded-t-sm transition-all ${
              activeTab === tab ? 'bg-cream border-sepia text-rust font-bold shadow-xs' : 'bg-parchment-dark/40 border-transparent text-ink-light hover:bg-parchment-dark/70'
            }`}>{tab}</button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-cream border border-sepia/30 p-6 rounded-sm shadow-sm min-h-[300px]">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {isEditMode && editingPlan ? (
              <form onSubmit={savePlanEdit} className="space-y-4">
                <h3 className="font-display text-base uppercase text-ink border-b border-sepia/20 pb-2">Edit Expedition Details</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Name *</label>
                    <input required value={planEditForm.name} onChange={e => setPlanEditForm({...planEditForm, name: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Budget</label>
                    <input type="number" min="0" value={planEditForm.budget} onChange={e => setPlanEditForm({...planEditForm, budget: Number(e.target.value)})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Start Date *</label>
                    <input type="date" required value={planEditForm.startDate} onChange={e => setPlanEditForm({...planEditForm, startDate: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">End Date *</label>
                    <input type="date" required value={planEditForm.endDate} onChange={e => setPlanEditForm({...planEditForm, endDate: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Description</label>
                    <textarea value={planEditForm.description} onChange={e => setPlanEditForm({...planEditForm, description: e.target.value})} rows={2} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm resize-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Notes</label>
                    <textarea value={planEditForm.notes} onChange={e => setPlanEditForm({...planEditForm, notes: e.target.value})} rows={3} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm resize-none" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingPlan(false)}><X className="w-3 h-3" /> Cancel</Button>
                  <Button type="submit" className="text-xs"><Save className="w-3 h-3" /> Save Changes</Button>
                </div>
              </form>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display text-lg text-ink uppercase">Chronicle Notes</h3>
                    {isEditMode && <Button variant="secondary" className="text-xs" onClick={startEditPlan}><Pencil className="w-3 h-3" /> Edit Plan</Button>}
                  </div>
                  <div className="bg-parchment border border-sepia/30 p-4 font-body rounded-sm min-h-[100px] whitespace-pre-wrap shadow-xs">
                    {plan.notes || "No secret observations mapped out yet."}
                  </div>
                  <div className="text-xs font-functional text-ink-light space-y-1">
                    <div className="flex gap-2"><Calendar className="w-3.5 h-3.5 text-sepia" /><span>{plan.startDate?.substring(0, 10)} — {plan.endDate?.substring(0, 10)}</span></div>
                  </div>
                </div>
                <div className="bg-parchment border border-sepia/30 p-4 rounded-sm space-y-4 h-fit shadow-xs">
                  <h4 className="font-display text-sm uppercase text-ink border-b border-sepia/20 pb-2">Treasury Check</h4>
                  <div className="flex justify-between font-functional text-xs"><span>Allocated Fund:</span><span className="font-mono">{plan.budget} Coins</span></div>
                  <div className="flex justify-between font-functional text-xs"><span>Total Spent:</span><span className="font-mono text-rust">{plan.totalExpenses} Coins</span></div>
                  <div className={`flex justify-between font-display text-xs pt-2 border-t border-sepia/20 font-bold ${plan.remainingBudget < 0 ? 'text-rust' : 'text-emerald-800'}`}>
                    <span>{plan.remainingBudget < 0 ? "Deficit Vault:" : "Remaining Coins:"}</span>
                    <span className="font-mono">{plan.remainingBudget} Coins</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DESTINATIONS TAB */}
        {activeTab === 'destinations' && (
          <div className="space-y-6">
            {isEditMode && (
              <form onSubmit={addDestination} className="bg-parchment/40 p-4 border border-sepia/20 rounded-sm grid sm:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Waypoint Title</label>
                  <input placeholder="e.g. Florence" required value={destForm.name} onChange={e => setDestForm({...destForm, name: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs w-full rounded-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Arrival</label>
                  <input type="date" required value={destForm.arrivalDate} onChange={e => setDestForm({...destForm, arrivalDate: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs w-full rounded-sm font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Departure</label>
                  <input type="date" required value={destForm.departureDate} onChange={e => setDestForm({...destForm, departureDate: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs w-full rounded-sm font-mono" />
                </div>
                <div className="sm:col-span-4 flex justify-end">
                  <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Map Waypoint</Button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {plan.destinations?.map((d: any) => (
                <div key={d.id} className="p-3 bg-parchment border border-sepia/10 rounded-sm shadow-xs">
                  {editingDestId === d.id ? (
                    <form onSubmit={e => saveDestEdit(e, d.id)} className="grid sm:grid-cols-4 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <input required value={destEditForm.name} onChange={e => setDestEditForm({...destEditForm, name: e.target.value})} className="w-full bg-cream border border-sepia/40 px-2 py-1 text-sm" />
                      </div>
                      <input type="date" required value={destEditForm.arrivalDate} onChange={e => setDestEditForm({...destEditForm, arrivalDate: e.target.value})} className="bg-cream border border-sepia/40 px-2 py-1 text-sm font-mono" />
                      <input type="date" required value={destEditForm.departureDate} onChange={e => setDestEditForm({...destEditForm, departureDate: e.target.value})} className="bg-cream border border-sepia/40 px-2 py-1 text-sm font-mono" />
                      <div className="sm:col-span-4 flex gap-2 justify-end">
                        <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingDestId(null)}><X className="w-3 h-3" /> Cancel</Button>
                        <Button type="submit" className="text-xs"><Check className="w-3 h-3" /> Save</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-display text-base text-ink uppercase">{d.name}</h4>
                        <p className="font-mono text-xs text-ink-light">{d.arrivalDate?.substring(0, 10)} — {d.departureDate?.substring(0, 10)}</p>
                      </div>
                      {isEditMode && (
                        <div className="flex gap-1">
                          <button onClick={() => startEditDest(d)} className="p-1.5 text-sepia hover:text-rust transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteDest(d.id)} className="p-1.5 text-sepia hover:text-rust transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            {isEditMode && (
              <form onSubmit={addActivity} className="bg-parchment/40 p-4 border border-sepia/20 rounded-sm space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  <input placeholder="Activity Name" required value={actForm.name} onChange={e => setActForm({...actForm, name: e.target.value})} className="bg-cream border border-sepia/30 w-full p-2 text-xs rounded-sm" />
                  <input type="datetime-local" required value={actForm.dateTime} onChange={e => setActForm({...actForm, dateTime: e.target.value})} className="bg-cream border border-sepia/30 w-full p-2 text-xs rounded-sm font-mono" />
                  <input placeholder="Location (e.g. Rome, Italy)" value={actForm.location} onChange={e => setActForm({...actForm, location: e.target.value})} className="bg-cream border border-sepia/30 w-full p-2 text-xs rounded-sm" />
                </div>
                <div className="flex justify-between items-center">
                  <select value={actForm.status} onChange={e => setActForm({...actForm, status: e.target.value as ActivityStatus})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm font-functional">
                    {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Log Vector</Button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {plan.activities?.map((a: any) => (
                <div key={a.id} className="p-3 bg-parchment border border-sepia/10 rounded-sm shadow-xs">
                  {editingActId === a.id ? (
                    <form onSubmit={e => saveActEdit(e, a.id)} className="grid sm:grid-cols-3 gap-3 items-end">
                      <input required value={actEditForm.name} onChange={e => setActEditForm({...actEditForm, name: e.target.value})} className="bg-cream border border-sepia/40 px-2 py-1 text-sm w-full" />
                      <input type="datetime-local" required value={actEditForm.dateTime} onChange={e => setActEditForm({...actEditForm, dateTime: e.target.value})} className="bg-cream border border-sepia/40 px-2 py-1 text-sm font-mono w-full" />
                      <input value={actEditForm.location} onChange={e => setActEditForm({...actEditForm, location: e.target.value})} placeholder="Location" className="bg-cream border border-sepia/40 px-2 py-1 text-sm w-full" />
                      <select value={actEditForm.status} onChange={e => setActEditForm({...actEditForm, status: e.target.value as ActivityStatus})} className="bg-cream border border-sepia/40 text-xs py-1 px-2">
                        {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="sm:col-span-2 flex gap-2 justify-end">
                        <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingActId(null)}><X className="w-3 h-3" /> Cancel</Button>
                        <Button type="submit" className="text-xs"><Check className="w-3 h-3" /> Save</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-display text-sm uppercase block">{a.name}</span>
                        <span className="font-mono text-[11px] text-ink-light">
                          {a.date?.substring(0, 10)} @ {a.date?.substring(11, 16)}{a.location && a.location !== 'TBD' ? ` · ${a.location}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 border font-display text-[10px] tracking-wider rounded-sm bg-parchment-dark border-sepia/40">
                          {typeof a.status === 'number' ? STATUS_LABELS[a.status] : a.status}
                        </span>
                        {isEditMode && (
                          <>
                            <button onClick={() => startEditAct(a)} className="p-1 text-sepia hover:text-rust"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteAct(a.id)} className="p-1 text-sepia hover:text-rust"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {isEditMode && (
              <form onSubmit={addExpense} className="bg-parchment/40 p-4 border border-sepia/20 rounded-sm grid sm:grid-cols-3 gap-3">
                <input placeholder="Provisions Manifest Item" required value={expForm.name} onChange={e => setExpForm({...expForm, name: e.target.value})} className="bg-cream border border-sepia/30 w-full p-2 text-xs rounded-sm" />
                <input type="number" placeholder="Coins Cost" required min="0.01" step="0.01" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} className="bg-cream border border-sepia/30 w-full p-2 text-xs rounded-sm font-mono" />
                <select value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value as ExpenseCategory})} className="bg-cream border border-sepia/30 w-full p-2 text-xs rounded-sm font-functional">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="sm:col-span-3 flex justify-end">
                  <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Audit Ledger</Button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {plan.expenses?.map((e: any) => (
                <div key={e.id} className="p-3 bg-parchment border border-sepia/10 rounded-sm shadow-xs">
                  {editingExpId === e.id ? (
                    <form onSubmit={ev => saveExpEdit(ev, e.id)} className="grid sm:grid-cols-3 gap-2 items-end">
                      <input required value={expEditForm.name} onChange={ev => setExpEditForm({...expEditForm, name: ev.target.value})} className="bg-cream border border-sepia/40 w-full px-2 py-1 text-sm" />
                      <input type="number" min="0.01" step="0.01" required value={expEditForm.amount} onChange={ev => setExpEditForm({...expEditForm, amount: ev.target.value})} className="bg-cream border border-sepia/40 w-full px-2 py-1 text-sm font-mono" />
                      <select value={expEditForm.category} onChange={ev => setExpEditForm({...expEditForm, category: ev.target.value as ExpenseCategory})} className="bg-cream border border-sepia/40 w-full text-sm py-1 px-2 font-functional">
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="sm:col-span-3 flex gap-2 justify-end">
                        <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingExpId(null)}><X className="w-3 h-3" /> Cancel</Button>
                        <Button type="submit" className="text-xs"><Check className="w-3 h-3" /> Save</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium block text-ink">{e.name}</span>
                        <span className="text-[10px] font-label tracking-widest uppercase text-gold">
                          {typeof e.category === 'number' ? CATEGORY_LABELS[e.category] : e.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-rust">-{e.amount} Coins</span>
                        {isEditMode && (
                          <>
                            <button onClick={() => startEditExp(e)} className="p-1 text-sepia hover:text-rust"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteExp(e.id)} className="p-1 text-sepia hover:text-rust"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            {isEditMode && (
              <form onSubmit={addChecklistItem} className="flex gap-2">
                <input placeholder="Add provision registry descriptor..." required value={checkForm.title} onChange={e => setCheckForm({ title: e.target.value })} className="flex-1 bg-cream border border-sepia/40 px-3 py-1.5 text-sm rounded-sm" />
                <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Register</Button>
              </form>
            )}
            <div className="space-y-1.5">
              {plan.checklistItems?.map((item: any) => {
                const isItemCompleting = toggleLoadingId === item.id;
                return (
                  <div key={item.id} className={`flex items-center gap-3 p-2.5 border rounded-sm text-xs transition-all group ${
                    isEditMode ? 'hover:border-rust bg-parchment/60' : 'bg-cream/40 border-sepia/10'
                  }`}>
                    <div onClick={() => handleToggleChecklist(item.id, item.isCompleted)} className={`flex items-center gap-3 flex-1 select-none ${isEditMode ? 'cursor-pointer' : ''}`}>
                      {item.isCompleted ? <CheckSquare className={`w-4 h-4 text-rust flex-shrink-0 ${isItemCompleting ? 'animate-pulse' : ''}`} /> : <Square className={`w-4 h-4 flex-shrink-0 ${isEditMode ? 'text-sepia/50' : 'text-sepia/20'} ${isItemCompleting ? 'animate-pulse' : ''}`} />}
                      <span className={`font-body font-medium transition-all ${item.isCompleted ? 'line-through text-ink-light/40 font-functional' : 'text-ink'}`}>{item.name}</span>
                    </div>
                    {isEditMode && (
                      <button onClick={() => deleteCheckItem(item.id)} className="p-1 text-sepia/40 hover:text-rust opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REMINDERS TAB (Local browser notifications synced to plan ID) */}
        {activeTab === 'reminders' && (
          <div className="space-y-6 max-w-lg">
            <form onSubmit={addReminder} className="bg-parchment/40 p-4 border border-sepia/30 rounded-sm space-y-3">
              <h4 className="font-display text-sm uppercase text-ink">Set a Local Reminder</h4>
              <div>
                <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Reminder Text</label>
                <input required value={reminderForm.text} onChange={e => setReminderForm({...reminderForm, text: e.target.value})} placeholder="e.g. Call carriage service" className="w-full bg-cream border border-sepia/40 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Date & Time</label>
                <input type="datetime-local" required value={reminderForm.datetime} onChange={e => setReminderForm({...reminderForm, datetime: e.target.value})} className="w-full bg-cream border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="text-xs"><Bell className="w-3 h-3" /> Schedule</Button>
              </div>
            </form>
            <div className="space-y-2">
              {reminders.length === 0 && <p className="text-xs font-functional text-ink-light/60 text-center py-4">No local chronometer events loaded.</p>}
              {reminders.map(r => (
                <div key={r.id} className={`flex justify-between items-center p-3 border rounded-sm text-sm ${r.fired ? 'opacity-50 bg-parchment/40 border-sepia/20' : 'bg-parchment border-sepia/30 shadow-xs'}`}>
                  <div>
                    <p className="font-functional font-semibold text-ink">{r.text}</p>
                    <p className="font-mono text-[11px] text-ink-light">{r.datetime?.replace('T', ' ')}</p>
                    {r.fired && <span className="text-[10px] font-label text-rust uppercase mt-1 block">Fired</span>}
                  </div>
                  <button onClick={() => deleteReminder(r.id)} className="p-1.5 text-sepia hover:text-rust"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === 'map' && (
          <TravelMap activities={plan.activities ?? []} />
        )}

      </div>
    </div>
  );
};