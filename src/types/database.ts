/**
 * PROVISORIO (Etapa 3, Task 9): tipos escritos a mano para las tablas que usa la capa de acceso.
 * Se reemplaza por el archivo generado con `npm run db:types` al vincular el proyecto de Supabase.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type AppRoleEnum = "admin";
type MembershipStatusEnum = "active" | "disabled";

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          cuit: string | null;
          address: string | null;
          city: string | null;
          province: string | null;
          phone: string | null;
          email: string | null;
          logo_path: string | null;
          is_demo: boolean;
          default_waste_pct: number;
          default_labor_rate: number;
          allow_negative_stock: boolean;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; is_demo?: boolean };
        Update: {
          name?: string;
          legal_name?: string | null;
          cuit?: string | null;
          address?: string | null;
          city?: string | null;
          province?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_path?: string | null;
          default_waste_pct?: number;
          default_labor_rate?: number;
          allow_negative_stock?: boolean;
          timezone?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_path: string | null;
          last_organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { id: string; full_name: string };
        Update: { full_name?: string; avatar_path?: string | null; last_organization_id?: string | null };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: AppRoleEnum;
          status: MembershipStatusEnum;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: AppRoleEnum;
          status?: MembershipStatusEnum;
          invited_by?: string | null;
        };
        Update: { role?: AppRoleEnum; status?: MembershipStatusEnum };
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
    };
    Views: { [_ in never]: never };
    Functions: {
      submit_demo_request: {
        Args: {
          p_name: string;
          p_company: string;
          p_email: string;
          p_phone: string;
          p_industry: string;
          p_message: string;
          p_ip_hash: string;
        };
        Returns: undefined;
      };
      reset_demo_organization: { Args: { p_org: string }; Returns: undefined };
    };
    Enums: {
      app_role: AppRoleEnum;
      membership_status: MembershipStatusEnum;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
