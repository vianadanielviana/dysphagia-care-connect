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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cadastro: {
        Row: {
          created_at: string
          id: number
          mensagem: string | null
          pausa_forcada: string | null
          timeout: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          mensagem?: string | null
          pausa_forcada?: string | null
          timeout?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          mensagem?: string | null
          pausa_forcada?: string | null
          timeout?: string | null
        }
        Relationships: []
      }
      chat_memory: {
        Row: {
          additional_kwargs: Json | null
          created_at: string | null
          id: string
          message: string
          session_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          additional_kwargs?: Json | null
          created_at?: string | null
          id?: string
          message: string
          session_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_kwargs?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          session_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          first_interaction: string | null
          last_interaction: string | null
          metadata: Json | null
          session_id: string
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          first_interaction?: string | null
          last_interaction?: string | null
          metadata?: Json | null
          session_id: string
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          first_interaction?: string | null
          last_interaction?: string | null
          metadata?: Json | null
          session_id?: string
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      Gastos: {
        Row: {
          created_at: string
          id: number
          Nome: string | null
          Tipo: Database["public"]["Enums"]["tipo"] | null
          Valor: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          Nome?: string | null
          Tipo?: Database["public"]["Enums"]["tipo"] | null
          Valor?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          Nome?: string | null
          Tipo?: Database["public"]["Enums"]["tipo"] | null
          Valor?: number | null
        }
        Relationships: []
      }
      n8n_chat_carol: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          FollowUp: number | null
          id: number
          message: Json
          session_id: string
          timestemp: string | null
        }
        Insert: {
          FollowUp?: number | null
          id?: number
          message: Json
          session_id: string
          timestemp?: string | null
        }
        Update: {
          FollowUp?: number | null
          id?: number
          message?: Json
          session_id?: string
          timestemp?: string | null
        }
        Relationships: []
      }
      table_name: {
        Row: {
          data: Json | null
          email: string | null
          id: number
          inserted_at: string
          message: string | null
          name: string | null
          pontos: number | null
          telefone: number | null
          temperatura: string | null
          updated_at: string
        }
        Insert: {
          data?: Json | null
          email?: string | null
          id?: number
          inserted_at?: string
          message?: string | null
          name?: string | null
          pontos?: number | null
          telefone?: number | null
          temperatura?: string | null
          updated_at?: string
        }
        Update: {
          data?: Json | null
          email?: string | null
          id?: number
          inserted_at?: string
          message?: string | null
          name?: string | null
          pontos?: number | null
          telefone?: number | null
          temperatura?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vector_documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      workflow: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      chat_memory_n8n: {
        Row: {
          additional_kwargs: Json | null
          created_at: string | null
          id: string | null
          message: string | null
          session_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          additional_kwargs?: Json | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          session_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_kwargs?: Json | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          session_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_vector_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      tipo:
        | "Mercado"
        | "Cartão"
        | "Assinatura"
        | "Gasolina"
        | "Dinheiro"
        | "Congresso"
        | "Passagem Aérea"
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
      tipo: [
        "Mercado",
        "Cartão",
        "Assinatura",
        "Gasolina",
        "Dinheiro",
        "Congresso",
        "Passagem Aérea",
      ],
    },
  },
} as const
