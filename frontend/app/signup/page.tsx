import SignupForm from '@/components/SignupForm';
import React from 'react';

const page = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 animate-fade-in-up">
        <div className="rounded-2xl p-6 bg-white/85 backdrop-blur border border-[color:var(--nord9)]/30 shadow-lg hover-lift hover-press">
          <p className="text-xl font-extrabold tracking-tight">SIGN UP</p>
        </div>
        <div className="bg-white/95 backdrop-blur border border-[color:var(--nord10)]/25 p-6 rounded-2xl shadow-lg hover-lift hover-press">
          <SignupForm/>
        </div>
      </div>
    </div>
  );
};
export default page;