export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          auth_user_id: string
          first_name: string | null
          last_name: string | null
          email: string
          phone: string | null
          country_id: string | null
          timezone: string
          avatar_url: string | null
          language_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          auth_user_id: string
          first_name?: string | null
          last_name?: string | null
          email: string
          phone?: string | null
          country_id?: string | null
          timezone?: string
          avatar_url?: string | null
          language_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string
          phone?: string | null
          country_id?: string | null
          timezone?: string
          avatar_url?: string | null
          language_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role_id: string
          assigned_at: string
        }
        Insert: {
          user_id: string
          role_id: string
          assigned_at?: string
        }
        Update: {
          user_id?: string
          role_id?: string
          assigned_at?: string
        }
      }
      countries: {
        Row: {
          id: string
          iso2: string
          iso3: string
          name: string
          phone_code: string
          flag_emoji: string | null
          currency_code: string | null
          default_timezone: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          iso2: string
          iso3: string
          name: string
          phone_code: string
          flag_emoji?: string | null
          currency_code?: string | null
          default_timezone?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          iso2?: string
          iso3?: string
          name?: string
          phone_code?: string
          flag_emoji?: string | null
          currency_code?: string | null
          default_timezone?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      exam_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon_name?: string | null
          created_at?: string
        }
      }
      exams: {
        Row: {
          id: string
          category_id: string | null
          country_id: string | null
          name: string
          slug: string
          description: string | null
          difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Adaptive'
          question_count: number
          time_limit_mins: number
          is_featured: boolean
          created_by_ai: boolean
          status: 'draft' | 'active' | 'archived'
          aliases: string[]
          ai_confidence_score: number
          official_website: string | null
          ai_version: string
          prompt_version: string
          source: string
          version: number
          metadata: Json
          approval_status: 'auto_approved' | 'pending_review' | 'approved' | 'archived'
          created_at: string
          updated_at: string
          normalized_name: string | null
          authority: string | null
          exam_type: string | null
          official_reference_website: string | null
          version_edition: string | null
          marking_scheme: Json
          negative_marking: boolean
          question_types: Json
          sections: Json
          syllabus_info: Json
          image_question_requirements: string | null
          video_question_requirements: string | null
          clinical_case_requirements: string | null
          verification_status: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          last_verified_at: string | null
          next_verification_at: string | null
        }
        Insert: {
          id?: string
          category_id?: string | null
          country_id?: string | null
          name: string
          slug: string
          description?: string | null
          difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Adaptive'
          question_count?: number
          time_limit_mins?: number
          is_featured?: boolean
          created_by_ai?: boolean
          status?: 'draft' | 'active' | 'archived'
          aliases?: string[]
          ai_confidence_score?: number
          official_website?: string | null
          ai_version?: string
          prompt_version?: string
          source?: string
          version?: number
          metadata?: Json
          approval_status?: 'auto_approved' | 'pending_review' | 'approved' | 'archived'
          created_at?: string
          updated_at?: string
          normalized_name?: string | null
          authority?: string | null
          exam_type?: string | null
          official_reference_website?: string | null
          version_edition?: string | null
          marking_scheme?: Json
          negative_marking?: boolean
          question_types?: Json
          sections?: Json
          syllabus_info?: Json
          image_question_requirements?: string | null
          video_question_requirements?: string | null
          clinical_case_requirements?: string | null
          verification_status?: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          last_verified_at?: string | null
          next_verification_at?: string | null
        }
        Update: {
          id?: string
          category_id?: string | null
          country_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Adaptive'
          question_count?: number
          time_limit_mins?: number
          is_featured?: boolean
          created_by_ai?: boolean
          status?: 'draft' | 'active' | 'archived'
          aliases?: string[]
          ai_confidence_score?: number
          official_website?: string | null
          ai_version?: string
          prompt_version?: string
          source?: string
          version?: number
          metadata?: Json
          approval_status?: 'auto_approved' | 'pending_review' | 'approved' | 'archived'
          created_at?: string
          updated_at?: string
          normalized_name?: string | null
          authority?: string | null
          exam_type?: string | null
          official_reference_website?: string | null
          version_edition?: string | null
          marking_scheme?: Json
          negative_marking?: boolean
          question_types?: Json
          sections?: Json
          syllabus_info?: Json
          image_question_requirements?: string | null
          video_question_requirements?: string | null
          clinical_case_requirements?: string | null
          verification_status?: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          last_verified_at?: string | null
          next_verification_at?: string | null
        }
      }
      exam_aliases: {
        Row: {
          id: string
          exam_id: string
          alias: string
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          alias: string
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          alias?: string
          created_at?: string
        }
      }
      exam_subjects: {
        Row: {
          id: string
          exam_id: string
          name: string
          slug: string | null
          description: string | null
          weight_percentage: number
          topic_count: number
          order_index: number
          version: number
          ai_confidence: number
          ai_version: string
          created_at: string
          normalized_name: string | null
          display_order: number
          is_active: boolean
          verification_status: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          verified_at: string | null
        }
        Insert: {
          id?: string
          exam_id: string
          name: string
          slug?: string | null
          description?: string | null
          weight_percentage?: number
          topic_count?: number
          order_index?: number
          version?: number
          ai_confidence?: number
          ai_version?: string
          created_at?: string
          normalized_name?: string | null
          display_order?: number
          is_active?: boolean
          verification_status?: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          verified_at?: string | null
        }
        Update: {
          id?: string
          exam_id?: string
          name?: string
          slug?: string | null
          description?: string | null
          weight_percentage?: number
          topic_count?: number
          order_index?: number
          version?: number
          ai_confidence?: number
          ai_version?: string
          created_at?: string
          normalized_name?: string | null
          display_order?: number
          is_active?: boolean
          verification_status?: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          verified_at?: string | null
        }
      }
      exam_topics: {
        Row: {
          id: string
          subject_id: string
          parent_id: string | null
          name: string
          slug: string | null
          description: string | null
          level: 'topic' | 'subtopic' | 'concept'
          target_weight: number
          order_index: number
          version: number
          ai_confidence: number
          tags: string[]
          created_at: string
          normalized_name: string | null
          display_order: number
          is_active: boolean
          verification_status: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          verified_at: string | null
        }
        Insert: {
          id?: string
          subject_id: string
          parent_id?: string | null
          name: string
          slug?: string | null
          description?: string | null
          level?: 'topic' | 'subtopic' | 'concept'
          target_weight?: number
          order_index?: number
          version?: number
          ai_confidence?: number
          tags?: string[]
          created_at?: string
          normalized_name?: string | null
          display_order?: number
          is_active?: boolean
          verification_status?: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          verified_at?: string | null
        }
        Update: {
          id?: string
          subject_id?: string
          parent_id?: string | null
          name?: string
          slug?: string | null
          description?: string | null
          level?: 'topic' | 'subtopic' | 'concept'
          target_weight?: number
          order_index?: number
          version?: number
          ai_confidence?: number
          tags?: string[]
          created_at?: string
          normalized_name?: string | null
          display_order?: number
          is_active?: boolean
          verification_status?: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          verified_at?: string | null
        }
      }
      user_exams: {
        Row: {
          id: string
          user_id: string
          exam_id: string
          target_date: string | null
          target_score: number
          status: 'in_progress' | 'completed' | 'paused'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_id: string
          target_date?: string | null
          target_score?: number
          status?: 'in_progress' | 'completed' | 'paused'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exam_id?: string
          target_date?: string | null
          target_score?: number
          status?: 'in_progress' | 'completed' | 'paused'
          created_at?: string
        }
      }
      study_preferences: {
        Row: {
          id: string
          user_id: string
          daily_hours: number
          preferred_time: 'morning' | 'afternoon' | 'evening' | 'night'
          learning_mode: 'rapid' | 'balanced' | 'mastery'
          reminders_enabled: boolean
          language_id: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          daily_hours?: number
          preferred_time?: 'morning' | 'afternoon' | 'evening' | 'night'
          learning_mode?: 'rapid' | 'balanced' | 'mastery'
          reminders_enabled?: boolean
          language_id?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          daily_hours?: number
          preferred_time?: 'morning' | 'afternoon' | 'evening' | 'night'
          learning_mode?: 'rapid' | 'balanced' | 'mastery'
          reminders_enabled?: boolean
          language_id?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          slug: string
          price_inr: number
          price_usd: number
          billing_interval: 'monthly' | 'quarterly' | 'yearly' | 'lifetime'
          features: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          price_inr: number
          price_usd: number
          billing_interval?: 'monthly' | 'quarterly' | 'yearly' | 'lifetime'
          features?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          price_inr?: number
          price_usd?: number
          billing_interval?: 'monthly' | 'quarterly' | 'yearly' | 'lifetime'
          features?: Json
          is_active?: boolean
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          razorpay_subscription_id: string | null
          status: 'active' | 'past_due' | 'canceled' | 'expired' | 'trialing'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          razorpay_subscription_id?: string | null
          status?: 'active' | 'past_due' | 'canceled' | 'expired' | 'trialing'
          current_period_start?: string
          current_period_end: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          razorpay_subscription_id?: string | null
          status?: 'active' | 'past_due' | 'canceled' | 'expired' | 'trialing'
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          razorpay_payment_id: string | null
          razorpay_order_id: string | null
          razorpay_signature: string | null
          amount: number
          currency: string
          status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
          webhook_payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_order_id?: string | null
          razorpay_signature?: string | null
          amount: number
          currency?: string
          status?: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
          webhook_payload?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_order_id?: string | null
          razorpay_signature?: string | null
          amount?: number
          currency?: string
          status?: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
          webhook_payload?: Json
          created_at?: string
        }
      }
      ai_jobs: {
        Row: {
          id: string
          user_id: string | null
          exam_id: string | null
          subject_id: string | null
          topic_id: string | null
          task: string
          status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending' | 'processing'
          priority: number
          provider: string | null
          model: string | null
          input_payload: Json | null
          output_payload: Json | null
          cost_usd: number | null
          tokens_input: number | null
          tokens_output: number | null
          attempts: number
          error: string | null
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          task: string
          status?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending' | 'processing'
          priority?: number
          provider?: string | null
          model?: string | null
          input_payload?: Json | null
          output_payload?: Json | null
          cost_usd?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          attempts?: number
          error?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          task?: string
          status?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending' | 'processing'
          priority?: number
          provider?: string | null
          model?: string | null
          input_payload?: Json | null
          output_payload?: Json | null
          cost_usd?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          attempts?: number
          error?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      ai_generation_jobs: {
        Row: {
          id: string
          user_id: string
          job_type: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          input_params: Json
          result: Json | null
          error_message: string | null
          retry_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_type: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          input_params?: Json
          result?: Json | null
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_type?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          input_params?: Json
          result?: Json | null
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      ai_content_cache: {
        Row: {
          id: string
          cache_key: string
          content_type: string
          payload: Json
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          content_type: string
          payload: Json
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cache_key?: string
          content_type?: string
          payload?: Json
          expires_at?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          details: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
      }
      exam_subtopics: {
        Row: {
          id: string
          topic_id: string
          name: string
          normalized_name: string | null
          slug: string | null
          description: string | null
          display_order: number
          is_active: boolean
          verification_status: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          name: string
          normalized_name?: string | null
          slug?: string | null
          description?: string | null
          display_order?: number
          is_active?: boolean
          verification_status?: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          topic_id?: string
          name?: string
          normalized_name?: string | null
          slug?: string | null
          description?: string | null
          display_order?: number
          is_active?: boolean
          verification_status?: 'pending' | 'discovering' | 'verified' | 'needs_review' | 'stale' | 'failed'
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      exam_evidence: {
        Row: {
          id: string
          exam_id: string
          source_url: string | null
          source_reference: string | null
          source_type: 'official_syllabus' | 'regulatory_board' | 'academic_publication' | 'official_handbook' | 'web_resource' | 'other'
          publisher_authority: string | null
          retrieved_at: string
          source_version_date: string | null
          verification_status: 'pending' | 'valid' | 'invalid' | 'disputed'
          extracted_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          source_url?: string | null
          source_reference?: string | null
          source_type?: 'official_syllabus' | 'regulatory_board' | 'academic_publication' | 'official_handbook' | 'web_resource' | 'other'
          publisher_authority?: string | null
          retrieved_at?: string
          source_version_date?: string | null
          verification_status?: 'pending' | 'valid' | 'invalid' | 'disputed'
          extracted_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          source_url?: string | null
          source_reference?: string | null
          source_type?: 'official_syllabus' | 'regulatory_board' | 'academic_publication' | 'official_handbook' | 'web_resource' | 'other'
          publisher_authority?: string | null
          retrieved_at?: string
          source_version_date?: string | null
          verification_status?: 'pending' | 'valid' | 'invalid' | 'disputed'
          extracted_data?: Json
          created_at?: string
        }
      }
      user_sticky_notes: {
        Row: {
          id: string
          user_id: string
          exam_id: string | null
          subject_id: string | null
          topic_id: string
          subtopic_id: string | null
          title: string | null
          text: string
          category: string
          color: string
          pinned: boolean
          size: string
          rotation_deg: number
          is_ai_generated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id: string
          subtopic_id?: string | null
          title?: string | null
          text: string
          category?: string
          color?: string
          pinned?: boolean
          size?: string
          rotation_deg?: number
          is_ai_generated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string
          subtopic_id?: string | null
          title?: string | null
          text?: string
          category?: string
          color?: string
          pinned?: boolean
          size?: string
          rotation_deg?: number
          is_ai_generated?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ai_tutor_lessons: {
        Row: {
          id: string
          user_id: string | null
          exam_id: string | null
          subject_id: string | null
          topic_id: string | null
          subtopic_id: string | null
          title: string
          slug: string | null
          current_phase: string
          current_sequence: number
          total_duration_seconds: number
          scenes_data: Json
          segments: Json
          video_engine_version: string
          difficulty_level: string
          target_exam: string
          content: Json
          lesson_state: string
          status: string
          content_version: number
          version: number
          batch_id: string | null
          content_hash: string | null
          source_generation_id: string | null
          generation_status: string
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          title: string
          slug?: string | null
          current_phase?: string
          current_sequence?: number
          total_duration_seconds?: number
          scenes_data?: Json
          segments?: Json
          video_engine_version?: string
          difficulty_level?: string
          target_exam?: string
          content?: Json
          lesson_state?: string
          status?: string
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          title?: string
          slug?: string | null
          current_phase?: string
          current_sequence?: number
          total_duration_seconds?: number
          scenes_data?: Json
          segments?: Json
          video_engine_version?: string
          difficulty_level?: string
          target_exam?: string
          content?: Json
          lesson_state?: string
          status?: string
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ai_tutor_messages: {
        Row: {
          id: string
          lesson_id: string
          user_id: string | null
          sender: 'user' | 'tutor' | 'system'
          message: string
          scene_index: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          user_id?: string | null
          sender: 'user' | 'tutor' | 'system'
          message: string
          scene_index?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          user_id?: string | null
          sender?: 'user' | 'tutor' | 'system'
          message?: string
          scene_index?: number
          metadata?: Json
          created_at?: string
        }
      }
      mcqs: {
        Row: {
          id: string
          exam_id: string | null
          subject_id: string | null
          topic_id: string | null
          subtopic_id: string | null
          slug: string | null
          question: string
          options: Json
          correct_answer: string
          explanation: string
          step_by_step_explanation: Json | null
          clinical_pearl: string | null
          difficulty: string
          question_type: string
          tags: string[] | null
          high_yield: boolean
          high_yield_tag: string | null
          fingerprint: string | null
          content_version: number
          version: number
          batch_id: string | null
          content_hash: string | null
          source_generation_id: string | null
          generation_status: string
          status: string
          visibility: string
          answer_visibility: string
          ai_generated: boolean
          ai_provider: string | null
          ai_model: string | null
          is_canonical: boolean
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          slug?: string | null
          question: string
          options?: Json
          correct_answer: string
          explanation: string
          step_by_step_explanation?: Json | null
          clinical_pearl?: string | null
          difficulty?: string
          question_type?: string
          tags?: string[] | null
          high_yield?: boolean
          high_yield_tag?: string | null
          fingerprint?: string | null
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          status?: string
          visibility?: string
          answer_visibility?: string
          ai_generated?: boolean
          ai_provider?: string | null
          ai_model?: string | null
          is_canonical?: boolean
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          slug?: string | null
          question?: string
          options?: Json
          correct_answer?: string
          explanation?: string
          step_by_step_explanation?: Json | null
          clinical_pearl?: string | null
          difficulty?: string
          question_type?: string
          tags?: string[] | null
          high_yield?: boolean
          high_yield_tag?: string | null
          fingerprint?: string | null
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          status?: string
          visibility?: string
          answer_visibility?: string
          ai_generated?: boolean
          ai_provider?: string | null
          ai_model?: string | null
          is_canonical?: boolean
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          exam_id: string | null
          subject_id: string | null
          topic_id: string | null
          subtopic_id: string | null
          slug: string | null
          title: string
          content: Json
          summary: string | null
          high_yield_points: Json | null
          clinical_correlations: Json | null
          mnemonics: Json | null
          diagnostic_pearls: Json | null
          note_type: string
          status: string
          content_version: number
          version: number
          batch_id: string | null
          content_hash: string | null
          source_generation_id: string | null
          generation_status: string
          ai_generated: boolean
          ai_provider: string | null
          ai_model: string | null
          is_canonical: boolean
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          slug?: string | null
          title: string
          content?: Json
          summary?: string | null
          high_yield_points?: Json | null
          clinical_correlations?: Json | null
          mnemonics?: Json | null
          diagnostic_pearls?: Json | null
          note_type?: string
          status?: string
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          ai_generated?: boolean
          ai_provider?: string | null
          ai_model?: string | null
          is_canonical?: boolean
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          slug?: string | null
          title?: string
          content?: Json
          summary?: string | null
          high_yield_points?: Json | null
          clinical_correlations?: Json | null
          mnemonics?: Json | null
          diagnostic_pearls?: Json | null
          note_type?: string
          status?: string
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          ai_generated?: boolean
          ai_provider?: string | null
          ai_model?: string | null
          is_canonical?: boolean
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      flashcards: {
        Row: {
          id: string
          deck_id: string | null
          exam_id: string | null
          subject_id: string | null
          topic_id: string | null
          subtopic_id: string | null
          front: string
          back: string
          clinical_pearl: string | null
          difficulty: string
          status: string
          content_version: number
          version: number
          batch_id: string | null
          content_hash: string | null
          source_generation_id: string | null
          generation_status: string
          ai_generated: boolean
          is_canonical: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deck_id?: string | null
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          front: string
          back: string
          clinical_pearl?: string | null
          difficulty?: string
          status?: string
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          ai_generated?: boolean
          is_canonical?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deck_id?: string | null
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          front?: string
          back?: string
          clinical_pearl?: string | null
          difficulty?: string
          status?: string
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          ai_generated?: boolean
          is_canonical?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      revision_sheets: {
        Row: {
          id: string
          exam_id: string | null
          subject_id: string | null
          topic_id: string | null
          subtopic_id: string | null
          slug: string | null
          title: string
          subtitle: string | null
          sheet_type: string
          content: Json
          status: string
          content_version: number
          version: number
          batch_id: string | null
          content_hash: string | null
          source_generation_id: string | null
          generation_status: string
          ai_generated: boolean
          is_canonical: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          slug?: string | null
          title: string
          subtitle?: string | null
          sheet_type?: string
          content?: Json
          status?: string
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          ai_generated?: boolean
          is_canonical?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          slug?: string | null
          title?: string
          subtitle?: string | null
          sheet_type?: string
          content?: Json
          status?: string
          content_version?: number
          version?: number
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          ai_generated?: boolean
          is_canonical?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      content_versions: {
        Row: {
          id: string
          asset_id: string
          asset_type: string
          exam_id: string | null
          subject_id: string | null
          topic_id: string | null
          subtopic_id: string | null
          version: number
          is_current: boolean
          generation_reason: string
          requested_by: string | null
          provider: string | null
          model: string | null
          input_tokens: number
          cached_input_tokens: number
          output_tokens: number
          actual_cost_usd: number
          quality_score: number
          content_count: number
          change_summary: string | null
          batch_id: string | null
          content_hash: string | null
          source_generation_id: string | null
          generation_status: string
          snapshot: Json
          created_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          asset_type?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          version?: number
          is_current?: boolean
          generation_reason?: string
          requested_by?: string | null
          provider?: string | null
          model?: string | null
          input_tokens?: number
          cached_input_tokens?: number
          output_tokens?: number
          actual_cost_usd?: number
          quality_score?: number
          content_count?: number
          change_summary?: string | null
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          snapshot?: Json
          created_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          asset_type?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string | null
          subtopic_id?: string | null
          version?: number
          is_current?: boolean
          generation_reason?: string
          requested_by?: string | null
          provider?: string | null
          model?: string | null
          input_tokens?: number
          cached_input_tokens?: number
          output_tokens?: number
          actual_cost_usd?: number
          quality_score?: number
          content_count?: number
          change_summary?: string | null
          batch_id?: string | null
          content_hash?: string | null
          source_generation_id?: string | null
          generation_status?: string
          snapshot?: Json
          created_at?: string
        }
      }
      active_recall_sessions: {
        Row: {
          id: string
          user_id: string
          exam_id: string | null
          subject_id: string | null
          topic_id: string
          subtopic_id: string | null
          version_id: string | null
          total_items: number
          correct_count: number
          revealed_count: number
          reviewed_count: number
          accuracy: number
          status: string
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id: string
          subtopic_id?: string | null
          version_id?: string | null
          total_items?: number
          correct_count?: number
          revealed_count?: number
          reviewed_count?: number
          accuracy?: number
          status?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string
          subtopic_id?: string | null
          version_id?: string | null
          total_items?: number
          correct_count?: number
          revealed_count?: number
          reviewed_count?: number
          accuracy?: number
          status?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      active_recall_attempts: {
        Row: {
          id: string
          user_id: string
          exam_id: string | null
          subject_id: string | null
          topic_id: string
          subtopic_id: string | null
          recall_item_id: string
          session_id: string
          user_answer: string
          correct_answer: string
          is_correct: boolean
          is_revealed: boolean
          response_time_ms: number
          review_due_at: string | null
          attempted_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id: string
          subtopic_id?: string | null
          recall_item_id: string
          session_id: string
          user_answer: string
          correct_answer: string
          is_correct?: boolean
          is_revealed?: boolean
          response_time_ms?: number
          review_due_at?: string | null
          attempted_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exam_id?: string | null
          subject_id?: string | null
          topic_id?: string
          subtopic_id?: string | null
          recall_item_id?: string
          session_id?: string
          user_answer?: string
          correct_answer?: string
          is_correct?: boolean
          is_revealed?: boolean
          response_time_ms?: number
          review_due_at?: string | null
          attempted_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { p_user_id: string; p_permission_name: string }
        Returns: boolean
      }
      is_admin: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: { p_user_id: string; p_action: string; p_entity_type: string; p_entity_id: string; p_details?: Json }
        Returns: string
      }
    }
  }
}
