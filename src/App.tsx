import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Realtor Buddy
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
            Dubai
          </span>
        </div>
      </header>
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold text-slate-800">Dubai Real Estate Agent Platform</h1>
      </main>
    </div>
  );
}
