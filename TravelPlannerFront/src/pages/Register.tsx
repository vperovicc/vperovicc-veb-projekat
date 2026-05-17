import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { ShieldAlert, Scroll, ShieldCheck, KeyRound } from 'lucide-react';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Provide both identity descriptors (First & Last Names).');
      return;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('The provided email structure is invalid.');
      return;
    }
    if (password.length < 6) {
      setError('The passcode requires 6 or more validation characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The validation passphrases do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = { firstName, lastName, email, password };
      if (adminKey.trim()) payload.adminKey = adminKey.trim();
      await authService.register(payload);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'The archive register rejected this entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-4 selection:bg-rust selection:text-parchment text-ink font-body">
      <div className="bg-parchment-dark p-8 rounded-sm shadow-xl border-2 border-sepia max-w-md w-full relative">
        <div className="text-center mb-6">
          <Scroll className="w-10 h-10 text-rust mx-auto mb-2" />
          <h2 className="text-2xl font-display tracking-wide uppercase">Join the Cartographer Guild</h2>
          <p className="text-xs font-functional text-ink-light">Log your coordinates into the global registry system</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rust/10 border border-rust text-rust rounded-sm flex items-center gap-2 text-xs font-functional">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-900/10 border border-emerald-800 text-emerald-900 rounded-sm flex items-center gap-2 text-xs font-functional">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Identity logged successfully! Directing to entry gates...</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 text-xs font-functional">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">First Name</label>
              <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-1.5 bg-cream border border-sepia/60 rounded-sm" />
            </div>
            <div>
              <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Last Name</label>
              <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-1.5 bg-cream border border-sepia/60 rounded-sm" />
            </div>
          </div>

          <div>
            <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Guild Email Address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-1.5 bg-cream border border-sepia/60 rounded-sm" />
          </div>

          <div>
            <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Security Passphrase</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-1.5 bg-cream border border-sepia/60 rounded-sm" />
          </div>

          <div>
            <label className="block text-ink font-semibold mb-1 uppercase tracking-wider">Confirm Passphrase</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-1.5 bg-cream border border-sepia/60 rounded-sm" />
          </div>

          {/* Admin elevation — only works if correct secret key is entered */}
          <div className="p-3 bg-cream/50 border border-sepia/30 rounded-sm space-y-1.5">
            <label className="flex items-center gap-1.5 text-ink font-semibold uppercase tracking-wider">
              <KeyRound className="w-3.5 h-3.5 text-sepia" />
              Administrator Key <span className="normal-case font-body text-ink-light/60">(optional)</span>
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Leave blank for standard enlistment"
              className="w-full px-3 py-1.5 bg-cream border border-sepia/60 rounded-sm placeholder:text-ink-light/40"
            />
            <p className="text-[10px] text-ink-light/60 font-body">If you hold the Guild High Guard key, enter it above to receive Administrator clearance.</p>
          </div>

          <button type="submit" disabled={submitting || success} className="w-full py-2.5 bg-rust hover:bg-rust-light text-parchment font-display font-semibold tracking-wide rounded-sm shadow-md transition-colors border border-ink/20 uppercase">
            {submitting ? 'Committing Text...' : 'Enlist Into Registry'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-sepia/30 text-center text-xs font-functional text-ink-light">
          Already a certified Cartographer?{' '}
          <Link to="/login" className="text-rust hover:text-rust-light underline font-semibold">Open Ledger</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;