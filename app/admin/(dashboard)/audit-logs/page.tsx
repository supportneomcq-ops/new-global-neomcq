'use client';

import React from 'react';
import { History, ShieldAlert, FileText } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const auditLogs = [
    { id: 'log-1', action: 'SUPPORT_STAFF_CREATED', user: 'admin@neomcq.com', details: 'Created support account support.agent@neomcq.com', time: '10 mins ago' },
    { id: 'log-2', action: 'EXAM_STATUS_UPDATED', user: 'admin@neomcq.com', details: 'Approved AI generated exam USMLE Step 1 Clinical Vignettes', time: '1 hour ago' },
    { id: 'log-3', action: 'AI_MODEL_SWITCH', user: 'admin@neomcq.com', details: 'Switched primary model to gemini-3.5-flash', time: '3 hours ago' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <History className="w-6 h-6 text-[#6D5BFF]" />
            <span>Admin Security Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Immutable trace of administrative actions, role modifications, content approvals, and security events.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
        <div className="font-bold text-sm">Security Trail</div>
        <div className="divide-y divide-slate-200 dark:divide-gray-800 text-xs font-medium">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#6D5BFF]/10 text-[#6D5BFF] font-mono text-[10px] font-bold">
                    {log.action}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{log.details}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">By {log.user}</div>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
