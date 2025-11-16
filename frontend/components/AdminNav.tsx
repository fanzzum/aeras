"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Users, Car } from 'lucide-react';

export default function AdminNav() {
  const path = usePathname();
  const links = [
    { href: '/admindashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admindashboard/analytics', label: 'Analytics', icon: TrendingUp },
    { href: '/admindashboard/users', label: 'Users', icon: Users },
    { href: '/admindashboard/rides', label: 'Rides', icon: Car },
  ];
  return (
    <nav className="flex gap-2 mb-6 flex-wrap">
      {links.map(l => {
        const Icon = l.icon;
        const active = path === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover-lift hover-press flex items-center gap-2 ${
              active
                ? 'bg-[color:var(--nord10)] text-white'
                : 'bg-white/90 text-[color:var(--foreground)] hover:bg-white border border-[color:var(--nord9)]/30'
            }`}
          >
            <Icon size={18} /> {l.label}
          </Link>
        );
      })}
    </nav>
  );
}