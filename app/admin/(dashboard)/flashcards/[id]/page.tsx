import React from 'react';
import AdminFlashcardDetail from '@/components/admin-flashcard-detail';

export default async function AdminFlashcardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminFlashcardDetail id={id} />;
}
