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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_user: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          is_active: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          is_active?: boolean | null
          role?: string
          user_id?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          is_active?: boolean | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      base_media: {
        Row: {
          base_media_id: string
          code: string
          created_at: string | null
          description: string | null
          is_active: boolean | null
          name: string
          phenol_red_flag: boolean | null
          sds_component_id: string | null
        }
        Insert: {
          base_media_id?: string
          code: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name: string
          phenol_red_flag?: boolean | null
          sds_component_id?: string | null
        }
        Update: {
          base_media_id?: string
          code?: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name?: string
          phenol_red_flag?: boolean | null
          sds_component_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "base_media_sds_component_id_fkey"
            columns: ["sds_component_id"]
            isOneToOne: false
            referencedRelation: "sds_component"
            referencedColumns: ["sds_component_id"]
          },
        ]
      }
      cell_type: {
        Row: {
          cell_type_code: string
          created_at: string | null
          description: string | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          cell_type_code: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          cell_type_code?: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      cm_lot: {
        Row: {
          base_product_code: string
          cm_lot_id: string
          collection_end_at: string | null
          collection_start_at: string | null
          created_at: string | null
          created_by: string | null
          frozen_spec: Json | null
          media_spec_id: string | null
          mode: string
          notes: string | null
          request_line_id: string | null
          status: string
        }
        Insert: {
          base_product_code: string
          cm_lot_id: string
          collection_end_at?: string | null
          collection_start_at?: string | null
          created_at?: string | null
          created_by?: string | null
          frozen_spec?: Json | null
          media_spec_id?: string | null
          mode?: string
          notes?: string | null
          request_line_id?: string | null
          status?: string
        }
        Update: {
          base_product_code?: string
          cm_lot_id?: string
          collection_end_at?: string | null
          collection_start_at?: string | null
          created_at?: string | null
          created_by?: string | null
          frozen_spec?: Json | null
          media_spec_id?: string | null
          mode?: string
          notes?: string | null
          request_line_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_lot_request_line_id_fkey"
            columns: ["request_line_id"]
            isOneToOne: false
            referencedRelation: "request_line"
            referencedColumns: ["request_line_id"]
          },
        ]
      }
      cm_process_method: {
        Row: {
          characteristics_json: Json | null
          code: string | null
          created_at: string | null
          description: string | null
          is_active: boolean | null
          method_id: string
          method_type: string
          name: string
        }
        Insert: {
          characteristics_json?: Json | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          method_id?: string
          method_type: string
          name: string
        }
        Update: {
          characteristics_json?: Json | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          method_id?: string
          method_type?: string
          name?: string
        }
        Relationships: []
      }
      cm_qa_release_decision: {
        Row: {
          cm_lot_id: string
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string
          decision_id: string
          expiry_date: string | null
          qa_release_date: string | null
          reason: string | null
          shelf_life_days: number
        }
        Insert: {
          cm_lot_id: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision: string
          decision_id?: string
          expiry_date?: string | null
          qa_release_date?: string | null
          reason?: string | null
          shelf_life_days: number
        }
        Update: {
          cm_lot_id?: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_id?: string
          expiry_date?: string | null
          qa_release_date?: string | null
          reason?: string | null
          shelf_life_days?: number
        }
        Relationships: []
      }
      cm_qc_request: {
        Row: {
          checkpoint_code: string
          cm_lot_id: string
          created_at: string | null
          qc_request_id: string
          qc_type: string
          requested_at: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          checkpoint_code: string
          cm_lot_id: string
          created_at?: string | null
          qc_request_id?: string
          qc_type?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          checkpoint_code?: string
          cm_lot_id?: string
          created_at?: string | null
          qc_request_id?: string
          qc_type?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: []
      }
      cm_qc_result: {
        Row: {
          created_at: string | null
          pass_fail: string | null
          qc_request_id: string
          qc_result_id: string
          report_ref: string | null
          result_value: string | null
          test_code: string
          tested_at: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          pass_fail?: string | null
          qc_request_id: string
          qc_result_id?: string
          report_ref?: string | null
          result_value?: string | null
          test_code: string
          tested_at?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          pass_fail?: string | null
          qc_request_id?: string
          qc_result_id?: string
          report_ref?: string | null
          result_value?: string | null
          test_code?: string
          tested_at?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      cm_sampling_event: {
        Row: {
          checkpoint_code: string
          cm_lot_id: string
          created_at: string | null
          notes: string | null
          operator_user_id: string | null
          sample_volume_ml: number | null
          sampled_at: string | null
          sampling_event_id: string
        }
        Insert: {
          checkpoint_code: string
          cm_lot_id: string
          created_at?: string | null
          notes?: string | null
          operator_user_id?: string | null
          sample_volume_ml?: number | null
          sampled_at?: string | null
          sampling_event_id?: string
        }
        Update: {
          checkpoint_code?: string
          cm_lot_id?: string
          created_at?: string | null
          notes?: string | null
          operator_user_id?: string | null
          sample_volume_ml?: number | null
          sampled_at?: string | null
          sampling_event_id?: string
        }
        Relationships: []
      }
      collection_event: {
        Row: {
          cm_lot_id: string
          collected_at: string | null
          collection_id: string
          confluence_end_percent: number | null
          confluence_start_percent: number | null
          created_at: string | null
          cultivation_day: number | null
          culture_id: string
          enrichment_end_date: string | null
          enrichment_start_date: string | null
          media_prep_journal_date: string
          media_prep_journal_no: string
          media_spec_id: string
          morphology: string | null
          notes: string | null
          operator_user_id: string | null
          passage_no: number
          target_container_id: string
          vessel_format_id: string | null
          volume_ml: number
        }
        Insert: {
          cm_lot_id: string
          collected_at?: string | null
          collection_id?: string
          confluence_end_percent?: number | null
          confluence_start_percent?: number | null
          created_at?: string | null
          cultivation_day?: number | null
          culture_id: string
          enrichment_end_date?: string | null
          enrichment_start_date?: string | null
          media_prep_journal_date: string
          media_prep_journal_no: string
          media_spec_id: string
          morphology?: string | null
          notes?: string | null
          operator_user_id?: string | null
          passage_no: number
          target_container_id: string
          vessel_format_id?: string | null
          volume_ml: number
        }
        Update: {
          cm_lot_id?: string
          collected_at?: string | null
          collection_id?: string
          confluence_end_percent?: number | null
          confluence_start_percent?: number | null
          created_at?: string | null
          cultivation_day?: number | null
          culture_id?: string
          enrichment_end_date?: string | null
          enrichment_start_date?: string | null
          media_prep_journal_date?: string
          media_prep_journal_no?: string
          media_spec_id?: string
          morphology?: string | null
          notes?: string | null
          operator_user_id?: string | null
          passage_no?: number
          target_container_id?: string
          vessel_format_id?: string | null
          volume_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_event_vessel_format_id_fkey"
            columns: ["vessel_format_id"]
            isOneToOne: false
            referencedRelation: "pack_format"
            referencedColumns: ["pack_format_code"]
          },
        ]
      }
      collection_vessel_item: {
        Row: {
          area_value: number | null
          collection_id: string
          created_at: string | null
          qty: number
          vessel_item_id: string
          vessel_type: string
        }
        Insert: {
          area_value?: number | null
          collection_id: string
          created_at?: string | null
          qty?: number
          vessel_item_id?: string
          vessel_type: string
        }
        Update: {
          area_value?: number | null
          collection_id?: string
          created_at?: string | null
          qty?: number
          vessel_item_id?: string
          vessel_type?: string
        }
        Relationships: []
      }
      container: {
        Row: {
          container_id: string
          container_type: string
          created_at: string | null
          current_qty: number | null
          current_volume_ml: number | null
          label_printed_at: string | null
          nominal_volume_ml: number | null
          owner_entity_type: string
          owner_id: string
          status: string
        }
        Insert: {
          container_id?: string
          container_type: string
          created_at?: string | null
          current_qty?: number | null
          current_volume_ml?: number | null
          label_printed_at?: string | null
          nominal_volume_ml?: number | null
          owner_entity_type: string
          owner_id: string
          status?: string
        }
        Update: {
          container_id?: string
          container_type?: string
          created_at?: string | null
          current_qty?: number | null
          current_volume_ml?: number | null
          label_printed_at?: string | null
          nominal_volume_ml?: number | null
          owner_entity_type?: string
          owner_id?: string
          status?: string
        }
        Relationships: []
      }
      culture: {
        Row: {
          cell_type_code: string
          created_at: string | null
          culture_id: string
          culture_journal_ref: string | null
          donor_ref: string | null
          status: string
          status_note: string | null
          tissue_list: Json | null
        }
        Insert: {
          cell_type_code: string
          created_at?: string | null
          culture_id: string
          culture_journal_ref?: string | null
          donor_ref?: string | null
          status?: string
          status_note?: string | null
          tissue_list?: Json | null
        }
        Update: {
          cell_type_code?: string
          created_at?: string | null
          culture_id?: string
          culture_journal_ref?: string | null
          donor_ref?: string | null
          status?: string
          status_note?: string | null
          tissue_list?: Json | null
        }
        Relationships: []
      }
      generated_document: {
        Row: {
          created_at: string | null
          doc_id: string
          doc_type: string
          entity_id: string
          entity_type: string
          generated_at: string | null
          generated_by: string | null
          snapshot_json: Json | null
          template_version: string | null
        }
        Insert: {
          created_at?: string | null
          doc_id?: string
          doc_type: string
          entity_id: string
          entity_type: string
          generated_at?: string | null
          generated_by?: string | null
          snapshot_json?: Json | null
          template_version?: string | null
        }
        Update: {
          created_at?: string | null
          doc_id?: string
          doc_type?: string
          entity_id?: string
          entity_type?: string
          generated_at?: string | null
          generated_by?: string | null
          snapshot_json?: Json | null
          template_version?: string | null
        }
        Relationships: []
      }
      infection_test_result: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          infection_type_id: string | null
          notes: string | null
          result: string
          result_id: string
          test_date: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          infection_type_id?: string | null
          notes?: string | null
          result: string
          result_id?: string
          test_date: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          infection_type_id?: string | null
          notes?: string | null
          result?: string
          result_id?: string
          test_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "infection_test_result_infection_type_id_fkey"
            columns: ["infection_type_id"]
            isOneToOne: false
            referencedRelation: "infection_type"
            referencedColumns: ["infection_type_id"]
          },
        ]
      }
      infection_type: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          infection_type_id: string
          is_active: boolean | null
          name: string
          test_method: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          infection_type_id?: string
          is_active?: boolean | null
          name: string
          test_method?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          infection_type_id?: string
          is_active?: boolean | null
          name?: string
          test_method?: string | null
        }
        Relationships: []
      }
      label_print_log: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          label_format: string | null
          log_id: string
          notes: string | null
          printed_at: string | null
          printed_by: string | null
          qty_printed: number
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          label_format?: string | null
          log_id?: string
          notes?: string | null
          printed_at?: string | null
          printed_by?: string | null
          qty_printed?: number
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          label_format?: string | null
          log_id?: string
          notes?: string | null
          printed_at?: string | null
          printed_by?: string | null
          qty_printed?: number
        }
        Relationships: []
      }
      media_additive: {
        Row: {
          additive_id: string
          additive_type: string | null
          code: string
          created_at: string | null
          default_concentration: number | null
          description: string | null
          is_active: boolean | null
          name: string
          sds_component_id: string | null
          unit: string | null
        }
        Insert: {
          additive_id?: string
          additive_type?: string | null
          code: string
          created_at?: string | null
          default_concentration?: number | null
          description?: string | null
          is_active?: boolean | null
          name: string
          sds_component_id?: string | null
          unit?: string | null
        }
        Update: {
          additive_id?: string
          additive_type?: string | null
          code?: string
          created_at?: string | null
          default_concentration?: number | null
          description?: string | null
          is_active?: boolean | null
          name?: string
          sds_component_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_additive_sds_component_id_fkey"
            columns: ["sds_component_id"]
            isOneToOne: false
            referencedRelation: "sds_component"
            referencedColumns: ["sds_component_id"]
          },
        ]
      }
      media_compatibility_spec: {
        Row: {
          base_media_id: string | null
          base_medium_code: string | null
          created_at: string | null
          description: string | null
          media_spec_id: string
          name: string | null
          notes: string | null
          phenol_red_flag: boolean
          serum_class: string
        }
        Insert: {
          base_media_id?: string | null
          base_medium_code?: string | null
          created_at?: string | null
          description?: string | null
          media_spec_id?: string
          name?: string | null
          notes?: string | null
          phenol_red_flag?: boolean
          serum_class: string
        }
        Update: {
          base_media_id?: string | null
          base_medium_code?: string | null
          created_at?: string | null
          description?: string | null
          media_spec_id?: string
          name?: string | null
          notes?: string | null
          phenol_red_flag?: boolean
          serum_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_compatibility_spec_base_media_id_fkey"
            columns: ["base_media_id"]
            isOneToOne: false
            referencedRelation: "base_media"
            referencedColumns: ["base_media_id"]
          },
        ]
      }
      media_spec_additives: {
        Row: {
          additive_id: string | null
          concentration: number | null
          created_at: string | null
          id: string
          media_spec_id: string | null
        }
        Insert: {
          additive_id?: string | null
          concentration?: number | null
          created_at?: string | null
          id?: string
          media_spec_id?: string | null
        }
        Update: {
          additive_id?: string | null
          concentration?: number | null
          created_at?: string | null
          id?: string
          media_spec_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_spec_additives_additive_id_fkey"
            columns: ["additive_id"]
            isOneToOne: false
            referencedRelation: "media_additive"
            referencedColumns: ["additive_id"]
          },
          {
            foreignKeyName: "media_spec_additives_media_spec_id_fkey"
            columns: ["media_spec_id"]
            isOneToOne: false
            referencedRelation: "media_compatibility_spec"
            referencedColumns: ["media_spec_id"]
          },
        ]
      }
      pack_format: {
        Row: {
          container_type: string | null
          created_at: string | null
          description: string | null
          is_active: boolean | null
          name: string
          nominal_fill_volume_ml: number
          pack_format_code: string
          purpose: string | null
        }
        Insert: {
          container_type?: string | null
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name: string
          nominal_fill_volume_ml: number
          pack_format_code: string
          purpose?: string | null
        }
        Update: {
          container_type?: string | null
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          name?: string
          nominal_fill_volume_ml?: number
          pack_format_code?: string
          purpose?: string | null
        }
        Relationships: []
      }
      pack_lot: {
        Row: {
          created_at: string | null
          created_by: string | null
          filling_completed_at: string | null
          filling_started_at: string | null
          has_lyophilization: boolean | null
          notes: string | null
          pack_format_code: string
          pack_lot_id: string
          packed_at: string | null
          qty_planned: number
          qty_produced: number | null
          request_line_id: string | null
          source_cm_lot_id: string
          status: string
          total_filled_volume_ml: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          filling_completed_at?: string | null
          filling_started_at?: string | null
          has_lyophilization?: boolean | null
          notes?: string | null
          pack_format_code: string
          pack_lot_id: string
          packed_at?: string | null
          qty_planned: number
          qty_produced?: number | null
          request_line_id?: string | null
          source_cm_lot_id: string
          status?: string
          total_filled_volume_ml?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          filling_completed_at?: string | null
          filling_started_at?: string | null
          has_lyophilization?: boolean | null
          notes?: string | null
          pack_format_code?: string
          pack_lot_id?: string
          packed_at?: string | null
          qty_planned?: number
          qty_produced?: number | null
          request_line_id?: string | null
          source_cm_lot_id?: string
          status?: string
          total_filled_volume_ml?: number | null
        }
        Relationships: []
      }
      pack_process_method: {
        Row: {
          characteristics_json: Json | null
          created_at: string | null
          description: string | null
          is_active: boolean | null
          method_id: string
          method_type: string
          name: string
        }
        Insert: {
          characteristics_json?: Json | null
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          method_id?: string
          method_type: string
          name: string
        }
        Update: {
          characteristics_json?: Json | null
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          method_id?: string
          method_type?: string
          name?: string
        }
        Relationships: []
      }
      pack_qa_release_decision: {
        Row: {
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string
          decision_id: string
          pack_lot_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision: string
          decision_id?: string
          pack_lot_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_id?: string
          pack_lot_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      pack_qc_request: {
        Row: {
          checkpoint_code: string
          created_at: string | null
          pack_lot_id: string
          qc_request_id: string
          qc_type: string
          requested_at: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          checkpoint_code: string
          created_at?: string | null
          pack_lot_id: string
          qc_request_id?: string
          qc_type?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          checkpoint_code?: string
          created_at?: string | null
          pack_lot_id?: string
          qc_request_id?: string
          qc_type?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: []
      }
      pack_qc_result: {
        Row: {
          created_at: string | null
          pass_fail: string | null
          qc_request_id: string
          qc_result_id: string
          report_ref: string | null
          result_value: string | null
          test_code: string
          tested_at: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          pass_fail?: string | null
          qc_request_id: string
          qc_result_id?: string
          report_ref?: string | null
          result_value?: string | null
          test_code: string
          tested_at?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          pass_fail?: string | null
          qc_request_id?: string
          qc_result_id?: string
          report_ref?: string | null
          result_value?: string | null
          test_code?: string
          tested_at?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      pack_sampling_event: {
        Row: {
          checkpoint_code: string
          created_at: string | null
          notes: string | null
          operator_user_id: string | null
          pack_lot_id: string
          sample_qty_units: number | null
          sampled_at: string | null
          sampling_event_id: string
        }
        Insert: {
          checkpoint_code: string
          created_at?: string | null
          notes?: string | null
          operator_user_id?: string | null
          pack_lot_id: string
          sample_qty_units?: number | null
          sampled_at?: string | null
          sampling_event_id?: string
        }
        Update: {
          checkpoint_code?: string
          created_at?: string | null
          notes?: string | null
          operator_user_id?: string | null
          pack_lot_id?: string
          sample_qty_units?: number | null
          sampled_at?: string | null
          sampling_event_id?: string
        }
        Relationships: []
      }
      processing_step: {
        Row: {
          cm_lot_id: string
          created_at: string | null
          cycle_no: number | null
          ended_at: string | null
          input_volume_ml: number | null
          method_id: string
          notes: string | null
          operator_user_id: string | null
          output_volume_ml: number | null
          parameters_json: Json | null
          processing_step_id: string
          started_at: string
        }
        Insert: {
          cm_lot_id: string
          created_at?: string | null
          cycle_no?: number | null
          ended_at?: string | null
          input_volume_ml?: number | null
          method_id: string
          notes?: string | null
          operator_user_id?: string | null
          output_volume_ml?: number | null
          parameters_json?: Json | null
          processing_step_id?: string
          started_at?: string
        }
        Update: {
          cm_lot_id?: string
          created_at?: string | null
          cycle_no?: number | null
          ended_at?: string | null
          input_volume_ml?: number | null
          method_id?: string
          notes?: string | null
          operator_user_id?: string | null
          output_volume_ml?: number | null
          parameters_json?: Json | null
          processing_step_id?: string
          started_at?: string
        }
        Relationships: []
      }
      product: {
        Row: {
          additional_qc_allowed: boolean | null
          additional_qc_default: boolean | null
          allowed_cell_types: Json | null
          created_at: string | null
          default_pack_format_code: string | null
          default_postprocess_methods: Json | null
          default_primary_qc: Json | null
          default_product_qc: Json | null
          default_raw_processing: Json | null
          description: string | null
          frozen_spec: Json | null
          is_active: boolean | null
          mechanism_of_action: string | null
          media_spec_id: string | null
          product_code: string
          product_name: string
          product_type: string
          product_type_for_sale: string | null
          shelf_life_days_default: number | null
        }
        Insert: {
          additional_qc_allowed?: boolean | null
          additional_qc_default?: boolean | null
          allowed_cell_types?: Json | null
          created_at?: string | null
          default_pack_format_code?: string | null
          default_postprocess_methods?: Json | null
          default_primary_qc?: Json | null
          default_product_qc?: Json | null
          default_raw_processing?: Json | null
          description?: string | null
          frozen_spec?: Json | null
          is_active?: boolean | null
          mechanism_of_action?: string | null
          media_spec_id?: string | null
          product_code: string
          product_name: string
          product_type: string
          product_type_for_sale?: string | null
          shelf_life_days_default?: number | null
        }
        Update: {
          additional_qc_allowed?: boolean | null
          additional_qc_default?: boolean | null
          allowed_cell_types?: Json | null
          created_at?: string | null
          default_pack_format_code?: string | null
          default_postprocess_methods?: Json | null
          default_primary_qc?: Json | null
          default_product_qc?: Json | null
          default_raw_processing?: Json | null
          description?: string | null
          frozen_spec?: Json | null
          is_active?: boolean | null
          mechanism_of_action?: string | null
          media_spec_id?: string | null
          product_code?: string
          product_name?: string
          product_type?: string
          product_type_for_sale?: string | null
          shelf_life_days_default?: number | null
        }
        Relationships: []
      }
      qc_test_type: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          is_active: boolean | null
          method: string | null
          name: string
          norm_max: number | null
          norm_min: number | null
          unit: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          method?: string | null
          name: string
          norm_max?: number | null
          norm_min?: number | null
          unit?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          method?: string | null
          name?: string
          norm_max?: number | null
          norm_min?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      request: {
        Row: {
          completion_note: string | null
          created_at: string | null
          created_by: string | null
          customer_ref: string | null
          due_date: string | null
          extra_primary_qc: Json | null
          frozen_spec: Json | null
          notes: string | null
          parent_request_id: string | null
          postprocess_methods: Json | null
          postprocess_qc: Json | null
          product_code: string | null
          request_id: string
          reserved_cm_lot_id: string | null
          status: string
        }
        Insert: {
          completion_note?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_ref?: string | null
          due_date?: string | null
          extra_primary_qc?: Json | null
          frozen_spec?: Json | null
          notes?: string | null
          parent_request_id?: string | null
          postprocess_methods?: Json | null
          postprocess_qc?: Json | null
          product_code?: string | null
          request_id: string
          reserved_cm_lot_id?: string | null
          status?: string
        }
        Update: {
          completion_note?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_ref?: string | null
          due_date?: string | null
          extra_primary_qc?: Json | null
          frozen_spec?: Json | null
          notes?: string | null
          parent_request_id?: string | null
          postprocess_methods?: Json | null
          postprocess_qc?: Json | null
          product_code?: string | null
          request_id?: string
          reserved_cm_lot_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["product_code"]
          },
          {
            foreignKeyName: "request_reserved_cm_lot_id_fkey"
            columns: ["reserved_cm_lot_id"]
            isOneToOne: false
            referencedRelation: "cm_lot"
            referencedColumns: ["cm_lot_id"]
          },
        ]
      }
      request_line: {
        Row: {
          additional_qc_required: boolean | null
          created_at: string | null
          dls_required: boolean | null
          finished_product_code: string
          lal_required: boolean | null
          notes: string | null
          pack_format_code: string
          partial_status: string | null
          qty_fulfilled: number | null
          qty_units: number
          request_id: string
          request_line_id: string
          source_type: string | null
          status: string | null
          sterility_required: boolean | null
        }
        Insert: {
          additional_qc_required?: boolean | null
          created_at?: string | null
          dls_required?: boolean | null
          finished_product_code: string
          lal_required?: boolean | null
          notes?: string | null
          pack_format_code: string
          partial_status?: string | null
          qty_fulfilled?: number | null
          qty_units: number
          request_id: string
          request_line_id?: string
          source_type?: string | null
          status?: string | null
          sterility_required?: boolean | null
        }
        Update: {
          additional_qc_required?: boolean | null
          created_at?: string | null
          dls_required?: boolean | null
          finished_product_code?: string
          lal_required?: boolean | null
          notes?: string | null
          pack_format_code?: string
          partial_status?: string | null
          qty_fulfilled?: number | null
          qty_units?: number
          request_id?: string
          request_line_id?: string
          source_type?: string | null
          status?: string | null
          sterility_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_request_line_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request"
            referencedColumns: ["request_id"]
          },
        ]
      }
      reservation: {
        Row: {
          cm_lot_id: string
          created_at: string | null
          notes: string | null
          request_line_id: string | null
          reservation_id: string
          reserved_at: string | null
          reserved_by: string | null
          reserved_volume_ml: number
          status: string
        }
        Insert: {
          cm_lot_id: string
          created_at?: string | null
          notes?: string | null
          request_line_id?: string | null
          reservation_id?: string
          reserved_at?: string | null
          reserved_by?: string | null
          reserved_volume_ml: number
          status?: string
        }
        Update: {
          cm_lot_id?: string
          created_at?: string | null
          notes?: string | null
          request_line_id?: string | null
          reservation_id?: string
          reserved_at?: string | null
          reserved_by?: string | null
          reserved_volume_ml?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservation_cm_lot"
            columns: ["cm_lot_id"]
            isOneToOne: false
            referencedRelation: "cm_lot"
            referencedColumns: ["cm_lot_id"]
          },
          {
            foreignKeyName: "fk_reservation_request_line"
            columns: ["request_line_id"]
            isOneToOne: false
            referencedRelation: "request_line"
            referencedColumns: ["request_line_id"]
          },
        ]
      }
      sds_component: {
        Row: {
          boiling_point: string | null
          cas_number: string | null
          cleanup_methods: string | null
          color: string | null
          component_name: string
          composition_info: string | null
          created_at: string | null
          decomposition_products: string | null
          disposal_methods: string | null
          ecological_info: string | null
          emergency_phone: string | null
          environmental_precautions: string | null
          exposure_limits: string | null
          extinguishing_media: string | null
          fire_hazards: string | null
          first_aid_measures: string | null
          flash_point: string | null
          hazard_classification: string | null
          incompatible_materials: string | null
          label_elements: string | null
          media_spec_id: string | null
          melting_point: string | null
          odor: string | null
          other_hazards: string | null
          other_info: string | null
          other_properties: Json | null
          packing_group: string | null
          personal_precautions: string | null
          personal_protection: string | null
          ph: string | null
          physical_state: string | null
          product_identifier: string | null
          regulatory_info: string | null
          revision_date: string | null
          safe_handling: string | null
          sds_component_id: string
          stability_info: string | null
          storage_conditions: string | null
          supplier_details: string | null
          symptoms_effects: string | null
          toxicological_info: string | null
          transport_class: string | null
          transport_info: string | null
          un_number: string | null
        }
        Insert: {
          boiling_point?: string | null
          cas_number?: string | null
          cleanup_methods?: string | null
          color?: string | null
          component_name: string
          composition_info?: string | null
          created_at?: string | null
          decomposition_products?: string | null
          disposal_methods?: string | null
          ecological_info?: string | null
          emergency_phone?: string | null
          environmental_precautions?: string | null
          exposure_limits?: string | null
          extinguishing_media?: string | null
          fire_hazards?: string | null
          first_aid_measures?: string | null
          flash_point?: string | null
          hazard_classification?: string | null
          incompatible_materials?: string | null
          label_elements?: string | null
          media_spec_id?: string | null
          melting_point?: string | null
          odor?: string | null
          other_hazards?: string | null
          other_info?: string | null
          other_properties?: Json | null
          packing_group?: string | null
          personal_precautions?: string | null
          personal_protection?: string | null
          ph?: string | null
          physical_state?: string | null
          product_identifier?: string | null
          regulatory_info?: string | null
          revision_date?: string | null
          safe_handling?: string | null
          sds_component_id?: string
          stability_info?: string | null
          storage_conditions?: string | null
          supplier_details?: string | null
          symptoms_effects?: string | null
          toxicological_info?: string | null
          transport_class?: string | null
          transport_info?: string | null
          un_number?: string | null
        }
        Update: {
          boiling_point?: string | null
          cas_number?: string | null
          cleanup_methods?: string | null
          color?: string | null
          component_name?: string
          composition_info?: string | null
          created_at?: string | null
          decomposition_products?: string | null
          disposal_methods?: string | null
          ecological_info?: string | null
          emergency_phone?: string | null
          environmental_precautions?: string | null
          exposure_limits?: string | null
          extinguishing_media?: string | null
          fire_hazards?: string | null
          first_aid_measures?: string | null
          flash_point?: string | null
          hazard_classification?: string | null
          incompatible_materials?: string | null
          label_elements?: string | null
          media_spec_id?: string | null
          melting_point?: string | null
          odor?: string | null
          other_hazards?: string | null
          other_info?: string | null
          other_properties?: Json | null
          packing_group?: string | null
          personal_precautions?: string | null
          personal_protection?: string | null
          ph?: string | null
          physical_state?: string | null
          product_identifier?: string | null
          regulatory_info?: string | null
          revision_date?: string | null
          safe_handling?: string | null
          sds_component_id?: string
          stability_info?: string | null
          storage_conditions?: string | null
          supplier_details?: string | null
          symptoms_effects?: string | null
          toxicological_info?: string | null
          transport_class?: string | null
          transport_info?: string | null
          un_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sds_component_media_spec_id_fkey"
            columns: ["media_spec_id"]
            isOneToOne: false
            referencedRelation: "media_compatibility_spec"
            referencedColumns: ["media_spec_id"]
          },
        ]
      }
      sds_media: {
        Row: {
          created_at: string | null
          custom_overrides: Json | null
          media_spec_id: string | null
          revision_date: string | null
          sds_data: Json | null
          sds_media_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_overrides?: Json | null
          media_spec_id?: string | null
          revision_date?: string | null
          sds_data?: Json | null
          sds_media_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_overrides?: Json | null
          media_spec_id?: string | null
          revision_date?: string | null
          sds_data?: Json | null
          sds_media_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sds_media_media_spec_id_fkey"
            columns: ["media_spec_id"]
            isOneToOne: false
            referencedRelation: "media_compatibility_spec"
            referencedColumns: ["media_spec_id"]
          },
        ]
      }
      shipment: {
        Row: {
          created_at: string | null
          notes: string | null
          pack_lot_id: string
          qty_shipped: number
          shipment_id: string
          shipped_at: string | null
          shipped_by: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          notes?: string | null
          pack_lot_id: string
          qty_shipped: number
          shipment_id: string
          shipped_at?: string | null
          shipped_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          notes?: string | null
          pack_lot_id?: string
          qty_shipped?: number
          shipment_id?: string
          shipped_at?: string | null
          shipped_by?: string | null
          status?: string
        }
        Relationships: []
      }
      stock_movement: {
        Row: {
          container_id: string
          created_at: string | null
          direction: string
          item_type: string
          moved_at: string | null
          movement_id: string
          notes: string | null
          qty: number
          reason_code: string
          user_id: string | null
        }
        Insert: {
          container_id: string
          created_at?: string | null
          direction: string
          item_type: string
          moved_at?: string | null
          movement_id?: string
          notes?: string | null
          qty: number
          reason_code: string
          user_id?: string | null
        }
        Update: {
          container_id?: string
          created_at?: string | null
          direction?: string
          item_type?: string
          moved_at?: string | null
          movement_id?: string
          notes?: string | null
          qty?: number
          reason_code?: string
          user_id?: string | null
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
    Enums: {},
  },
} as const
