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
      contagens: {
        Row: {
          id: string
          data: string
          created_at: string
          excel_url: string | null
          finalizada: boolean
        }
        Insert: {
          id?: string
          data: string
          created_at?: string
          excel_url?: string | null
          finalizada?: boolean
        }
        Update: {
          id?: string
          data?: string
          created_at?: string
          excel_url?: string | null
          finalizada?: boolean
        }
      }
      itens_contagem: {
        Row: {
          id: string
          contagem_id: string
          produto_id: string | null
          nome_livre: string | null
          pallets: number
          lastros: number
          pacotes: number
          unidades: number
          total: number
          created_at: string
        }
        Insert: {
          id?: string
          contagem_id: string
          produto_id?: string | null
          nome_livre?: string | null
          pallets?: number
          lastros?: number
          pacotes?: number
          unidades?: number
          total?: number
          created_at?: string
        }
        Update: {
          id?: string
          contagem_id?: string
          produto_id?: string | null
          nome_livre?: string | null
          pallets?: number
          lastros?: number
          pacotes?: number
          unidades?: number
          total?: number
          created_at?: string
        }
      }
      produtos: {
        Row: {
          id: string
          codigo: string
          nome: string
          unidades_por_pacote: number
          pacotes_por_lastro: number
          lastros_por_pallet: number
          created_at: string
        }
        Insert: {
          id?: string
          codigo: string
          nome: string
          unidades_por_pacote?: number
          pacotes_por_lastro?: number
          lastros_por_pallet?: number
          created_at?: string
        }
        Update: {
          id?: string
          codigo?: string
          nome?: string
          unidades_por_pacote?: number
          pacotes_por_lastro?: number
          lastros_por_pallet?: number
          created_at?: string
        }
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
  }
} 