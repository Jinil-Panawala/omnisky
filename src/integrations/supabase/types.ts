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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      aircraft_positions: {
        Row: {
          altitude_m: number | null
          callsign: string | null
          heading_deg: number | null
          icao24: string
          lat: number | null
          lon: number | null
          on_ground: boolean | null
          updated_at: string
          velocity_ms: number | null
          vertical_rate_ms: number | null
        }
        Insert: {
          altitude_m?: number | null
          callsign?: string | null
          heading_deg?: number | null
          icao24: string
          lat?: number | null
          lon?: number | null
          on_ground?: boolean | null
          updated_at?: string
          velocity_ms?: number | null
          vertical_rate_ms?: number | null
        }
        Update: {
          altitude_m?: number | null
          callsign?: string | null
          heading_deg?: number | null
          icao24?: string
          lat?: number | null
          lon?: number | null
          on_ground?: boolean | null
          updated_at?: string
          velocity_ms?: number | null
          vertical_rate_ms?: number | null
        }
        Relationships: []
      }
      launches: {
        Row: {
          id: string
          mission: string | null
          name: string
          pad_lat: number | null
          pad_lon: number | null
          pad_name: string | null
          provider: string | null
          rocket: string | null
          status: string | null
          updated_at: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          id: string
          mission?: string | null
          name: string
          pad_lat?: number | null
          pad_lon?: number | null
          pad_name?: string | null
          provider?: string | null
          rocket?: string | null
          status?: string | null
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          id?: string
          mission?: string | null
          name?: string
          pad_lat?: number | null
          pad_lon?: number | null
          pad_name?: string | null
          provider?: string | null
          rocket?: string | null
          status?: string | null
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      position_history: {
        Row: {
          altitude_m: number | null
          craft_id: string
          craft_type: string
          id: number
          lat: number | null
          lon: number | null
          recorded_at: string
          speed: number | null
        }
        Insert: {
          altitude_m?: number | null
          craft_id: string
          craft_type: string
          id?: never
          lat?: number | null
          lon?: number | null
          recorded_at?: string
          speed?: number | null
        }
        Update: {
          altitude_m?: number | null
          craft_id?: string
          craft_type?: string
          id?: never
          lat?: number | null
          lon?: number | null
          recorded_at?: string
          speed?: number | null
        }
        Relationships: []
      }
      satellite_tles: {
        Row: {
          category: string | null
          name: string
          norad_id: number
          tle_line1: string
          tle_line2: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          name: string
          norad_id: number
          tle_line1: string
          tle_line2: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          name?: string
          norad_id?: number
          tle_line1?: string
          tle_line2?: string
          updated_at?: string
        }
        Relationships: []
      }
      vessel_positions: {
        Row: {
          course_deg: number | null
          heading_deg: number | null
          lat: number | null
          lon: number | null
          mmsi: string
          ship_name: string | null
          ship_type: string | null
          speed_kn: number | null
          updated_at: string
        }
        Insert: {
          course_deg?: number | null
          heading_deg?: number | null
          lat?: number | null
          lon?: number | null
          mmsi: string
          ship_name?: string | null
          ship_type?: string | null
          speed_kn?: number | null
          updated_at?: string
        }
        Update: {
          course_deg?: number | null
          heading_deg?: number | null
          lat?: number | null
          lon?: number | null
          mmsi?: string
          ship_name?: string | null
          ship_type?: string | null
          speed_kn?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
