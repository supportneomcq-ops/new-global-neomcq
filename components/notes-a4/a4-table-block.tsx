'use client';

import React from 'react';
import { A4Table } from '@/lib/types/a4-notes';

interface A4TableBlockProps {
  table: A4Table;
}

export function A4TableBlock({ table }: A4TableBlockProps) {
  if (!table || !table.headers || table.headers.length === 0) return null;

  return (
    <div className="my-4">
      {table.title && (
        <h5 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
          {table.title}
        </h5>
      )}
      {/* Horizontal scroll container strictly contained within table region */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse min-w-[480px]">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              {table.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-3 py-2.5 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wider uppercase"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {table.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={
                  rowIdx % 2 === 1
                    ? 'bg-slate-50/50 dark:bg-slate-800/20'
                    : 'bg-white dark:bg-slate-900'
                }
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-snug"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
