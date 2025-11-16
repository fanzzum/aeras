"use client";
import React, { useState } from 'react';

const SignupForm = () => {
  const [formData, setFormData] = useState({ fullname: '', phonenumber: '', email: '', password: '', confirmpassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setSuccess(false);
    if (!formData.fullname || !formData.email || !formData.password) { setError('Fill all required'); return; }
    if (formData.password !== formData.confirmpassword) { setError('Passwords do not match'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/puller/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullname,
          phone_number: formData.phonenumber,
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      setSuccess(true);
      setFormData({ fullname: '', phonenumber: '', email: '', password: '', confirmpassword: '' });
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
      {success && <div className="text-green-600 text-sm">Account created.</div>}
      <input name="fullname" placeholder="Full Name" value={formData.fullname} onChange={handleChange} className="border p-2 rounded" />
      <input name="phonenumber" placeholder="Phone Number" value={formData.phonenumber} onChange={handleChange} className="border p-2 rounded" />
      <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} className="border p-2 rounded" />
      <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} className="border p-2 rounded" />
      <input name="confirmpassword" type="password" placeholder="Confirm Password" value={formData.confirmpassword} onChange={handleChange} className="border p-2 rounded" />
      <button disabled={isLoading} className="bg-blue-600 text-white p-2 rounded">{isLoading ? 'Signing up…' : 'Sign up'}</button>
    </form>
  );
};

export default SignupForm;