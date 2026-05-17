import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import { 
  Scroll, Calendar, Coins, MapPin, CheckSquare, 
  Share2, ShieldAlert, Activity, ClipboardList, Trash2, ArrowLeft, Plus, Check, Square
} from 'lucide-react';

import { travelPlanService } from '../services/travelPlanService';
import { destinationService } from '../services/destinationService';
import { activityService } from '../services/activityService';
import { expenseService } from '../services/expenseService';
import { checklistService } from '../services/checklistService';
import { sharingService } from '../services/sharingService';
import type { TravelPlan, ActivityStatus, ExpenseCategory } from '../models/types';
import { Button } from '../components/ui/Button';
import { TravelMap } from '../components/TravelMap';

const SafeQRCode = (props: any) => {
  const QRCodeComponent: any = (QRCode as any).default || QRCode;
  try {
    return <QRCodeComponent {...props} />;
  } catch (e) {
    return <div className="p-4 border border-dashed border-sepia/30 text-xs text-center">QR Framework Loading Error</div>;
  }
};

const ACTIVITY_STATUSES: ActivityStatus[] = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];

const ACTIVITY_STATUS_MAP: Record<ActivityStatus, number> = {
  'Planned': 0,
  'Reserved': 1,
  'Completed': 2,
  'Cancelled': 3
};

const EXPENSE_CATEGORY_MAP: Record<ExpenseCategory, number> = {
  'Transport': 0,
  'Accommodation': 1,
  'Food': 2,
  'Tickets': 3,
  'Shopping': 4,
  'Other': 5
};

type ActiveTab = 'overview' | 'destinations' | 'activities' | 'expenses' | 'checklist' | 'share' | 'map';

export const PlanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  const [sharePermission, setSharePermission] = useState<number>(0);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [destForm, setDestForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });
  const [actForm, setActForm] = useState({ name: '', description: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });
  const [expForm, setExpForm] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });
  const [checkForm, setCheckForm] = useState({ title: '' });

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

  useEffect(() => {
    fetchPlanDetails();
  }, [id]);

  const handlePurgePlan = async () => {
    if (!plan || !window.confirm("Permanently burn this expedition log? All sub-manifest data will automatically cascade away.")) return;
    try {
      await travelPlanService.delete(plan.id);
      navigate('/dashboard');
    } catch (err) {
      alert("Failed to erase ledger entry.");
    }
  };

  const generateShareToken = async () => {
    if (!id) return;
    try {
      setShareLoading(true);
      setShareError(null);
      
      const response = await sharingService.createToken(Number(id), sharePermission);
      const pathLink = `${window.location.origin}/shared-plans/${response.token}?perm=${sharePermission}`;
      setGeneratedLink(pathLink);
    } catch (err: any) {
      setShareError("Failed to issue wax share seal credentials.");
    } finally {
      setShareLoading(false);
    }
  };

  const addDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destForm.name || !destForm.arrivalDate || !destForm.departureDate) return;
    
    // Strict Verification Rule Alignment
    if (new Date(destForm.departureDate) < new Date(destForm.arrivalDate)) {
      alert("The departure date cannot precede the arrival date.");
      return;
    }

    try {
      await destinationService.create(Number(id), {
        name: destForm.name,
        location: destForm.name,
        arrivalDate: destForm.arrivalDate,
      departureDate: destForm.departureDate,
        description: destForm.description || '',
        notes: ''
      });
      setDestForm({ name: '', arrivalDate: '', departureDate: '', description: '' });
      fetchPlanDetails();
    } catch (err) { alert("Failed to log waypoint."); }
  };

  const addActivity = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!actForm.name || !actForm.dateTime) return;
  try {
    await activityService.create(Number(id), {
      name: actForm.name,
      date: actForm.dateTime + ':00', // Raw string — no Date constructor, no TZ conversion
      time: null, // Safely ignored
      location: actForm.location || 'TBD',
      description: actForm.description || '',
      estimatedCost: 0,
      status: actForm.status
    });
    
    setActForm({ name: '', description: '', dateTime: '', location: '', status: 'Planned' });
    fetchPlanDetails();
  } catch (err) { 
    alert("Failed to log activity vector. Ensure your ApiGateway is reachable."); 
  }
};

const addExpense = async (e: React.FormEvent) => {
  e.preventDefault();
  const amountNum = Number(expForm.amount);
  if (!expForm.name || amountNum <= 0) {
    alert("Expense amount must be greater than zero.");
    return;
  }
  try {
    await expenseService.create(Number(id), {
      name: expForm.name,
      amount: amountNum,
      category: expForm.category, // <-- FIXED: Pass the string directly. The service maps it.
      date: new Date().toISOString(),
      description: ''
    });
    setExpForm({ name: '', amount: '', category: 'Transport' });
    fetchPlanDetails();
  } catch (err) { 
    alert("Failed to audit resource coins."); 
  }
};

  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkForm.title.trim()) return;
    try {
      await checklistService.create(Number(id), checkForm.title.trim());
      setCheckForm({ title: '' });
      fetchPlanDetails();
    } catch (err) { alert("Failed to catalog packing item."); }
  };

  const toggleCheckItem = async (itemId: number, currentStatus: boolean) => {
    try {
      await checklistService.toggle(Number(id), itemId, !currentStatus);
      fetchPlanDetails();
    } catch (err) { alert("Failed to check off provisions ledger."); }
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
      <div className="flex justify-between items-center border-b-2 border-sepia pb-4">
        <div>
          <h1 className="font-display text-3xl text-rust uppercase tracking-wide">{plan.name}</h1>
          <p className="font-body text-sm text-ink-light italic">{plan.description || "No written itinerary record exists for this deployment."}</p>
        </div>
        <Button variant="danger" onClick={handlePurgePlan} className="text-xs">
          <Trash2 className="w-4 h-4" /> Scrap Expedition
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-sepia/30">
        {(['overview', 'destinations', 'activities', 'expenses', 'checklist', 'share', 'map'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-display text-xs uppercase tracking-wider border border-b-0 rounded-t-sm transition-all ${
              activeTab === tab ? 'bg-parchment-dark text-rust border-sepia border-b-parchment font-bold' : 'bg-cream/40 text-ink-light border-transparent hover:bg-cream/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents Content Panels */}
      <div className="bg-parchment-dark p-6 border-2 border-sepia shadow-md rounded-sm min-h-[300px]">
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-display text-lg text-ink uppercase">Chronicle Marginalia & Observations</h3>
              <div className="bg-cream p-4 border border-sepia/30 font-body rounded-sm min-h-[100px] whitespace-pre-wrap">
                {plan.notes || "No secret observations mapped out yet."}
              </div>
            </div>
            <div className="bg-cream p-4 border-2 border-sepia rounded-sm space-y-4 h-fit">
              <h4 className="font-display text-sm uppercase text-ink border-b border-sepia/20 pb-2">Treasury Check</h4>
              <div className="flex justify-between font-functional text-xs"><span>Allocated Fund:</span><span className="font-mono">{plan.budget} Coins</span></div>
              <div className="flex justify-between font-functional text-xs"><span>Total Spent:</span><span className="font-mono text-rust">{plan.totalExpenses} Coins</span></div>
              <div className={`flex justify-between font-display text-xs pt-2 border-t border-sepia/20 font-bold ${isOverBudget ? 'text-rust' : 'text-ink'}`}>
                <span>{isOverBudget ? "Deficit Vault:" : "Remaining Coins:"}</span>
                <span className="font-mono">{plan.remainingBudget} Coins</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'destinations' && (
          <div className="space-y-6">
            <form onSubmit={addDestination} className="grid sm:grid-cols-4 gap-3 bg-cream p-4 border border-sepia/30 rounded-sm items-end">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-functional uppercase text-ink-light mb-1">Waypoint Title</label>
                <input type="text" required value={destForm.name} onChange={e => setDestForm({...destForm, name: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm" placeholder="e.g. Kingdom of Florence" />
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
                <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Map Waypoint</Button>
              </div>
            </form>
            <div className="space-y-3">
              {plan.destinations?.map(d => (
                <div key={d.id} className="bg-cream p-4 border border-sepia/20 rounded-sm flex justify-between items-center shadow-xs">
                  <div>
                    <h4 className="font-display text-base text-ink uppercase">{d.name}</h4>
                    <p className="font-mono text-xs text-ink-light">
                      {format(new Date(d.arrivalDate), 'MMM dd, yyyy')} — {format(new Date(d.departureDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <MapPin className="w-5 h-5 text-rust/60" />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-6">
            <form onSubmit={addActivity} className="bg-cream p-4 border border-sepia/30 rounded-sm space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <input type="text" placeholder="Activity Name" required value={actForm.name} onChange={e => setActForm({...actForm, name: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm" />
                <input type="datetime-local" required value={actForm.dateTime} onChange={e => setActForm({...actForm, dateTime: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
                <input type="text" placeholder="Location (e.g. Paris, France)" value={actForm.location} onChange={e => setActForm({...actForm, location: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm" />
              </div>
              <div className="flex justify-between items-center">
                <select value={actForm.status} onChange={e => setActForm({...actForm, status: e.target.value as ActivityStatus})} className="bg-parchment/60 border border-sepia/40 text-xs py-1 px-2 font-functional">
                  {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Order Plan Vector</Button>
              </div>
            </form>
            <div className="divide-y divide-sepia/10">
              {plan.activities?.map(a => (
                <div key={a.id} className="py-3 flex justify-between items-center">
                  <div>
                    <h5 className="font-display text-sm text-ink">{a.name}</h5>
                    <span className="font-mono text-xs text-ink-light">
                      {/* String-sliced directly — no Date constructor, no TZ shift */}
                      Execution: {a.date.substring(0, 10)} @ {a.date.substring(11, 16)} | Location: {a.location || 'Uncharted Coordinates'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 font-label text-[10px] rounded-sm uppercase border border-sepia/30 shadow-xs ${
                    a.status === 'Completed' ? 'bg-emerald-800 text-parchment' : a.status === 'Reserved' ? 'bg-blue-900 text-parchment' : 'bg-gold text-ink'
                  }`}>{a.status}</span>
                </div>
              ))}
          </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <form onSubmit={addExpense} className="grid sm:grid-cols-3 gap-3 bg-cream p-4 border border-sepia/30 rounded-sm items-end">
              <input type="text" placeholder="Expense Ledger Title" required value={expForm.name} onChange={e => setExpForm({...expForm, name: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm" />
              <input type="number" placeholder="Coins Cost" required min="1" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} className="w-full bg-parchment/60 border border-sepia/40 px-2 py-1.5 text-sm font-mono" />
              <select value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value as ExpenseCategory})} className="bg-parchment/60 border border-sepia/40 text-sm py-1.5 px-2 font-functional w-full">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="sm:col-span-3 flex justify-end"><Button type="submit" className="text-xs"><Coins className="w-3 h-3"/> Deduct Treasury</Button></div>
            </form>
            <div className="bg-cream border border-sepia/20 rounded-sm divide-y divide-sepia/10">
              {plan.expenses?.map(e => (
                <div key={e.id} className="p-3 flex justify-between items-center font-body text-sm">
                  <span>{e.name} <span className="text-xs font-mono text-ink-light/60">({e.category})</span></span>
                  <span className="font-mono font-bold text-rust">-{e.amount} Coins</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="space-y-4">
            <form onSubmit={addChecklistItem} className="flex gap-2">
              <input type="text" required placeholder="Packable supply item descriptor..." value={checkForm.title} onChange={e => setCheckForm({ title: e.target.value })} className="flex-1 bg-cream border border-sepia/40 px-3 py-1.5 text-sm rounded-sm" />
              <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Provision</Button>
            </form>
            <div className="grid sm:grid-cols-2 gap-2">
              {plan.checklistItems?.map(item => (
                <div key={item.id} onClick={() => toggleCheckItem(item.id, item.isCompleted)} className="bg-cream border border-sepia/20 p-2.5 rounded-sm flex items-center gap-3 cursor-pointer select-none hover:border-rust transition-all">
                  {item.isCompleted ? <CheckSquare className="w-4 h-4 text-rust" /> : <Square className="w-4 h-4 text-sepia/50" />}
                  <span className={`text-sm ${item.isCompleted ? 'line-through text-ink-light/40 font-functional' : 'text-ink'}`}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'share' && (
          <div className="max-w-md mx-auto text-center space-y-4">
            <h4 className="font-display text-base text-ink uppercase">Apply Wax Sharing Seals</h4>
            <div className="flex justify-center gap-6 py-2">
              <label className="flex items-center gap-2 font-functional text-xs cursor-pointer"><input type="radio" checked={sharePermission === 0} onChange={() => setSharePermission(0)} className="accent-rust" /> Read-Only Spectator</label>
              <label className="flex items-center gap-2 font-functional text-xs cursor-pointer"><input type="radio" checked={sharePermission === 1} onChange={() => setSharePermission(1)} className="accent-rust" /> Allow Document Edits</label>
            </div>
            <Button onClick={generateShareToken} isLoading={shareLoading} className="text-xs w-full">Melt Wax Seal & Issue Token</Button>
            {generatedLink && (
              <div className="p-4 bg-cream border border-sepia/30 rounded-sm space-y-4">
                <div className="text-[11px] font-mono select-all bg-parchment p-2 border border-sepia/10 break-all">{generatedLink}</div>
                <div className="bg-white p-3 inline-block rounded-sm border shadow-inner"><SafeQRCode value={generatedLink} size={130} /></div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'map' && (
          <TravelMap activities={plan.activities ?? []} />
        )}

      </div>
    </div>
  );
};