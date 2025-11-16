"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import { supabase } from '@/lib/supabaseClient';

interface User { user_id: string; name: string; email: string; is_banned: boolean; }
interface Puller { puller_id: string; name: string; email: string; is_banned: boolean; status: boolean; } // ✅ Added status

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pullers, setPullers] = useState<Puller[]>([]);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'ADMIN') { router.push('/login'); return; }
    fetchAll();
  }, [router]);

  const fetchAll = async () => {
    const [{ data: u }, { data: p }] = await Promise.all([
      supabase.from('users').select('user_id,name,email,is_banned'),
      supabase.from('pullers').select('puller_id,name,email,is_banned,status'), // ✅ Fetch status
    ]);
    setUsers((u || []) as User[]);
    setPullers((p || []) as Puller[]);
  };

  const toggleBanUser = async (id: string, banned: boolean) => {
    await fetch('http://localhost:4000/api/v1/admin/users/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, banned: !banned })
    });
    fetchAll();
  };

  const toggleBanPuller = async (id: string, banned: boolean) => {
    await fetch('http://localhost:4000/api/v1/admin/pullers/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puller_id: id, banned: !banned })
    });
    fetchAll();
  };

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="rounded-2xl p-5 bg-white/85 backdrop-blur border border-[color:var(--nord9)]/30 shadow-lg mb-6 hover-lift animate-fade-in-up">
        <h1 className="text-3xl font-extrabold tracking-tight">User & Puller Management</h1>
      </div>
      <AdminNav />
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users */}
        <div className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-lg animate-fade-in-up">
          <h2 className="text-xl font-bold mb-4">Users ({users.length})</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {users.map(u => (
              <div key={u.user_id} className="flex justify-between items-center border border-[color:var(--nord9)]/30 rounded p-3 hover-lift hover-press">
                <div>
                  <div className="font-semibold">{u.name || 'Unknown'}</div>
                  <div className="text-sm text-black/70">{u.email}</div>
                </div>
                <button
                  onClick={() => toggleBanUser(u.user_id, u.is_banned)}
                  className={`px-3 py-1 rounded-lg font-bold text-sm transition-all duration-200 hover-lift hover-press ${
                    u.is_banned
                      ? 'bg-[color:var(--nord14)] text-white'
                      : 'bg-[color:var(--nord11)] text-white'
                  }`}
                >
                  {u.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pullers */}
        <div className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-lg animate-fade-in-up">
          <h2 className="text-xl font-bold mb-4">Pullers ({pullers.length})</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {pullers.map(p => (
              <div key={p.puller_id} className="flex justify-between items-center border border-[color:var(--nord9)]/30 rounded p-3 hover-lift hover-press">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.name || 'Unknown'}</span>
                    {/* ✅ Online/Offline indicator */}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      p.status ? 'bg-[color:var(--nord14)]/50 text-black' : 'bg-gray-300 text-black'
                    }`}>
                      {p.status ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="text-sm text-black/70">{p.email}</div>
                </div>
                <button
                  onClick={() => toggleBanPuller(p.puller_id, p.is_banned)}
                  className={`px-3 py-1 rounded-lg font-bold text-sm transition-all duration-200 hover-lift hover-press ${
                    p.is_banned
                      ? 'bg-[color:var(--nord14)] text-white'
                      : 'bg-[color:var(--nord11)] text-white'
                  }`}
                >
                  {p.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}