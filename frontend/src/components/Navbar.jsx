import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Boxes,
  HandHeart,
  HeartPulse,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const mainNavItems = [
  {
    name: 'Safe Status',
    path: '/safe-status',
    icon: ShieldCheck,
    description: 'Report safety',
  },
  {
    name: 'Resources',
    path: '/resources',
    icon: Boxes,
    description: 'Share supplies',
  },
  {
    name: 'Matching',
    path: '/matching',
    icon: MapPin,
    description: 'Find nearby help',
  },
  {
    name: 'Help Center',
    path: '/requests',
    icon: HandHeart,
    description: 'Community requests',
  },
];

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);

  if (parts.length === 0) return 'U';

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = useMemo(() => {
    return mainNavItems.find((item) => location.pathname.startsWith(item.path));
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    if (typeof logout === 'function') {
      logout();
    }

    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/safe-status" className="group flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200">
              <HeartPulse className="h-6 w-6" />
              <div className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                HLRN
              </p>
              <h1 className="text-base font-bold text-slate-900">
                Resilience Network
              </h1>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center lg:flex">
            <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-3xl border border-slate-200 bg-white px-3 py-2 shadow-sm md:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                {user?.name ? (
                  <span className="text-sm font-bold">{getInitials(user.name)}</span>
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </div>

              <div className="max-w-[170px]">
                <p className="truncate text-sm font-bold text-slate-900">
                  {user?.name || 'Resident'}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user?.email || user?.role || 'Community member'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-blue-600 md:flex"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 md:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile active breadcrumb */}
        <div className="flex items-center gap-2 border-t border-slate-100 py-3 lg:hidden">
          <LayoutGrid className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">
            {activeItem?.name || 'Dashboard'}
          </p>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t border-slate-100 pb-4 pt-3 lg:hidden">
            <div className="grid gap-2">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-3xl border p-4 transition ${
                      isActive
                        ? 'border-blue-100 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="mt-0.5 text-xs opacity-75">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  {user?.name ? (
                    <span className="text-sm font-bold">{getInitials(user.name)}</span>
                  ) : (
                    <UserRound className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {user?.name || 'Resident'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user?.email || 'Community member'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}