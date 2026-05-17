import { useEffect, useState } from 'react';
import { Shield, Users, Scroll, Trash2 } from 'lucide-react';
import { adminService } from '../services/adminService';
import type { User, TravelPlan } from '../models/types';

export const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, plansData] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllPlans()
      ]);
      setUsers(usersData);
      setPlans(plansData);
    } catch (err: any) {
      setError("Failed to gather master logs. Verify administrative role clearance keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDeactivateUser = async (userId: number) => {
    if (!window.confirm("Revoke this archivist's registry access credentials?")) return;
    try {
      await adminService.deactivateUser(userId);
      fetchAdminData();
    } catch (err) {
      alert("Failed to freeze user access permissions.");
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!window.confirm("Purge this journey ledger entry permanently from global matrices?")) return;
    try {
      await adminService.deletePlan(planId);
      fetchAdminData();
    } catch (err) {
      alert("Failed to burn target journey ledger layout.");
    }
  };

  if (loading) return <div className="p-8 text-center font-display text-rust animate-pulse">Querying Guild Core Security Ledgers...</div>;
  if (error) return <div className="p-6 bg-cream border border-rust text-rust font-display text-center rounded-sm max-w-md mx-auto mt-12">{error}</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="border-b-2 border-sepia pb-4 flex items-center gap-3">
        <Shield className="w-8 h-8 text-rust" />
        <div>
          <h1 className="font-display text-2xl text-ink uppercase tracking-wide">Guild Matrix Core Controls</h1>
          <p className="font-body text-xs text-ink-light italic">High Command Sovereign Administrative Oversight Supervision Dashboard</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* User Management Ledger Box */}
        <div className="bg-parchment-dark p-5 rounded-sm border border-sepia/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-sepia/20 pb-2">
            <Users className="w-5 h-5 text-sepia" />
            <h2 className="font-display text-base text-ink uppercase">Archivist Registry Logs ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-sepia/30 text-ink font-functional uppercase">
                  <th className="py-2">Identity</th>
                  <th className="py-2">Role</th>
                  <th className="py-2 text-right">Sanctions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sepia/15 font-body text-sm">
                {users.map(u => (u.id &&
                  <tr key={u.id} className="hover:bg-cream/40">
                    <td className="py-2.5">
                      <div className="font-semibold text-ink">{u.firstName} {u.lastName}</div>
                      <div className="text-[10px] text-ink-light/70 font-mono select-all">{u.email}</div>
                    </td>
                    <td className="py-2.5 font-label text-[10px]"><span className={u.role === 'Admin' ? 'text-rust font-bold' : 'text-ink-light'}>{u.role}</span></td>
                    <td className="py-2.5 text-right">
                      {u.isActive ? (
                        <button onClick={() => handleDeactivateUser(u.id)} className="text-xs bg-cream hover:bg-rust hover:text-parchment px-2 py-1 border border-sepia/30 rounded-xs transition-colors">Exile</button>
                      ) : (
                        <span className="text-[11px] font-functional text-rust italic">Banished</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plan Manifest Management Box */}
        <div className="bg-parchment-dark p-5 rounded-sm border border-sepia/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-sepia/20 pb-2">
            <Scroll className="w-5 h-5 text-sepia" />
            <h2 className="font-display text-base text-ink uppercase">Master Ledger Manifests ({plans.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-sepia/30 text-ink uppercase">
                  <th className="py-2">Journey Title</th>
                  <th className="py-2">Treasury Alloc.</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sepia/15 font-body text-sm">
                {plans.map(p => (
                  <tr key={p.id} className="hover:bg-cream/30">
                    <td className="py-2.5 font-medium truncate max-w-[180px] text-ink uppercase font-display text-xs">{p.name}</td>
                    <td className="py-2.5 font-mono text-xs text-ink-light">{p.budget} Coins</td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => handleDeletePlan(p.id)} className="text-rust hover:text-red-600 p-1" title="Purge Document">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};