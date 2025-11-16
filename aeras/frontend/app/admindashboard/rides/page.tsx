import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const RidesPage = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRides = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setRides(data);
      } catch (err) {
        setError('Failed to fetch rides');
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, []);

  const handleFilter = (filterCriteria) => {
    // Implement filtering logic based on filterCriteria
  };

  return (
    <div className="p-6 md:p-8 space-y-4 min-h-screen">
      <h1 className="text-2xl font-extrabold tracking-tight">Ride Management</h1>
      {loading && <p>Loading rides...</p>}
      {error && <p className="text-red-600">{error}</p>}
      <div className="space-y-3">
        {rides.map(ride => (
          <div key={ride.ride_id} className="border border-gray-300 rounded p-3">
            <div className="flex justify-between">
              <span>Ride ID: {ride.ride_id}</span>
              <span>Status: {ride.status}</span>
            </div>
            <div>Pickup: {ride.pickup_location_id}</div>
            <div>Destination: {ride.destination_location_id}</div>
            <div>Requested At: {new Date(ride.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RidesPage;