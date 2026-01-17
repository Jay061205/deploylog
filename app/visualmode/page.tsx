'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from 'next/navigation';

interface Comic {
  num: number;
  title: string;
  img: string;
  alt: string;
  year: string;
}

import { PipelineGraph, PipelineStage } from '../components/PipelineGraph';

// Helper to determine stage statuses based on global status and logs
function calculateStages(status: string, logs: string = ''): PipelineStage[] {
  const normalize = (s: string) => s?.toLowerCase() || 'pending';
  const current = normalize(status);
  const logContent = logs?.toLowerCase() || '';

  // Base stages
  // NOTE: In a real app these durations would come from the DB too
  let stages: PipelineStage[] = [
    { name: 'Start', status: 'pending' },
    { name: 'Lint', status: 'pending' },
    { name: 'Test', status: 'pending' },
    { name: 'Build', status: 'pending' },
    { name: 'End', status: 'pending' },
  ];

  if (current === 'success') {
    return stages.map(s => ({ ...s, status: 'success' }));
  }

  if (current === 'failed' || current === 'error') {
    // Smart Failure Inference based on logs
    let failedStageIndex = 3; // Default to Build/Deploy failure if unknown

    if (logContent.includes('linting failed')) failedStageIndex = 1;
    else if (logContent.includes('tests failed')) failedStageIndex = 2;
    else if (logContent.includes('build failed')) failedStageIndex = 3;

    return stages.map((stage, index) => {
      if (index < failedStageIndex) return { ...stage, status: 'success' };
      if (index === failedStageIndex) return { ...stage, status: 'failed' };
      return { ...stage, status: 'skipped' }; // Remaining stages are skipped
    });
  }

  // Active State Logic (Normal flow)
  let activeIndex = -1;
  if (current === 'queued') activeIndex = 0; // Start
  if (current === 'linting') activeIndex = 1;
  if (current === 'testing') activeIndex = 2;
  if (current === 'building') activeIndex = 3;
  if (current === 'deploying') activeIndex = 3;
  if (current === 'success') activeIndex = 4; // End

  return stages.map((stage, index) => {
    if (index < activeIndex) return { ...stage, status: 'success' };
    if (index === activeIndex) return { ...stage, status: 'running' };
    return { ...stage, status: 'pending' };
  });
}

function VisualModeContent() {
  const [activeTab, setActiveTab] = useState('Pipeline graph');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  // Real Deployment State
  const [deploymentStatus, setDeploymentStatus] = useState<string>('pending');
  // Store real logs
  const [deploymentLogs, setDeploymentLogs] = useState<string>('');
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);

  const searchParams = useSearchParams();
  const urlId = searchParams.get('id');

  useEffect(() => {
    if (urlId) {
      setDeploymentId(urlId);
    }
  }, [urlId]);

  // Polling for Deployment Status & Logs
  useEffect(() => {
    if (!deploymentId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/deployments/${deploymentId}`);
        if (res.ok) {
          const data = await res.json();
          setDeploymentStatus(data.status);
          const logs = data.logs || '';
          setPipelineStages(calculateStages(data.status, logs));
          // Update logs
          setDeploymentLogs(logs || 'Waiting for logs...');
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    poll(); // Initial call
    const interval = setInterval(poll, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, [deploymentId]);


  const handleAnalyze = async () => {
    if (!deploymentId) {
      alert('Please enter a Deployment ID');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deploymentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysis(data.analysis);
      } else {
        // More user-friendly error messages
        const errMsg = data.error || '';

        if (errMsg.includes('No logs available')) {
          setError('This deployment has no logs to analyze. Run the pipeline simulation first to generate data.');
        } else if (errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('quota')) {
          setError('Usage limit exceeded. Please try again later or verify your API key.');
        } else {
          setError(errMsg || 'Something went wrong during analysis.');
        }
      }
    } catch {
      setError('Failed to connect to the analysis service. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = ['Pipeline graph', 'AI Mode'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center pt-8 relative font-sans text-slate-800">

      {/* Top Navigation */}
      <div className="w-full max-w-6xl px-6 flex items-center mb-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Centered Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Visual Mode <span className="text-slate-400">#{deploymentId || '...'}</span>
        </h1>
        <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          Status:
          <span className={`
                ${deploymentStatus === 'success' ? 'text-green-600' : ''}
                ${deploymentStatus === 'failed' || deploymentStatus === 'error' ? 'text-red-600' : ''}
                ${deploymentStatus === 'running' || deploymentStatus === 'building' || deploymentStatus === 'testing' ? 'text-blue-600' : ''}
            `}>
            {deploymentStatus}
          </span>
        </div>
      </div>

      {/* Toggle Tab */}
      <div className="bg-slate-200/50 p-1.5 rounded-full flex relative mb-10 shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
                relative px-6 py-2 rounded-full text-sm font-medium transition-all z-10 duration-200
                ${activeTab === tab ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}
            `}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-white rounded-full shadow-sm border border-slate-200/50"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                style={{ zIndex: -1 }}
              />
            )}
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="w-full max-w-5xl px-6 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'Pipeline graph' && (
              <div className="flex flex-col gap-8">
                {/* Graph Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-10 flex flex-col items-center">
                  <PipelineGraph stages={pipelineStages} />
                </div>

                {/* Logs Terminal */}
                <div className="w-full">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Pipeline Logs</h3>
                  <div className="bg-slate-900 rounded-xl p-6 shadow-lg overflow-hidden border border-slate-800">
                    <pre className="font-mono text-xs md:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                      {deploymentLogs}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'AI Mode' && (
              <div className="w-full bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden relative min-h-[400px]">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -z-0 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-purple-50 to-pink-50 rounded-tr-full -z-0 opacity-50"></div>

                {!analysis && !loading && (
                  <div className="flex flex-col gap-6 items-center py-20 px-4 relative z-10">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30 mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        <path d="M12 2v2" />
                        <path d="M12 22v-2" />
                        <path d="M22 12h-2" />
                        <path d="M2 12h2" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">
                        AI Log Analysis
                      </h3>
                      <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
                        Detect errors and get fix suggestions instantly using Gemini 2.0 Flash.
                      </p>
                    </div>

                    {deploymentId ? (
                      <div className="flex flex-col gap-6 mt-4 w-full max-w-xs items-center">
                        <div className="text-sm font-mono bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-slate-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          ID: {deploymentId}
                        </div>

                        {/* Error Message */}
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 text-sm text-center max-w-md shadow-sm"
                          >
                            <p className="font-semibold mb-1">Analysis Failed</p>
                            {error}
                          </motion.div>
                        )}

                        {/* Empty Logs Warning */}
                        {(!deploymentLogs || deploymentLogs === 'Waiting for logs...') && !error && (
                          <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-xl border border-amber-100 text-sm text-center max-w-md shadow-sm">
                            <p className="font-semibold mb-1">Waiting for Logs...</p>
                            Cannot run analysis until logs are generated.
                          </div>
                        )}

                        <button
                          onClick={handleAnalyze}
                          disabled={!deploymentLogs || deploymentLogs === 'Waiting for logs...'}
                          className={`
                            px-8 py-3.5 rounded-xl transition-all font-medium flex items-center gap-3 w-full justify-center
                            ${!deploymentLogs || deploymentLogs === 'Waiting for logs...'
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 group active:scale-[0.98]'
                            }
                          `}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={!deploymentLogs ? '' : "group-hover:rotate-12 transition-transform"}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                          Run Analysis
                        </button>
                      </div>
                    ) : (
                      <div className="mt-6 flex flex-col items-center gap-3">
                        <div className="text-sm text-amber-700 bg-amber-50 px-5 py-3 rounded-xl border border-amber-100 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          No Deployment ID detected in URL.
                        </div>
                        <Link
                          href="/"
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold hover:underline decoration-2 underline-offset-2"
                        >
                          Select a deployment from Dashboard &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {loading && (
                  <div className="flex flex-col items-center justify-center p-20 relative z-10">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                      <div className="animate-spin h-14 w-14 border-[3px] border-slate-100 rounded-full border-t-blue-600 relative z-10"></div>
                    </div>
                    <p className="text-slate-500 mt-6 font-medium animate-pulse">
                      Crunching logs with Gemini...
                    </p>
                  </div>
                )}

                {analysis && (
                  <div className="p-0 relative z-10 animate-fade-in-up">
                    {/* Analysis Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg text-green-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            Analysis Complete
                          </h3>
                          <p className="text-xs text-slate-500 font-mono">
                            Generated by Gemini 2.0 Flash
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAnalysis(null)}
                        className="text-sm text-slate-400 hover:text-slate-700 font-medium px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Clear Results
                      </button>
                    </div>

                    {/* Markdown Content */}
                    <div className="p-8 prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-xl prose-pre:bg-slate-900 prose-pre:shadow-lg prose-pre:border prose-pre:border-slate-800">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2" {...props} />,
                          ul: ({ node, ...props }) => <ul className="space-y-2 my-4 list-disc list-outside ml-6 marker:text-blue-500" {...props} />,
                          li: ({ node, ...props }) => <li className="text-slate-600 leading-relaxed" {...props} />,
                          p: ({ node, ...props }) => <p className="text-slate-600 leading-7 mb-4" {...props} />,
                          code: ({ node, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '')
                            const isInline = !match
                            return isInline ? (
                              <code className="bg-slate-100 text-pink-600 font-mono text-[0.9em] px-1.5 py-0.5 rounded border border-slate-200" {...props}>
                                {children}
                              </code>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          },
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-blue-500 bg-blue-50/50 pl-4 py-2 italic text-slate-700 my-6 rounded-r-lg" {...props} />
                          )

                        }}
                      >
                        {analysis}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function VisualModePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 pt-10 text-center text-gray-500">
          Loading...
        </div>
      }
    >
      <VisualModeContent />
    </Suspense>
  );
}
