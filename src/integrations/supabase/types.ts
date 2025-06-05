export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_email_configs: {
        Row: {
          created_at: string | null
          email_address: string
          frequency: string | null
          id: string
          is_active: boolean | null
          last_sent: string | null
          send_time: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          updated_at: string | null
          use_tls: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_address: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          send_time?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string | null
          use_tls?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_address?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          send_time?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string | null
          use_tls?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_keywords: {
        Row: {
          created_at: string | null
          id: string
          keyword: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          keyword: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          keyword?: string
          user_id?: string
        }
        Relationships: []
      }
      user_news_sources: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          name: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_search_settings: {
        Row: {
          created_at: string | null
          current_date_only: boolean | null
          deep_scrape: boolean | null
          id: string
          include_twitter: boolean | null
          max_results: number | null
          python_executable: string | null
          python_script_path: string | null
          updated_at: string | null
          user_id: string
          validate_links: boolean | null
        }
        Insert: {
          created_at?: string | null
          current_date_only?: boolean | null
          deep_scrape?: boolean | null
          id?: string
          include_twitter?: boolean | null
          max_results?: number | null
          python_executable?: string | null
          python_script_path?: string | null
          updated_at?: string | null
          user_id: string
          validate_links?: boolean | null
        }
        Update: {
          created_at?: string | null
          current_date_only?: boolean | null
          deep_scrape?: boolean | null
          id?: string
          include_twitter?: boolean | null
          max_results?: number | null
          python_executable?: string | null
          python_script_path?: string | null
          updated_at?: string | null
          user_id?: string
          validate_links?: boolean | null
        }
        Relationships: []
      }
      user_twitter_users: {
        Row: {
          created_at: string | null
          id: string
          twitter_username: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          twitter_username: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          twitter_username?: string
          user_id?: string
        }
        Relationships: []
      }
      user_whatsapp_configs: {
        Row: {
          api_key: string | null
          connection_method: string | null
          created_at: string | null
          evolution_api_url: string | null
          id: string
          is_active: boolean | null
          phone_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key?: string | null
          connection_method?: string | null
          created_at?: string | null
          evolution_api_url?: string | null
          id?: string
          is_active?: boolean | null
          phone_number: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string | null
          connection_method?: string | null
          created_at?: string | null
          evolution_api_url?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          message_text: string
          message_type: string | null
          phone_number: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          message_text: string
          message_type?: string | null
          phone_number: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          message_text?: string
          message_type?: string | null
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_subscriptions: {
        Row: {
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          last_sent: string | null
          phone_number: string
          scheduled_time: string
          updated_at: string
          user_id: string
          weekdays: number[] | null
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent?: string | null
          phone_number: string
          scheduled_time?: string
          updated_at?: string
          user_id: string
          weekdays?: number[] | null
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent?: string | null
          phone_number?: string
          scheduled_time?: string
          updated_at?: string
          user_id?: string
          weekdays?: number[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_existing_subscription: {
        Args: { p_user_id: string; p_phone_number: string }
        Returns: {
          id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
