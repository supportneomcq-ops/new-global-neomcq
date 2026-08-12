import React from 'react';
import AdminAITutorDetail from '@/components/admin-ai-tutor-detail';

export default async function AdminAITutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminAITutorDetail id={id} />;
}
