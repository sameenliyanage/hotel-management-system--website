import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/rooms', label: 'Rooms' },
  { to: '/room-types', label: 'Room Types' },
  { to: '/guests', label: 'Guests' },
  { to: '/staff', label: 'Staff' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/payments', label: 'Payments' },
];

function AppShell() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('hotelStaff');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Hotel Logo" className="h-25 w-35 items-center square-full"
            />
          </div>

          <div className="flex items-center gap-6">
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-4 py-2 text-sm transition',
                      isActive
                        ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 shadow-lg shadow-rose-950/20 transition hover:bg-rose-500/20"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;