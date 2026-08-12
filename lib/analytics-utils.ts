export function getDateRange(timeframe: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  let endDate = new Date(now);
  let startDate = new Date(now);

  switch (timeframe) {
    case 'today': {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'yesterday': {
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case '7d': {
      startDate.setDate(now.getDate() - 7);
      break;
    }
    case '30d': {
      startDate.setDate(now.getDate() - 30);
      break;
    }
    case '90d': {
      startDate.setDate(now.getDate() - 90);
      break;
    }
    case 'this_year': {
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    }
    case 'custom': {
      if (customStart) startDate = new Date(customStart);
      if (customEnd) endDate = new Date(customEnd);
      break;
    }
    default: {
      // 30d default
      startDate.setDate(now.getDate() - 30);
      break;
    }
  }

  const durationMs = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
  };
}

export function calcPercentChange(current: number, previous: number): { value: number; formatted: string; isPositive: boolean } {
  if (previous === 0) {
    if (current === 0) {
      return { value: 0, formatted: '0.0%', isPositive: true };
    }
    return { value: 100, formatted: '+100.0%', isPositive: true };
  }

  const pct = ((current - previous) / previous) * 100;
  const isPositive = pct >= 0;
  const formatted = `${isPositive ? '+' : ''}${pct.toFixed(1)}%`;

  return { value: parseFloat(pct.toFixed(1)), formatted, isPositive };
}

export function safeAvg(sum: number, count: number, decimals = 1): number {
  if (!count || count === 0) return 0;
  return parseFloat((sum / count).toFixed(decimals));
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number | boolean)[][]) {
  if (typeof window === 'undefined') return;

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
