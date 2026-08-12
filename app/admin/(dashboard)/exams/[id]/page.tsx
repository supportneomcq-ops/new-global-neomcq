'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { AdminExamDetailView } from '@/components/admin-exam-detail-view'

export default function AdminExamDetailPage() {
  const params = useParams()
  const id = params?.id as string

  return <AdminExamDetailView examId={id} />
}
