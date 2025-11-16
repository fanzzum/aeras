"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import { Activity, Users, Car, AlertCircle } from 'lucide-react';

interface Stats {
  activeUsers: number;
  onlinePullers: number;
  activeRides: number;
  pendingReviews: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ activeUsers: 0, onlinePullers: 0, activeRides: 0, pendingReviews: 0 });

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'ADMIN') { router.push('/login'); return; }
    fetchStats();
    const id = setInterval(fetchStats, 5000); // refresh every 5s
    return () => clearInterval(id);
  }, [router]);

  const fetchStats = async () => {
    const res = await fetch('http://localhost:4000/api/v1/admin/stats');
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };

  const cards = [
    { label: 'Active Users', value: stats.activeUsers, icon: Users, color: 'var(--nord14)' },
    { label: 'Online Pullers', value: stats.onlinePullers, icon: Activity, color: 'var(--nord9)' },
    { label: 'Active Rides', value: stats.activeRides, icon: Car, color: 'var(--nord10)' },
    { label: 'Pending Reviews', value: stats.pendingReviews, icon: AlertCircle, color: 'var(--nord12)' },
  ];

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="rounded-2xl p-5 bg-white/85 backdrop-blur border border-[color:var(--nord9)]/30 shadow-lg mb-6 hover-lift animate-fade-in-up">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
      </div>
      <AdminNav />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-lg hover-lift hover-press animate-fade-in-up">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{c.label}</span>
                <Icon size={24} style={{ color: c.color }} />
              </div>
              <div className="text-4xl font-extrabold">{c.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}