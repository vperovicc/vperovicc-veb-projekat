import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Calendar, Coins, ShieldCheck, ShieldAlert, Compass, 
  CheckSquare, Square, MapPin, Activity as ActIcon, ClipboardList, Plus 
} from 'lucide-react';
import { sharingService } from '../services/sharingService';
import { checklistService } from '../services/checklistService';
import { destinationService } from '../services/destinationService';
import { activityService } from '../services/activityService';
import { expenseService } from '../services/expenseService';
import type { TravelPlan, ActivityStatus, ExpenseCategory } from '../models/types';
import { Button } from '../components/ui/Button';
import { TravelMap } from '../components/TravelMap';

const ACTIVITY_STATUSES: ActivityStatus[] = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];

const ACTIVITY_STATUS_MAP: Record<ActivityStatus, number> = {
  'Planned': 0, 'Reserved': 1, 'Completed': 2, 'Cancelled': 3
};

const EXPENSE_CATEGORY_MAP: Record<ExpenseCategory, number> = {
  'Transport': 0, 'Accommodation': 1, 'Food': 2, 'Tickets': 3, 'Shopping': 4, 'Other': 5
};

// Reverse arrays for rendering integer enums to strings in read/view states
const STATUS_LABELS = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const CATEGORY_LABELS = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];

type ViewTab = 'overview' | 'destinations' | 'activities' | 'expenses' | 'checklist' | 'map';

export const SharedPlanView = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);

  // Form states for additions
  const [destForm, setDestForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });
  const [actForm, setActForm] = useState({ name: '', description: '', dateTime: '', location: '', status: 'Planned' as ActivityStatus });
  const [expForm, setExpForm] = useState({ name: '', amount: '', category: 'Transport' as ExpenseCategory });
  const [checkForm, setCheckForm] = useState({ title: '' });

  const isEditMode = searchParams.get('perm') === '1';

  const validateAndFetchSharedPlan = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const authValidation = await sharingService.validateToken(token);
      
      if (!authValidation.isValid) {
        throw new Error(authValidation.reason || "This token lacks validation structural alignment.");
      }

      const planData = await sharingService.getSharedPlan(authValidation.travelPlanId, token);
      setPlan(planData);
    } catch (err: any) {
      setError(err.message || "This shared validation token has expired or is invalid.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateAndFetchSharedPlan();
  }, [token]);

  const handleReload = async () => {
    if (!plan || !token) return;
    const planData = await sharingService.getSharedPlan(plan.id, token);
    setPlan(planData);
  };

  const handleToggleChecklist = async (itemId: number, currentStatus: boolean) => {
    if (!isEditMode || !plan) return;
    try {
      setToggleLoadingId(itemId);
      await checklistService.toggle(plan.id, itemId, !currentStatus);
      await handleReload();
    } catch (err) {
      alert("Unauthorized: Configuration mutation rejected.");
    } finally {
      setToggleLoadingId(null);
    }
  };

  const addDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !destForm.name || !destForm.arrivalDate || !destForm.departureDate) return;
    if (new Date(destForm.departureDate) < new Date(destForm.arrivalDate)) {
      alert("The departure date cannot precede the arrival date.");
      return;
    }
    try {
      await destinationService.create(plan.id, {
        name: destForm.name, location: destForm.name,
        arrivalDate: destForm.arrivalDate, departureDate: destForm.departureDate,
        description: destForm.description || '', notes: ''
      });
      setDestForm({ name: '', arrivalDate: '', departureDate: '', description: '' });
      await handleReload();
    } catch (err) { alert("Failed to log waypoint."); }
  };

  const addActivity = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!plan || !actForm.name || !actForm.dateTime) return;
  try {
    await activityService.create(plan.id, {
      name: actForm.name, 
      date: actForm.dateTime + ':00', // Raw string — no TZ conversion
      time: null, 
      location: actForm.location || 'TBD', 
      description: actForm.description || '',
      estimatedCost: 0,
      status: actForm.status 
    });
    setActForm({ name: '', description: '', dateTime: '', location: '', status: 'Planned' });
    await handleReload();
  } catch (err) { 
    alert("Failed to log activity vector."); 
  }
};

const addExpense = async (e: React.FormEvent) => {
  e.preventDefault();
  const amountNum = Number(expForm.amount);
  if (!plan || !expForm.name || amountNum <= 0) return;
  try {
    await expenseService.create(plan.id, {
      name: expForm.name, 
      amount: amountNum,
      category: expForm.category, // <-- FIXED: Pass the string directly.
      date: new Date().toISOString(), 
      description: ''
    });
    setExpForm({ name: '', amount: '', category: 'Transport' });
    await handleReload();
  } catch (err) { 
    alert("Failed to audit resource coins."); 
  }
};

  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !checkForm.title.trim()) return;
    try {
      await checklistService.create(plan.id, checkForm.title.trim());
      setCheckForm({ title: '' });
      await handleReload();
    } catch (err) { alert("Failed to catalog packing item."); }
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
        <div className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-display tracking-wider rounded-sm shadow-inner uppercase ${
          isEditMode ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-emerald-100 border-emerald-400 text-emerald-950'
        }`}>
          <ShieldCheck className="w-4 h-4" /> {isEditMode ? "Interactive Scribe Access" : "Spectator Reading Only"}
        </div>
      </div>

      {/* Medieval Styled Navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-sepia/30">
        {(['overview', 'destinations', 'activities', 'expenses', 'checklist', 'map'] as ViewTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-display text-xs uppercase tracking-wider border border-b-0 rounded-t-sm transition-all ${
              activeTab === tab 
                ? 'bg-cream border-sepia text-rust font-bold shadow-xs' 
                : 'bg-parchment-dark/40 border-transparent text-ink-light hover:bg-parchment-dark/70'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-cream border border-sepia/30 p-6 rounded-sm shadow-sm min-h-[300px]">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-parchment border border-sepia/20 p-4 rounded-sm shadow-xs flex items-center gap-3">
                <Calendar className="w-8 h-8 text-rust" />
                <div>
                  <h4 className="font-label text-[10px] uppercase text-ink-light tracking-wider">Time window Horizon</h4>
                  <p className="font-mono text-xs font-bold">{format(new Date(plan.startDate), 'yyyy-MM-dd')} to {format(new Date(plan.endDate), 'yyyy-MM-dd')}</p>
                </div>
              </div>
              <div className="bg-parchment border border-sepia/20 p-4 rounded-sm shadow-xs flex items-center gap-3">
                <Coins className="w-8 h-8 text-gold" />
                <div>
                  <h4 className="font-label text-[10px] uppercase text-ink-light tracking-wider">Treasury Allocation</h4>
                  <p className="font-mono text-xs font-bold">{plan.budget} Coins</p>
                </div>
              </div>
              <div className="bg-parchment border border-sepia/20 p-4 rounded-sm shadow-xs flex items-center gap-3">
                <Coins className="w-8 h-8 text-rust-light" />
                <div>
                  <h4 className="font-label text-[10px] uppercase text-ink-light tracking-wider">Remaining Vault</h4>
                  <p className={`font-mono text-xs font-bold ${plan.remainingBudget < 0 ? 'text-rust' : 'text-emerald-800'}`}>
                    {plan.remainingBudget} Coins
                  </p>
                </div>
              </div>
            </div>
            {plan.notes && (
              <div className="bg-parchment/50 border border-dashed border-sepia/30 p-4 rounded-sm">
                <h5 className="font-display text-xs text-ink uppercase mb-1">Archivist's Marginalia Notes</h5>
                <p className="text-sm italic text-ink-light whitespace-pre-wrap">{plan.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* DESTINATIONS TAB */}
        {activeTab === 'destinations' && (
          <div className="space-y-6">
            {isEditMode && (
              <form onSubmit={addDestination} className="bg-parchment/40 p-4 border border-sepia/20 rounded-sm grid sm:grid-cols-4 gap-3">
                <input placeholder="Waypoint Name" value={destForm.name} onChange={e => setDestForm({...destForm, name: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm sm:col-span-2" required />
                <input type="date" value={destForm.arrivalDate} onChange={e => setDestForm({...destForm, arrivalDate: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm" required />
                <input type="date" value={destForm.departureDate} onChange={e => setDestForm({...destForm, departureDate: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm" required />
                <div className="sm:col-span-4 flex justify-end">
                  <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Map Waypoint</Button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {plan.destinations?.map((d: any) => (
                <div key={d.id} className="p-3 bg-parchment border border-sepia/10 text-sm rounded-sm flex justify-between items-center shadow-xs">
                  <span className="font-display text-sm uppercase text-ink">{d.name}</span>
                  <span className="font-mono text-xs text-ink-light">{format(new Date(d.arrivalDate), 'yyyy-MM-dd')} — {format(new Date(d.departureDate), 'yyyy-MM-dd')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            {isEditMode && (
              <form onSubmit={addActivity} className="bg-parchment/40 p-4 border border-sepia/20 rounded-sm grid sm:grid-cols-4 gap-3">
                <input placeholder="Activity Name" value={actForm.name} onChange={e => setActForm({...actForm, name: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm" required />
                <input type="datetime-local" value={actForm.dateTime} onChange={e => setActForm({...actForm, dateTime: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm" required />
                <input placeholder="Location (e.g. Rome, Italy)" value={actForm.location} onChange={e => setActForm({...actForm, location: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm" />
                <select value={actForm.status} onChange={e => setActForm({...actForm, status: e.target.value as ActivityStatus})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm">
                  {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="sm:col-span-4 flex justify-end">
                  <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Log Vector</Button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {plan.activities?.map((a: any) => (
              <div key={a.id} className="p-3 bg-parchment border border-sepia/10 text-sm rounded-sm flex justify-between items-center shadow-xs">
                <div>
                  <span className="font-display text-sm uppercase block">{a.name}</span>
                  <span className="font-mono text-[11px] text-ink-light">
                    {/* String-sliced — no TZ shift */}
                    {a.date.substring(0, 10)} @ {a.date.substring(11, 16)}{a.location && a.location !== 'TBD' ? ` · ${a.location}` : ''}
                  </span>
                </div>
                <span className="px-2 py-0.5 border font-display text-[10px] tracking-wider rounded-sm bg-parchment-dark border-sepia/40">
                  {typeof a.status === 'number' ? STATUS_LABELS[a.status] : a.status}
                </span>
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
                <input placeholder="Provisions Manifest Item" value={expForm.name} onChange={e => setExpForm({...expForm, name: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm" required />
                <input type="number" placeholder="Coins Cost" min="0.01" step="0.01" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm" required />
                <select value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value as ExpenseCategory})} className="bg-cream border border-sepia/30 p-2 text-xs rounded-sm">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="sm:col-span-3 flex justify-end">
                  <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Audit Ledger</Button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {plan.expenses?.map((e: any) => (
                <div key={e.id} className="p-3 bg-parchment border border-sepia/10 text-sm rounded-sm flex justify-between items-center shadow-xs">
                  <div>
                    <span className="font-medium block">{e.name}</span>
                    <span className="text-[10px] font-label tracking-widest uppercase text-gold">
                      {typeof e.category === 'number' ? CATEGORY_LABELS[e.category] : e.category}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-rust">{e.amount} Coins</span>
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
                <input placeholder="Add provision registry descriptor..." value={checkForm.title} onChange={e => setCheckForm({ title: e.target.value })} className="flex-1 bg-cream border border-sepia/40 px-3 py-1.5 text-xs rounded-sm" required />
                <Button type="submit" className="text-xs"><Plus className="w-3 h-3"/> Register</Button>
              </form>
            )}
            <div className="space-y-1.5">
              {plan.checklistItems?.map((item: any) => {
                const isItemCompleting = toggleLoadingId === item.id;
                return (
                  <div 
                    key={item.id} 
                    onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                    className={`flex items-center gap-3 p-2.5 border rounded-sm text-xs transition-all select-none ${
                      isEditMode ? 'cursor-pointer hover:border-rust bg-parchment/60' : 'opacity-70 bg-gray-100'
                    }`}
                  >
                    <div className="text-rust flex-shrink-0">
                      {item.isCompleted ? (
                        <CheckSquare className={`w-4 h-4 ${isItemCompleting ? 'animate-pulse' : ''}`} />
                      ) : (
                        <Square className={`w-4 h-4 ${isItemCompleting ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    <span className={`font-body font-medium transition-all ${item.isCompleted ? 'line-through text-ink-light/40 font-functional' : 'text-ink'}`}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <TravelMap activities={plan.activities ?? []} />
        )}

      </div>
    </div>
  );
};