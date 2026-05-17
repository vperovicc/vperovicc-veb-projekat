import { useEffect, useState } from 'react';
import { Shield, Users, Scroll, Trash2, Ban } from 'lucide-react';
import api from '../services/api';

export const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      // Fetch both entities concurrently via the administrative gateway endpoints
      const [usersRes, plansRes] = await Promise.all([
        api.get<any[]>('/api/admin/users'),
        api.get<any[]>('/api/admin/travel-plans')
      ]);
      setUsers(usersRes.data);
      setPlans(plansRes.data);
    } catch (err: any) {
      setError("Failed to gather master logs. Verify administrative JWT role clearance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDeactivateUser = async (userId: number) => {
    if (!window.confirm("Revoke this user's registry access credentials?")) return;
    try {
      await api.put(`/api/admin/users/${userId}/deactivate`);
      fetchAdminData(); // Refresh records
    } catch (err) {
      alert("Failed to restrict user access.");
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!window.confirm("Permanently erase this expedition from the master files? This action is irreversible.")) return;
    try {
      await api.delete(`/api/admin/travel-plans/${planId}`);
      fetchAdminData(); // Refresh records
    } catch (err) {
      alert("Failed to strike record.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rust"></div>
        <p className="mt-2 font-display text-xs tracking-wider text-sepia uppercase">Opening Master Imperial Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Title Header */}
      <div className="flex items-center gap-3 border-b border-sepia/30 pb-4">
        <Shield className="w-8 h-8 text-rust" />
        <div>
          <h1 className="text-3xl font-display text-ink">High Guard Administrative Archives</h1>
          <p className="font-functional text-sm text-ink-light">Global overview of system operations, users, and logged itineraries.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/10 border border-rust text-rust font-functional text-sm rounded-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* USERS MANAGEMENT MATRIX */}
        <div className="bg-parchment-dark p-5 rounded-sm border border-sepia/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-sepia/20 pb-2">
            <Users className="w-5 h-5 text-sepia" />
            <h2 className="font-display text-lg text-ink">Registered Cartographers ({users.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-functional border-collapse">
              <thead>
                <tr className="border-b border-sepia/30 text-ink uppercase tracking-wider">
                  <th className="py-2">Identity</th>
                  <th className="py-2">Guild Email</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sepia/15 font-body text-sm">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-cream/30">
                    <td className="py-2.5 font-medium">{u.firstName} {u.lastName}</td>
                    <td className="py-2.5 font-mono text-xs text-ink-light">{u.email}</td>
                    <td className="py-2.5 text-right">
                      <button 
                        onClick={() => handleDeactivateUser(u.id)}
                        className="text-rust hover:text-rust-light p-1" 
                        title="Deactivate Guild Access"
                      >
                        <Ban className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GLOBAL EXPEDITIONS CONTROLLER */}
        <div className="bg-parchment-dark p-5 rounded-sm border border-sepia/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-sepia/20 pb-2">
            <Scroll className="w-5 h-5 text-sepia" />
            <h2 className="font-display text-lg text-ink">Master Ledger Manifests ({plans.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-functional border-collapse">
              <thead>
                <tr className="border-b border-sepia/30 text-ink uppercase tracking-wider">
                  <th className="py-2">Journey Title</th>
                  <th className="py-2">Treasury Alloc.</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sepia/15 font-body text-sm">
                {plans.map(p => (
                  <tr key={p.id} className="hover:bg-cream/30">
                    <td className="py-2.5 font-medium truncate max-w-[180px]">{p.name}</td>
                    <td className="py-2.5 font-mono text-xs text-ink-light">{p.budget} Coins</td>
                    <td className="py-2.5 text-right">
                      <button 
                        onClick={() => handleDeletePlan(p.id)}
                        className="text-red-900 hover:text-red-700 p-1" 
                        title="Purge Document"
                      >
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