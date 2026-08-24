'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Activity,
  Clock,
  Search,
  Filter,
  ShieldAlert,
  Server,
  Database,
  Cpu,
  Globe,
  Mail,
  Radio,
  Workflow,
  FileCode,
  Timer,
  Sliders,
  X,
  Info,
  Wrench
} from 'lucide-react';

export default function AdminSystemHealthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system-health');
      const json = await res.json();
      if (json.success) {
        setData(json);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.error('Error loading health data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthData();
    // Auto refresh health checks every 30 seconds
    const interval = setInterval(() => {
      loadHealthData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'HEALTHY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> HEALTHY
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> DEGRADED
          </span>
        );
      case 'DOWN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" /> DOWN
          </span>
        );
      case 'NOT_CONFIGURED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-amber-400" /> NOT CONFIGURED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-slate-400" /> UNKNOWN
          </span>
        );
    }
  };

  const filteredServices = (data?.services || []).filter((s: any) => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-[#6D5BFF]" />
            <span>Infrastructure System Health Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Real-time health telemetry & diagnostic status for NeoMCQ application services.
            {lastRefreshedAt && (
              <span className="text-slate-400 ml-2">
                Last checked: {lastRefreshedAt.toLocaleTimeString()} (Auto-refreshes every 30s)
              </span>
            )}
          </p>
        </div>

        <button
          onClick={loadHealthData}
          disabled={loading}
          className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 shadow-sm hover:border-[#6D5BFF] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#6D5BFF]' : ''}`} />
          <span>Ping System Health</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">All Services</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? '...' : data?.summary?.totalServices || 0}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Monitored Endpoints</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Healthy</div>
          <div className="text-2xl font-black text-emerald-400">
            {loading ? '...' : data?.summary?.healthyCount || 0}
          </div>
          <div className="text-[10px] text-emerald-500 font-extrabold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Fully Operational
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Degraded</div>
          <div className="text-2xl font-black text-amber-400">
            {loading ? '...' : data?.summary?.degradedCount || 0}
          </div>
          <div className="text-[10px] text-amber-500 font-extrabold">Latency Spikes</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Critical / Down</div>
          <div className="text-2xl font-black text-rose-500">
            {loading ? '...' : data?.summary?.criticalCount || 0}
          </div>
          <div className="text-[10px] text-rose-400 font-extrabold">Requires Attention</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Not Configured / Unknown</div>
          <div className="text-2xl font-black text-amber-400">
            {loading ? '...' : (data?.summary?.notConfiguredCount || 0) + (data?.summary?.unknownCount || 0)}
          </div>
          <div className="text-[10px] text-amber-400 font-medium">Missing Env Variables</div>
        </div>
      </div>

      {/* Incident Counters Banner */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#6D5BFF]/20 text-[#6D5BFF]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm">System Failures & Incident Log Counters</div>
            <div className="text-xs text-slate-400">Real-time metrics calculated from live database records.</div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase block">Failed AI Jobs</span>
            <span className="text-sm font-black text-rose-400">{data?.summary?.incidents?.failedAiJobs ?? 0}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase block">Failed Webhooks</span>
            <span className="text-sm font-black text-amber-400">{data?.summary?.incidents?.failedWebhooks ?? 0}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase block">Failed Emails</span>
            <span className="text-sm font-black text-slate-300">{data?.summary?.incidents?.failedEmails ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-full sm:w-72 text-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search service name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent focus:outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold text-slate-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="HEALTHY">HEALTHY</option>
            <option value="DEGRADED">DEGRADED</option>
            <option value="DOWN">DOWN</option>
            <option value="NOT_CONFIGURED">NOT CONFIGURED</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </div>
      </div>

      {/* Services Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && !data ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
            <span>Pinging system services...</span>
          </div>
        ) : (
          filteredServices.map((svc: any) => (
            <div
              key={svc.id}
              onClick={() => setSelectedService(svc)}
              className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-3 flex flex-col justify-between hover:border-[#6D5BFF]/50 transition-all cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    {svc.category}
                  </span>
                  {getStatusBadge(svc.status)}
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#6D5BFF] transition-colors">
                  {svc.name}
                </h3>

                {svc.error_summary && (
                  <p className="text-[11px] text-amber-400 font-mono mt-2 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    {svc.error_summary}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Latency: {svc.latency_ms !== undefined ? `${svc.latency_ms}ms` : 'N/A'}</span>
                <span className="text-[10px] underline text-slate-500 group-hover:text-slate-300">Inspect Details →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Health History Telemetry */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-gray-800 font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
          <span>Telemetry Incident & Status Check History</span>
          <span className="text-xs text-slate-400 font-normal">Real audit logs & execution history</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase">
              <tr>
                <th className="p-4">Service</th>
                <th className="p-4">Status</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Latency</th>
                <th className="p-4">Recovery / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {(data?.history || []).map((h: any) => (
                <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{h.service}</td>
                  <td className="p-4">{getStatusBadge(h.status)}</td>
                  <td className="p-4 text-slate-400 text-[11px]">{new Date(h.timestamp).toLocaleString()}</td>
                  <td className="p-4 font-mono text-emerald-400">{h.latency_ms}ms</td>
                  <td className="p-4 text-slate-400 text-[11px]">{h.recovery || 'Normal operations'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal for Unconfigured / Failed Service */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090D1E] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedService(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#6D5BFF]/20 text-[#6D5BFF]">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black">{selectedService.name}</h3>
                <div className="text-xs text-slate-400 uppercase font-bold mt-0.5">{selectedService.category}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-bold">Current Status:</span>
                <div>{getStatusBadge(selectedService.status)}</div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-800 font-mono">
                <span className="text-slate-400 font-bold">Measured Latency:</span>
                <span className="text-emerald-400 font-bold">{selectedService.latency_ms !== undefined ? `${selectedService.latency_ms}ms` : 'N/A'}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-800 font-mono">
                <span className="text-slate-400 font-bold">Last Checked:</span>
                <span className="text-slate-300">{new Date(selectedService.last_checked).toLocaleString()}</span>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-slate-400 font-bold block">Status Details:</span>
                <p className="text-slate-200 font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  {selectedService.details || 'Service operational.'}
                </p>
              </div>

              {selectedService.error_summary && (
                <div className="space-y-1 pt-1">
                  <span className="text-amber-400 font-bold block">Error Summary:</span>
                  <p className="text-amber-300 font-mono bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    {selectedService.error_summary}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#6D5BFF]/10 border border-[#6D5BFF]/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D5BFF]">
                <Wrench className="w-4 h-4" />
                <span>Recommended Action:</span>
              </div>
              <p className="text-xs text-slate-300">
                {selectedService.recommended_action || 'No action required.'}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedService(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
