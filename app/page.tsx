'use client';

import { useState, useEffect } from 'react';
import { DeploymentCard } from './components/DeploymentCard';

// 1. Define the shape of a Deployment object
interface Deployment {
  id: string;
  status?: string;
  branch?: string;
  commitMessage?: string;
  createdAt?: string;
  // This allows any other extra properties from your database
  [key: string]: any; 
}

export default function Home() {
  // 2. Tell useState that this is an array of 'Deployment' objects
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDeployments = async () => {
    try {
      const res = await fetch('/api/deployments');
      if (res.ok) {
        const data = await res.json();
        setDeployments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDeployments();
    // Poll every 3 seconds
    const interval = setInterval(fetchDeployments, 3000);
    return () => clearInterval(interval);
  }, []);

  const triggerDeployment = async () => {
    setLoading(true);
    try {
      await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: 'main',
          commitMessage: `Triggered from UI at ${new Date().toLocaleTimeString()}`
        })
      });
      fetchDeployments();
    } catch (error) {
      console.error('Failed to trigger deployment', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">DeployLog</h1>
            <p className="text-gray-500 mt-1">Live Deployment Feeds</p>
          </div>
          <button
            onClick={triggerDeployment}
            disabled={loading}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm
              ${loading
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800 hover:shadow-md'
              }`}
          >
            {loading ? 'Starting...' : 'New Deployment'}
          </button>
        </header>

        <div className="space-y-4">
          {deployments.length > 0 ? (
            // 3. No need for ': any' here anymore; TypeScript knows 'd' is a Deployment
            deployments.map((d) => (
              <DeploymentCard key={d.id} deployment={d} />
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">No deployments found.</p>
              <p className="text-sm text-gray-400 mt-1">Trigger one to get started.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}