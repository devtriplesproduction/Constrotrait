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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_email: string
          created_at: string
          details: Json | null
          id: string
          severity: string | null
          target_user_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email: string
          created_at?: string
          details?: Json | null
          id?: string
          severity?: string | null
          target_user_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string
          created_at?: string
          details?: Json | null
          id?: string
          severity?: string | null
          target_user_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          branch_id: string | null
          created_at: string
          date: string
          employee_id: string
          eod_reference_id: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          date: string
          employee_id: string
          eod_reference_id?: string | null
          id?: string
          status: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          eod_reference_id?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_eod_reference_id_fkey"
            columns: ["eod_reference_id"]
            isOneToOne: false
            referencedRelation: "eod_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_employee_sequences: {
        Row: {
          branch_id: string
          current_value: number | null
        }
        Insert: {
          branch_id: string
          current_value?: number | null
        }
        Update: {
          branch_id?: string
          current_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_employee_sequences_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          branch_number: number
          code: string
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_number?: number
          code: string
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_number?: number
          code?: string
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          agency_name: string | null
          collected_by: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          dispatch_address: string | null
          dispatch_name: string | null
          division: string | null
          email: string | null
          gst_no: string | null
          id: string
          mobile: string | null
          name: string
          project_name: string | null
          site_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          agency_name?: string | null
          collected_by?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_address?: string | null
          dispatch_name?: string | null
          division?: string | null
          email?: string | null
          gst_no?: string | null
          id?: string
          mobile?: string | null
          name: string
          project_name?: string | null
          site_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          agency_name?: string | null
          collected_by?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_address?: string | null
          dispatch_name?: string | null
          division?: string | null
          email?: string | null
          gst_no?: string | null
          id?: string
          mobile?: string | null
          name?: string
          project_name?: string | null
          site_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      comp_off_ledger: {
        Row: {
          created_at: string
          employee_id: string
          hours: number
          id: string
          reference_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          hours: number
          id?: string
          reference_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          hours?: number
          id?: string
          reference_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "comp_off_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_financial_ledger: {
        Row: {
          adjustment_category: string
          adjustment_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_date: string
          employee_id: string
          id: string
          kilometers: number | null
          original_amount: number
          remaining_amount: number
          status: string
          suggested_installment_amount: number | null
          tds_applied: boolean | null
          tds_rate: number | null
          updated_at: string | null
          updated_by: string | null
          vehicle_type: string | null
        }
        Insert: {
          adjustment_category: string
          adjustment_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string
          employee_id: string
          id?: string
          kilometers?: number | null
          original_amount?: number
          remaining_amount?: number
          status?: string
          suggested_installment_amount?: number | null
          tds_applied?: boolean | null
          tds_rate?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_type?: string | null
        }
        Update: {
          adjustment_category?: string
          adjustment_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string
          employee_id?: string
          id?: string
          kilometers?: number | null
          original_amount?: number
          remaining_amount?: number
          status?: string
          suggested_installment_amount?: number | null
          tds_applied?: boolean | null
          tds_rate?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_financial_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_financial_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_financial_ledger_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eod_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          blockers: string | null
          branch_id: string | null
          created_at: string
          employee_id: string
          id: string
          job_card_numbers: string | null
          location: string
          office_hours: number
          photo_url: string | null
          rejection_reason: string | null
          report_date: string
          status: string
          submitted_by: string
          tasks_accomplished: string
          tomorrows_plan: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          blockers?: string | null
          branch_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          job_card_numbers?: string | null
          location: string
          office_hours: number
          photo_url?: string | null
          rejection_reason?: string | null
          report_date: string
          status?: string
          submitted_by: string
          tasks_accomplished: string
          tomorrows_plan?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          blockers?: string | null
          branch_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          job_card_numbers?: string | null
          location?: string
          office_hours?: number
          photo_url?: string | null
          rejection_reason?: string | null
          report_date?: string
          status?: string
          submitted_by?: string
          tasks_accomplished?: string
          tomorrows_plan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eod_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eod_reports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eod_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eod_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          date: string
          department: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      id_sequences: {
        Row: {
          fy: string
          kind: string
          last_value: number
        }
        Insert: {
          fy: string
          kind: string
          last_value?: number
        }
        Update: {
          fy?: string
          kind?: string
          last_value?: number
        }
        Relationships: []
      }
      job_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          created_at: string
          due_date: string | null
          id: string
          job_entry_test_id: string
          notes: string | null
          report_url: string | null
          reviewer_remark: string | null
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_entry_test_id: string
          notes?: string | null
          report_url?: string | null
          reviewer_remark?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_entry_test_id?: string
          notes?: string | null
          report_url?: string | null
          reviewer_remark?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_job_entry_test_id_fkey"
            columns: ["job_entry_test_id"]
            isOneToOne: false
            referencedRelation: "job_entry_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_entries: {
        Row: {
          agency: string | null
          client_id: string
          collected_by: string | null
          created_at: string
          created_by: string | null
          dispatch_address: string | null
          dispatch_name: string | null
          division: string | null
          id: string
          invoice_date: string | null
          invoice_no: string | null
          inward_on: string | null
          is_nabl: boolean | null
          letter_reference: string | null
          payment_status: string | null
          project_name: string | null
          uid: number | null
          uid_label: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agency?: string | null
          client_id: string
          collected_by?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_address?: string | null
          dispatch_name?: string | null
          division?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          inward_on?: string | null
          is_nabl?: boolean | null
          letter_reference?: string | null
          payment_status?: string | null
          project_name?: string | null
          uid?: number | null
          uid_label?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agency?: string | null
          client_id?: string
          collected_by?: string | null
          created_at?: string
          created_by?: string | null
          dispatch_address?: string | null
          dispatch_name?: string | null
          division?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          inward_on?: string | null
          is_nabl?: boolean | null
          letter_reference?: string | null
          payment_status?: string | null
          project_name?: string | null
          uid?: number | null
          uid_label?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      job_entry_tests: {
        Row: {
          additional_details_values: Json | null
          created_at: string
          created_by: string | null
          date_of_casting: string | null
          date_of_receiving: string | null
          date_of_testing: string | null
          grade: string | null
          id: string
          job_entry_id: string
          material_description: string | null
          material_details_location: string | null
          material_id: string | null
          qc_number: string | null
          report_class: string | null
          sample_quantity: string | null
          test_master_id: string | null
          test_method: string | null
          testing_age: string | null
          testing_day: string | null
          uid_label: string | null
          ulr_generated_at: string | null
          ulr_number: string | null
          ulr_seq: number | null
          ulr_status: string
          ulr_year: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          additional_details_values?: Json | null
          created_at?: string
          created_by?: string | null
          date_of_casting?: string | null
          date_of_receiving?: string | null
          date_of_testing?: string | null
          grade?: string | null
          id?: string
          job_entry_id: string
          material_description?: string | null
          material_details_location?: string | null
          material_id?: string | null
          qc_number?: string | null
          report_class?: string | null
          sample_quantity?: string | null
          test_master_id?: string | null
          test_method?: string | null
          testing_age?: string | null
          testing_day?: string | null
          uid_label?: string | null
          ulr_generated_at?: string | null
          ulr_number?: string | null
          ulr_seq?: number | null
          ulr_status?: string
          ulr_year?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          additional_details_values?: Json | null
          created_at?: string
          created_by?: string | null
          date_of_casting?: string | null
          date_of_receiving?: string | null
          date_of_testing?: string | null
          grade?: string | null
          id?: string
          job_entry_id?: string
          material_description?: string | null
          material_details_location?: string | null
          material_id?: string | null
          qc_number?: string | null
          report_class?: string | null
          sample_quantity?: string | null
          test_master_id?: string | null
          test_method?: string | null
          testing_age?: string | null
          testing_day?: string | null
          uid_label?: string | null
          ulr_generated_at?: string | null
          ulr_number?: string | null
          ulr_seq?: number | null
          ulr_status?: string
          ulr_year?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_entry_tests_job_entry_id_fkey"
            columns: ["job_entry_id"]
            isOneToOne: false
            referencedRelation: "job_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_entry_tests_test_master_id_fkey"
            columns: ["test_master_id"]
            isOneToOne: false
            referencedRelation: "test_master"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_report_lines: {
        Row: {
          job_entry_test_id: string
          report_id: string
        }
        Insert: {
          job_entry_test_id: string
          report_id: string
        }
        Update: {
          job_entry_test_id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_report_lines_job_entry_test_id_fkey"
            columns: ["job_entry_test_id"]
            isOneToOne: false
            referencedRelation: "job_entry_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_report_lines_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "lab_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_reports: {
        Row: {
          id: string
          issued_at: string
          issued_by: string | null
          job_entry_id: string
          qc_number: string | null
          qr_code: string | null
          report_class: string
          report_no: string
          sibling_report_id: string | null
          status: string
          uid_label: string | null
          ulr_number: string | null
        }
        Insert: {
          id?: string
          issued_at?: string
          issued_by?: string | null
          job_entry_id: string
          qc_number?: string | null
          qr_code?: string | null
          report_class: string
          report_no: string
          sibling_report_id?: string | null
          status?: string
          uid_label?: string | null
          ulr_number?: string | null
        }
        Update: {
          id?: string
          issued_at?: string
          issued_by?: string | null
          job_entry_id?: string
          qc_number?: string | null
          qr_code?: string | null
          report_class?: string
          report_no?: string
          sibling_report_id?: string | null
          status?: string
          uid_label?: string | null
          ulr_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_reports_job_entry_id_fkey"
            columns: ["job_entry_id"]
            isOneToOne: false
            referencedRelation: "job_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_sibling_report_id_fkey"
            columns: ["sibling_report_id"]
            isOneToOne: false
            referencedRelation: "lab_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_settings: {
        Row: {
          id: number
          lab_code: string
          tc_number: string
        }
        Insert: {
          id?: number
          lab_code?: string
          tc_number?: string
        }
        Update: {
          id?: number
          lab_code?: string
          tc_number?: string
        }
        Relationships: []
      }
      lab_uid_counters: {
        Row: {
          counter_name: string
          counter_value: number
          counter_year: number
          id: string
        }
        Insert: {
          counter_name: string
          counter_value?: number
          counter_year: number
          id?: string
        }
        Update: {
          counter_name?: string
          counter_value?: number
          counter_year?: number
          id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          certificate_verified_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          first_level_approver_id: string | null
          hr_approver_id: string | null
          id: string
          is_half_day: boolean
          is_paid: boolean
          leave_type: string
          medical_certificate_url: string | null
          reason: string
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          certificate_verified_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          first_level_approver_id?: string | null
          hr_approver_id?: string | null
          id?: string
          is_half_day?: boolean
          is_paid?: boolean
          leave_type: string
          medical_certificate_url?: string | null
          reason: string
          rejection_reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_verified_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          first_level_approver_id?: string | null
          hr_approver_id?: string | null
          id?: string
          is_half_day?: boolean
          is_paid?: boolean
          leave_type?: string
          medical_certificate_url?: string | null
          reason?: string
          rejection_reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_certificate_verified_by_fkey"
            columns: ["certificate_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_first_level_approver_id_fkey"
            columns: ["first_level_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approver_id_fkey"
            columns: ["hr_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustment_applications: {
        Row: {
          adjustment_category: string
          adjustment_type: string
          applied_amount: number
          applied_at: string | null
          applied_by: string | null
          created_at: string | null
          cycle_id: string
          employee_id: string
          id: string
          ledger_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          adjustment_category: string
          adjustment_type: string
          applied_amount?: number
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          cycle_id: string
          employee_id: string
          id?: string
          ledger_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          adjustment_category?: string
          adjustment_type?: string
          applied_amount?: number
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          cycle_id?: string
          employee_id?: string
          id?: string
          ledger_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustment_applications_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustment_applications_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustment_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustment_applications_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "employee_financial_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_cycles: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          month: number
          slip_status: string | null
          status: string
          year: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month: number
          slip_status?: string | null
          status?: string
          year: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month?: number
          slip_status?: string | null
          status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_cycles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_cycles_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_snapshots: {
        Row: {
          allowance: number | null
          base_salary: number | null
          basic_salary: number | null
          bonus: number | null
          calculated_at: string | null
          cycle_id: string
          damage_recovery: number | null
          days_absent: number | null
          days_field: number | null
          days_paid_leave: number | null
          days_present: number | null
          days_unpaid_leave: number | null
          department: string | null
          designation: string | null
          employee_id: string
          employee_id_external: string | null
          employee_name: string | null
          esi: number | null
          food_allowance: number | null
          gross_salary: number | null
          hra: number | null
          id: string
          income_tax: number | null
          is_reviewed: boolean | null
          medical_allowance: number | null
          net_payable: number | null
          net_salary: number | null
          other_deductions: number | null
          overtime_hours: number | null
          overtime_pay: number | null
          performance_incentive: number | null
          pf: number | null
          professional_tax: number | null
          remarks: string | null
          salary_advance_recovery: number | null
          tds: number | null
          total_deductions: number | null
          travel_expense: number | null
        }
        Insert: {
          allowance?: number | null
          base_salary?: number | null
          basic_salary?: number | null
          bonus?: number | null
          calculated_at?: string | null
          cycle_id: string
          damage_recovery?: number | null
          days_absent?: number | null
          days_field?: number | null
          days_paid_leave?: number | null
          days_present?: number | null
          days_unpaid_leave?: number | null
          department?: string | null
          designation?: string | null
          employee_id: string
          employee_id_external?: string | null
          employee_name?: string | null
          esi?: number | null
          food_allowance?: number | null
          gross_salary?: number | null
          hra?: number | null
          id?: string
          income_tax?: number | null
          is_reviewed?: boolean | null
          medical_allowance?: number | null
          net_payable?: number | null
          net_salary?: number | null
          other_deductions?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          performance_incentive?: number | null
          pf?: number | null
          professional_tax?: number | null
          remarks?: string | null
          salary_advance_recovery?: number | null
          tds?: number | null
          total_deductions?: number | null
          travel_expense?: number | null
        }
        Update: {
          allowance?: number | null
          base_salary?: number | null
          basic_salary?: number | null
          bonus?: number | null
          calculated_at?: string | null
          cycle_id?: string
          damage_recovery?: number | null
          days_absent?: number | null
          days_field?: number | null
          days_paid_leave?: number | null
          days_present?: number | null
          days_unpaid_leave?: number | null
          department?: string | null
          designation?: string | null
          employee_id?: string
          employee_id_external?: string | null
          employee_name?: string | null
          esi?: number | null
          food_allowance?: number | null
          gross_salary?: number | null
          hra?: number | null
          id?: string
          income_tax?: number | null
          is_reviewed?: boolean | null
          medical_allowance?: number | null
          net_payable?: number | null
          net_salary?: number | null
          other_deductions?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          performance_incentive?: number | null
          pf?: number | null
          professional_tax?: number | null
          remarks?: string | null
          salary_advance_recovery?: number | null
          tds?: number | null
          total_deductions?: number | null
          travel_expense?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_snapshots_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_snapshots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          designation: string | null
          dob: string | null
          documents: Json | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relation: string | null
          employee_id: string | null
          employment_type: string | null
          experience: number | null
          first_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          joining_date: string | null
          last_name: string
          personal_email: string | null
          phone_number: string | null
          profile_photo: string | null
          reporting_manager_id: string | null
          residential_address: string | null
          roles: Database["public"]["Enums"]["user_role"][]
          salary: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          designation?: string | null
          dob?: string | null
          documents?: Json | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          employment_type?: string | null
          experience?: number | null
          first_name: string
          gender?: string | null
          id: string
          is_active?: boolean | null
          joining_date?: string | null
          last_name: string
          personal_email?: string | null
          phone_number?: string | null
          profile_photo?: string | null
          reporting_manager_id?: string | null
          residential_address?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          salary?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          designation?: string | null
          dob?: string | null
          documents?: Json | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          employment_type?: string | null
          experience?: number | null
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          joining_date?: string | null
          last_name?: string
          personal_email?: string | null
          phone_number?: string | null
          profile_photo?: string | null
          reporting_manager_id?: string | null
          residential_address?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          salary?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_documents: {
        Row: {
          code: string
          doc_type: string | null
          is_nabl: boolean | null
          name: string | null
        }
        Insert: {
          code: string
          doc_type?: string | null
          is_nabl?: boolean | null
          name?: string | null
        }
        Update: {
          code?: string
          doc_type?: string | null
          is_nabl?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
      report_yearly_counters: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      salary_hikes: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          employee_id: string
          id: string
          new_salary: number
          previous_salary: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date: string
          employee_id: string
          id?: string
          new_salary: number
          previous_salary: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_id?: string
          id?: string
          new_salary?: number
          previous_salary?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_hikes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_slips: {
        Row: {
          cycle_id: string
          emailed: boolean | null
          emailed_at: string | null
          emailed_by: string | null
          employee_id: string
          generated_at: string | null
          generated_by: string | null
          id: string
          pdf_url: string | null
          shared: boolean | null
          snapshot_id: string
          status: string | null
        }
        Insert: {
          cycle_id: string
          emailed?: boolean | null
          emailed_at?: string | null
          emailed_by?: string | null
          employee_id: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          pdf_url?: string | null
          shared?: boolean | null
          snapshot_id: string
          status?: string | null
        }
        Update: {
          cycle_id?: string
          emailed?: boolean | null
          emailed_at?: string | null
          emailed_by?: string | null
          employee_id?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          pdf_url?: string | null
          shared?: boolean | null
          snapshot_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_slips_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_slips_emailed_by_fkey"
            columns: ["emailed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_slips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_slips_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_slips_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: true
            referencedRelation: "payroll_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_at: string
          employee_id: string
          id: string
          team_id: string
        }
        Insert: {
          added_at?: string
          employee_id: string
          id?: string
          team_id: string
        }
        Update: {
          added_at?: string
          employee_id?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      test_master: {
        Row: {
          additional_details: string[] | null
          category: string
          component_parameter: string
          created_at: string
          created_by: string | null
          datasheet_qr: string | null
          discipline_group: string
          id: string
          is_nabl: boolean
          material_product: string
          report_qr: string | null
          serial_no: string
          specific_test: string
          technique_equipment: string
          test_method: string
          minimum_value: string | null
          particulars: string | null
          sample_size: string | null
          tested_as_per_is: string | null
          time_required: string | null
          unit: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          additional_details?: string[] | null
          category: string
          component_parameter: string
          created_at?: string
          created_by?: string | null
          datasheet_qr?: string | null
          discipline_group: string
          id?: string
          is_nabl?: boolean
          material_product: string
          report_qr?: string | null
          serial_no: string
          specific_test: string
          technique_equipment: string
          test_method: string
          minimum_value?: string | null
          particulars?: string | null
          sample_size?: string | null
          tested_as_per_is?: string | null
          time_required?: string | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          additional_details?: string[] | null
          category?: string
          component_parameter?: string
          created_at?: string
          created_by?: string | null
          datasheet_qr?: string | null
          discipline_group?: string
          id?: string
          is_nabl?: boolean
          material_product?: string
          report_qr?: string | null
          serial_no?: string
          specific_test?: string
          technique_equipment?: string
          test_method?: string
          minimum_value?: string | null
          particulars?: string | null
          sample_size?: string | null
          tested_as_per_is?: string | null
          time_required?: string | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_master_datasheet_qr_fkey"
            columns: ["datasheet_qr"]
            isOneToOne: false
            referencedRelation: "qr_documents"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "test_master_report_qr_fkey"
            columns: ["report_qr"]
            isOneToOne: false
            referencedRelation: "qr_documents"
            referencedColumns: ["code"]
          },
        ]
      }
      test_result_rows: {
        Row: {
          area_mm2: number | null
          created_at: string
          id: string
          id_mark: string | null
          job_entry_test_id: string
          length_mm: number | null
          load_kn: number | null
          particulars: string | null
          result_value: string | null
          specified_value: string | null
          sr_no: number
          strength_nmm2: number | null
          width_mm: number | null
        }
        Insert: {
          area_mm2?: number | null
          created_at?: string
          id?: string
          id_mark?: string | null
          job_entry_test_id: string
          length_mm?: number | null
          load_kn?: number | null
          particulars?: string | null
          result_value?: string | null
          specified_value?: string | null
          sr_no: number
          strength_nmm2?: number | null
          width_mm?: number | null
        }
        Update: {
          area_mm2?: number | null
          created_at?: string
          id?: string
          id_mark?: string | null
          job_entry_test_id?: string
          length_mm?: number | null
          load_kn?: number | null
          particulars?: string | null
          result_value?: string | null
          specified_value?: string | null
          sr_no?: number
          strength_nmm2?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_result_rows_job_entry_test_id_fkey"
            columns: ["job_entry_test_id"]
            isOneToOne: false
            referencedRelation: "job_entry_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      uid_yearly_counters: {
        Row: {
          kind: string
          last_seq: number
          year: number
        }
        Insert: {
          kind: string
          last_seq?: number
          year: number
        }
        Update: {
          kind?: string
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      ulr_generation_queue: {
        Row: {
          created_at: string
          job_entry_id: string
          job_entry_test_id: string
          processed_at: string | null
          scheduled_on: string
          status: string
        }
        Insert: {
          created_at?: string
          job_entry_id: string
          job_entry_test_id: string
          processed_at?: string | null
          scheduled_on: string
          status?: string
        }
        Update: {
          created_at?: string
          job_entry_id?: string
          job_entry_test_id?: string
          processed_at?: string | null
          scheduled_on?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ulr_generation_queue_job_entry_id_fkey"
            columns: ["job_entry_id"]
            isOneToOne: false
            referencedRelation: "job_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ulr_generation_queue_job_entry_test_id_fkey"
            columns: ["job_entry_test_id"]
            isOneToOne: false
            referencedRelation: "job_entry_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ulr_yearly_counters: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }

    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_job_uid: { Args: { p_job_entry_id: string }; Returns: string }
      approve_comp_off_leave: {
        Args: {
          p_approver_id: string
          p_hours_to_debit: number
          p_leave_id: string
        }
        Returns: undefined
      }
      approve_leave: { Args: { p_leave_id: string }; Returns: undefined }
      cancel_leave: { Args: { p_leave_id: string }; Returns: undefined }
      current_fy: { Args: { p_at?: string }; Returns: string }
      delete_branch_transaction: {
        Args: { p_admin_id: string; p_branch_id: string }
        Returns: Json
      }
      delete_medical_certificate: {
        Args: { p_leave_id: string }
        Returns: undefined
      }
      enqueue_ulr_for_job: {
        Args: { p_job_entry_id: string }
        Returns: undefined
      }
      ensure_job_uid: { Args: { p_job_id: string }; Returns: string }
      expire_pending_comp_off_leaves: {
        Args: never
        Returns: {
          employee_id: string
          expired_leave_id: string
          hours_released: number
        }[]
      }
      generate_employee_id: {
        Args: { p_branch_id: string; p_is_preview?: boolean }
        Returns: string
      }
      generate_ulr_for_date: { Args: { p_date: string }; Returns: undefined }
      get_comp_off_balance: { Args: { p_employee_id: string }; Returns: number }
      get_today_birthdays: {
        Args: never
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_user_branch_id: { Args: never; Returns: string }
      is_working_day: {
        Args: { p_date: string; p_employee_id: string }
        Returns: boolean
      }
      issue_reports_for_job: {
        Args: { p_issued_by?: string; p_job_entry_id: string }
        Returns: Json
      }
      lock_payroll_cycle:
        | {
            Args: {
              p_locked_by: string
              p_month: number
              p_snapshots: Json
              p_year: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_adjustments?: Json
              p_locked_by: string
              p_month: number
              p_snapshots: Json
              p_year: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_adjustments?: Json
              p_branch_id?: string
              p_locked_by: string
              p_month: number
              p_snapshots: Json
              p_year: number
            }
            Returns: undefined
          }
      next_report_seq: { Args: { p_year: number }; Returns: number }
      next_seq: { Args: { p_fy: string; p_kind: string }; Returns: number }
      next_uid_seq: {
        Args: { p_name: string; p_year: number }
        Returns: number
      }
      process_ulr_queue_for_date: { Args: { p_date: string }; Returns: Json }
      reject_leave: {
        Args: { p_leave_id: string; p_reason: string }
        Returns: undefined
      }
      reject_medical_certificate: {
        Args: { p_leave_id: string }
        Returns: undefined
      }
      review_eod_rpc: {
        Args: { p_eod_id: string; p_rejection_reason: string; p_status: string }
        Returns: string
      }
      submit_eod_rpc: {
        Args: {
          p_blockers: string
          p_employee_id: string
          p_job_card_numbers?: string
          p_location: string
          p_office_hours: number
          p_photo_url: string
          p_report_date: string
          p_status: string
          p_submitted_by: string
          p_tasks_accomplished: string
          p_tomorrows_plan?: string
        }
        Returns: string
      }
      submit_leave: {
        Args: {
          p_end_date: string
          p_is_half_day: boolean
          p_leave_type: string
          p_medical_certificate_url?: string
          p_reason: string
          p_start_date: string
        }
        Returns: string
      }
      sync_eod_comp_off: {
        Args: {
          p_credit_hours: number
          p_employee_id: string
          p_eod_id: string
        }
        Returns: undefined
      }
      update_eod_rpc: {
        Args: {
          p_blockers: string
          p_employee_id: string
          p_job_card_numbers?: string
          p_location: string
          p_office_hours: number
          p_photo_url: string
          p_report_date: string
          p_status: string
          p_submitted_by: string
          p_tasks_accomplished: string
          p_tomorrows_plan?: string
        }
        Returns: string
      }
      verify_medical_certificate: {
        Args: { p_leave_id: string; p_medical_certificate_url?: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role:
        | "SUPER_ADMIN"
        | "BRANCH_MANAGER_ADMINISTRATIVE"
        | "HR"
        | "QUALITY_MANAGER"
        | "TECHNICAL_MANAGER"
        | "ADMIN_INWARD_CRE"
        | "ACCOUNTANT"
        | "TEST_ENGINEER"
        | "LAB_ANALYST"
        | "LAB_ASSISTANT"
        | "SAMPLER"
        | "MARKETING_EXECUTIVE"
        | "DIGITAL_MARKETING"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: [
        "SUPER_ADMIN",
        "BRANCH_MANAGER_ADMINISTRATIVE",
        "HR",
        "QUALITY_MANAGER",
        "TECHNICAL_MANAGER",
        "ADMIN_INWARD_CRE",
        "ACCOUNTANT",
        "TEST_ENGINEER",
        "LAB_ANALYST",
        "LAB_ASSISTANT",
        "SAMPLER",
        "MARKETING_EXECUTIVE",
        "DIGITAL_MARKETING",
      ],
    },
  },
} as const
