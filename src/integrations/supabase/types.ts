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
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          mensagem?: string | null
          pausa_forcada?: string | null
          timeout?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          mensagem?: string | null
          pausa_forcada?: string | null
          timeout?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          id: string
          ip_address: unknown | null
          message_id: number | null
          metadata: Json | null
          session_id: string
          user_agent: string | null
          user_id: string
          user_type: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          id?: string
          ip_address?: unknown | null
          message_id?: number | null
          metadata?: Json | null
          session_id: string
          user_agent?: string | null
          user_id: string
          user_type?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          id?: string
          ip_address?: unknown | null
          message_id?: number | null
          metadata?: Json | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
          user_type?: string | null
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
          user_id: string | null
        }
        Insert: {
          additional_kwargs?: Json | null
          created_at?: string | null
          id?: string
          message: string
          session_id: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          additional_kwargs?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          session_id?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          first_interaction: string | null
          last_interaction: string | null
          metadata: Json | null
          session_id: string
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          first_interaction?: string | null
          last_interaction?: string | null
          metadata?: Json | null
          session_id: string
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          first_interaction?: string | null
          last_interaction?: string | null
          metadata?: Json | null
          session_id?: string
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      communications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          patient_id: string | null
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          patient_id?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          patient_id?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          dias_para_followup: number | null
          email: string | null
          erro_envio: string | null
          id: number
          mensagem_followup: string | null
          nome: string
          status: string | null
          status_envio: string | null
          telefone: string | null
          tentativas_followup: number | null
          ultima_mensagem_enviada: string | null
          ultimo_contato: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          dias_para_followup?: number | null
          email?: string | null
          erro_envio?: string | null
          id?: number
          mensagem_followup?: string | null
          nome: string
          status?: string | null
          status_envio?: string | null
          telefone?: string | null
          tentativas_followup?: number | null
          ultima_mensagem_enviada?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          dias_para_followup?: number | null
          email?: string | null
          erro_envio?: string | null
          id?: number
          mensagem_followup?: string | null
          nome?: string
          status?: string | null
          status_envio?: string | null
          telefone?: string | null
          tentativas_followup?: number | null
          ultima_mensagem_enviada?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_record_symptoms: {
        Row: {
          created_at: string | null
          daily_record_id: string | null
          id: string
          symptom_name: string
        }
        Insert: {
          created_at?: string | null
          daily_record_id?: string | null
          id?: string
          symptom_name: string
        }
        Update: {
          created_at?: string | null
          daily_record_id?: string | null
          id?: string
          symptom_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_record_symptoms_daily_record_id_fkey"
            columns: ["daily_record_id"]
            isOneToOne: false
            referencedRelation: "daily_records"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_records: {
        Row: {
          caregiver_id: string | null
          created_at: string | null
          food_consistency: Database["public"]["Enums"]["food_consistency"]
          id: string
          observations: string | null
          patient_id: string | null
          photo_urls: string[] | null
          record_date: string
          risk_score: number | null
          updated_at: string | null
        }
        Insert: {
          caregiver_id?: string | null
          created_at?: string | null
          food_consistency: Database["public"]["Enums"]["food_consistency"]
          id?: string
          observations?: string | null
          patient_id?: string | null
          photo_urls?: string[] | null
          record_date: string
          risk_score?: number | null
          updated_at?: string | null
        }
        Update: {
          caregiver_id?: string | null
          created_at?: string | null
          food_consistency?: Database["public"]["Enums"]["food_consistency"]
          id?: string
          observations?: string | null
          patient_id?: string | null
          photo_urls?: string[] | null
          record_date?: string
          risk_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_records_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          document_id: number
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
          user_type: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          document_id: number
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
          user_type?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          document_id?: number
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
          user_type?: string | null
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
      followup_logs: {
        Row: {
          categoria: string | null
          contact_id: number | null
          created_at: string | null
          erro: string | null
          id: number
          mensagem_enviada: string | null
          nome: string | null
          resposta_api: string | null
          status: string | null
          telefone: string | null
        }
        Insert: {
          categoria?: string | null
          contact_id?: number | null
          created_at?: string | null
          erro?: string | null
          id?: number
          mensagem_enviada?: string | null
          nome?: string | null
          resposta_api?: string | null
          status?: string | null
          telefone?: string | null
        }
        Update: {
          categoria?: string | null
          contact_id?: number | null
          created_at?: string | null
          erro?: string | null
          id?: number
          mensagem_enviada?: string | null
          nome?: string | null
          resposta_api?: string | null
          status?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          created_at: string | null
          daily_record_id: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string | null
          daily_record_id?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string | null
          daily_record_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_files_daily_record_id_fkey"
            columns: ["daily_record_id"]
            isOneToOne: false
            referencedRelation: "daily_records"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
        ]
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
      pacientes: {
        Row: {
          caregiver_id: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          diagnostico: string | null
          email: string | null
          endereco: string | null
          historico_medico: string | null
          id: string
          medicamentos_atuais: string | null
          nome: string
          observacoes: string | null
          professional_id: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          status: string | null
          telefone: string | null
          tipo_usuario: string
          updated_at: string
          usuario_cadastro_id: string | null
        }
        Insert: {
          caregiver_id?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          diagnostico?: string | null
          email?: string | null
          endereco?: string | null
          historico_medico?: string | null
          id?: string
          medicamentos_atuais?: string | null
          nome: string
          observacoes?: string | null
          professional_id?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          status?: string | null
          telefone?: string | null
          tipo_usuario: string
          updated_at?: string
          usuario_cadastro_id?: string | null
        }
        Update: {
          caregiver_id?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          diagnostico?: string | null
          email?: string | null
          endereco?: string | null
          historico_medico?: string | null
          id?: string
          medicamentos_atuais?: string | null
          nome?: string
          observacoes?: string | null
          professional_id?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          status?: string | null
          telefone?: string | null
          tipo_usuario?: string
          updated_at?: string
          usuario_cadastro_id?: string | null
        }
        Relationships: []
      }
      patient_access_log: {
        Row: {
          accessed_at: string | null
          accessed_fields: string[] | null
          action: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          patient_id: string | null
          user_agent: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          accessed_at?: string | null
          accessed_fields?: string[] | null
          action: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          patient_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          accessed_at?: string | null
          accessed_fields?: string[] | null
          action?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          patient_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_patient_access_log_patient"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_access_permissions: {
        Row: {
          access_level: Database["public"]["Enums"]["patient_access_level"]
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          justification: string | null
          metadata: Json | null
          patient_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["patient_access_level"]
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          justification?: string | null
          metadata?: Json | null
          patient_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["patient_access_level"]
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          justification?: string | null
          metadata?: Json | null
          patient_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_access_permissions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_assignment_approvals: {
        Row: {
          assignment_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          justification: string
          metadata: Json | null
          patient_id: string
          requested_assignee_id: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          assignment_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          justification: string
          metadata?: Json | null
          patient_id: string
          requested_assignee_id: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          assignment_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          justification?: string
          metadata?: Json | null
          patient_id?: string
          requested_assignee_id?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      patient_assignment_audit: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_by: string
          assignment_reason: string | null
          assignment_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_assignee_id: string | null
          old_assignee_id: string | null
          patient_id: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_by: string
          assignment_reason?: string | null
          assignment_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_assignee_id?: string | null
          old_assignee_id?: string | null
          patient_id: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_by?: string
          assignment_reason?: string | null
          assignment_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_assignee_id?: string | null
          old_assignee_id?: string | null
          patient_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_admin: boolean | null
          is_approved: boolean
          nome: string | null
          tipo_usuario: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_admin?: boolean | null
          is_approved?: boolean
          nome?: string | null
          tipo_usuario: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_admin?: boolean | null
          is_approved?: boolean
          nome?: string | null
          tipo_usuario?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          appointment_id: string
          channel: string | null
          id: number
          message_id: string | null
          recipient: string | null
          reminder_type: string
          sent_at: string
          status: string | null
        }
        Insert: {
          appointment_id: string
          channel?: string | null
          id?: number
          message_id?: string | null
          recipient?: string | null
          reminder_type: string
          sent_at?: string
          status?: string | null
        }
        Update: {
          appointment_id?: string
          channel?: string | null
          id?: number
          message_id?: string | null
          recipient?: string | null
          reminder_type?: string
          sent_at?: string
          status?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
      team_message_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          id: string
          ip_address: unknown | null
          message_id: string | null
          user_agent: string | null
          user_id: string
          user_type: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          id?: string
          ip_address?: unknown | null
          message_id?: string | null
          user_agent?: string | null
          user_id: string
          user_type?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          id?: string
          ip_address?: unknown | null
          message_id?: string | null
          user_agent?: string | null
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      team_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          reply_to_id: string | null
          sender_id: string
          sender_name: string
          sender_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          reply_to_id?: string | null
          sender_id: string
          sender_name: string
          sender_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          reply_to_id?: string | null
          sender_id?: string
          sender_name?: string
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_answers: {
        Row: {
          answer_value: number
          assessment_id: string | null
          created_at: string | null
          id: string
          question_id: string
        }
        Insert: {
          answer_value: number
          assessment_id?: string | null
          created_at?: string | null
          id?: string
          question_id: string
        }
        Update: {
          answer_value?: number
          assessment_id?: string | null
          created_at?: string | null
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "triage_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_assessments: {
        Row: {
          caregiver_id: string | null
          completed_at: string | null
          id: string
          patient_id: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          total_score: number
        }
        Insert: {
          caregiver_id?: string | null
          completed_at?: string | null
          id?: string
          patient_id?: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          total_score?: number
        }
        Update: {
          caregiver_id?: string | null
          completed_at?: string | null
          id?: string
          patient_id?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "triage_assessments_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          registration_number: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          registration_number?: string | null
          updated_at?: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          registration_number?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      vector_document_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          document_id: number | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          search_query: string | null
          user_agent: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          document_id?: number | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          search_query?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          document_id?: number | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          search_query?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_type?: string | null
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
          user_id: string | null
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
          user_id?: string | null
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_patient_securely: {
        Args: {
          assignee_id: string
          assignment_type: string
          justification?: string
          patient_uuid: string
        }
        Returns: Json
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      can_access_contact: {
        Args: { contact_user_id: string }
        Returns: boolean
      }
      can_access_patient: {
        Args: { patient_uuid: string }
        Returns: boolean
      }
      can_access_patient_secure: {
        Args: { patient_uuid: string }
        Returns: boolean
      }
      can_access_patient_strict: {
        Args: { patient_uuid: string }
        Returns: boolean
      }
      can_create_patients: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_view_patients_list: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      emergency_security_check: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_assignment_security_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_available_users_for_assignment: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          id: string
          nome: string
          tipo_usuario: string
        }[]
      }
      get_comprehensive_security_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_contacts_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_level: string
          categoria: string
          created_at: string
          email: string
          id: number
          nome: string
          status: string
          telefone: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_type: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_pacientes_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          caregiver_id: string
          cpf: string
          created_at: string
          data_nascimento: string
          diagnostico: string
          email: string
          endereco: string
          historico_medico: string
          id: string
          medicamentos_atuais: string
          nome: string
          observacoes: string
          professional_id: string
          responsavel_email: string
          responsavel_nome: string
          responsavel_telefone: string
          status: string
          telefone: string
          updated_at: string
          usuario_cadastro_id: string
        }[]
      }
      get_pacientes_secure_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_level: string
          cpf: string
          created_at: string
          data_nascimento: string
          id: string
          nome: string
          status: string
        }[]
      }
      get_patient_data_secure: {
        Args: { patient_uuid: string }
        Returns: {
          access_level: string
          caregiver_id: string
          cpf: string
          created_at: string
          data_nascimento: string
          diagnostico: string
          email: string
          endereco: string
          historico_medico: string
          id: string
          medicamentos_atuais: string
          nome: string
          observacoes: string
          professional_id: string
          responsavel_email: string
          responsavel_nome: string
          responsavel_telefone: string
          status: string
          telefone: string
          updated_at: string
        }[]
      }
      get_patient_data_secure_enhanced: {
        Args: { patient_uuid: string }
        Returns: {
          access_level: string
          caregiver_id: string
          cpf: string
          created_at: string
          data_nascimento: string
          diagnostico: string
          email: string
          endereco: string
          historico_medico: string
          id: string
          medicamentos_atuais: string
          nome: string
          observacoes: string
          professional_id: string
          responsavel_email: string
          responsavel_nome: string
          responsavel_telefone: string
          status: string
          telefone: string
          updated_at: string
        }[]
      }
      get_patient_secure_with_audit: {
        Args: { patient_uuid: string }
        Returns: {
          caregiver_id: string
          cpf: string
          created_at: string
          data_nascimento: string
          diagnostico: string
          email: string
          endereco: string
          historico_medico: string
          id: string
          medicamentos_atuais: string
          nome: string
          observacoes: string
          professional_id: string
          responsavel_email: string
          responsavel_nome: string
          responsavel_telefone: string
          status: string
          telefone: string
          updated_at: string
          user_access_level: string
        }[]
      }
      get_security_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_unread_messages_count: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_patient_access_level: {
        Args: { target_patient_id: string; target_user_id: string }
        Returns: Database["public"]["Enums"]["patient_access_level"]
      }
      get_users_contact_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          registration_number: string
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      grant_patient_access: {
        Args: {
          access_level: Database["public"]["Enums"]["patient_access_level"]
          expires_in_hours?: number
          justification?: string
          target_patient_id: string
          target_user_id: string
        }
        Returns: boolean
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
      is_admin_email: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_approved_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authorized_caregiver: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authorized_for_patient: {
        Args: { patient_uuid: string }
        Returns: boolean
      }
      is_authorized_healthcare_professional: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_system_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_system_admin_secure: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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
        Returns: string
      }
      log_contact_access: {
        Args: { action_type: string; contact_id: number }
        Returns: undefined
      }
      log_patient_access_simple: {
        Args: { action_type: string; patient_id: string }
        Returns: undefined
      }
      log_security_violation: {
        Args: {
          attempted_action: string
          metadata?: Json
          table_name: string
          violation_type: string
        }
        Returns: undefined
      }
      mark_message_as_read: {
        Args: { message_uuid: string; user_uuid: string }
        Returns: boolean
      }
      mask_medical_data: {
        Args: { access_level?: string; field_type?: string; input_data: string }
        Returns: string
      }
      mask_sensitive_data: {
        Args: { input_data: string; mask_type?: string }
        Returns: string
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
      monitor_patient_security_violations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      secure_match_vector_documents: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
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
      test_patient_access_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          result: string
          test_name: string
        }[]
      }
      validate_patient_assignment_security: {
        Args: {
          assignee_id: string
          assignment_type: string
          patient_uuid: string
        }
        Returns: boolean
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
      verify_patient_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          security_check: string
          status: string
        }[]
      }
    }
    Enums: {
      food_consistency:
        | "normal"
        | "pastosa"
        | "liquida_modificada"
        | "liquida_fina"
      food_consistency_type:
        | "liquida_fina"
        | "liquida_modificada"
        | "pastosa"
        | "normal"
      patient_access_level: "none" | "basic" | "medical" | "full"
      risk_level: "baixo" | "medio" | "alto"
      tipo:
        | "Mercado"
        | "Cartão"
        | "Assinatura"
        | "Gasolina"
        | "Dinheiro"
        | "Congresso"
        | "Passagem Aérea"
      user_type: "cuidador" | "profissional"
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
      food_consistency: [
        "normal",
        "pastosa",
        "liquida_modificada",
        "liquida_fina",
      ],
      food_consistency_type: [
        "liquida_fina",
        "liquida_modificada",
        "pastosa",
        "normal",
      ],
      patient_access_level: ["none", "basic", "medical", "full"],
      risk_level: ["baixo", "medio", "alto"],
      tipo: [
        "Mercado",
        "Cartão",
        "Assinatura",
        "Gasolina",
        "Dinheiro",
        "Congresso",
        "Passagem Aérea",
      ],
      user_type: ["cuidador", "profissional"],
    },
  },
} as const
