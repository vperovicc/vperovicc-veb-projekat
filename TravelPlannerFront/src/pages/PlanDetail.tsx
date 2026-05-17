import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import { 
  Scroll, Calendar, Coins, MapPin, CheckSquare, 
  Share2, ShieldAlert, Activity, ClipboardList, Trash2, ArrowLeft 
} from 'lucide-react';

import { travelPlanService } from '../services/travelPlanService';
import type { TravelPlan } from '../models/types';
import { Button } from '../components/ui/Button';

// Category Definitions mapping database integer enums [Briefing Constraints]
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

  // Sharing state configuration
  const [sharePermission, setSharePermission] = useState<number>(0); // 0 = View, 1 = Edit
  const [generatedLink, setGeneratedLink] = useState<string>('');

  useEffect(() => {
    const fetchPlanData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await travelPlanService.getById(Number(id));
        setPlan(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Could not map structural ledger coordinates.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlanData();
  }, [id]);

  const handleDeletePlan = async () => {
    if (!plan || !window.confirm("Are you certain you wish to strike this entire journey from the records? This deletes all sub-data.")) return;
    try {
      await travelPlanService.delete(plan.id);
      navigate('/dashboard');
    } catch (err) {
      alert("Failed to burn structural ledger files.");
    }
  };

  const generateShareToken = () => {
    // Simulates an access permission payload mapping token parameters [Briefing Section 4/6]
    const simulationToken = `ST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const trackingUrl = `${window.location.origin}/shared-plans/${simulationToken}?perm=${sharePermission}`;
    setGeneratedLink(trackingUrl);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rust"></div>
        <span className="mt-3 font-display text-xs tracking-wider text-sepia uppercase">Scanning Parchment Logs...</span>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6 bg-red-900/10 border border-rust text-rust rounded-sm max-w-xl mx-auto text-center mt-10">
        <ShieldAlert className="w-10 h-10 mx-auto mb-3" />
        <p className="font-display text-lg">Ledger Entry Misplaced</p>
        <p className="font-body text-sm mt-1 mb-4">{error || "The requested expedition keys do not exist."}</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>Return to Safety</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Return & Administrative Command Ribbon */}
      <div className="flex items-center justify-between gap-4 border-b border-sepia/20 pb-3">
        <button 
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1 text-xs font-functional font-bold text-ink-light hover:text-rust transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Master Collection
        </button>
        <Button variant="danger" className="py-1 px-3 text-xs" onClick={handleDeletePlan}>
          <Trash2 className="w-3.5 h-3.5" /> Strike Records
        </Button>
      </div>

      {/* Primary Journal Header Banner */}
      <div className="bg-parchment-dark p-6 border border-sepia/30 rounded-sm shadow-sm relative">
        <div className="absolute top-2 right-2 font-mono text-[10px] text-sepia/40">ID: #{plan.id}</div>
        <h1 className="text-3xl font-display text-ink tracking-wide">{plan.name}</h1>
        {plan.description && <p className="font-body text-ink-light italic mt-1">"{plan.description}"</p>}
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-sepia/20">
          <div className="flex items-center gap-2 text-sm font-functional">
            <Calendar className="w-4 h-4 text-rust" />
            <span>{format(new Date(plan.startDate), 'dd MMM yyyy')} — {format(new Date(plan.endDate), 'dd MMM yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-functional">
            <Coins className="w-4 h-4 text-gold" />
            <span>Budget: <strong className="font-mono">{plan.budget} Coins</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm font-functional">
            <ClipboardList className="w-4 h-4 text-ink-light" />
            <span>Vault Reserve: 
              <strong className={`font-mono ml-1 ${plan.remainingBudget < 0 ? 'text-rust' : 'text-emerald-800'}`}>
                {plan.remainingBudget} Coins
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Medieval Matrix Journal Navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-sepia/40">
        {(['overview', 'destinations', 'activities', 'expenses', 'checklist', 'share'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-display text-xs tracking-wider uppercase border-t border-x rounded-t-sm transition-all relative top-[1px] ${
              activeTab === tab 
                ? 'bg-parchment-dark border-sepia/40 border-b-parchment text-rust font-bold z-10' 
                : 'bg-cream/40 border-transparent text-ink-light/70 hover:text-ink hover:bg-cream/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dynamic Main Journal Content Frame */}
      <div className="bg-parchment-dark p-6 border border-sepia/30 rounded-b-sm shadow-md min-h-[300px]">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="font-display text-lg text-ink border-b border-sepia/20 pb-1">Archivist Journal Insights</h3>
            <div className="bg-cream p-4 border border-sepia/20 rounded-sm">
              <span className="font-label text-xs block text-sepia mb-1">Marginalia & Private Reminders</span>
              <p className="font-body text-ink whitespace-pre-wrap italic">
                {plan.notes || "No secret administrative codes or marginalia written down for this expedition."}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs font-functional pt-2">
              <div className="bg-cream/60 p-3 border border-sepia/10">
                <span className="block text-ink-light">Destinations</span>
                <span className="text-xl font-display font-bold mt-1 block">{plan.destinations?.length || 0}</span>
              </div>
              <div className="bg-cream/60 p-3 border border-sepia/10">
                <span className="block text-ink-light">Activities</span>
                <span className="text-xl font-display font-bold mt-1 block">{plan.activities?.length || 0}</span>
              </div>
              <div className="bg-cream/60 p-3 border border-sepia/10">
                <span className="block text-ink-light">Total Expenses</span>
                <span className="text-xl font-display font-bold text-rust mt-1 block">{plan.totalExpenses || 0}</span>
              </div>
              <div className="bg-cream/60 p-3 border border-sepia/10">
                <span className="block text-ink-light">Checklist Items</span>
                <span className="text-xl font-display font-bold mt-1 block">{plan.checklistItems?.length || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* DESTINATIONS TAB */}
        {activeTab === 'destinations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-sepia/20 pb-2">
              <h3 className="font-display text-lg text-ink">Mapped Destinations</h3>
              <Button className="text-xs py-1">Add Waypoint</Button>
            </div>
            {!plan.destinations || plan.destinations.length === 0 ? (
              <p className="font-body text-sm text-ink-light italic text-center py-6">No maps pinned to this coordinate node yet.</p>
            ) : (
              <div className="space-y-3">
                {plan.destinations.map((dest: any) => (
                  <div key={dest.id} className="bg-cream p-4 border border-sepia/20 rounded-sm flex justify-between items-start">
                    <div>
                      <h4 className="font-display text-md text-rust flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> {dest.name}
                      </h4>
                      <p className="text-xs font-functional text-ink-light mt-0.5">
                        Duration: {format(new Date(dest.arrivalDate), 'dd MMM')} to {format(new Date(dest.departureDate), 'dd MMM, yyyy')}
                      </p>
                      {dest.description && <p className="font-body text-sm text-ink mt-2">{dest.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-sepia/20 pb-2">
              <h3 className="font-display text-lg text-ink">Scheduled Daily Tasks</h3>
              <Button className="text-xs py-1">Log Action</Button>
            </div>
            {!plan.activities || plan.activities.length === 0 ? (
              <p className="font-body text-sm text-ink-light italic text-center py-6">No scheduled operations exist for this duration window.</p>
            ) : (
              <div className="space-y-3">
                {plan.activities.map((act: any) => (
                  <div key={act.id} className="bg-cream p-4 border border-sepia/20 rounded-sm flex justify-between items-center">
                    <div>
                      <h4 className="font-display text-md text-ink">{act.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-functional text-ink-light">
                        <span>Time: {format(new Date(act.startTime), 'dd MMM, HH:mm')}</span>
                        {act.location && <span>Location: {act.location}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 bg-sepia/10 border border-sepia/20 rounded-sm text-ink">
                      {ACTIVITY_STATUSES[act.status] || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-sepia/20 pb-2">
              <h3 className="font-display text-lg text-ink">Treasury Expenditure Ledger</h3>
              <Button className="text-xs py-1">Record Cost</Button>
            </div>
            {!plan.expenses || plan.expenses.length === 0 ? (
              <p className="font-body text-sm text-ink-light italic text-center py-6">No gold outfluxes recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse font-functional">
                  <thead>
                    <tr className="border-b border-sepia/40 font-display text-xs tracking-wider text-ink">
                      <th className="py-2">Item/Description</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sepia/10 font-body">
                    {plan.expenses.map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-cream/40 transition-colors">
                        <td className="py-2.5 font-medium">{exp.title}</td>
                        <td className="py-2.5 text-xs font-mono text-ink-light">{EXPENSE_CATEGORIES[exp.category] || 'Other'}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-rust">{exp.amount.toFixed(2)} Coins</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-sepia/20 pb-2">
              <h3 className="font-display text-lg text-ink">Supply Inventory Checklist</h3>
              <Button className="text-xs py-1">Inscribe Requirement</Button>
            </div>
            {!plan.checklistItems || plan.checklistItems.length === 0 ? (
              <p className="font-body text-sm text-ink-light italic text-center py-6">No logistics listed on the manifesto framework.</p>
            ) : (
              <div className="space-y-2">
                {plan.checklistItems.map((item: any) => (
                  <label key={item.id} className="flex items-center gap-3 bg-cream p-3 border border-sepia/10 rounded-sm cursor-pointer select-none hover:bg-cream/80 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={item.isCompleted}
                      readOnly 
                      className="accent-rust w-4 h-4 border-sepia/40 rounded-sm cursor-pointer" 
                    />
                    <span className={`font-body text-sm text-ink ${item.isCompleted ? 'line-through text-ink-light/50 italic' : ''}`}>
                      {item.title}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SHARE TAB */}
        {activeTab === 'share' && (
          <div className="space-y-5 max-w-xl mx-auto text-center py-4">
            <Share2 className="w-10 h-10 text-rust mx-auto mb-2" />
            <h3 className="font-display text-lg text-ink">Forge Navigation Permission Keys</h3>
            <p className="font-body text-sm text-ink-light">
              Generate a cryptographically tied validation track so alternate cartographers can read or alter your chronicles via a secure matrix pathway.
            </p>

            <div className="flex justify-center gap-6 bg-cream p-3 border border-sepia/20 rounded-sm max-w-sm mx-auto">
              <label className="flex items-center gap-2 text-xs font-functional font-semibold cursor-pointer">
                <input 
                  type="radio" 
                  name="perm" 
                  checked={sharePermission === 0} 
                  onChange={() => { setSharePermission(0); setGeneratedLink(''); }} 
                  className="accent-rust"
                />
                Read Ledger Only
              </label>
              <label className="flex items-center gap-2 text-xs font-functional font-semibold cursor-pointer">
                <input 
                  type="radio" 
                  name="perm" 
                  checked={sharePermission === 1} 
                  onChange={() => { setSharePermission(1); setGeneratedLink(''); }} 
                  className="accent-rust"
                />
                Allow Document Edits
              </label>
            </div>

            <Button onClick={generateShareToken} className="text-xs">
              Melt Wax Seal & Generate Link
            </Button>

            {generatedLink && (
              <div className="mt-6 space-y-4 p-4 bg-cream border border-sepia/30 rounded-sm shadow-inner animate-fadeIn">
                <div className="text-xs font-mono select-all bg-parchment p-2 border border-sepia/20 text-ink overflow-x-auto rounded-sm">
                  {generatedLink}
                </div>
                
                {/* Embedded Client-side Canvas QR Framework */}
                <div className="bg-white p-3 inline-block rounded-sm border border-sepia/30 shadow-sm mx-auto">
                  <QRCode value={generatedLink} size={140} className="mx-auto" />
                </div>
                <p className="font-label text-[10px] text-sepia tracking-widest uppercase block">Scan Cipher Matrix</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};