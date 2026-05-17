import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Compass, LogOut, Shield, Map } from 'lucide-react';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-parchment flex flex-col selection:bg-rust selection:text-parchment text-ink font-body">
      {/* Top Banner Navigation */}
      <header className="bg-parchment-dark border-b-2 border-sepia relative z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <Compass className="w-8 h-8 text-rust transition-transform duration-500 group-hover:rotate-45" />
            <div>
              <span className="font-display text-xl font-bold tracking-wider block leading-none">CHRONICLES</span>
              <span className="font-label text-[9px] tracking-widest text-ink-light block mt-0.5">EXPLORER MATRIX</span>
            </div>
          </Link>

          {/* Identity & Actions Navigation */}
          <div className="flex items-center gap-6">
            {user && (
              <div className="hidden md:flex flex-col text-right">
                <span className="font-functional font-semibold text-sm">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-light/70">
                  {user.role} Archivist
                </span>
              </div>
            )}

            <nav className="flex items-center gap-3">
              {isAdmin() && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border font-display text-xs tracking-wider transition-colors shadow-sm ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-rust text-parchment border-ink/20'
                      : 'bg-cream text-ink border-sepia/50 hover:bg-parchment'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  GUILD CORE
                </Link>
              )}

              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border font-display text-xs tracking-wider transition-colors shadow-sm ${
                  location.pathname === '/dashboard'
                    ? 'bg-rust text-parchment border-ink/20'
                    : 'bg-cream text-ink border-sepia/50 hover:bg-parchment'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                MY LEDGERS
              </Link>

              <button
                onClick={handleLogout}
                title="Seal Travel Journal"
                className="p-2 bg-cream text-ink border border-sepia/50 rounded-sm hover:text-rust hover:border-rust transition-all shadow-sm cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </nav>
          </div>
        </div>

        {/* Ink Stroke Divider Accentuator */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-sepia/40 to-transparent w-full"></div>
      </header>

      {/* Primary Canvas Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {children}
      </main>

      {/* Tiny Ledger Footer */}
      <footer className="py-4 text-center text-xs font-mono text-ink-light/50 border-t border-sepia/20">
        © {new Date().getFullYear()} Chronicles Travel Ledger System • Local Service Fabric Active Pipeline
      </footer>
    </div>
  );
};