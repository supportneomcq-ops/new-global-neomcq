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
          created_at: string
          updated_at: string
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
          created_at?: string
          updated_at?: string
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
          created_at?: string
          updated_at?: string
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
    }
  }
}
