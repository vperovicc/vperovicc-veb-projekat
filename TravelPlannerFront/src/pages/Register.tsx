import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { ShieldAlert, Scroll, User, Mail, Lock } from 'lucide-react';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Comprehensive frontend mapping evaluation
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
      setError('The security seals do not align. Passwords mismatch.');
      return;
    }

    try {
      setSubmitting(true);
      await authService.register({ firstName, lastName, email, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not register client. Email might be already claimed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 selection:bg-rust selection:text-parchment">
      <div className="w-full max-w-md bg-parchment-dark border-4 border-sepia p-8 shadow-2xl rounded-sm relative overflow-hidden before:content-[''] before:absolute before:inset-1 before:border before:border-sepia/30 before:pointer-events-none">
        
        {/* Flourish Corners */}
        <div className="absolute top-2 left-2 text-sepia/40 font-display text-xs pointer-events-none">✦</div>
        <div className="absolute top-2 right-2 text-sepia/40 font-display text-xs pointer-events-none">✦</div>
        <div className="absolute bottom-2 left-2 text-sepia/40 font-display text-xs pointer-events-none">✦</div>
        <div className="absolute bottom-2 right-2 text-sepia/40 font-display text-xs pointer-events-none">✦</div>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <Scroll className="w-12 h-12 text-rust" />
          </div>
          <h1 className="text-3xl font-display text-ink font-bold tracking-wider">GUILD REGISTRY</h1>
          <p className="text-xs font-label text-ink-light tracking-widest mt-1">ENLIST NEW ARCHIVIST</p>
          <div className="w-24 h-[1px] bg-sepia mx-auto mt-3 relative after:content-['◆'] after:absolute after:text-[8px] after:text-sepia after:-top-[5px] after:left-1/2 after:-ml-[4px] after:bg-parchment-dark px-1"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rust/10 border border-rust text-rust text-sm font-functional flex items-start gap-2 rounded-sm">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-gold/20 border border-gold text-ink font-functional text-sm rounded-sm text-center">
            Ledger recorded successfully! Forwarding to the login post...
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-label text-ink tracking-wider mb-1">GIVEN NAME *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-light/50">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full pl-9 pr-3 py-1.5 bg-cream border border-sepia/60 text-ink rounded-sm font-functional focus:outline-none focus:border-rust text-sm transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-label text-ink tracking-wider mb-1">SURNAME *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-1.5 bg-cream border border-sepia/60 text-ink rounded-sm font-functional focus:outline-none focus:border-rust text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label text-ink tracking-wider mb-1">EMAIL CORRESPONDENCE *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-light/50">
                <Mail className="w-3.5 h-3.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="explorer@cartography.com"
                className="w-full pl-9 pr-3 py-1.5 bg-cream border border-sepia/60 text-ink rounded-sm font-functional focus:outline-none focus:border-rust text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label text-ink tracking-wider mb-1">SECRET PASSCODE *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-light/50">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-1.5 bg-cream border border-sepia/60 text-ink rounded-sm font-functional focus:outline-none focus:border-rust text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label text-ink tracking-wider mb-1">CONFIRM PASSCODE *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-light/50">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-1.5 bg-cream border border-sepia/60 text-ink rounded-sm font-functional focus:outline-none focus:border-rust text-sm transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || success}
            className="w-full py-2.5 mt-2 bg-rust hover:bg-rust-light active:bg-rust text-parchment font-display font-semibold tracking-wide rounded-sm shadow-md transition-colors duration-200 disabled:opacity-50 cursor-pointer border border-ink/20"
          >
            {submitting ? 'COMMITTING TEXT...' : 'ENLIST INTO REGISTRY'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-sepia/30 text-center text-sm font-functional text-ink-light">
          Already a certified Cartographer?{' '}
          <Link to="/login" className="text-rust hover:text-rust-light underline font-semibold transition-colors">
            Present Seals
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;