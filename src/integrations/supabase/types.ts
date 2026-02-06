export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contractors: {
        Row: {
          category: string | null
          company: string | null
          created_at: string
          created_by_user_id: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company?: string | null
          created_at?: string
          created_by_user_id: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company?: string | null
          created_at?: string
          created_by_user_id?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractors_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_map_plans: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          project_id: string
          updated_at: string
          view_settings: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          project_id: string
          updated_at?: string
          view_settings?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          project_id?: string
          updated_at?: string
          view_settings?: Json
        }
        Relationships: []
      }
      floor_map_shapes: {
        Row: {
          coordinates: Json
          created_at: string
          id: string
          plan_id: string | null
          project_id: string
          properties: Json | null
          room_id: string | null
          shape_type: string
          updated_at: string
          view_mode: string
        }
        Insert: {
          coordinates: Json
          created_at?: string
          id?: string
          plan_id?: string | null
          project_id: string
          properties?: Json | null
          room_id?: string | null
          shape_type: string
          updated_at?: string
          view_mode?: string
        }
        Update: {
          coordinates?: Json
          created_at?: string
          id?: string
          plan_id?: string | null
          project_id?: string
          properties?: Json | null
          room_id?: string | null
          shape_type?: string
          updated_at?: string
          view_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_map_shapes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "floor_map_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_map_shapes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_map_shapes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          cost: number | null
          created_at: string
          created_by_user_id: string
          id: string
          name: string
          ordered_amount: number | null
          paid_amount: number | null
          project_id: string | null
          quantity: number | null
          room_id: string | null
          status: string
          task_id: string | null
          unit: string | null
          updated_at: string
          vendor_link: string | null
          vendor_name: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by_user_id: string
          id?: string
          name: string
          ordered_amount?: number | null
          paid_amount?: number | null
          project_id?: string | null
          quantity?: number | null
          room_id?: string | null
          status?: string
          task_id?: string | null
          unit?: string | null
          updated_at?: string
          vendor_link?: string | null
          vendor_name?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          name?: string
          ordered_amount?: number | null
          paid_amount?: number | null
          project_id?: string | null
          quantity?: number | null
          room_id?: string | null
          status?: string
          task_id?: string | null
          unit?: string | null
          updated_at?: string
          vendor_link?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          created_by_user_id: string
          id: string
          linked_to_id: string
          linked_to_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by_user_id: string
          id?: string
          linked_to_id: string
          linked_to_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          linked_to_id?: string
          linked_to_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          linked_to_id: string
          linked_to_type: string
          uploaded_by_user_id: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          linked_to_id: string
          linked_to_type: string
          uploaded_by_user_id: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          linked_to_id?: string
          linked_to_type?: string
          uploaded_by_user_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          description: string
          quantity: number
          unit: string | null
          unit_price: number
          total_price: number
          is_rot_eligible: boolean | null
          rot_deduction: number | null
          sort_order: number | null
          room_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          description: string
          quantity?: number
          unit?: string | null
          unit_price?: number
          total_price?: never
          is_rot_eligible?: boolean | null
          rot_deduction?: number | null
          sort_order?: number | null
          room_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          description?: string
          quantity?: number
          unit?: string | null
          unit_price?: number
          total_price?: never
          is_rot_eligible?: boolean | null
          rot_deduction?: number | null
          sort_order?: number | null
          room_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          id: string
          project_id: string
          creator_id: string
          client_id: string | null
          title: string
          description: string | null
          status: string
          total_amount: number | null
          total_rot_deduction: number | null
          total_after_rot: number | null
          valid_until: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          creator_id: string
          client_id?: string | null
          title?: string
          description?: string | null
          status?: string
          total_amount?: number | null
          total_rot_deduction?: number | null
          total_after_rot?: number | null
          valid_until?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          creator_id?: string
          client_id?: string | null
          title?: string
          description?: string | null
          status?: string
          total_amount?: number | null
          total_rot_deduction?: number | null
          total_after_rot?: number | null
          valid_until?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          company_address: string | null
          company_city: string | null
          company_country: string | null
          company_description: string | null
          company_name: string | null
          company_postal_code: string | null
          company_website: string | null
          contractor_category: string | null
          created_at: string
          email: string | null
          id: string
          is_professional: boolean
          language_preference: string | null
          latitude: number | null
          longitude: number | null
          name: string
          onboarding_completed_at: string | null
          onboarding_completed_profile: boolean | null
          onboarding_created_project: boolean | null
          onboarding_created_quote: boolean | null
          onboarding_created_task_room: boolean | null
          onboarding_dismissed: boolean | null
          onboarding_drawn_room: boolean | null
          onboarding_user_type: string | null
          onboarding_welcome_completed: boolean | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_description?: string | null
          company_name?: string | null
          company_postal_code?: string | null
          company_website?: string | null
          contractor_category?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_professional?: boolean
          language_preference?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          onboarding_completed_at?: string | null
          onboarding_completed_profile?: boolean | null
          onboarding_created_project?: boolean | null
          onboarding_created_quote?: boolean | null
          onboarding_created_task_room?: boolean | null
          onboarding_dismissed?: boolean | null
          onboarding_drawn_room?: boolean | null
          onboarding_user_type?: string | null
          onboarding_welcome_completed?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_description?: string | null
          company_name?: string | null
          company_postal_code?: string | null
          company_website?: string | null
          contractor_category?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_professional?: boolean
          language_preference?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          onboarding_completed_at?: string | null
          onboarding_completed_profile?: boolean | null
          onboarding_created_project?: boolean | null
          onboarding_created_quote?: boolean | null
          onboarding_created_task_room?: boolean | null
          onboarding_dismissed?: boolean | null
          onboarding_drawn_room?: boolean | null
          onboarding_user_type?: string | null
          onboarding_welcome_completed?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_invitations: {
        Row: {
          accepted_at: string | null
          access_level: string
          contractor_role: Database["public"]["Enums"]["contractor_role"]
          created_at: string
          delivery_method: string | null
          expires_at: string
          id: string
          invitation_token: string
          invited_by_user_id: string
          invited_email: string
          invited_phone: string | null
          permissions_snapshot: Record<string, unknown> | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          access_level?: string
          contractor_role: Database["public"]["Enums"]["contractor_role"]
          created_at?: string
          delivery_method?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by_user_id: string
          invited_email: string
          invited_phone?: string | null
          permissions_snapshot?: Record<string, unknown> | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          access_level?: string
          contractor_role?: Database["public"]["Enums"]["contractor_role"]
          created_at?: string
          delivery_method?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by_user_id?: string
          invited_email?: string
          invited_phone?: string | null
          permissions_snapshot?: Record<string, unknown> | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shares: {
        Row: {
          can_create_purchase_requests: boolean | null
          contractor_role: Database["public"]["Enums"]["contractor_role"] | null
          created_at: string
          id: string
          project_id: string
          role: string | null
          shared_with_user_id: string
        }
        Insert: {
          can_create_purchase_requests?: boolean | null
          contractor_role?:
            | Database["public"]["Enums"]["contractor_role"]
            | null
          created_at?: string
          id?: string
          project_id: string
          role?: string | null
          shared_with_user_id: string
        }
        Update: {
          can_create_purchase_requests?: boolean | null
          contractor_role?:
            | Database["public"]["Enums"]["contractor_role"]
            | null
          created_at?: string
          id?: string
          project_id?: string
          role?: string | null
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          description: string | null
          finish_goal_date: string | null
          floor_plan_data: Json | null
          id: string
          name: string
          owner_id: string
          postal_code: string | null
          project_type: string | null
          spent_amount: number | null
          start_date: string | null
          status: string | null
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          finish_goal_date?: string | null
          floor_plan_data?: Json | null
          id?: string
          name: string
          owner_id: string
          postal_code?: string | null
          project_type?: string | null
          spent_amount?: number | null
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          finish_goal_date?: string | null
          floor_plan_data?: Json | null
          id?: string
          name?: string
          owner_id?: string
          postal_code?: string | null
          project_type?: string | null
          spent_amount?: number | null
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          created_at: string
          id: string
          material_id: string
          notes: string | null
          requested_by_user_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          requested_by_user_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          requested_by_user_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          description: string | null
          dimensions: Json | null
          floor_plan_position: Json | null
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          floor_plan_position?: Json | null
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          floor_plan_position?: Json | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to_contractor_id: string | null
          budget: number | null
          cost_center: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          due_date: string | null
          finish_date: string | null
          floor_plan_position: Json | null
          id: string
          ordered_amount: number | null
          paid_amount: number | null
          payment_status: string | null
          priority: string | null
          progress: number | null
          project_id: string
          room_id: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_contractor_id?: string | null
          budget?: number | null
          cost_center?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          due_date?: string | null
          finish_date?: string | null
          floor_plan_position?: Json | null
          id?: string
          ordered_amount?: number | null
          paid_amount?: number | null
          payment_status?: string | null
          priority?: string | null
          progress?: number | null
          project_id: string
          room_id?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_contractor_id?: string | null
          budget?: number | null
          cost_center?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          due_date?: string | null
          finish_date?: string | null
          floor_plan_position?: Json | null
          id?: string
          ordered_amount?: number | null
          paid_amount?: number | null
          payment_status?: string | null
          priority?: string | null
          progress?: number | null
          project_id?: string
          room_id?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_contractor_id_fkey"
            columns: ["assigned_to_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_profile_id: { Args: never; Returns: string }
      user_can_manage_project: {
        Args: { project_id: string }
        Returns: boolean
      }
      user_has_project_access: {
        Args: { project_id: string }
        Returns: boolean
      }
      user_owns_project: { Args: { project_id: string }; Returns: boolean }
    }
    Enums: {
      contractor_role:
        | "painter"
        | "electrician"
        | "plumber"
        | "carpenter"
        | "designer"
        | "architect"
        | "general_contractor"
        | "supplier"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      contractor_role: [
        "painter",
        "electrician",
        "plumber",
        "carpenter",
        "designer",
        "architect",
        "general_contractor",
        "supplier",
        "other",
      ],
    },
  },
} as const
