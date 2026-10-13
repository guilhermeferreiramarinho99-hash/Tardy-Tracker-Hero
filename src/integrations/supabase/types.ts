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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          aluno_id: string
          gerado_em: string
          id: string
          periodo_id: string
          quantidade: number
          status: string
        }
        Insert: {
          aluno_id: string
          gerado_em?: string
          id?: string
          periodo_id: string
          quantidade: number
          status?: string
        }
        Update: {
          aluno_id?: string
          gerado_em?: string
          id?: string
          periodo_id?: string
          quantidade?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          turma_id: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          turma_id: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          turma_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      atrasos: {
        Row: {
          aluno_id: string
          cancelado: boolean
          created_at: string
          data: string
          hora: string
          id: string
          justificado: boolean
          observacao: string | null
          registrado_por: string | null
          registrado_por_nome: string
        }
        Insert: {
          aluno_id: string
          cancelado?: boolean
          created_at?: string
          data: string
          hora: string
          id?: string
          justificado?: boolean
          observacao?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string
        }
        Update: {
          aluno_id?: string
          cancelado?: boolean
          created_at?: string
          data?: string
          hora?: string
          id?: string
          justificado?: boolean
          observacao?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "atrasos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          detalhes: Json | null
          id: string
          operacao: string
          quando: string
          usuario: string | null
          usuario_nome: string
        }
        Insert: {
          detalhes?: Json | null
          id?: string
          operacao: string
          quando?: string
          usuario?: string | null
          usuario_nome?: string
        }
        Update: {
          detalhes?: Json | null
          id?: string
          operacao?: string
          quando?: string
          usuario?: string | null
          usuario_nome?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          contar_justificados: boolean
          fuso: string
          id: number
          limite: number
        }
        Insert: {
          contar_justificados?: boolean
          fuso?: string
          id?: number
          limite?: number
        }
        Update: {
          contar_justificados?: boolean
          fuso?: string
          id?: number
          limite?: number
        }
        Relationships: []
      }
      encaminhamentos: {
        Row: {
          alerta_id: string | null
          aluno_id: string
          autor: string | null
          autor_nome: string
          created_at: string
          id: string
          texto: string
        }
        Insert: {
          alerta_id?: string | null
          aluno_id: string
          autor?: string | null
          autor_nome?: string
          created_at?: string
          id?: string
          texto: string
        }
        Update: {
          alerta_id?: string | null
          aluno_id?: string
          autor?: string | null
          autor_nome?: string
          created_at?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "encaminhamentos_alerta_id_fkey"
            columns: ["alerta_id"]
            isOneToOne: false
            referencedRelation: "alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encaminhamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos: {
        Row: {
          fim: string
          id: string
          inicio: string
          nome: string
        }
        Insert: {
          fim: string
          id?: string
          inicio: string
          nome: string
        }
        Update: {
          fim?: string
          id?: string
          inicio?: string
          nome?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ano: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ano?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analisar_alerta: {
        Args: { _id: string; _texto: string }
        Returns: undefined
      }
      auditar: {
        Args: { _detalhes: Json; _operacao: string }
        Returns: undefined
      }
      cancelar_atraso: {
        Args: { _id: string; _motivo: string }
        Returns: undefined
      }
      corrigir_atraso: {
        Args: { _id: string; _justificado: boolean; _motivo: string }
        Returns: undefined
      }
      definir_papel: {
        Args: {
          _ativo: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user: string
        }
        Returns: undefined
      }
      excluir_aluno: { Args: { _id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestor: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      nome_usuario: { Args: { _uid: string }; Returns: string }
      recalcular_alerta: {
        Args: { _aluno: string; _data: string }
        Returns: Json
      }
      registrar_atraso: {
        Args: { _aluno: string; _justificado: boolean; _observacao?: string }
        Returns: Json
      }
      registrar_atraso_offline: {
        Args: {
          _aluno: string
          _data: string
          _hora: string
          _justificado: boolean
          _observacao: string
        }
        Returns: Json
      }
      vincular_aluno: {
        Args: { _aluno: string; _user: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "equipe" | "coordenacao" | "aluno"
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
    Enums: {
      app_role: ["admin", "equipe", "coordenacao", "aluno"],
    },
  },
} as const
