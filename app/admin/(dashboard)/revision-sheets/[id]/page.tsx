import React from 'react';
import AdminRevisionSheetDetail from '@/components/admin-revision-sheet-detail';

export default async function AdminRevisionSheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminRevisionSheetDetail id={id} />;
}
