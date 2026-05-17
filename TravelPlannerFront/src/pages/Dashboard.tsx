import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import { travelPlanService } from '../services/travelPlanService';
import type { TravelPlan } from '../models/types';
import { format } from 'date-fns';
import { Calendar, Scroll, Coins, ArrowRight, Compass, AlertCircle, Plus, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Dashboard = () => {
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        setLoading(true);
        const data = await travelPlanService.getAll();
        setPlans(data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError("Your ledger session authorization has crumbled. Please log back in.");
        } else {
          setError("Could not trace coordinates back to your travel data vault. Check ApiGateway connectivity.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchJourneys();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rust"></div>
        <p className="mt-4 font-display text-sm tracking-wide text-ink-light uppercase">Consulting Grand Archives...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Quick-Access Banner */}
      {isAdmin() && (
        <RouterLink
          to="/admin"
          className="flex items-center justify-between gap-3 px-5 py-3 bg-rust/10 border border-rust/40 rounded-sm hover:bg-rust/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-rust" />
            <div>
              <p className="font-display text-sm text-rust uppercase tracking-wide">Administrator Access Active</p>
              <p className="font-functional text-xs text-ink-light">Open Guild Core Control Panel →</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rust transition-transform group-hover:translate-x-1" />
        </RouterLink>
      )}

      {/* Role debug strip — remove after confirming admin works */}
      {import.meta.env.DEV && (
        <div className="text-[10px] font-mono text-ink-light/50 bg-cream/50 border border-sepia/20 px-3 py-1 rounded-sm">
          DEV: role=<strong>{user?.role ?? 'undefined'}</strong> · isAdmin={String(isAdmin())} · userId={user?.userId ?? '?'}
        </div>
      )}
      {/* Dynamic Header Frame with Navigation Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sepia/30 pb-4">
        <div>
          <h1 className="text-3xl font-display text-ink">Active Expeditions</h1>
          <p className="font-functional text-sm text-ink-light">Review, adapt, or deploy coordinates for your journeys.</p>
        </div>
        
        <RouterLink
          to="/travel-plans/create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rust text-parchment font-display text-sm tracking-wider uppercase border border-ink/20 rounded-sm shadow-md hover:bg-rust-light transition-all focus:outline-none"
        >
          <Plus className="w-4 h-4" />
          Chart New Expedition
        </RouterLink>
      </div>

      {error && (
        <div className="p-4 bg-red-900/10 border border-rust text-rust rounded-sm flex items-center gap-3 font-functional text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="text-center py-16 bg-parchment-dark/40 border border-dashed border-sepia/30 rounded-sm p-8">
          <Scroll className="w-12 h-12 text-sepia/50 mx-auto mb-4" />
          <h3 className="font-display text-lg text-ink">No Expeditions Written</h3>
          <p className="font-body text-ink-light max-w-sm mx-auto mt-1 mb-6">
            Your travel log remains unscribed. Chart a new course to populate your master map index.
          </p>
          <RouterLink
            to="/travel-plans/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cream hover:bg-parchment text-ink font-display text-xs tracking-wider border border-sepia transition-all"
          >
            Inscribe First Entry
          </RouterLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isOverBudget = plan.remainingBudget < 0;
            return (
              <div
                key={plan.id}
                className="group bg-parchment-dark p-5 rounded-sm shadow-md border border-sepia/30 hover:border-rust transition-all flex flex-col justify-between relative overflow-hidden"
              >
                {/* Visual Ambient Flourish Accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-rust/5 to-transparent pointer-events-none"></div>
                
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h2 className="font-display text-xl text-ink group-hover:text-rust transition-colors leading-snug">
                      {plan.name}
                    </h2>
                    <Compass className="w-4 h-4 text-sepia/40 group-hover:text-rust/60 transition-transform group-hover:rotate-45 flex-shrink-0 mt-1" />
                  </div>

                  {plan.description && (
                    <p className="font-body text-sm text-ink-light line-clamp-2 italic mb-4">
                      "{plan.description}"
                    </p>
                  )}

                  <div className="space-y-2 border-t border-sepia/20 pt-3">
                    <div className="flex items-center gap-2 text-xs font-functional text-ink-light">
                      <Calendar className="w-3.5 h-3.5 text-sepia" />
                      <span>
                        {format(new Date(plan.startDate), 'MMM dd, yyyy')} — {format(new Date(plan.endDate), 'MMM dd, yyyy')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-functional text-ink-light">
                      <Coins className="w-3.5 h-3.5 text-gold" />
                      <span>Budget Allocation: <span className="font-mono font-bold text-ink">{plan.budget.toFixed(0)} Coins</span></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-sepia/20">
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="font-functional text-ink-light">Vault Balance:</span>
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                        isOverBudget
                          ? 'bg-rust/10 text-rust border border-rust/30'
                          : 'bg-cream text-ink border border-sepia/30'
                      }`}
                    >
                      {plan.remainingBudget >= 0 
                        ? `+${plan.remainingBudget.toFixed(0)} Coins Left` 
                        : `${plan.remainingBudget.toFixed(0)} Coins Deficit`
                      }
                    </span>
                  </div>

                  <RouterLink
                    to={`/travel-plans/${plan.id}`}
                    className="w-full mt-4 inline-flex items-center justify-center gap-1.5 py-1.5 bg-cream hover:bg-parchment text-ink font-display text-xs tracking-wider border border-sepia transition-all group-hover:border-rust group-hover:text-rust"
                  >
                    INSPECT JOURNAL KEYS
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </RouterLink>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;