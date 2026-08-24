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
      asignaciones: {
        Row: {
          activa: boolean
          asignado_por: string
          asistente_id: string
          expediente_id: string
          fecha_asignacion: string
          id: string
        }
        Insert: {
          activa?: boolean
          asignado_por: string
          asistente_id: string
          expediente_id: string
          fecha_asignacion?: string
          id?: string
        }
        Update: {
          activa?: boolean
          asignado_por?: string
          asistente_id?: string
          expediente_id?: string
          fecha_asignacion?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_asistente_id_fkey"
            columns: ["asistente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "vista_embargo_saldos"
            referencedColumns: ["expediente_id"]
          },
        ]
      }
      audiencias: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_audiencia"]
          expediente_id: string
          fecha_limite_calculada: string | null
          fecha_programada: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_audiencia"]
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_audiencia"]
          expediente_id: string
          fecha_limite_calculada?: string | null
          fecha_programada: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_audiencia"]
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_audiencia"]
          expediente_id?: string
          fecha_limite_calculada?: string | null
          fecha_programada?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_audiencia"]
        }
        Relationships: [
          {
            foreignKeyName: "audiencias_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiencias_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "vista_embargo_saldos"
            referencedColumns: ["expediente_id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          created_at: string
          detalle: Json | null
          entidad: string
          entidad_id: string | null
          id: string
          usuario_id: string
        }
        Insert: {
          accion: string
          created_at?: string
          detalle?: Json | null
          entidad: string
          entidad_id?: string | null
          id?: string
          usuario_id: string
        }
        Update: {
          accion?: string
          created_at?: string
          detalle?: Json | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      campos_restringidos: {
        Row: {
          activo: boolean
          created_at: string
          definido_por: string
          entidad: string
          id: number
          motivo: string | null
          nombre_campo: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          definido_por: string
          entidad: string
          id?: number
          motivo?: string | null
          nombre_campo: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          definido_por?: string
          entidad?: string
          id?: number
          motivo?: string | null
          nombre_campo?: string
        }
        Relationships: [
          {
            foreignKeyName: "campos_restringidos_definido_por_fkey"
            columns: ["definido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_sistema: {
        Row: {
          actualizado_por: string | null
          id: number
          modo_validacion_cuantia: string
          plazo_admision_dias: number
          tope_cuantia: number
          umbral_inactividad_dias: number
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          id?: number
          modo_validacion_cuantia?: string
          plazo_admision_dias?: number
          tope_cuantia?: number
          umbral_inactividad_dias?: number
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          id?: number
          modo_validacion_cuantia?: string
          plazo_admision_dias?: number
          tope_cuantia?: number
          umbral_inactividad_dias?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_sistema_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      despachos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          tipo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          archivo_docx_path: string | null
          confirmado_por: string | null
          contenido_texto: string | null
          created_at: string
          culmina_proceso: boolean
          estado: Database["public"]["Enums"]["estado_documento"]
          expediente_id: string
          fecha_confirmacion: string | null
          generado_por: string
          id: string
          motivo_culminacion: string | null
          observaciones_juez: string | null
          tipo_documento_id: number
          updated_at: string
        }
        Insert: {
          archivo_docx_path?: string | null
          confirmado_por?: string | null
          contenido_texto?: string | null
          created_at?: string
          culmina_proceso?: boolean
          estado?: Database["public"]["Enums"]["estado_documento"]
          expediente_id: string
          fecha_confirmacion?: string | null
          generado_por: string
          id?: string
          motivo_culminacion?: string | null
          observaciones_juez?: string | null
          tipo_documento_id: number
          updated_at?: string
        }
        Update: {
          archivo_docx_path?: string | null
          confirmado_por?: string | null
          contenido_texto?: string | null
          created_at?: string
          culmina_proceso?: boolean
          estado?: Database["public"]["Enums"]["estado_documento"]
          expediente_id?: string
          fecha_confirmacion?: string | null
          generado_por?: string
          id?: string
          motivo_culminacion?: string | null
          observaciones_juez?: string | null
          tipo_documento_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_confirmado_por_fkey"
            columns: ["confirmado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "vista_embargo_saldos"
            referencedColumns: ["expediente_id"]
          },
          {
            foreignKeyName: "documentos_generado_por_fkey"
            columns: ["generado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "tipos_documento"
            referencedColumns: ["id"]
          },
        ]
      }
      embargo_abonos: {
        Row: {
          created_at: string
          expediente_id: string
          fecha: string
          id: string
          monto: number
          registrado_por: string
        }
        Insert: {
          created_at?: string
          expediente_id: string
          fecha: string
          id?: string
          monto: number
          registrado_por: string
        }
        Update: {
          created_at?: string
          expediente_id?: string
          fecha?: string
          id?: string
          monto?: number
          registrado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "embargo_abonos_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embargo_abonos_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "vista_embargo_saldos"
            referencedColumns: ["expediente_id"]
          },
          {
            foreignKeyName: "embargo_abonos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_expediente: {
        Row: {
          created_at: string
          detalle: string | null
          expediente_id: string
          fecha_evento: string
          id: string
          registrado_por: string | null
          tipo_evento_id: string
        }
        Insert: {
          created_at?: string
          detalle?: string | null
          expediente_id: string
          fecha_evento: string
          id?: string
          registrado_por?: string | null
          tipo_evento_id: string
        }
        Update: {
          created_at?: string
          detalle?: string | null
          expediente_id?: string
          fecha_evento?: string
          id?: string
          registrado_por?: string | null
          tipo_evento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_expediente_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_expediente_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "vista_embargo_saldos"
            referencedColumns: ["expediente_id"]
          },
          {
            foreignKeyName: "eventos_expediente_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_expediente_tipo_evento_id_fkey"
            columns: ["tipo_evento_id"]
            isOneToOne: false
            referencedRelation: "tipos_evento"
            referencedColumns: ["id"]
          },
        ]
      }
      expediente_fases: {
        Row: {
          expediente_id: string
          fase_id: string
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          observaciones: string | null
        }
        Insert: {
          expediente_id: string
          fase_id: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          observaciones?: string | null
        }
        Update: {
          expediente_id?: string
          fase_id?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expediente_fases_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "expedientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expediente_fases_expediente_id_fkey"
            columns: ["expediente_id"]
            isOneToOne: false
            referencedRelation: "vista_embargo_saldos"
            referencedColumns: ["expediente_id"]
          },
          {
            foreignKeyName: "expediente_fases_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases_proceso"
            referencedColumns: ["id"]
          },
        ]
      }
      expedientes: {
        Row: {
          cerrado: boolean
          cerrado_por: string | null
          created_at: string
          created_by: string
          cuantia: number | null
          despacho_id: string
          documento_cierre_id: string | null
          es_lanzamiento: boolean
          estado_matrimonio: string | null
          fecha_cierre: string | null
          fecha_notificacion_demanda: string | null
          fecha_registro: string
          fisico_electronico: string | null
          id: string
          monto_embargo_decretado: number | null
          motivo_cierre: string | null
          motivo_omision_umbral: string | null
          municipal_circuito: string | null
          notas: string | null
          numero_expediente: string
          omitir_umbral_inactividad: boolean
          pretension: string | null
          subtipo_proceso_id: number | null
          tipo_cierre: string | null
          tipo_proceso_id: number
          updated_at: string
        }
        Insert: {
          cerrado?: boolean
          cerrado_por?: string | null
          created_at?: string
          created_by: string
          cuantia?: number | null
          despacho_id: string
          documento_cierre_id?: string | null
          es_lanzamiento?: boolean
          estado_matrimonio?: string | null
          fecha_cierre?: string | null
          fecha_notificacion_demanda?: string | null
          fecha_registro: string
          fisico_electronico?: string | null
          id?: string
          monto_embargo_decretado?: number | null
          motivo_cierre?: string | null
          motivo_omision_umbral?: string | null
          municipal_circuito?: string | null
          notas?: string | null
          numero_expediente: string
          omitir_umbral_inactividad?: boolean
          pretension?: string | null
          subtipo_proceso_id?: number | null
          tipo_cierre?: string | null
          tipo_proceso_id: number
          updated_at?: string
        }
        Update: {
          cerrado?: boolean
          cerrado_por?: string | null
          created_at?: string
          created_by?: string
          cuantia?: number | null
          despacho_id?: string
          documento_cierre_id?: string | null
          es_lanzamiento?: boolean
          estado_matrimonio?: string | null
          fecha_cierre?: string | null
          fecha_notificacion_demanda?: string | null
          fecha_registro?: string
          fisico_electronico?: string | null
          id?: string
          monto_embargo_decretado?: number | null
          motivo_cierre?: string | null
          motivo_omision_umbral?: string | null
          municipal_circuito?: string | null
          notas?: string | null
          numero_expediente?: string
          omitir_umbral_inactividad?: boolean
          pretension?: string | null
          subtipo_proceso_id?: number | null
          tipo_cierre?: string | null
          tipo_proceso_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expedientes_cerrado_por_fkey"
            columns: ["cerrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_despacho_id_fkey"
            columns: ["despacho_id"]
            isOneToOne: false
            referencedRelation: "despachos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_documento_cierre_id_fkey"
            columns: ["documento_cierre_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_subtipo_proceso_id_fkey"
            columns: ["subtipo_proceso_id"]
            isOneToOne: false
            referencedRelation: "subtipos_proceso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedientes_tipo_proceso_id_fkey"
            columns: ["tipo_proceso_id"]
            isOneToOne: false
            referencedRelation: "tipos_proceso"
            referencedColumns: ["id"]
          },
        ]
      }
      fases_proceso: {
        Row: {
          created_at: string
          es_fase_inicial: boolean
          id: string
          nombre: string
          orden: number
          tipo_proceso_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          es_fase_inicial?: boolean
          id?: string
          nombre: string
          orden: number
          tipo_proceso_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          es_fase_inicial?: boolean
          id?: string
          nombre?: string
          orden?: number
          tipo_proceso_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fases_proceso_tipo_proceso_id_fkey"
            columns: ["tipo_proceso_id"]
            isOneToOne: false
            referencedRelation: "tipos_proceso"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis_config: {
        Row: {
          activo: boolean
          configurado_por: string
          created_at: string
          descripcion: string | null
          entidad_base: Database["public"]["Enums"]["entidad_base_kpi"]
          id: string
          metrica: Database["public"]["Enums"]["metrica_kpi"]
          nombre: string
          umbral_alerta: number | null
          umbral_critico: number | null
          umbral_optimo: number | null
        }
        Insert: {
          activo?: boolean
          configurado_por: string
          created_at?: string
          descripcion?: string | null
          entidad_base: Database["public"]["Enums"]["entidad_base_kpi"]
          id?: string
          metrica: Database["public"]["Enums"]["metrica_kpi"]
          nombre: string
          umbral_alerta?: number | null
          umbral_critico?: number | null
          umbral_optimo?: number | null
        }
        Update: {
          activo?: boolean
          configurado_por?: string
          created_at?: string
          descripcion?: string | null
          entidad_base?: Database["public"]["Enums"]["entidad_base_kpi"]
          id?: string
          metrica?: Database["public"]["Enums"]["metrica_kpi"]
          nombre?: string
          umbral_alerta?: number | null
          umbral_critico?: number | null
          umbral_optimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpis_config_configurado_por_fkey"
            columns: ["configurado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      subtipos_proceso: {
        Row: {
          base_legal: string | null
          id: number
          nombre: string
          plazo_audiencia_fondo_max_dias: number | null
          plazo_audiencia_fondo_min_dias: number | null
          plazo_audiencia_max_dias: number | null
          plazo_audiencia_min_dias: number | null
          tipo_proceso_id: number
        }
        Insert: {
          base_legal?: string | null
          id?: number
          nombre: string
          plazo_audiencia_fondo_max_dias?: number | null
          plazo_audiencia_fondo_min_dias?: number | null
          plazo_audiencia_max_dias?: number | null
          plazo_audiencia_min_dias?: number | null
          tipo_proceso_id: number
        }
        Update: {
          base_legal?: string | null
          id?: number
          nombre?: string
          plazo_audiencia_fondo_max_dias?: number | null
          plazo_audiencia_fondo_min_dias?: number | null
          plazo_audiencia_max_dias?: number | null
          plazo_audiencia_min_dias?: number | null
          tipo_proceso_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "subtipos_proceso_tipo_proceso_id_fkey"
            columns: ["tipo_proceso_id"]
            isOneToOne: false
            referencedRelation: "tipos_proceso"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_documento: {
        Row: {
          base_legal: string | null
          categoria: Database["public"]["Enums"]["categoria_documento"]
          id: number
          nombre: string
          requiere_motivacion: boolean
        }
        Insert: {
          base_legal?: string | null
          categoria: Database["public"]["Enums"]["categoria_documento"]
          id?: number
          nombre: string
          requiere_motivacion?: boolean
        }
        Update: {
          base_legal?: string | null
          categoria?: Database["public"]["Enums"]["categoria_documento"]
          id?: number
          nombre?: string
          requiere_motivacion?: boolean
        }
        Relationships: []
      }
      tipos_evento: {
        Row: {
          alimenta: string
          codigo: string
          created_at: string
          es_generado_por_sistema: boolean
          id: string
          nombre: string
          tipo_proceso_id: number | null
        }
        Insert: {
          alimenta: string
          codigo: string
          created_at?: string
          es_generado_por_sistema?: boolean
          id?: string
          nombre: string
          tipo_proceso_id?: number | null
        }
        Update: {
          alimenta?: string
          codigo?: string
          created_at?: string
          es_generado_por_sistema?: boolean
          id?: string
          nombre?: string
          tipo_proceso_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tipos_evento_tipo_proceso_id_fkey"
            columns: ["tipo_proceso_id"]
            isOneToOne: false
            referencedRelation: "tipos_proceso"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_proceso: {
        Row: {
          base_legal: string | null
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          base_legal?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          base_legal?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          activo: boolean
          auth_user_id: string
          created_at: string
          despacho_id: string
          id: string
          nombre_completo: string
          rol: Database["public"]["Enums"]["rol_gdc"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          auth_user_id: string
          created_at?: string
          despacho_id: string
          id?: string
          nombre_completo: string
          rol: Database["public"]["Enums"]["rol_gdc"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          auth_user_id?: string
          created_at?: string
          despacho_id?: string
          id?: string
          nombre_completo?: string
          rol?: Database["public"]["Enums"]["rol_gdc"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_despacho_id_fkey"
            columns: ["despacho_id"]
            isOneToOne: false
            referencedRelation: "despachos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vista_embargo_saldos: {
        Row: {
          expediente_id: string | null
          monto_embargo_decretado: number | null
          saldo_pendiente: number | null
          total_abonado: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_expediente_asignado: {
        Args: { p_expediente_id: string }
        Returns: boolean
      }
      fn_usuario_despacho: { Args: never; Returns: string }
      fn_usuario_id: { Args: never; Returns: string }
      fn_usuario_rol: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_gdc"]
      }
    }
    Enums: {
      categoria_documento: "resolucion_judicial" | "comunicacion"
      entidad_base_kpi: "expediente" | "documento" | "audiencia"
      estado_audiencia:
        | "programada"
        | "celebrada"
        | "suspendida"
        | "continuada"
        | "terminada_por_incomparecencia"
      estado_documento: "generado" | "validado" | "en_correccion" | "confirmado"
      metrica_kpi: "conteo" | "porcentaje_cumplimiento" | "promedio_dias"
      rol_gdc: "juez" | "asistente" | "analista_datos" | "administrador"
      tipo_audiencia: "preliminar" | "fondo"
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
      categoria_documento: ["resolucion_judicial", "comunicacion"],
      entidad_base_kpi: ["expediente", "documento", "audiencia"],
      estado_audiencia: [
        "programada",
        "celebrada",
        "suspendida",
        "continuada",
        "terminada_por_incomparecencia",
      ],
      estado_documento: ["generado", "validado", "en_correccion", "confirmado"],
      metrica_kpi: ["conteo", "porcentaje_cumplimiento", "promedio_dias"],
      rol_gdc: ["juez", "asistente", "analista_datos", "administrador"],
      tipo_audiencia: ["preliminar", "fondo"],
    },
  },
} as const
