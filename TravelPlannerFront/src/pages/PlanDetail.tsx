import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import {
  Scroll, Calendar, Coins, MapPin, CheckSquare,
  ShieldAlert, Trash2, ArrowLeft, Plus, Square,
  Pencil, X, Check, Bell, FileDown, Save
} from 'lucide-react';

import { travelPlanService } from '../services/travelPlanService';
import { destinationService } from '../services/destinationService';
import { activityService } from '../services/activityService';
import { expenseService } from '../services/expenseService';
import { checklistService } from '../services/checklistService';
import { sharingService } from '../services/sharingService';
import type { TravelPlan, ActivityStatus, ExpenseCategory, Destination, Activity, Expense } from '../models/types';
import { Button } from '../components/ui/Button';
import { TravelMap } from '../components/TravelMap';

const SafeQRCode = (props: any) => {
  const QRCodeComponent: any = (QRCode as any).default || QRCode;
  try { return <QRCodeComponent {...props} />; }
  catch (e) { return <div className="p-4 border border-dashed border-sepia/30 text-xs text-center">QR Framework Loading Error</div>; }
};

const ACTIVITY_STATUSES: ActivityStatus[] = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];
const ACTIVITY_STATUS_MAP: Record<ActivityStatus, number> = { 'Planned': 0, 'Reserved': 1, 'Completed': 2, 'Cancelled': 3 };
const CATEGORY_MAP: Record<ExpenseCategory, number> = { 'Transport': 0, 'Accommodation': 1, 'Food': 2, 'Tickets': 3, 'Shopping': 4, 'Other': 5 };

type ActiveTab = 'overview' | 'destinations' | 'activities' | 'expenses' | 'checklist' | 'share' | 'map' | 'reminders';

interface Reminder { id: string; text: string; datetime: string; fired: boolean; }

export const PlanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Share state
  const [sharePermission, setSharePermission] = useState<number>(0);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Create forms
  const [destForm, setDestForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });
  const [actForm, setActForm] = useState({ name: '', description: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });
  const [expForm, setExpForm] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });
  const [checkForm, setCheckForm] = useState({ title: '' });

  // Edit plan state
  const [editingPlan, setEditingPlan] = useState(false);
  const [planEditForm, setPlanEditForm] = useState({ name: '', description: '', startDate: '', endDate: '', budget: 0, notes: '' });

  // Edit destination state
  const [editingDestId, setEditingDestId] = useState<number | null>(null);
  const [destEditForm, setDestEditForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });

  // Edit activity state
  const [editingActId, setEditingActId] = useState<number | null>(null);
  const [actEditForm, setActEditForm] = useState({ name: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });

  // Edit expense state
  const [editingExpId, setEditingExpId] = useState<number | null>(null);
  const [expEditForm, setExpEditForm] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });

  // Reminders
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try { return JSON.parse(localStorage.getItem(`reminders_${id}`) || '[]'); } catch { return []; }
  });
  const [reminderForm, setReminderForm] = useState({ text: '', datetime: '' });
  const reminderTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const fetchPlanDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await travelPlanService.getById(Number(id));
      setPlan(data);
    } catch (err: any) {
      setError("Could not retrieve ledger entries for this journey path key.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlanDetails(); }, [id]);

  // Schedule any existing reminder notifications on mount
  useEffect(() => {
    reminders.forEach(r => { if (!r.fired) scheduleNotification(r); });
    return () => { reminderTimers.current.forEach(t => clearTimeout(t)); };
  }, []);

  const saveReminders = (updated: Reminder[]) => {
    setReminders(updated);
    localStorage.setItem(`reminders_${id}`, JSON.stringify(updated));
  };

  const scheduleNotification = (r: Reminder) => {
    const ms = new Date(r.datetime).getTime() - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('Chronicles Reminder', { body: r.text });
      } else {
        alert(`Reminder: ${r.text}`);
      }
      saveReminders(reminders.map(x => x.id === r.id ? { ...x, fired: true } : x));
    }, ms);
    reminderTimers.current.set(r.id, t);
  };

  const addReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderForm.text.trim() || !reminderForm.datetime) return;
    const r: Reminder = { id: Date.now().toString(), text: reminderForm.text.trim(), datetime: reminderForm.datetime, fired: false };
    const updated = [...reminders, r];
    saveReminders(updated);
    scheduleNotification(r);
    if (Notification.permission === 'default') Notification.requestPermission();
    setReminderForm({ text: '', datetime: '' });
  };

  const deleteReminder = (rid: string) => {
    const t = reminderTimers.current.get(rid);
    if (t) clearTimeout(t);
    reminderTimers.current.delete(rid);
    saveReminders(reminders.filter(r => r.id !== rid));
  };

  // PDF Export
  const handleExportPdf = () => {
    if (!plan) return;
    const lines: string[] = [];
    lines.push(`TRAVEL PLAN: ${plan.name}`);
    lines.push(`Period: ${plan.startDate?.substring(0, 10)} — ${plan.endDate?.substring(0, 10)}`);
    lines.push(`Budget: ${plan.budget} | Spent: ${plan.totalExpenses} | Remaining: ${plan.remainingBudget}`);
    if (plan.description) lines.push(`\nDescription: ${plan.description}`);
    if (plan.notes) lines.push(`Notes: ${plan.notes}`);

    if (plan.destinations?.length) {
      lines.push('\n--- DESTINATIONS ---');
      plan.destinations.forEach(d => lines.push(`• ${d.name}: ${d.arrivalDate?.substring(0, 10)} → ${d.departureDate?.substring(0, 10)}`));
    }
    if (plan.activities?.length) {
      lines.push('\n--- ACTIVITIES ---');
      plan.activities.forEach(a => lines.push(`• ${a.name} | ${a.date?.substring(0, 10)} ${a.date?.substring(11, 16)} | ${a.location || 'TBD'} | ${a.status}`));
    }
    if (plan.expenses?.length) {
      lines.push('\n--- EXPENSES ---');
      plan.expenses.forEach(e => lines.push(`• ${e.name} (${e.category}): ${e.amount} Coins`));
    }
    if (plan.checklistItems?.length) {
      lines.push('\n--- CHECKLIST ---');
      plan.checklistItems.forEach(c => lines.push(`[${c.isCompleted ? 'x' : ' '}] ${c.name}`));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.name.replace(/\s+/g, '_')}_plan.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete plan
  const handlePurgePlan = async () => {
    if (!plan || !window.confirm("Permanently burn this expedition log?")) return;
    try { await travelPlanService.delete(plan.id); navigate('/dashboard'); }
    catch { alert("Failed to erase ledger entry."); }
  };

  // Edit plan
  const startEditPlan = () => {
    if (!plan) return;
    setPlanEditForm({
      name: plan.name, description: plan.description || '',
      startDate: plan.startDate?.substring(0, 10), endDate: plan.endDate?.substring(0, 10),
      budget: plan.budget, notes: plan.notes || ''
    });
    setEditingPlan(true);
  };

  const savePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(planEditForm.endDate) < new Date(planEditForm.startDate)) { alert("End date cannot precede start date."); return; }
    if (planEditForm.budget < 0) { alert("Budget cannot be negative."); return; }
    try {
      await travelPlanService.update(Number(id), planEditForm);
      setEditingPlan(false);
      fetchPlanDetails();
    } catch { alert("Failed to update plan."); }
  };

  // Share
  const generateShareToken = async () => {
    if (!id) return;
    try {
      setShareLoading(true); setShareError(null);
      const response = await sharingService.createToken(Number(id), sharePermission);
      setGeneratedLink(`${window.location.origin}/shared-plans/${response.token}?perm=${sharePermission}`);
    } catch { setShareError("Failed to issue share token."); }
    finally { setShareLoading(false); }
  };

  // Destination CRUD
  const addDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(destForm.departureDate) < new Date(destForm.arrivalDate)) { alert("Departure cannot precede arrival."); return; }
    try {
      await destinationService.create(Number(id), { name: destForm.name, location: destForm.name, arrivalDate: destForm.arrivalDate, departureDate: destForm.departureDate, description: destForm.description || '', notes: '' });
      setDestForm({ name: '', arrivalDate: '', departureDate: '', description: '' });
      fetchPlanDetails();
    } catch { alert("Failed to log waypoint."); }
  };

  const startEditDest = (d: Destination) => {
    setEditingDestId(d.id);
    setDestEditForm({ name: d.name, arrivalDate: d.arrivalDate?.substring(0, 10), departureDate: d.departureDate?.substring(0, 10), description: d.description || '' });
  };

  const saveDestEdit = async (e: React.FormEvent, destId: number) => {
    e.preventDefault();
    if (new Date(destEditForm.departureDate) < new Date(destEditForm.arrivalDate)) { alert("Departure cannot precede arrival."); return; }
    try {
      await destinationService.update(Number(id), destId, { name: destEditForm.name, location: destEditForm.name, arrivalDate: destEditForm.arrivalDate, departureDate: destEditForm.departureDate, description: destEditForm.description, notes: '' });
      setEditingDestId(null);
      fetchPlanDetails();
    } catch { alert("Failed to update waypoint."); }
  };

  const deleteDest = async (destId: number) => {
    if (!window.confirm("Remove this waypoint?")) return;
    try { await destinationService.delete(Number(id), destId); fetchPlanDetails(); }
    catch { alert("Failed to remove waypoint."); }
  };

  // Activity CRUD
  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actForm.name || !actForm.dateTime) return;
    try {
      await activityService.create(Number(id), { name: actForm.name, date: actForm.dateTime + ':00', time: null, location: actForm.location || 'TBD', description: '', estimatedCost: 0, status: actForm.status });
      setActForm({ name: '', description: '', dateTime: '', location: '', status: 'Planned' });
      fetchPlanDetails();
    } catch { alert("Failed to log activity."); }
  };

  const startEditAct = (a: Activity) => {
    setEditingActId(a.id);
    setActEditForm({ name: a.name, dateTime: a.date?.substring(0, 16), location: a.location || '', status: a.status });
  };

  const saveActEdit = async (e: React.FormEvent, actId: number) => {
    e.preventDefault();
    try {
      await activityService.update(Number(id), actId, { name: actEditForm.name, date: actEditForm.dateTime + ':00', time: null, location: actEditForm.location || 'TBD', status: actEditForm.status });
      setEditingActId(null);
      fetchPlanDetails();
    } catch { alert("Failed to update activity."); }
  };

  const deleteAct = async (actId: number) => {
    if (!window.confirm("Remove this activity?")) return;
    try { await activityService.delete(Number(id), actId); fetchPlanDetails(); }
    catch { alert("Failed to remove activity."); }
  };

  // Expense CRUD
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expForm.amount);
    if (!expForm.name || amountNum <= 0) { alert("Amount must be greater than zero."); return; }
    try {
      await expenseService.create(Number(id), { name: expForm.name, amount: amountNum, category: expForm.category, date: new Date().toISOString(), description: '' });
      setExpForm({ name: '', amount: '', category: 'Transport' });
      fetchPlanDetails();
    } catch { alert("Failed to log expense."); }
  };

  const startEditExp = (e: Expense) => {
    setEditingExpId(e.id);
    setExpEditForm({ name: e.name, amount: String(e.amount), category: e.category });
  };

  const saveExpEdit = async (ev: React.FormEvent, expId: number) => {
    ev.preventDefault();
    const amountNum = Number(expEditForm.amount);
    if (amountNum <= 0) { alert("Amount must be greater than zero."); return; }
    try {
      await expenseService.update(Number(id), expId, { name: expEditForm.name, amount: amountNum, category: expEditForm.category });
      setEditingExpId(null);
      fetchPlanDetails();
    } catch { alert("Failed to update expense."); }
  };

  const deleteExp = async (expId: number) => {
    if (!window.confirm("Remove this expense?")) return;
    try { await expenseService.delete(Number(id), expId); fetchPlanDetails(); }
    catch { alert("Failed to remove expense."); }
  };

  // Checklist
  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkForm.title.trim()) return;
    try { await checklistService.create(Number(id), checkForm.title.trim()); setCheckForm({ title: '' }); fetchPlanDetails(); }
    catch { alert("Failed to add checklist item."); }
  };

  const toggleCheckItem = async (itemId: number, currentStatus: boolean) => {
    try { await checklistService.toggle(Number(id), itemId, !currentStatus); fetchPlanDetails(); }
    catch { alert("Failed to toggle item."); }
  };

  const deleteCheckItem = async (itemId: number) => {
    if (!window.confirm("Remove this item?")) return;
    try { await checklistService.delete(Number(id), itemId); fetchPlanDetails(); }
    catch { alert("Failed to remove item."); }
  };

  if (loading) return <div className="p-8 text-center font-display text-ink animate-pulse">Consulting the Grand Cartographer logs...</div>;
  if (error || !plan) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4 bg-cream border border-sepia">
        <ShieldAlert className="w-12 h-12 text-rust mx-auto" />
        <p className="font-display text-base text-ink">{error || "Expedition map data corrupted."}</p>
        <Button onClick={() => navigate('/dashboard')} variant="secondary"><ArrowLeft className="w-4 h-4" /> Return to Camp</Button>
      </div>
    );
  }

  const isOverBudget = plan.remainingBudget < 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-sepia pb-4 gap-4">
        <div className="flex-1">
          <h1 className="font-display text-3xl text-rust uppercase tracking-wide">{plan.name}</h1>
          <p className="font-body text-sm text-ink-light italic">{plan.description || "No written itinerary record exists."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportPdf} className="text-xs">
            <FileDown className="w-4 h-4" /> Export
          </Button>
          <Button variant="danger" onClick={handlePurgePlan} className="text-xs">
            <Trash2 className="w-4 h-4" /> Scrap
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-sepia/30">
        {(['overview', 'destinations', 'activities', 'expenses', 'checklist', 'reminders', 'share', 'map'] as ActiveTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-display text-xs uppercase tracking-wider border border-b-0 rounded-t-sm transition-all ${
              activeTab === tab ? 'bg-parchment-dark text-rust border-sepia font-bold' : 'bg-cream/40 text-ink-light border-transparent hover:bg-cream/80'
            }`}>{tab}</button>
        ))}
      </div>

      <div className="bg-parchment-dark p-6 border-2 border-sepia shadow-md rounded-sm min-h-[300px]">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {editingPlan ? (
              <form onSubmit={savePlanEdit} className="space-y-4">
                <h3 className="font-display text-base uppercase text-ink border-b border-sepia/20 pb-2">Edit Expedition Details</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Name *</label>
                    <input required value={planEditForm.name} onChange={e => setPlanEditForm({...planEditForm, name: e.target.value})} className="w-full bg-cream border border-sepia/40 px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Budget</label>
                    <input type="number" min="0" value={planEditForm.budget} onChange={e => setPlanEditForm({...planEditForm, budget: Number(e.target.value)})} className="w-full bg-cream border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Start Date *</label>
                    <input type="date" required value={planEditForm.startDate} onChange={e => setPlanEditForm({...planEditForm, startDate: e.target.value})} className="w-full bg-cream border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">End Date *</label>
                    <input type="date" required value={planEditForm.endDate} onChange={e => setPlanEditForm({...planEditForm, endDate: e.target.value})} className="w-full bg-cream border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Description</label>
                    <textarea value={planEditForm.description} onChange={e => setPlanEditForm({...planEditForm, description: e.target.value})} rows={2} className="w-full bg-cream border border-sepia/40 px-2 py-1.5 text-sm resize-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Notes</label>
                    <textarea value={planEditForm.notes} onChange={e => setPlanEditForm({...planEditForm, notes: e.target.value})} rows={3} className="w-full bg-cream border border-sepia/40 px-2 py-1.5 text-sm resize-none" />
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
                    <Button variant="secondary" className="text-xs" onClick={startEditPlan}><Pencil className="w-3 h-3" /> Edit Plan</Button>
                  </div>
                  <div className="bg-cream p-4 border border-sepia/30 font-body rounded-sm min-h-[100px] whitespace-pre-wrap">
                    {plan.notes || "No notes yet."}
                  </div>
                  <div className="text-xs font-functional text-ink-light space-y-1">
                    <div className="flex gap-2"><Calendar className="w-3.5 h-3.5 text-sepia" /><span>{plan.startDate?.substring(0, 10)} — {plan.endDate?.substring(0, 10)}</span></div>
                  </div>
                </div>
                <div className="bg-cream p-4 border-2 border-sepia rounded-sm space-y-4 h-fit">
                  <h4 className="font-display text-sm uppercase text-ink border-b border-sepia/20 pb-2">Treasury Check</h4>
                  <div className="flex justify-between font-functional text-xs"><span>Allocated:</span><span className="font-mono">{plan.budget} Coins</span></div>
                  <div className="flex justify-between font-functional text-xs"><span>Spent:</span><span className="font-mono text-rust">{plan.totalExpenses} Coins</span></div>
                  <div className={`flex justify-between font-display text-xs pt-2 border-t border-sepia/20 font-bold ${isOverBudget ? 'text-rust' : 'text-ink'}`}>
                    <span>{isOverBudget ? "Deficit:" : "Remaining:"}</span>
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
            <form onSubmit={addDestination} className="grid sm:grid-cols-4 gap-3 bg-cream p-4 border border-sepia/30 rounded-sm items-end">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Waypoint Title</label>
                <input type="text" required value={destForm.name} onChange={e => setDestForm({...destForm, name: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm" placeholder="e.g. Florence" />
              </div>
              <div>
                <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Arrival</label>
                <input type="date" required value={destForm.arrivalDate} onChange={e => setDestForm({...destForm, arrivalDate: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Departure</label>
                <input type="date" required value={destForm.departureDate} onChange={e => setDestForm({...destForm, departureDate: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Map Waypoint</Button>
              </div>
            </form>
            <div className="space-y-3">
              {plan.destinations?.map(d => (
                <div key={d.id} className="bg-cream p-4 border border-sepia/20 rounded-sm shadow-xs">
                  {editingDestId === d.id ? (
                    <form onSubmit={e => saveDestEdit(e, d.id)} className="grid sm:grid-cols-4 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <input required value={destEditForm.name} onChange={e => setDestEditForm({...destEditForm, name: e.target.value})} className="w-full bg-parchment border border-sepia/40 px-2 py-1 text-sm" />
                      </div>
                      <input type="date" required value={destEditForm.arrivalDate} onChange={e => setDestEditForm({...destEditForm, arrivalDate: e.target.value})} className="bg-parchment border border-sepia/40 px-2 py-1 text-sm font-mono" />
                      <input type="date" required value={destEditForm.departureDate} onChange={e => setDestEditForm({...destEditForm, departureDate: e.target.value})} className="bg-parchment border border-sepia/40 px-2 py-1 text-sm font-mono" />
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
                      <div className="flex gap-1">
                        <button onClick={() => startEditDest(d)} className="p-1.5 text-sepia hover:text-rust transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteDest(d.id)} className="p-1.5 text-sepia hover:text-rust transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
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
            <form onSubmit={addActivity} className="bg-cream p-4 border border-sepia/30 rounded-sm space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <input type="text" placeholder="Activity Name" required value={actForm.name} onChange={e => setActForm({...actForm, name: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm" />
                <input type="datetime-local" required value={actForm.dateTime} onChange={e => setActForm({...actForm, dateTime: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
                <input type="text" placeholder="Location" value={actForm.location} onChange={e => setActForm({...actForm, location: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm" />
              </div>
              <div className="flex justify-between items-center">
                <select value={actForm.status} onChange={e => setActForm({...actForm, status: e.target.value as ActivityStatus})} className="bg-parchment/60 border border-sepia/40 text-xs py-1 px-2 font-functional">
                  {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add Activity</Button>
              </div>
            </form>
            <div className="divide-y divide-sepia/10">
              {plan.activities?.map(a => (
                <div key={a.id} className="py-3">
                  {editingActId === a.id ? (
                    <form onSubmit={e => saveActEdit(e, a.id)} className="grid sm:grid-cols-3 gap-3 items-end">
                      <input required value={actEditForm.name} onChange={e => setActEditForm({...actEditForm, name: e.target.value})} className="bg-cream border border-sepia/40 px-2 py-1 text-sm" />
                      <input type="datetime-local" required value={actEditForm.dateTime} onChange={e => setActEditForm({...actEditForm, dateTime: e.target.value})} className="bg-cream border border-sepia/40 px-2 py-1 text-sm font-mono" />
                      <input value={actEditForm.location} onChange={e => setActEditForm({...actEditForm, location: e.target.value})} placeholder="Location" className="bg-cream border border-sepia/40 px-2 py-1 text-sm" />
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
                        <h5 className="font-display text-sm text-ink">{a.name}</h5>
                        <span className="font-mono text-xs text-ink-light">{a.date?.substring(0, 10)} @ {a.date?.substring(11, 16)} | {a.location || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 font-label text-[10px] rounded-sm uppercase border border-sepia/30 ${
                          a.status === 'Completed' ? 'bg-emerald-800 text-parchment' : a.status === 'Reserved' ? 'bg-blue-900 text-parchment' : 'bg-gold text-ink'
                        }`}>{a.status}</span>
                        <button onClick={() => startEditAct(a)} className="p-1 text-sepia hover:text-rust"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteAct(a.id)} className="p-1 text-sepia hover:text-rust"><Trash2 className="w-3.5 h-3.5" /></button>
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
            <form onSubmit={addExpense} className="grid sm:grid-cols-3 gap-3 bg-cream p-4 border border-sepia/30 rounded-sm items-end">
              <input type="text" placeholder="Expense Title" required value={expForm.name} onChange={e => setExpForm({...expForm, name: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm" />
              <input type="number" placeholder="Amount" required min="1" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
              <select value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value as ExpenseCategory})} className="bg-parchment/60 border border-sepia/40 text-sm py-1.5 px-2 w-full">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="sm:col-span-3 flex justify-end"><Button type="submit" className="text-xs"><Coins className="w-3 h-3" /> Add Expense</Button></div>
            </form>
            <div className="bg-cream border border-sepia/20 rounded-sm divide-y divide-sepia/10">
              {plan.expenses?.map(e => (
                <div key={e.id} className="p-3">
                  {editingExpId === e.id ? (
                    <form onSubmit={ev => saveExpEdit(ev, e.id)} className="grid sm:grid-cols-3 gap-2 items-end">
                      <input required value={expEditForm.name} onChange={ev => setExpEditForm({...expEditForm, name: ev.target.value})} className="bg-parchment border border-sepia/40 px-2 py-1 text-sm" />
                      <input type="number" min="0.01" step="0.01" required value={expEditForm.amount} onChange={ev => setExpEditForm({...expEditForm, amount: ev.target.value})} className="bg-parchment border border-sepia/40 px-2 py-1 text-sm font-mono" />
                      <select value={expEditForm.category} onChange={ev => setExpEditForm({...expEditForm, category: ev.target.value as ExpenseCategory})} className="bg-parchment border border-sepia/40 text-sm py-1 px-2">
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="sm:col-span-3 flex gap-2 justify-end">
                        <Button type="button" variant="secondary" className="text-xs" onClick={() => setEditingExpId(null)}><X className="w-3 h-3" /> Cancel</Button>
                        <Button type="submit" className="text-xs"><Check className="w-3 h-3" /> Save</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center font-body text-sm">
                      <span>{e.name} <span className="text-xs font-mono text-ink-light/60">({e.category})</span></span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rust">-{e.amount} Coins</span>
                        <button onClick={() => startEditExp(e)} className="p-1 text-sepia hover:text-rust"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteExp(e.id)} className="p-1 text-sepia hover:text-rust"><Trash2 className="w-3.5 h-3.5" /></button>
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
            <form onSubmit={addChecklistItem} className="flex gap-2">
              <input type="text" required placeholder="Add item..." value={checkForm.title} onChange={e => setCheckForm({ title: e.target.value })} className="flex-1 bg-cream border border-sepia/40 px-3 py-1.5 text-sm rounded-sm" />
              <Button type="submit" className="text-xs"><Plus className="w-3 h-3" /> Add</Button>
            </form>
            <div className="grid sm:grid-cols-2 gap-2">
              {plan.checklistItems?.map(item => (
                <div key={item.id} className="bg-cream border border-sepia/20 p-2.5 rounded-sm flex items-center gap-3 hover:border-rust transition-all group">
                  <div onClick={() => toggleCheckItem(item.id, item.isCompleted)} className="flex items-center gap-3 flex-1 cursor-pointer select-none">
                    {item.isCompleted ? <CheckSquare className="w-4 h-4 text-rust flex-shrink-0" /> : <Square className="w-4 h-4 text-sepia/50 flex-shrink-0" />}
                    <span className={`text-sm ${item.isCompleted ? 'line-through text-ink-light/40' : 'text-ink'}`}>{item.name}</span>
                  </div>
                  <button onClick={() => deleteCheckItem(item.id)} className="p-1 text-sepia/40 hover:text-rust opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REMINDERS TAB */}
        {activeTab === 'reminders' && (
          <div className="space-y-6 max-w-lg">
            <form onSubmit={addReminder} className="bg-cream p-4 border border-sepia/30 rounded-sm space-y-3">
              <h4 className="font-display text-sm uppercase text-ink">Set a Reminder</h4>
              <div>
                <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Reminder Text</label>
                <input required value={reminderForm.text} onChange={e => setReminderForm({...reminderForm, text: e.target.value})} placeholder="e.g. Book hotel in Florence" className="w-full bg-parchment border border-sepia/40 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Date & Time</label>
                <input type="datetime-local" required value={reminderForm.datetime} onChange={e => setReminderForm({...reminderForm, datetime: e.target.value})} className="w-full bg-parchment border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="text-xs"><Bell className="w-3 h-3" /> Set Reminder</Button>
              </div>
            </form>
            <div className="space-y-2">
              {reminders.length === 0 && <p className="text-xs font-functional text-ink-light/60 text-center py-4">No reminders set for this expedition.</p>}
              {reminders.map(r => (
                <div key={r.id} className={`flex justify-between items-center p-3 border rounded-sm text-sm ${r.fired ? 'opacity-50 bg-cream/40 border-sepia/20' : 'bg-cream border-sepia/30'}`}>
                  <div>
                    <p className="font-functional font-semibold text-ink">{r.text}</p>
                    <p className="font-mono text-[11px] text-ink-light">{r.datetime?.replace('T', ' ')}</p>
                    {r.fired && <span className="text-[10px] font-label text-rust uppercase">Fired</span>}
                  </div>
                  <button onClick={() => deleteReminder(r.id)} className="p-1 text-sepia hover:text-rust"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHARE TAB */}
        {activeTab === 'share' && (
          <div className="max-w-md mx-auto text-center space-y-4">
            <h4 className="font-display text-base text-ink uppercase">Apply Wax Sharing Seals</h4>
            <div className="flex justify-center gap-6 py-2">
              <label className="flex items-center gap-2 font-functional text-xs cursor-pointer"><input type="radio" checked={sharePermission === 0} onChange={() => setSharePermission(0)} className="accent-rust" /> Read-Only</label>
              <label className="flex items-center gap-2 font-functional text-xs cursor-pointer"><input type="radio" checked={sharePermission === 1} onChange={() => setSharePermission(1)} className="accent-rust" /> Allow Edits</label>
            </div>
            <Button onClick={generateShareToken} isLoading={shareLoading} className="text-xs w-full">Issue Share Token</Button>
            {shareError && <p className="text-xs text-rust">{shareError}</p>}
            {generatedLink && (
              <div className="p-4 bg-cream border border-sepia/30 rounded-sm space-y-4">
                <div className="text-[11px] font-mono select-all bg-parchment p-2 border border-sepia/10 break-all">{generatedLink}</div>
                <div className="bg-white p-3 inline-block rounded-sm border shadow-inner"><SafeQRCode value={generatedLink} size={130} /></div>
              </div>
            )}
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === 'map' && <TravelMap activities={plan.activities ?? []} />}

      </div>
    </div>
  );
};