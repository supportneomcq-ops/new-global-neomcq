import React from 'react';
import AdminMCQDetail from '@/components/admin-mcq-detail';

export default async function AdminMCQDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminMCQDetail id={id} />;
}
