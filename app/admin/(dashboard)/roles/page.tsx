'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Users, Check, X, RefreshCw, AlertCircle, Loader2, Plus } from 'lucide-react';
import { getRolesAndPermissionsAction, togglePermissionForRoleAction } from '@/app/actions/admin';

export default function RolesAndPermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getRolesAndPermissionsAction();
      setRoles(res.roles || []);
      setPermissions(res.permissions || []);
      setRolePermissions(res.rolePermissions || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load roles and permissions matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasPermission = (roleId: string, permissionId: string) => {
    return rolePermissions.some((rp) => rp.role_id === roleId && rp.permission_id === permissionId);
  };

  const handleTogglePermission = async (roleId: string, permissionId: string) => {
    const key = `${roleId}-${permissionId}`;
    setUpdating(key);
    const currentlyAssigned = hasPermission(roleId, permissionId);

    try {
      await togglePermissionForRoleAction(roleId, permissionId, !currentlyAssigned);
      
      if (currentlyAssigned) {
        setRolePermissions((prev) => prev.filter((rp) => !(rp.role_id === roleId && rp.permission_id === permissionId)));
      } else {
        setRolePermissions((prev) => [...prev, { role_id: roleId, permission_id: permissionId }]);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update role permission.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Lock className="w-6 h-6 text-[#6D5BFF]" />
            <span>Roles & RBAC Permission Matrix</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Define system authorization scopes, platform access controls, and role capabilities.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors w-fit"
          title="Refresh Roles & Permissions"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((r) => (
          <div key={r.id} className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                {r.name}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-gray-400">
                <Users className="w-3.5 h-3.5" />
                <span>{r.userCount} users</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 min-h-[32px] line-clamp-2">
              {r.description || `Platform ${r.name} role with assigned authorization scopes.`}
            </p>
          </div>
        ))}
      </div>

      {/* Permission Matrix Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 dark:bg-gray-900/60 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-700 dark:text-gray-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#6D5BFF]" />
            <span>Interactive Access Control Matrix</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Changes take effect immediately</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#6D5BFF]" />
            <span>Loading permission matrix...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/50 dark:bg-gray-900 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4 w-1/3">Permission Name & Scope</th>
                  <th className="p-4">Category</th>
                  {roles.map((r) => (
                    <th key={r.id} className="p-4 text-center">
                      <span className="uppercase text-[11px] font-extrabold text-slate-900 dark:text-white">{r.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                {permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">{p.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-gray-400">{p.description}</div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300">
                        {p.category || 'General'}
                      </span>
                    </td>

                    {roles.map((r) => {
                      const assigned = hasPermission(r.id, p.id);
                      const key = `${r.id}-${p.id}`;
                      const isUpdating = updating === key;

                      return (
                        <td key={r.id} className="p-4 text-center">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleTogglePermission(r.id, p.id)}
                            className={`w-7 h-7 rounded-xl inline-flex items-center justify-center transition-all cursor-pointer ${
                              assigned
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-slate-100 dark:bg-gray-800 text-slate-400 border border-slate-200 dark:border-gray-700 hover:bg-slate-200'
                            }`}
                            title={`Toggle ${p.name} for ${r.name}`}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : assigned ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
