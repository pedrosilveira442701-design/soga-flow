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
      anotacoes: {
        Row: {
          activity_log: Json | null
          assignee: string | null
          attachments: Json | null
          client_id: string | null
          client_name: string | null
          completed_at: string | null
          created_at: string
          id: string
          note: string | null
          notify_email: boolean | null
          notify_push: boolean | null
          priority: Database["public"]["Enums"]["anotacao_priority"]
          recurrence_rule: string | null
          reminder_datetime: string | null
          reminder_email_sent_at: string | null
          status: Database["public"]["Enums"]["anotacao_status"]
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["anotacao_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_log?: Json | null
          assignee?: string | null
          attachments?: Json | null
          client_id?: string | null
          client_name?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          notify_email?: boolean | null
          notify_push?: boolean | null
          priority?: Database["public"]["Enums"]["anotacao_priority"]
          recurrence_rule?: string | null
          reminder_datetime?: string | null
          reminder_email_sent_at?: string | null
          status?: Database["public"]["Enums"]["anotacao_status"]
          tags?: string[] | null
          title: string
          type?: Database["public"]["Enums"]["anotacao_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_log?: Json | null
          assignee?: string | null
          attachments?: Json | null
          client_id?: string | null
          client_name?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          notify_email?: boolean | null
          notify_push?: boolean | null
          priority?: Database["public"]["Enums"]["anotacao_priority"]
          recurrence_rule?: string | null
          reminder_datetime?: string | null
          reminder_email_sent_at?: string | null
          status?: Database["public"]["Enums"]["anotacao_status"]
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["anotacao_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      anotacoes_saved_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      anotacoes_snoozes: {
        Row: {
          anotacao_id: string
          created_at: string
          id: string
          original_datetime: string
          snoozed_until: string
        }
        Insert: {
          anotacao_id: string
          created_at?: string
          id?: string
          original_datetime: string
          snoozed_until: string
        }
        Update: {
          anotacao_id?: string
          created_at?: string
          id?: string
          original_datetime?: string
          snoozed_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_snoozes_anotacao_id_fkey"
            columns: ["anotacao_id"]
            isOneToOne: false
            referencedRelation: "anotacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivo_downloads: {
        Row: {
          arquivo_id: string
          cliente_nome: string | null
          downloaded_at: string
          entidade: string
          id: string
          nome_arquivo: string
          tipo_arquivo: string | null
          user_id: string
        }
        Insert: {
          arquivo_id: string
          cliente_nome?: string | null
          downloaded_at?: string
          entidade: string
          id?: string
          nome_arquivo: string
          tipo_arquivo?: string | null
          user_id: string
        }
        Update: {
          arquivo_id?: string
          cliente_nome?: string | null
          downloaded_at?: string
          entidade?: string
          id?: string
          nome_arquivo?: string
          tipo_arquivo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      arquivos: {
        Row: {
          created_at: string
          entidade: string
          entidade_id: string
          id: string
          nome: string
          tipo: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entidade: string
          entidade_id: string
          id?: string
          nome: string
          tipo?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          entidade?: string
          entidade_id?: string
          id?: string
          nome?: string
          tipo?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          pais: string | null
          status: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at: string
          endereco?: string | null
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          pais?: string | null
          status?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          pais?: string | null
          status?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contatos: {
        Row: {
          converteu_lead: boolean | null
          created_at: string
          data_hora: string
          id: string
          lead_id: string | null
          nome: string | null
          observacoes: string | null
          origem: string
          tag: Database["public"]["Enums"]["contato_tag"] | null
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          converteu_lead?: boolean | null
          created_at?: string
          data_hora?: string
          id?: string
          lead_id?: string | null
          nome?: string | null
          observacoes?: string | null
          origem: string
          tag?: Database["public"]["Enums"]["contato_tag"] | null
          telefone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          converteu_lead?: boolean | null
          created_at?: string
          data_hora?: string
          id?: string
          lead_id?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string
          tag?: Database["public"]["Enums"]["contato_tag"] | null
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string
          cpf_cnpj: string
          created_at: string
          data_inicio: string
          dia_vencimento: number | null
          forma_pagamento: string
          forma_pagamento_entrada: string | null
          id: string
          margem_pct: number | null
          numero_parcelas: number | null
          observacoes: string | null
          proposta_id: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          updated_at: string
          user_id: string
          valor_entrada: number | null
          valor_negociado: number
        }
        Insert: {
          cliente_id: string
          cpf_cnpj: string
          created_at?: string
          data_inicio: string
          dia_vencimento?: number | null
          forma_pagamento: string
          forma_pagamento_entrada?: string | null
          id?: string
          margem_pct?: number | null
          numero_parcelas?: number | null
          observacoes?: string | null
          proposta_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          updated_at?: string
          user_id: string
          valor_entrada?: number | null
          valor_negociado: number
        }
        Update: {
          cliente_id?: string
          cpf_cnpj?: string
          created_at?: string
          data_inicio?: string
          dia_vencimento?: number | null
          forma_pagamento?: string
          forma_pagamento_entrada?: string | null
          id?: string
          margem_pct?: number | null
          numero_parcelas?: number | null
          observacoes?: string | null
          proposta_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          updated_at?: string
          user_id?: string
          valor_entrada?: number | null
          valor_negociado?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          anotacao_id: string | null
          attempts: number
          body_html: string
          created_at: string
          id: string
          last_error: string | null
          send_at: string
          sent_at: string | null
          subject: string
          to_email: string
        }
        Insert: {
          anotacao_id?: string | null
          attempts?: number
          body_html: string
          created_at?: string
          id?: string
          last_error?: string | null
          send_at?: string
          sent_at?: string | null
          subject: string
          to_email: string
        }
        Update: {
          anotacao_id?: string | null
          attempts?: number
          body_html?: string
          created_at?: string
          id?: string
          last_error?: string | null
          send_at?: string
          sent_at?: string | null
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      email_reminders_queue: {
        Row: {
          body: string
          created_at: string
          error: string | null
          id: string
          send_at: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          error?: string | null
          id?: string
          send_at: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          error?: string | null
          id?: string
          send_at?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financeiro_parcelas: {
        Row: {
          contrato_id: string
          created_at: string
          data_pagamento: string | null
          forma: string | null
          id: string
          numero_parcela: number
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string
          user_id: string
          valor_liquido_parcela: number
          vencimento: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          data_pagamento?: string | null
          forma?: string | null
          id?: string
          numero_parcela: number
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
          user_id: string
          valor_liquido_parcela: number
          vencimento: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          data_pagamento?: string | null
          forma?: string | null
          id?: string
          numero_parcela?: number
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
          user_id?: string
          valor_liquido_parcela?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_parcelas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interacoes: {
        Row: {
          automatica: boolean | null
          created_at: string
          data_hora: string
          id: string
          lead_id: string
          observacao: string | null
          tipo_interacao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          automatica?: boolean | null
          created_at?: string
          data_hora: string
          id?: string
          lead_id: string
          observacao?: string | null
          tipo_interacao: string
          updated_at?: string
          user_id: string
        }
        Update: {
          automatica?: boolean | null
          created_at?: string
          data_hora?: string
          id?: string
          lead_id?: string
          observacao?: string | null
          tipo_interacao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          cliente_id: string | null
          created_at: string
          estagio: Database["public"]["Enums"]["lead_stage"]
          first_response_at: string | null
          first_response_minutes: number | null
          id: string
          medida: number | null
          motivo_perda: string | null
          observacoes: string | null
          origem: string | null
          produtos: Json | null
          responsavel: string | null
          status_changed_at: string | null
          tipo_piso: string | null
          ultima_interacao: string | null
          updated_at: string
          user_id: string
          valor_potencial: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          estagio?: Database["public"]["Enums"]["lead_stage"]
          first_response_at?: string | null
          first_response_minutes?: number | null
          id?: string
          medida?: number | null
          motivo_perda?: string | null
          observacoes?: string | null
          origem?: string | null
          produtos?: Json | null
          responsavel?: string | null
          status_changed_at?: string | null
          tipo_piso?: string | null
          ultima_interacao?: string | null
          updated_at?: string
          user_id: string
          valor_potencial?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          estagio?: Database["public"]["Enums"]["lead_stage"]
          first_response_at?: string | null
          first_response_minutes?: number | null
          id?: string
          medida?: number | null
          motivo_perda?: string | null
          observacoes?: string | null
          origem?: string | null
          produtos?: Json | null
          responsavel?: string | null
          status_changed_at?: string | null
          tipo_piso?: string | null
          ultima_interacao?: string | null
          updated_at?: string
          user_id?: string
          valor_potencial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          created_at: string
          id: string
          periodo_fim: string
          periodo_inicio: string
          progresso: number | null
          responsavel: string | null
          status: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor_alvo: number
        }
        Insert: {
          created_at?: string
          id?: string
          periodo_fim: string
          periodo_inicio: string
          progresso?: number | null
          responsavel?: string | null
          status?: string | null
          tipo: string
          updated_at?: string
          user_id: string
          valor_alvo: number
        }
        Update: {
          created_at?: string
          id?: string
          periodo_fim?: string
          periodo_inicio?: string
          progresso?: number | null
          responsavel?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_alvo?: number
        }
        Relationships: []
      }
      notificacao_preferencias: {
        Row: {
          contrato_email: boolean
          contrato_inapp: boolean
          created_at: string
          email_customizado: string | null
          financeiro_email: boolean
          financeiro_inapp: boolean
          id: string
          lead_email: boolean
          lead_inapp: boolean
          obra_email: boolean
          obra_inapp: boolean
          proposta_email: boolean
          proposta_inapp: boolean
          resumo_diario_hora: string
          resumo_diario_visitas: boolean
          updated_at: string
          user_id: string
          visita_atrasada_email: boolean
          visita_atrasada_inapp: boolean
          visita_email: boolean
          visita_inapp: boolean
        }
        Insert: {
          contrato_email?: boolean
          contrato_inapp?: boolean
          created_at?: string
          email_customizado?: string | null
          financeiro_email?: boolean
          financeiro_inapp?: boolean
          id?: string
          lead_email?: boolean
          lead_inapp?: boolean
          obra_email?: boolean
          obra_inapp?: boolean
          proposta_email?: boolean
          proposta_inapp?: boolean
          resumo_diario_hora?: string
          resumo_diario_visitas?: boolean
          updated_at?: string
          user_id: string
          visita_atrasada_email?: boolean
          visita_atrasada_inapp?: boolean
          visita_email?: boolean
          visita_inapp?: boolean
        }
        Update: {
          contrato_email?: boolean
          contrato_inapp?: boolean
          created_at?: string
          email_customizado?: string | null
          financeiro_email?: boolean
          financeiro_inapp?: boolean
          id?: string
          lead_email?: boolean
          lead_inapp?: boolean
          obra_email?: boolean
          obra_inapp?: boolean
          proposta_email?: boolean
          proposta_inapp?: boolean
          resumo_diario_hora?: string
          resumo_diario_visitas?: boolean
          updated_at?: string
          user_id?: string
          visita_atrasada_email?: boolean
          visita_atrasada_inapp?: boolean
          visita_email?: boolean
          visita_inapp?: boolean
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          agendamento: string
          created_at: string
          descricao: string | null
          email_sent_at: string | null
          entidade: string | null
          entidade_id: string | null
          excluida: boolean
          icone: string | null
          id: string
          lida: boolean
          lida_em: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agendamento?: string
          created_at?: string
          descricao?: string | null
          email_sent_at?: string | null
          entidade?: string | null
          entidade_id?: string | null
          excluida?: boolean
          icone?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agendamento?: string
          created_at?: string
          descricao?: string | null
          email_sent_at?: string | null
          entidade?: string | null
          entidade_id?: string | null
          excluida?: boolean
          icone?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obras: {
        Row: {
          completed_at: string | null
          contrato_id: string
          created_at: string | null
          equipe: Json | null
          fotos: Json | null
          id: string
          marcos: Json | null
          ocorrencias: Json | null
          progresso_pct: number | null
          responsavel_obra: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["obra_status"] | null
          termo_conclusao_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contrato_id: string
          created_at?: string | null
          equipe?: Json | null
          fotos?: Json | null
          id?: string
          marcos?: Json | null
          ocorrencias?: Json | null
          progresso_pct?: number | null
          responsavel_obra?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["obra_status"] | null
          termo_conclusao_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contrato_id?: string
          created_at?: string | null
          equipe?: Json | null
          fotos?: Json | null
          id?: string
          marcos?: Json | null
          ocorrencias?: Json | null
          progresso_pct?: number | null
          responsavel_obra?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["obra_status"] | null
          termo_conclusao_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      propostas: {
        Row: {
          cliente_id: string
          created_at: string
          custo_m2: number
          data: string
          desconto: number | null
          id: string
          lead_id: string | null
          liquido: number | null
          m2: number
          margem_pct: number | null
          observacao: string | null
          servicos: Json | null
          status: string | null
          tipo_piso: string
          updated_at: string
          user_id: string
          valor_m2: number
          valor_total: number | null
          visita_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          custo_m2: number
          data?: string
          desconto?: number | null
          id?: string
          lead_id?: string | null
          liquido?: number | null
          m2: number
          margem_pct?: number | null
          observacao?: string | null
          servicos?: Json | null
          status?: string | null
          tipo_piso: string
          updated_at?: string
          user_id: string
          valor_m2: number
          valor_total?: number | null
          visita_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          custo_m2?: number
          data?: string
          desconto?: number | null
          id?: string
          lead_id?: string | null
          liquido?: number | null
          m2?: number
          margem_pct?: number | null
          observacao?: string | null
          servicos?: Json | null
          status?: string | null
          tipo_piso?: string
          updated_at?: string
          user_id?: string
          valor_m2?: number
          valor_total?: number | null
          visita_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitas: {
        Row: {
          assunto: string
          checklist: Json | null
          cliente_id: string | null
          cliente_manual_name: string | null
          complexidade: number | null
          created_at: string
          data: string | null
          done_at: string | null
          endereco: string | null
          fotos: Json | null
          hora: string | null
          id: string
          lead_id: string | null
          m2_medido: number | null
          marcacao_tipo: string
          observacao: string | null
          realizada: boolean | null
          responsavel: string | null
          status: Database["public"]["Enums"]["visita_status"] | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assunto: string
          checklist?: Json | null
          cliente_id?: string | null
          cliente_manual_name?: string | null
          complexidade?: number | null
          created_at?: string
          data?: string | null
          done_at?: string | null
          endereco?: string | null
          fotos?: Json | null
          hora?: string | null
          id?: string
          lead_id?: string | null
          m2_medido?: number | null
          marcacao_tipo: string
          observacao?: string | null
          realizada?: boolean | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["visita_status"] | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assunto?: string
          checklist?: Json | null
          cliente_id?: string | null
          cliente_manual_name?: string | null
          complexidade?: number | null
          created_at?: string
          data?: string | null
          done_at?: string | null
          endereco?: string | null
          fotos?: Json | null
          hora?: string | null
          id?: string
          lead_id?: string | null
          m2_medido?: number | null
          marcacao_tipo?: string
          observacao?: string | null
          realizada?: boolean | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["visita_status"] | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_anotacao_activity: {
        Args: {
          p_activity_type: string
          p_anotacao_id: string
          p_description: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      anotacao_priority: "baixa" | "media" | "alta"
      anotacao_status: "aberta" | "em_andamento" | "concluida" | "arquivada"
      anotacao_type:
        | "ligacao"
        | "orcamento"
        | "follow_up"
        | "visita"
        | "reuniao"
        | "outro"
      app_role: "admin" | "comercial" | "financeiro" | "visualizador"
      contato_tag: "anuncio" | "descoberta" | "orcamento"
      contract_status: "ativo" | "concluido" | "cancelado"
      lead_stage:
        | "contato"
        | "visita_agendada"
        | "visita_realizada"
        | "proposta_pendente"
        | "proposta"
        | "contrato"
        | "execucao"
        | "finalizado"
        | "perdido"
        | "em_analise"
        | "repouso"
      obra_status:
        | "mobilizacao"
        | "execucao"
        | "acabamento"
        | "concluida"
        | "pausada"
      payment_status: "pendente" | "pago" | "atrasado"
      visita_status: "agendar" | "marcada" | "atrasada" | "concluida"
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
      anotacao_priority: ["baixa", "media", "alta"],
      anotacao_status: ["aberta", "em_andamento", "concluida", "arquivada"],
      anotacao_type: [
        "ligacao",
        "orcamento",
        "follow_up",
        "visita",
        "reuniao",
        "outro",
      ],
      app_role: ["admin", "comercial", "financeiro", "visualizador"],
      contato_tag: ["anuncio", "descoberta", "orcamento"],
      contract_status: ["ativo", "concluido", "cancelado"],
      lead_stage: [
        "contato",
        "visita_agendada",
        "visita_realizada",
        "proposta_pendente",
        "proposta",
        "contrato",
        "execucao",
        "finalizado",
        "perdido",
        "em_analise",
        "repouso",
      ],
      obra_status: [
        "mobilizacao",
        "execucao",
        "acabamento",
        "concluida",
        "pausada",
      ],
      payment_status: ["pendente", "pago", "atrasado"],
      visita_status: ["agendar", "marcada", "atrasada", "concluida"],
    },
  },
} as const
