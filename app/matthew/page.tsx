'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function MatthewDashboard() {
  const [classes] = useState([]);

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <Link href="/" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </Link>
        <div
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ background: 'var(--purple-light)', color: 'var(--purple-dark)' }}
        >
          Pre-Dental · AP Track
        </div>
      </div>

      <h1 className="text-4xl mb-1" style={{ color: 'var(--purple-dark)' }}>
        Hey, Matthew.
      </h1>
      <p className="mb-10" style={{ color: 'var(--text-secondary)' }}>
        What are we mastering today?
      </p>

      <Link href="/matthew/study">
        <div
          className="flex items-center gap-4 p-5 rounded-2xl mb-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
          style={{
            background: 'var(--purple)',
            boxShadow: '0 2px 8px rgba(123,111,160,0.3)',
          }}
        >
          <div className="text-2xl">📄</div>
          <div>
            <div className="font-semibold text-white">Generate a Study Guide</div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Upload a PDF and get an instant study guide
            </div>
          </div>
        </div>
      </Link>

      <div
        className="rounded-2xl p-6 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
          My Classes
        </h2>
        {classes.length === 0 ? (
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            No classes added yet. Add your first class to get started.
          </p>
        ) : null}
        <Link href="/matthew/add-class">
          <button
            className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:opacity-90"
            style={{ background: 'var(--purple-light)', color: 'var(--purple-dark)' }}
          >
            + Add a Class
          </button>
        </Link>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
          Recent Study Guides
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Your study guides will appear here once you generate them.
        </p>
      </div>
    </main>
  );
}