import React from 'react';
import Link from 'next/link';

const AdminNav = () => {
  return (
    <nav className="bg-white shadow-md p-4">
      <ul className="flex space-x-4">
        <li>
          <Link href="/admindashboard" className="text-blue-600 hover:underline">Dashboard</Link>
        </li>
        <li>
          <Link href="/admindashboard/users" className="text-blue-600 hover:underline">Users</Link>
        </li>
        <li>
          <Link href="/admindashboard/rides" className="text-blue-600 hover:underline">Rides</Link>
        </li>
        <li>
          <Link href="/admindashboard/analytics" className="text-blue-600 hover:underline">Analytics</Link>
        </li>
      </ul>
    </nav>
  );
};

export default AdminNav;