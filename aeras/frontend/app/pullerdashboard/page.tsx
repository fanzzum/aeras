import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AdminNav from '@/components/AdminNav';
import AdminStats from '@/components/AdminStats';

const PullerDashboard = () => {
  const router = useRouter();
  const [activeUsers, setActiveUsers] = useState(0);
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    if (!token || role !== 'PULLER') {
      router.push('/login');
      return;
    }

    const fetchActiveUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true);
      setActiveUsers(data.length);
    };

    const fetchRides = async () => {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .order('created_at', { ascending: false });
      setRides(data);
    };

    fetchActiveUsers();
    fetchRides();
  }, [router]);

  return (
    <div className="min-h-screen p-6">
      <AdminNav />
      <h1 className="text-2xl font-bold">Puller Dashboard</h1>
      <AdminStats activeUsers={activeUsers} />
      <div className="mt-4">
        <h2 className="text-xl font-semibold">Recent Rides</h2>
        <ul>
          {rides.map(ride => (
            <li key={ride.ride_id} className="border-b py-2">
              Ride ID: {ride.ride_id} - Status: {ride.status}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PullerDashboard;