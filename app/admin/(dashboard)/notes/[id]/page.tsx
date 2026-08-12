import React from 'react';
import AdminNoteDetail from '@/components/admin-note-detail';

export default async function AdminNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminNoteDetail id={id} />;
}
