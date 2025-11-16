import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        setUsers(data);
      } catch (error) {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleBanUser = async (userId) => {
    try {
      await supabase.from('users').update({ banned: true }).eq('id', userId);
      setUsers(users.map(user => (user.id === userId ? { ...user, banned: true } : user)));
    } catch (error) {
      setError('Failed to ban user');
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      await supabase.from('users').update({ suspended: true }).eq('id', userId);
      setUsers(users.map(user => (user.id === userId ? { ...user, suspended: true } : user)));
    } catch (error) {
      setError('Failed to suspend user');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-4 min-h-screen">
      <h1 className="text-2xl font-extrabold tracking-tight">User Management</h1>
      {loading && <p>Loading users...</p>}
      {error && <p className="text-red-600">{error}</p>}
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2">ID</th>
            <th className="border border-gray-300 p-2">Name</th>
            <th className="border border-gray-300 p-2">Email</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="border border-gray-300 p-2">{user.id}</td>
              <td className="border border-gray-300 p-2">{user.name}</td>
              <td className="border border-gray-300 p-2">{user.email}</td>
              <td className="border border-gray-300 p-2">
                <button onClick={() => handleBanUser(user.id)} className="text-red-600">Ban</button>
                <button onClick={() => handleSuspendUser(user.id)} className="text-yellow-600 ml-2">Suspend</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersPage;