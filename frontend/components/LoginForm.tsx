"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const LoginForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({ email:'', password:'' });
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

      // Redirect based on role
      if (data.role === 'ADMIN') router.push('/admindashboard');
      else if (data.role === 'PULLER') router.push('/pullerdashboard');
      else router.push('/');
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} className="border border-[color:var(--nord9)]/30 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--nord10)]" />
      <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} className="border border-[color:var(--nord9)]/30 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--nord10)]" />
      <button disabled={isLoading} className="bg-[color:var(--nord10)] hover:bg-[color:var(--nord9)] text-white p-3 rounded-lg font-bold transition-all duration-200 hover-lift hover-press disabled:opacity-50">{isLoading ? 'Logging in…' : 'Login'}</button>
    </form>
  );
};

export default LoginForm;