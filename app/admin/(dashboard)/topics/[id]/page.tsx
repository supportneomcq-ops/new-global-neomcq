'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { AdminTopicDetailView } from '@/components/admin-topic-detail-view'

export default function AdminTopicDetailPage() {
  const params = useParams()
  const id = params?.id as string

  return <AdminTopicDetailView topicId={id} />
}
