import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Home', icon: 'M3 10.5 12 3l9 7.5V21H3z' },
  { to: '/live', label: 'Live', icon: 'M4 6h16v10H4zM8 20h8' },
  { to: '/movies', label: 'Movies', icon: 'M4 5h16v14H4zM8 5v14M16 5v14' },
  { to: '/series', label: 'Series', icon: 'M4 5h16v10H4zM9 19h6' },
  { to: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2' },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-ink pb-20 text-white md:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 md:px-8">
          <NavLink to="/" className="text-[19px] font-black tracking-tight text-brand">
            IPTV
          </NavLink>
          <nav className="hidden gap-1 md:flex">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-1.5 text-[13px] transition ${
                    isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/favourites"
            className="ml-auto rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] text-white/70 transition hover:text-white"
          >
            Favourites
          </NavLink>
        </div>
      </header>

      <main className="mx-auto max-w-6xl">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${
                  isActive ? 'text-white' : 'text-white/45'
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d={tab.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
