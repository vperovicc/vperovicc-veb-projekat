import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert, Compass, Mail, Lock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Route target memory tracking
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend Validations matching backend constraints
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Thy communication message (Email) format is invalid.');
      return;
    }
    if (password.length < 6) {
      setError('The security seal must be at least 6 glyphs long.');
      return;
    }

    try {
      setSubmitting(true);
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid credentials. The ledger rejects these authorization glyphs.');
      } else {
        setError(err.response?.data?.message || 'The gateway timed out. Check your local Service Fabric host.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 selection:bg-rust selection:text-parchment">
      {/* Decorative Outer Journal Frame */}
      <div className="w-full max-w-md bg-parchment-dark border-4 border-sepia p-8 shadow-2xl rounded-sm relative overflow-hidden before:content-[''] before:absolute before:inset-1 before:border before:border-sepia/30 before:pointer-events-none">
        
        {/* Flourish Corner Elements */}
        <div className="absolute top-2 left-2 text-sepia/40 font-display text-xs pointer-events-none">✦</div>
        <div className="absolute top-2 right-2 text-sepia/40 font-display text-xs pointer-events-none">✦</div>
        <div className="absolute bottom-2 left-2 text-sepia/40 font-display text-xs pointer-events-none">✦</div>
        <div className="absolute bottom-2 right-2 text-sepia/40 font-display text-xs pointer-events-none">✦</div>

        {/* Branding Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Compass className="w-12 h-12 text-rust animate-[spin_60s_linear_infinite]" />
          </div>
          <h1 className="text-3xl font-display text-ink font-bold tracking-wider">CHRONICLES</h1>
          <p className="text-xs font-label text-ink-light tracking-widest mt-1">TRAVEL LEDGER SYSTEM</p>
          <div className="w-24 h-[1px] bg-sepia mx-auto mt-3 relative after:content-['◆'] after:absolute after:text-[8px] after:text-sepia after:-top-[5px] after:left-1/2 after:-ml-[4px] after:bg-parchment-dark px-1"></div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rust/10 border border-rust text-rust text-sm font-functional flex items-start gap-2 rounded-sm animate-pulse">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-label text-ink tracking-wider mb-1">
              EMAIL ADDRESS <span className="text-rust">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-light/50">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="explorer@cartography.com"
                className="w-full pl-10 pr-3 py-2 bg-cream border border-sepia/60 text-ink rounded-sm font-functional focus:outline-none focus:border-rust focus:ring-1 focus:ring-rust/30 transition-all placeholder:text-ink-light/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label text-ink tracking-wider mb-1">
              SECURITY KEY <span className="text-rust">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-light/50">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 bg-cream border border-sepia/60 text-ink rounded-sm font-functional focus:outline-none focus:border-rust focus:ring-1 focus:ring-rust/30 transition-all placeholder:text-ink-light/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 bg-rust hover:bg-rust-light active:bg-rust text-parchment font-display font-semibold tracking-wide rounded-sm shadow-md transition-colors duration-200 disabled:opacity-50 cursor-pointer border border-ink/20"
          >
            {submitting ? 'VALIDATING LEDGER...' : 'OPEN CHRONICLES'}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-sepia/30 text-center text-sm font-functional text-ink-light">
          New to the Cartographer Guild?{' '}
          <Link to="/register" className="text-rust hover:text-rust-light underline font-semibold transition-colors">
            Enlist Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;