import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import { 
  Scroll, Calendar, Coins, MapPin, CheckSquare, 
  Share2, ShieldAlert, Activity, ClipboardList, Trash2, ArrowLeft, Plus, Check
} from 'lucide-react';

import api from '../services/api';
import { travelPlanService } from '../services/travelPlanService';
import type { TravelPlan } from '../models/types';
import { Button } from '../components/ui/Button';

// Safe wrapper fallback for Vite/CJS bundle configurations
const SafeQRCode = (props: any) => {
  const QRCodeComponent: any = (QRCode as any).default || QRCode;
  try {
    return <QRCodeComponent {...props} />;
  } catch (e) {
    return <div className="p-4 border border-dashed border-sepia/30 text-xs text-center">QR Framework Loading Error</div>;
  }
};

const ACTIVITY_STATUSES = ['Planned', 'Reserved', 'Completed', 'Cancelled'];
const EXPENSE_CATEGORIES = ['Transport', 'Accommodation', 'Food', 'Tickets', 'Shopping', 'Other'];

type ActiveTab = 'overview' | 'destinations' | 'activities' | 'expenses' | 'checklist' | 'share';

export const PlanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Share specific state configuration (Isolated to prevent full page unmounting)
  const [sharePermission, setSharePermission] = useState<number>(0);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Sub-forms Entry Inline States
  const [destForm, setDestForm] = useState({ name: '', arrivalDate: '', departureDate: '', description: '' });
  const [actForm, setActForm] = useState({ name: '', description: '', dateTime: '', location: '', status: 0 });
  const [expForm, setExpForm] = useState({ title: '', amount: '', category: 0 });
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
      
      const response = await api.post('/api/shares', {
        travelPlanId: Number(id),
        permissionLevel: sharePermission
      });
      
      const token = response.data.token;
      const pathLink = `${window.location.origin}/shared-plans/${token}?perm=${sharePermission}`;
      setGeneratedLink(pathLink);
    } catch (err: any) {
      setShareError(err.response?.data?.message || "Failed to issue wax share seal credentials.");
    } finally {
      setShareLoading(false);
    }
  };

  // Sub-Manifest Content Appends
  const addDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destForm.name || !destForm.arrivalDate || !destForm.departureDate) return;
    try {
      await api.post(`/api/destinations`, { ...destForm, travelPlanId: Number(id) });
      setDestForm({ name: '', arrivalDate: '', departureDate: '', description: '' });
      fetchPlanDetails();
    } catch (err) { alert("Failed to log waypoint."); }
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actForm.name || !actForm.dateTime) return;
    try {
      await api.post(`/api/activities`, { ...actForm, status: Number(actForm.status), travelPlanId: Number(id) });
      setActForm({ name: '', description: '', dateTime: '', location: '', status: 0 });
      fetchPlanDetails();
    } catch (err) { alert("Failed to log activity vector."); }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.title || Number(expForm.amount) <= 0) return;
    try {
      await api.post(`/api/expenses`, { 
        title: expForm.title, 
        amount: Number(expForm.amount), 
        category: Number(expForm.category), 
        travelPlanId: Number(id) 
      });
      setExpForm({ title: '', amount: '', category: 0 });
      fetchPlanDetails();
    } catch (err) { alert("Failed to log ledger expense transaction."); }
  };

  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkForm.title) return;
    try {
      await api.post(`/api/checklist`, { title: checkForm.title, isCompleted: false, travelPlanId: Number(id) });
      setCheckForm({ title: '' });
      fetchPlanDetails();
    } catch (err) { alert("Failed to pin checklist item."); }
  };

  const toggleCheckItem = async (itemId: number, currentStatus: boolean) => {
    try {
      await api.put(`/api/checklist/${itemId}`, { isCompleted: !currentStatus });
      fetchPlanDetails();
    } catch (err) { alert("Failed to update status marker."); }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rust"></div>
        <p className="mt-2 font-display text-xs tracking-wider text-sepia uppercase">Unrolling Map Log Manifest...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="bg-parchment-dark p-8 rounded-sm text-center border-2 border-sepia max-w-md mx-auto space-y-4">
        <ShieldAlert className="w-12 h-12 text-rust mx-auto" />
        <h2 className="text-xl font-display text-ink uppercase">Expedition Unreachable</h2>
        <p className="font-body text-sm text-ink-light">{error || 'Ledger document empty.'}</p>
        <Button onClick={() => navigate('/dashboard')} variant="secondary" className="w-full">
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  const isOverBudget = plan.remainingBudget < 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Upper Navigation Links */}
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 font-display text-xs tracking-wider text-sepia hover:text-rust transition-colors uppercase">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <button onClick={handlePurgePlan} className="flex items-center gap-1.5 font-display text-xs tracking-wider text-rust hover:text-rust-light transition-colors uppercase">
          <Trash2 className="w-3.5 h-3.5" /> Purge Journal
        </button>
      </div>

      {/* Main Parchment Document Sheet Header */}
      <div className="bg-parchment-dark border border-sepia/40 rounded-sm p-6 shadow-md relative">
        <span className="font-label text-[10px] tracking-widest text-sepia uppercase block mb-1">Central Expedition Ledger</span>
        <h1 className="text-3xl font-display text-ink tracking-wide">{plan.name}</h1>
        {plan.description && <p className="font-body text-ink-light italic text-sm mt-1">"{plan.description}"</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-sepia/20 text-xs font-functional">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rust" />
            <div>
              <span className="block text-ink-light font-bold">TIMELINE TRANSIT</span>
              <span>{format(new Date(plan.startDate), 'dd MMM yyyy')} — {format(new Date(plan.endDate), 'dd MMM yyyy')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-gold" />
            <div>
              <span className="block text-ink-light font-bold">TOTAL TREASURY ALLOCATION</span>
              <span className="font-mono text-sm">{plan.budget.toFixed(0)} Coins</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-ink-light" />
            <div>
              <span className="block text-ink-light font-bold">VAULT RESERVE STATUS</span>
              <span className={`font-mono text-sm font-bold ${isOverBudget ? 'text-rust' : 'text-emerald-800'}`}>
                {plan.remainingBudget.toFixed(0)} Coins {isOverBudget ? 'Deficit' : 'Remaining'}
              </span>
            </div>
          </div>
        </div>

        {plan.notes && (
          <div className="mt-4 p-3 bg-cream/40 border border-sepia/15 text-xs rounded-sm italic text-ink-light">
            <strong className="font-label uppercase block tracking-wider not-italic text-[9px] text-sepia mb-0.5">Archivist Marginalia:</strong>
            {plan.notes}
          </div>
        )}
      </div>

      {/* Tab Selectors Grid Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-sepia/30 font-display text-xs tracking-wider">
        {(['overview', 'destinations', 'activities', 'expenses', 'checklist', 'share'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-t border-x rounded-t-sm transition-all uppercase ${
              activeTab === tab 
                ? 'bg-parchment-dark border-sepia/40 text-rust font-bold border-b-parchment relative z-10' 
                : 'bg-cream/40 border-transparent text-ink-light hover:bg-cream'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Primary Tab Canvas Frame */}
      <div className="bg-parchment-dark border border-sepia/30 rounded-b-sm p-6 shadow-md min-h-[300px]">
        
        {/* TAB 1: OVERVIEW COMPONENT */}
        {activeTab === 'overview' && (
          <div className="space-y-6 font-body text-sm">
            <div>
              <h3 className="font-display text-lg text-ink border-b border-sepia/20 pb-1 mb-3">Expedition Summary Statistics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-cream p-3 border border-sepia/20 rounded-sm">
                  <span className="block text-2xl font-display text-rust">{plan.destinations?.length || 0}</span>
                  <span className="text-[10px] font-functional text-ink-light uppercase tracking-wider">Fixed Waypoints</span>
                </div>
                <div className="bg-cream p-3 border border-sepia/20 rounded-sm">
                  <span className="block text-2xl font-display text-rust">{plan.activities?.length || 0}</span>
                  <span className="text-[10px] font-functional text-ink-light uppercase tracking-wider">Itinerary Plans</span>
                </div>
                <div className="bg-cream p-3 border border-sepia/20 rounded-sm">
                  <span className="block text-2xl font-display text-rust">{plan.totalExpenses?.toFixed(0) || 0}</span>
                  <span className="text-[10px] font-functional text-ink-light uppercase tracking-wider">Spent Gold Coins</span>
                </div>
                <div className="bg-cream p-3 border border-sepia/20 rounded-sm">
                  <span className="block text-2xl font-display text-rust">
                    {plan.checklistItems?.filter(i => i.isCompleted).length || 0}/{plan.checklistItems?.length || 0}
                  </span>
                  <span className="text-[10px] font-functional text-ink-light uppercase tracking-wider">Provisions Packed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DESTINATIONS MANIFEST */}
        {activeTab === 'destinations' && (
          <div className="space-y-6">
            <form onSubmit={addDestination} className="bg-cream p-4 border border-sepia/20 rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-functional items-end">
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Waypoint Title</label>
                <input type="text" required value={destForm.name} onChange={e => setDestForm({...destForm, name: e.target.value})} placeholder="e.g., Kingdom of Venice" className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm" />
              </div>
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Arrival Date</label>
                <input type="date" required value={destForm.arrivalDate} onChange={e => setDestForm({...destForm, arrivalDate: e.target.value})} className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm" />
              </div>
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Departure Date</label>
                <input type="date" required value={destForm.departureDate} onChange={e => setDestForm({...destForm, departureDate: e.target.value})} className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm" />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" className="text-xs py-1 px-3"><Plus className="w-3.5 h-3.5" /> Append Coordinate Vector</Button>
              </div>
            </form>

            <div className="space-y-3">
              {!plan.destinations || plan.destinations.length === 0 ? (
                <p className="text-sm italic text-ink-light">No fixed chart targets pinned to this route.</p>
              ) : (
                plan.destinations.map(d => (
                  <div key={d.id} className="bg-cream p-4 border border-sepia/20 rounded-sm flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-rust shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-display text-base text-ink">{d.name}</h4>
                      <p className="text-xs font-functional text-ink-light">
                        Transit Window: {format(new Date(d.arrivalDate), 'dd MMM yyyy')} — {format(new Date(d.departureDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVITIES ITINERARY */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            <form onSubmit={addActivity} className="bg-cream p-4 border border-sepia/20 rounded-sm grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-functional items-end">
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Activity Vector Title</label>
                <input type="text" required value={actForm.name} onChange={e => setActForm({...actForm, name: e.target.value})} placeholder="e.g., Secure Tavern Lodging" className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm" />
              </div>
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Execution Timing</label>
                <input type="datetime-local" required value={actForm.dateTime} onChange={e => setActForm({...actForm, dateTime: e.target.value})} className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm" />
              </div>
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Specific Coordinates/Location</label>
                <input type="text" value={actForm.location} onChange={e => setActForm({...actForm, location: e.target.value})} placeholder="e.g., Old Pier Marketplace" className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm" />
              </div>
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Status Badge</label>
                <select value={actForm.status} onChange={e => setActForm({...actForm, status: Number(e.target.value)})} className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm">
                  {ACTIVITY_STATUSES.map((status, idx) => <option key={idx} value={idx}>{status}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" className="text-xs py-1 px-3"><Plus className="w-3.5 h-3.5" /> Add Task Blueprint</Button>
              </div>
            </form>

            <div className="space-y-3">
              {!plan.activities || plan.activities.length === 0 ? (
                <p className="text-sm italic text-ink-light">No daily tracking agendas written yet.</p>
              ) : (
                plan.activities.map(a => (
                  <div key={a.id} className="bg-cream p-4 border border-sepia/20 rounded-sm flex justify-between items-center">
                    <div>
                      <h4 className="font-display text-sm text-ink">{a.name}</h4>
                      <p className="text-xs text-ink-light font-functional">
                        Execution: {format(new Date(a.date), 'dd MMM yyyy - HH:mm')} | Location: {a.location || 'Uncharted Coordinates'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 border border-sepia/30 bg-parchment text-[10px] uppercase font-functional tracking-wider font-bold">
                      {ACTIVITY_STATUSES[Number(a.status)]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TREASURY EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <form onSubmit={addExpense} className="bg-cream p-4 border border-sepia/20 rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-functional items-end">
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Transaction Title</label>
                <input type="text" required value={expForm.title} onChange={e => setExpForm({...expForm, title: e.target.value})} placeholder="e.g., Rations & Supplies" className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm" />
              </div>
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Cost (Gold Coins)</label>
                <input type="number" required min="0.01" step="0.01" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} placeholder="0" className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm font-mono" />
              </div>
              <div>
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Log Category</label>
                <select value={expForm.category} onChange={e => setExpForm({...expForm, category: Number(e.target.value)})} className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm">
                  {EXPENSE_CATEGORIES.map((cat, idx) => <option key={idx} value={idx}>{cat}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" className="text-xs py-1 px-3"><Plus className="w-3.5 h-3.5" /> Transact Gold Coins</Button>
              </div>
            </form>

            <div className="space-y-2">
              {!plan.expenses || plan.expenses.length === 0 ? (
                <p className="text-sm italic text-ink-light">Treasury balance sheet is fully clean.</p>
              ) : (
                plan.expenses.map(ex => (
                  <div key={ex.id} className="bg-cream px-4 py-3 border border-sepia/20 rounded-sm flex justify-between items-center font-functional">
                    <div>
                      <strong className="font-body text-sm text-ink block">{ex.name}</strong>
                      <span className="text-[10px] text-sepia uppercase font-bold tracking-wider">{EXPENSE_CATEGORIES[Number(ex.category)]}</span>
                    </div>
                    <span className="font-mono text-rust font-bold">-{ex.amount} Coins</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PACKING CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            <form onSubmit={addChecklistItem} className="bg-cream p-4 border border-sepia/20 rounded-sm flex gap-3 text-xs font-functional items-end">
              <div className="flex-1">
                <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Item Descriptor</label>
                <input type="text" required value={checkForm.title} onChange={e => setCheckForm({ title: e.target.value })} placeholder="e.g., Compass Tool Kit, Extra Water Flasks" className="w-full px-2 py-1.5 bg-parchment border border-sepia/40 rounded-sm" />
              </div>
              <Button type="submit" className="text-xs py-1.5 px-3"><Plus className="w-3.5 h-3.5" /> Pack Item</Button>
            </form>

            <div className="divide-y divide-sepia/15 font-body">
              {!plan.checklistItems || plan.checklistItems.length === 0 ? (
                <p className="text-sm italic text-ink-light">No gear tracking manifests attached.</p>
              ) : (
                plan.checklistItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => toggleCheckItem(item.id, item.isCompleted)}
                    className="flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-cream/40 transition-colors select-none"
                  >
                    <div className={`w-4 h-4 border border-sepia flex items-center justify-center rounded-sm ${item.isCompleted ? 'bg-rust text-parchment' : 'bg-cream'}`}>
                      {item.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={`text-sm ${item.isCompleted ? 'line-through text-ink-light/50 italic' : 'text-ink'}`}>
                      {item.name}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: DIAL SHARE WAX SEAL (Isformed & Safeguarded) */}
        {activeTab === 'share' && (
          <div className="max-w-md mx-auto text-center space-y-4 font-body">
            <Share2 className="w-10 h-10 text-sepia mx-auto" />
            <h3 className="font-display text-lg text-ink uppercase tracking-wide">Melt Wax Authorization Seal</h3>
            <p className="text-xs font-functional text-ink-light leading-relaxed">
              Generate a client-side cipher token link and QR code matrix. Anyone with this grid map token key can examine or modify your journal logging notes.
            </p>

            {shareError && (
              <div className="p-3 bg-rust/10 border border-rust text-rust text-xs font-functional rounded-sm text-left">
                {shareError}
              </div>
            )}

            <div className="flex justify-center gap-6 py-2 text-xs font-functional">
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input type="radio" name="perm" checked={sharePermission === 0} onChange={() => { setSharePermission(0); setGeneratedLink(''); }} className="accent-rust" />
                Read-Only Spectator
              </label>
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input type="radio" name="perm" checked={sharePermission === 1} onChange={() => { setSharePermission(1); setGeneratedLink(''); }} className="accent-rust" />
                Allow Document Edits
              </label>
            </div>

            <Button onClick={generateShareToken} isLoading={shareLoading} className="text-xs w-full">
              Melt Wax Seal & Generate Link
            </Button>

            {generatedLink && (
              <div className="mt-6 space-y-4 p-4 bg-cream border border-sepia/30 rounded-sm shadow-inner">
                <div className="text-xs font-mono select-all bg-parchment p-2 border border-sepia/20 text-ink overflow-x-auto rounded-sm text-left">
                  {generatedLink}
                </div>
                
                {/* Securely Isolated QR Component Container Frame */}
                <div className="bg-white p-3 inline-block rounded-sm border border-sepia/30 shadow-sm mx-auto">
                  <SafeQRCode value={generatedLink} size={140} className="mx-auto" />
                </div>
                <span className="font-label text-[10px] text-sepia tracking-widest uppercase block mt-1">Scan Cipher Matrix Code</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};