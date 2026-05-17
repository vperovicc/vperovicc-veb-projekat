import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {  Calendar, Coins, ShieldCheck, ShieldAlert, Compass } from 'lucide-react';
import api from '../services/api';
import type { TravelPlan } from '../models/types';
import { Button } from '../components/ui/Button';

export const SharedPlanView = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = searchParams.get('perm') === '1';

  useEffect(() => {
    const validateSharedToken = async () => {
      try {
        setLoading(true);
        const response = await api.get<TravelPlan>(`/api/shares/validate`, {
          params: { token }
        });
        setPlan(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "This shared validation token has expired or is invalid.");
      } finally {
        setLoading(false);
      }
    };

    if (token) validateSharedToken();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rust"></div>
        <p className="mt-4 font-display text-sm tracking-wider text-ink-light uppercase">Decrypting Shared Wax Seal...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center p-4">
        <div className="bg-parchment-dark p-8 rounded-sm shadow-md border border-rust max-w-md w-full text-center relative">
          <ShieldAlert className="w-12 h-12 text-rust mx-auto mb-4" />
          <h2 className="text-2xl font-display text-ink mb-2">Access Key Invalid</h2>
          <p className="font-body text-sm text-ink-light mb-6">{error}</p>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/dashboard')}>
            Return to Private Quarters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment text-ink font-body p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Verification Status Alert Ribbon */}
        <div className="bg-emerald-900/10 border border-emerald-800 text-emerald-900 px-4 py-3 rounded-sm flex items-center justify-between text-sm font-functional">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
            <span>Authenticated via Shared Token Grid. Mode: <strong>{isEditMode ? 'Co-Cartographer (Write)' : 'Spectator (Read-Only)'}</strong></span>
          </div>
          <button onClick={() => navigate('/dashboard')} className="text-xs underline font-bold hover:text-rust">
            Go to My Dashboard
          </button>
        </div>

        {/* Plan Header Summary Card */}
        <div className="bg-parchment-dark p-6 border border-sepia/30 rounded-sm shadow-md relative">
          <Compass className="absolute top-4 right-4 w-8 h-8 text-sepia/20" />
          <span className="font-label text-[10px] tracking-widest text-sepia uppercase block mb-1">Shared Expedition Journal</span>
          <h1 className="text-3xl font-display text-ink tracking-wide">{plan.name}</h1>
          {plan.description && <p className="font-body text-ink-light italic mt-1">"{plan.description}"</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-sepia/20 text-sm font-functional">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rust" />
              <span>Duration: {format(new Date(plan.startDate), 'dd MMM yyyy')} — {format(new Date(plan.endDate), 'dd MMM yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-gold" />
              <span>Allocated Funds: <strong className="font-mono">{plan.budget} Coins</strong></span>
            </div>
          </div>
        </div>

        {/* Detailed Lists */}
        <div className="bg-parchment-dark p-6 border border-sepia/30 rounded-sm shadow-md space-y-6">
          <div>
            <h3 className="font-display text-lg text-ink border-b border-sepia/20 pb-1 mb-3">Planned Waypoints</h3>
            {!plan.destinations || plan.destinations.length === 0 ? (
              <p className="text-sm font-body text-ink-light italic">No map vectors fixed to this coordinate node.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {plan.destinations.map((dest: any) => (
                  <div key={dest.id} className="bg-cream p-3 border border-sepia/10 rounded-sm">
                    <h4 className="font-display text-sm text-rust">{dest.name}</h4>
                    <p className="text-[11px] font-functional text-ink-light">
                      Staying from {format(new Date(dest.arrivalDate), 'dd MMM')} to {format(new Date(dest.departureDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};