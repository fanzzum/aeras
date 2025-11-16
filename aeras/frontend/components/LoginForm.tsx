"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const LoginForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!formData.email || !formData.password) { setError('Fill all fields'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.custom_id);
      localStorage.setItem('userRole', data.role);
      router.push(data.role === 'ADMIN' ? '/admindashboard' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} className="border p-2 rounded" />
      <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} className="border p-2 rounded" />
      <button disabled={isLoading} className="bg-blue-600 text-white p-2 rounded">{isLoading ? 'Logging in…' : 'Login'}</button>
    </form>
  );
};

export default LoginForm;