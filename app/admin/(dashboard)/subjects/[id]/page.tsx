'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { AdminSubjectDetailView } from '@/components/admin-subject-detail-view'

export default function AdminSubjectDetailPage() {
  const params = useParams()
  const id = params?.id as string

  return <AdminSubjectDetailView subjectId={id} />
}
