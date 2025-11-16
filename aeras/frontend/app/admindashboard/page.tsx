import React from 'react';
import AdminNav from '@/components/AdminNav';
import AdminStats from '@/components/AdminStats';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen flex flex-col p-6">
      <AdminNav />
      <div className="flex-1 space-y-6">
        <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
        <AdminStats />
        <div className="rounded-2xl p-6 bg-white/85 backdrop-blur border border-gray-300 shadow-lg">
          <h2 className="text-2xl font-bold">Overview</h2>
          <p>Manage users, rides, and view analytics.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;