/** Generado con `npm run db:types` a partir del esquema de Supabase. No editar a mano. */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_id: string | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: NonNullable<Json>;
          occurred_at: string;
          organization_id: string;
          summary: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
          organization_id: string;
          summary: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
          organization_id?: string;
          summary?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      areas: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "areas_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      bom_lines: {
        Row: {
          bom_id: string;
          component_item_id: string;
          created_at: string;
          id: string;
          organization_id: string;
          position: number;
          quantity: number;
          updated_at: string;
          waste_pct: number | null;
        };
        ComputedFields: never;
        Insert: {
          bom_id: string;
          component_item_id: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          position?: number;
          quantity: number;
          updated_at?: string;
          waste_pct?: number | null;
        };
        Update: {
          bom_id?: string;
          component_item_id?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          position?: number;
          quantity?: number;
          updated_at?: string;
          waste_pct?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "bom_lines_organization_id_bom_id_fkey";
            columns: ["organization_id", "bom_id"];
            isOneToOne: false;
            referencedRelation: "boms";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "bom_lines_organization_id_component_item_id_fkey";
            columns: ["organization_id", "component_item_id"];
            isOneToOne: false;
            referencedRelation: "item_costing";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "bom_lines_organization_id_component_item_id_fkey";
            columns: ["organization_id", "component_item_id"];
            isOneToOne: false;
            referencedRelation: "item_stock_status";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "bom_lines_organization_id_component_item_id_fkey";
            columns: ["organization_id", "component_item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "bom_lines_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      boms: {
        Row: {
          created_at: string;
          created_by: string | null;
          default_waste_pct: number | null;
          id: string;
          item_id: string;
          notes: string | null;
          organization_id: string;
          output_qty: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          default_waste_pct?: number | null;
          id?: string;
          item_id: string;
          notes?: string | null;
          organization_id: string;
          output_qty?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          default_waste_pct?: number | null;
          id?: string;
          item_id?: string;
          notes?: string | null;
          organization_id?: string;
          output_qty?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boms_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boms_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_costing";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "boms_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_stock_status";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "boms_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      categories: {
        Row: {
          applies_to: string;
          color: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          applies_to?: string;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          applies_to?: string;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      demo_requests: {
        Row: {
          company: string;
          created_at: string;
          email: string;
          id: string;
          industry: string | null;
          ip_hash: string;
          message: string | null;
          name: string;
          phone: string | null;
        };
        ComputedFields: never;
        Insert: {
          company: string;
          created_at?: string;
          email: string;
          id?: string;
          industry?: string | null;
          ip_hash: string;
          message?: string | null;
          name: string;
          phone?: string | null;
        };
        Update: {
          company?: string;
          created_at?: string;
          email?: string;
          id?: string;
          industry?: string | null;
          ip_hash?: string;
          message?: string | null;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      document_sequences: {
        Row: {
          doc_type: string;
          last_value: number;
          organization_id: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          doc_type: string;
          last_value?: number;
          organization_id: string;
          year: number;
        };
        Update: {
          doc_type?: string;
          last_value?: number;
          organization_id?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "document_sequences_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          area_id: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          first_name: string;
          hire_date: string | null;
          hourly_cost: number | null;
          id: string;
          last_name: string;
          notes: string | null;
          organization_id: string;
          phone: string | null;
          photo_path: string | null;
          position: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          area_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          first_name: string;
          hire_date?: string | null;
          hourly_cost?: number | null;
          id?: string;
          last_name: string;
          notes?: string | null;
          organization_id: string;
          phone?: string | null;
          photo_path?: string | null;
          position?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          area_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          first_name?: string;
          hire_date?: string | null;
          hourly_cost?: number | null;
          id?: string;
          last_name?: string;
          notes?: string | null;
          organization_id?: string;
          phone?: string | null;
          photo_path?: string | null;
          position?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_area_id_fkey";
            columns: ["organization_id", "area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "employees_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          archived_at: string | null;
          avg_cost: number;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          current_stock: number;
          description: string | null;
          id: string;
          image_path: string | null;
          last_purchase_cost: number | null;
          manual_cost: number | null;
          min_stock: number;
          name: string;
          organization_id: string;
          overhead_per_unit: number;
          preferred_supplier_id: string | null;
          sale_price: number | null;
          sku: string;
          standard_labor_minutes: number;
          status: string;
          type: string;
          unit_id: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          avg_cost?: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_stock?: number;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          last_purchase_cost?: number | null;
          manual_cost?: number | null;
          min_stock?: number;
          name: string;
          organization_id: string;
          overhead_per_unit?: number;
          preferred_supplier_id?: string | null;
          sale_price?: number | null;
          sku: string;
          standard_labor_minutes?: number;
          status?: string;
          type: string;
          unit_id: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          avg_cost?: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_stock?: number;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          last_purchase_cost?: number | null;
          manual_cost?: number | null;
          min_stock?: number;
          name?: string;
          organization_id?: string;
          overhead_per_unit?: number;
          preferred_supplier_id?: string | null;
          sale_price?: number | null;
          sku?: string;
          standard_labor_minutes?: number;
          status?: string;
          type?: string;
          unit_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_organization_id_category_id_fkey";
            columns: ["organization_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_organization_id_preferred_supplier_id_fkey";
            columns: ["organization_id", "preferred_supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "items_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          id: string;
          invited_by: string | null;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          organization_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          address: string | null;
          allow_negative_stock: boolean;
          city: string | null;
          created_at: string;
          cuit: string | null;
          default_labor_rate: number;
          default_waste_pct: number;
          email: string | null;
          id: string;
          is_demo: boolean;
          is_public_demo: boolean;
          legal_name: string | null;
          logo_path: string | null;
          name: string;
          phone: string | null;
          province: string | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          allow_negative_stock?: boolean;
          city?: string | null;
          created_at?: string;
          cuit?: string | null;
          default_labor_rate?: number;
          default_waste_pct?: number;
          email?: string | null;
          id?: string;
          is_demo?: boolean;
          is_public_demo?: boolean;
          legal_name?: string | null;
          logo_path?: string | null;
          name: string;
          phone?: string | null;
          province?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          allow_negative_stock?: boolean;
          city?: string | null;
          created_at?: string;
          cuit?: string | null;
          default_labor_rate?: number;
          default_waste_pct?: number;
          email?: string | null;
          id?: string;
          is_demo?: boolean;
          is_public_demo?: boolean;
          legal_name?: string | null;
          logo_path?: string | null;
          name?: string;
          phone?: string | null;
          province?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      production_order_assignments: {
        Row: {
          created_at: string;
          employee_id: string;
          hours_worked: number;
          id: string;
          organization_id: string;
          production_order_id: string;
          role_in_order: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          employee_id: string;
          hours_worked?: number;
          id?: string;
          organization_id: string;
          production_order_id: string;
          role_in_order?: string;
        };
        Update: {
          created_at?: string;
          employee_id?: string;
          hours_worked?: number;
          id?: string;
          organization_id?: string;
          production_order_id?: string;
          role_in_order?: string;
        };
        Relationships: [
          {
            foreignKeyName: "production_order_assignments_organization_id_employee_id_fkey";
            columns: ["organization_id", "employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "production_order_assignments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "production_order_assignments_organization_id_production_or_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_order_overview";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "production_order_assignments_organization_id_production_or_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_orders";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      production_order_events: {
        Row: {
          actor_id: string | null;
          from_status: string | null;
          id: string;
          note: string | null;
          occurred_at: string;
          organization_id: string;
          production_order_id: string;
          to_status: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          from_status?: string | null;
          id?: string;
          note?: string | null;
          occurred_at?: string;
          organization_id: string;
          production_order_id: string;
          to_status: string;
        };
        Update: {
          actor_id?: string | null;
          from_status?: string | null;
          id?: string;
          note?: string | null;
          occurred_at?: string;
          organization_id?: string;
          production_order_id?: string;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "production_order_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "production_order_events_organization_id_production_order_i_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_order_overview";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "production_order_events_organization_id_production_order_i_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_orders";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      production_order_materials: {
        Row: {
          consumed_qty: number;
          cost_consumed: number;
          id: string;
          item_id: string;
          organization_id: string;
          planned_qty: number;
          production_order_id: string;
          qty_per_unit: number;
          returned_qty: number;
          scrap_qty: number;
          unit_cost: number | null;
          waste_pct: number;
        };
        ComputedFields: never;
        Insert: {
          consumed_qty?: number;
          cost_consumed?: number;
          id?: string;
          item_id: string;
          organization_id: string;
          planned_qty: number;
          production_order_id: string;
          qty_per_unit: number;
          returned_qty?: number;
          scrap_qty?: number;
          unit_cost?: number | null;
          waste_pct?: number;
        };
        Update: {
          consumed_qty?: number;
          cost_consumed?: number;
          id?: string;
          item_id?: string;
          organization_id?: string;
          planned_qty?: number;
          production_order_id?: string;
          qty_per_unit?: number;
          returned_qty?: number;
          scrap_qty?: number;
          unit_cost?: number | null;
          waste_pct?: number;
        };
        Relationships: [
          {
            foreignKeyName: "production_order_materials_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "production_order_materials_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_costing";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "production_order_materials_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_stock_status";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "production_order_materials_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "production_order_materials_organization_id_production_orde_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_order_overview";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "production_order_materials_organization_id_production_orde_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_orders";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      production_orders: {
        Row: {
          actual_labor_cost: number | null;
          actual_material_cost: number | null;
          actual_overhead_cost: number | null;
          actual_unit_cost: number | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          good_qty: number;
          id: string;
          item_id: string;
          notes: string | null;
          organization_id: string;
          planned_end_date: string | null;
          planned_labor_cost: number;
          planned_material_cost: number;
          planned_overhead_cost: number;
          planned_qty: number;
          planned_start_date: string | null;
          priority: string;
          responsible_employee_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          actual_labor_cost?: number | null;
          actual_material_cost?: number | null;
          actual_overhead_cost?: number | null;
          actual_unit_cost?: number | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          code: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          defective_qty?: number;
          good_qty?: number;
          id?: string;
          item_id: string;
          notes?: string | null;
          organization_id: string;
          planned_end_date?: string | null;
          planned_labor_cost?: number;
          planned_material_cost?: number;
          planned_overhead_cost?: number;
          planned_qty: number;
          planned_start_date?: string | null;
          priority?: string;
          responsible_employee_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          actual_labor_cost?: number | null;
          actual_material_cost?: number | null;
          actual_overhead_cost?: number | null;
          actual_unit_cost?: number | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          code?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          defective_qty?: number;
          good_qty?: number;
          id?: string;
          item_id?: string;
          notes?: string | null;
          organization_id?: string;
          planned_end_date?: string | null;
          planned_labor_cost?: number;
          planned_material_cost?: number;
          planned_overhead_cost?: number;
          planned_qty?: number;
          planned_start_date?: string | null;
          priority?: string;
          responsible_employee_id?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "production_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "production_orders_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_costing";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "production_orders_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_stock_status";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "production_orders_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "production_orders_organization_id_responsible_employee_id_fkey";
            columns: ["organization_id", "responsible_employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      production_reports: {
        Row: {
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          employee_id: string | null;
          good_qty: number;
          id: string;
          notes: string | null;
          organization_id: string;
          production_order_id: string;
          report_date: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          defective_qty: number;
          employee_id?: string | null;
          good_qty: number;
          id?: string;
          notes?: string | null;
          organization_id: string;
          production_order_id: string;
          report_date: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          defective_qty?: number;
          employee_id?: string | null;
          good_qty?: number;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          production_order_id?: string;
          report_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "production_reports_organization_id_employee_id_fkey";
            columns: ["organization_id", "employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "production_reports_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "production_reports_organization_id_production_order_id_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_order_overview";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "production_reports_organization_id_production_order_id_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_orders";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          full_name: string;
          id: string;
          last_organization_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          last_organization_id?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          last_organization_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_last_organization_id_fkey";
            columns: ["last_organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_lines: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          organization_id: string;
          purchase_order_id: string;
          quantity: number;
          received_qty: number;
          tax_rate: number;
          unit_price: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          organization_id: string;
          purchase_order_id: string;
          quantity: number;
          received_qty?: number;
          tax_rate?: number;
          unit_price: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          organization_id?: string;
          purchase_order_id?: string;
          quantity?: number;
          received_qty?: number;
          tax_rate?: number;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_lines_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_costing";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "purchase_order_lines_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_stock_status";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "purchase_order_lines_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "purchase_order_lines_organization_id_purchase_order_id_fkey";
            columns: ["organization_id", "purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          cancel_reason: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          expected_date: string | null;
          id: string;
          notes: string | null;
          order_date: string;
          organization_id: string;
          status: string;
          subtotal: number;
          supplier_id: string;
          tax_total: number;
          total: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cancel_reason?: string | null;
          code: string;
          created_at?: string;
          created_by?: string | null;
          expected_date?: string | null;
          id?: string;
          notes?: string | null;
          order_date?: string;
          organization_id: string;
          status?: string;
          subtotal?: number;
          supplier_id: string;
          tax_total?: number;
          total?: number;
          updated_at?: string;
        };
        Update: {
          cancel_reason?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          expected_date?: string | null;
          id?: string;
          notes?: string | null;
          order_date?: string;
          organization_id?: string;
          status?: string;
          subtotal?: number;
          supplier_id?: string;
          tax_total?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_organization_id_supplier_id_fkey";
            columns: ["organization_id", "supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      purchase_receipt_lines: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          purchase_order_line_id: string;
          quantity: number;
          receipt_id: string;
          reversed_qty: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          purchase_order_line_id: string;
          quantity: number;
          receipt_id: string;
          reversed_qty?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          purchase_order_line_id?: string;
          quantity?: number;
          receipt_id?: string;
          reversed_qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_receipt_lines_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_receipt_lines_organization_id_purchase_order_line_fkey";
            columns: ["organization_id", "purchase_order_line_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_lines";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "purchase_receipt_lines_organization_id_receipt_id_fkey";
            columns: ["organization_id", "receipt_id"];
            isOneToOne: false;
            referencedRelation: "purchase_receipts";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      purchase_receipts: {
        Row: {
          created_at: string;
          created_by: string | null;
          delivery_note_number: string | null;
          id: string;
          notes: string | null;
          organization_id: string;
          purchase_order_id: string;
          received_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          delivery_note_number?: string | null;
          id?: string;
          notes?: string | null;
          organization_id: string;
          purchase_order_id: string;
          received_at: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          delivery_note_number?: string | null;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          purchase_order_id?: string;
          received_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_receipts_organization_id_purchase_order_id_fkey";
            columns: ["organization_id", "purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          balance_after: number | null;
          created_at: string;
          created_by: string | null;
          id: string;
          item_id: string;
          movement_type: string;
          occurred_at: string;
          organization_id: string;
          production_order_id: string | null;
          purchase_receipt_line_id: string | null;
          quantity: number;
          reason: string | null;
          reverses_movement_id: string | null;
          total_cost: number | null;
          unit_cost: number | null;
        };
        ComputedFields: never;
        Insert: {
          balance_after?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_id: string;
          movement_type: string;
          occurred_at?: string;
          organization_id: string;
          production_order_id?: string | null;
          purchase_receipt_line_id?: string | null;
          quantity: number;
          reason?: string | null;
          reverses_movement_id?: string | null;
          total_cost?: number | null;
          unit_cost?: number | null;
        };
        Update: {
          balance_after?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_id?: string;
          movement_type?: string;
          occurred_at?: string;
          organization_id?: string;
          production_order_id?: string | null;
          purchase_receipt_line_id?: string | null;
          quantity?: number;
          reason?: string | null;
          reverses_movement_id?: string | null;
          total_cost?: number | null;
          unit_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_costing";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "stock_movements_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_stock_status";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "stock_movements_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "stock_movements_organization_id_production_order_id_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_order_overview";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "stock_movements_organization_id_production_order_id_fkey";
            columns: ["organization_id", "production_order_id"];
            isOneToOne: false;
            referencedRelation: "production_orders";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "stock_movements_purchase_receipt_line_id_fkey";
            columns: ["purchase_receipt_line_id"];
            isOneToOne: false;
            referencedRelation: "purchase_receipt_lines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_reverses_movement_id_fkey";
            columns: ["reverses_movement_id"];
            isOneToOne: false;
            referencedRelation: "stock_movements";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          address: string | null;
          city: string | null;
          contact_name: string | null;
          created_at: string;
          created_by: string | null;
          cuit: string | null;
          email: string | null;
          id: string;
          legal_name: string | null;
          name: string;
          notes: string | null;
          organization_id: string;
          payment_terms: string | null;
          phone: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          city?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          cuit?: string | null;
          email?: string | null;
          id?: string;
          legal_name?: string | null;
          name: string;
          notes?: string | null;
          organization_id: string;
          payment_terms?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          cuit?: string | null;
          email?: string | null;
          id?: string;
          legal_name?: string | null;
          name?: string;
          notes?: string | null;
          organization_id?: string;
          payment_terms?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          allows_decimals: boolean;
          code: string;
          id: number;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          allows_decimals?: boolean;
          code: string;
          id: number;
          name: string;
        };
        Update: {
          allows_decimals?: boolean;
          code?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      item_costing: {
        Row: {
          item_id: string;
          labor_cost: number | null;
          materials_cost: number | null;
          organization_id: string;
          overhead_cost: number | null;
          standard_cost: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      item_stock_status: {
        Row: {
          available: number | null;
          committed: number | null;
          item_id: string;
          level: string | null;
          min_stock: number;
          organization_id: string;
          physical: number;
          type: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      production_order_overview: {
        Row: {
          actual_labor_cost: number | null;
          actual_material_cost: number | null;
          actual_overhead_cost: number | null;
          actual_unit_cost: number | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          good_qty: number;
          id: string;
          is_delayed: boolean | null;
          item_id: string;
          item_name: string;
          item_sku: string;
          notes: string | null;
          organization_id: string;
          planned_end_date: string | null;
          planned_labor_cost: number;
          planned_material_cost: number;
          planned_overhead_cost: number;
          planned_qty: number;
          planned_start_date: string | null;
          priority: string;
          progress_pct: number | null;
          responsible_employee_id: string | null;
          started_at: string | null;
          status: string;
          unit_code: string;
          updated_at: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "production_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "production_orders_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_costing";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "production_orders_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "item_stock_status";
            referencedColumns: ["organization_id", "item_id"];
          },
          {
            foreignKeyName: "production_orders_organization_id_item_id_fkey";
            columns: ["organization_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "production_orders_organization_id_responsible_employee_id_fkey";
            columns: ["organization_id", "responsible_employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
    };
    Functions: {
      admin_can_share_login_link: { Args: { p_org: string; p_user: string }; Returns: boolean };
      admin_create_demo_organization: { Args: { p_user: string }; Returns: string };
      admin_create_organization: {
        Args: { p_admin_user: string; p_is_demo?: boolean; p_name: string };
        Returns: string;
      };
      admin_delete_organization: {
        Args: { p_confirm_name: string; p_org: string };
        Returns: undefined;
      };
      admin_find_user_by_email: { Args: { p_email: string }; Returns: string };
      admin_list_member_accounts: {
        Args: { p_org: string };
        Returns: {
          email: string;
          last_sign_in_at: string;
          user_id: string;
        }[];
      };
      admin_set_public_demo: { Args: { p_org: string }; Returns: undefined };
      cancel_production_order: {
        Args: { p_id: string; p_reason: string; p_returns: Json };
        Returns: {
          actual_labor_cost: number | null;
          actual_material_cost: number | null;
          actual_overhead_cost: number | null;
          actual_unit_cost: number | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          good_qty: number;
          id: string;
          item_id: string;
          notes: string | null;
          organization_id: string;
          planned_end_date: string | null;
          planned_labor_cost: number;
          planned_material_cost: number;
          planned_overhead_cost: number;
          planned_qty: number;
          planned_start_date: string | null;
          priority: string;
          responsible_employee_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "production_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cancel_purchase_order: {
        Args: { p_id: string; p_reason: string };
        Returns: {
          cancel_reason: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          expected_date: string | null;
          id: string;
          notes: string | null;
          order_date: string;
          organization_id: string;
          status: string;
          subtotal: number;
          supplier_id: string;
          tax_total: number;
          total: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "purchase_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      complete_production_order: {
        Args: {
          p_consumptions: Json;
          p_defective: number;
          p_good: number;
          p_hours: Json;
          p_id: string;
          p_note: string;
        };
        Returns: {
          actual_labor_cost: number | null;
          actual_material_cost: number | null;
          actual_overhead_cost: number | null;
          actual_unit_cost: number | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          good_qty: number;
          id: string;
          item_id: string;
          notes: string | null;
          organization_id: string;
          planned_end_date: string | null;
          planned_labor_cost: number;
          planned_material_cost: number;
          planned_overhead_cost: number;
          planned_qty: number;
          planned_start_date: string | null;
          priority: string;
          responsible_employee_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "production_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      confirm_purchase_order: {
        Args: { p_id: string };
        Returns: {
          cancel_reason: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          expected_date: string | null;
          id: string;
          notes: string | null;
          order_date: string;
          organization_id: string;
          status: string;
          subtotal: number;
          supplier_id: string;
          tax_total: number;
          total: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "purchase_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_manual_movement: {
        Args: {
          p_item: string;
          p_quantity: number;
          p_reason: string;
          p_type: string;
          p_unit_cost?: number;
        };
        Returns: {
          balance_after: number | null;
          created_at: string;
          created_by: string | null;
          id: string;
          item_id: string;
          movement_type: string;
          occurred_at: string;
          organization_id: string;
          production_order_id: string | null;
          purchase_receipt_line_id: string | null;
          quantity: number;
          reason: string | null;
          reverses_movement_id: string | null;
          total_cost: number | null;
          unit_cost: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "stock_movements";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_production_order: {
        Args: {
          p_employee_ids: string[];
          p_item: string;
          p_notes: string;
          p_planned_end: string;
          p_planned_qty: number;
          p_planned_start: string;
          p_priority: string;
          p_responsible: string;
        };
        Returns: {
          actual_labor_cost: number | null;
          actual_material_cost: number | null;
          actual_overhead_cost: number | null;
          actual_unit_cost: number | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          good_qty: number;
          id: string;
          item_id: string;
          notes: string | null;
          organization_id: string;
          planned_end_date: string | null;
          planned_labor_cost: number;
          planned_material_cost: number;
          planned_overhead_cost: number;
          planned_qty: number;
          planned_start_date: string | null;
          priority: string;
          responsible_employee_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "production_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_purchase_from_shortages: {
        Args: { p_order: string; p_supplier: string };
        Returns: {
          cancel_reason: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          expected_date: string | null;
          id: string;
          notes: string | null;
          order_date: string;
          organization_id: string;
          status: string;
          subtotal: number;
          supplier_id: string;
          tax_total: number;
          total: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "purchase_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_stock_adjustment: {
        Args: { p_counted_qty: number; p_item: string; p_reason: string };
        Returns: {
          balance_after: number | null;
          created_at: string;
          created_by: string | null;
          id: string;
          item_id: string;
          movement_type: string;
          occurred_at: string;
          organization_id: string;
          production_order_id: string | null;
          purchase_receipt_line_id: string | null;
          quantity: number;
          reason: string | null;
          reverses_movement_id: string | null;
          total_cost: number | null;
          unit_cost: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "stock_movements";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      dashboard_data: { Args: { p_org: string }; Returns: Json };
      receive_purchase_order: {
        Args: { p_delivery_note: string; p_id: string; p_lines: Json; p_received_at: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          delivery_note_number: string | null;
          id: string;
          notes: string | null;
          organization_id: string;
          purchase_order_id: string;
          received_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "purchase_receipts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      recent_activity: {
        Args: { p_limit?: number; p_org: string };
        Returns: {
          actor_name: string;
          entity_id: string;
          entity_type: string;
          id: string;
          occurred_at: string;
          summary: string;
        }[];
      };
      report_production_progress: {
        Args: {
          p_defective: number;
          p_employee: string;
          p_good: number;
          p_id: string;
          p_notes: string;
          p_report_date: string;
        };
        Returns: {
          actual_labor_cost: number | null;
          actual_material_cost: number | null;
          actual_overhead_cost: number | null;
          actual_unit_cost: number | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          good_qty: number;
          id: string;
          item_id: string;
          notes: string | null;
          organization_id: string;
          planned_end_date: string | null;
          planned_labor_cost: number;
          planned_material_cost: number;
          planned_overhead_cost: number;
          planned_qty: number;
          planned_start_date: string | null;
          priority: string;
          responsible_employee_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "production_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reset_demo_organization: { Args: { p_org: string }; Returns: undefined };
      return_to_production: {
        Args: { p_id: string; p_note: string };
        Returns: {
          actual_labor_cost: number | null;
          actual_material_cost: number | null;
          actual_overhead_cost: number | null;
          actual_unit_cost: number | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          good_qty: number;
          id: string;
          item_id: string;
          notes: string | null;
          organization_id: string;
          planned_end_date: string | null;
          planned_labor_cost: number;
          planned_material_cost: number;
          planned_overhead_cost: number;
          planned_qty: number;
          planned_start_date: string | null;
          priority: string;
          responsible_employee_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "production_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reverse_purchase_receipt: {
        Args: { p_lines: Json; p_reason: string; p_receipt: string };
        Returns: undefined;
      };
      reverse_stock_movement: {
        Args: { p_movement: string; p_reason: string };
        Returns: {
          balance_after: number | null;
          created_at: string;
          created_by: string | null;
          id: string;
          item_id: string;
          movement_type: string;
          occurred_at: string;
          organization_id: string;
          production_order_id: string | null;
          purchase_receipt_line_id: string | null;
          quantity: number;
          reason: string | null;
          reverses_movement_id: string | null;
          total_cost: number | null;
          unit_cost: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "stock_movements";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_bom: {
        Args: {
          p_default_waste_pct: number;
          p_item: string;
          p_lines: Json;
          p_notes: string;
          p_output_qty: number;
        };
        Returns: string;
      };
      send_to_quality_check: {
        Args: { p_id: string };
        Returns: {
          actual_labor_cost: number | null;
          actual_material_cost: number | null;
          actual_overhead_cost: number | null;
          actual_unit_cost: number | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          good_qty: number;
          id: string;
          item_id: string;
          notes: string | null;
          organization_id: string;
          planned_end_date: string | null;
          planned_labor_cost: number;
          planned_material_cost: number;
          planned_overhead_cost: number;
          planned_qty: number;
          planned_start_date: string | null;
          priority: string;
          responsible_employee_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "production_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      start_production_order: {
        Args: { p_id: string };
        Returns: {
          actual_labor_cost: number | null;
          actual_material_cost: number | null;
          actual_overhead_cost: number | null;
          actual_unit_cost: number | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          defective_qty: number;
          good_qty: number;
          id: string;
          item_id: string;
          notes: string | null;
          organization_id: string;
          planned_end_date: string | null;
          planned_labor_cost: number;
          planned_material_cost: number;
          planned_overhead_cost: number;
          planned_qty: number;
          planned_start_date: string | null;
          priority: string;
          responsible_employee_id: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "production_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_demo_request: {
        Args: {
          p_company: string;
          p_email: string;
          p_industry: string;
          p_ip_hash: string;
          p_message: string;
          p_name: string;
          p_phone: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin";
      membership_status: "active" | "disabled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
      membership_status: ["active", "disabled"],
    },
  },
} as const;
