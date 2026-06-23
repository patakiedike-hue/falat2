export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          email: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          currency: string;
          language: string;
          timezone: string;
          operating_hours: Json | null;
          delivery_fee: number;
          min_order_amount: number;
          delivery_radius_km: number;
          settings: Json | null;
          license_status: string;
          license_expires_at: string | null;
          plan: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          currency?: string;
          language?: string;
          timezone?: string;
          operating_hours?: Json | null;
          delivery_fee?: number;
          min_order_amount?: number;
          delivery_radius_km?: number;
          settings?: Json | null;
          license_status?: string;
          license_expires_at?: string | null;
          plan?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          email?: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          currency?: string;
          language?: string;
          timezone?: string;
          operating_hours?: Json | null;
          delivery_fee?: number;
          min_order_amount?: number;
          delivery_radius_km?: number;
          settings?: Json | null;
          license_status?: string;
          license_expires_at?: string | null;
          plan?: string;
          is_active?: boolean;
        };
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          order_number: string;
          table_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          delivery_address: string | null;
          delivery_city: string | null;
          delivery_postal_code: string | null;
          delivery_notes: string | null;
          delivery_lat: number | null;
          delivery_lng: number | null;
          order_type: string;
          status: string;
          payment_status: string;
          payment_method: string | null;
          subtotal: number;
          delivery_fee: number;
          discount: number;
          tax: number;
          total: number;
          estimated_delivery_at: string | null;
          delivered_at: string | null;
          notes: string | null;
          internal_notes: string | null;
          courier_id: string | null;
          courier_status: string | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_number?: string;
          table_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_email?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          delivery_postal_code?: string | null;
          delivery_notes?: string | null;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          order_type?: string;
          status?: string;
          payment_status?: string;
          payment_method?: string | null;
          subtotal: number;
          delivery_fee?: number;
          discount?: number;
          tax?: number;
          total: number;
          estimated_delivery_at?: string | null;
          delivered_at?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
          courier_id?: string | null;
          courier_status?: string | null;
          source?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_number?: string;
          table_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_email?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          delivery_postal_code?: string | null;
          delivery_notes?: string | null;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          order_type?: string;
          status?: string;
          payment_status?: string;
          payment_method?: string | null;
          subtotal?: number;
          delivery_fee?: number;
          discount?: number;
          tax?: number;
          total?: number;
          estimated_delivery_at?: string | null;
          delivered_at?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
          courier_id?: string | null;
          courier_status?: string | null;
          source?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          role: string;
          name: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          role?: string;
          name?: string | null;
          phone?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string;
          role?: string;
          name?: string | null;
          phone?: string | null;
          is_active?: boolean;
        };
      };
    };
    Functions: {
      get_tenant_by_domain: {
        Args: { p_domain: string };
        Returns: Database['public']['Tables']['tenants']['Row'];
      };
      generate_order_number: {
        Args: { p_tenant_id: string };
        Returns: string;
      };
      check_ingredient_availability: {
        Args: { p_product_id: string };
        Returns: {
          inventory_item_id: string;
          name: string;
          current_stock: number;
          required_qty: number;
          is_available: boolean;
        }[];
      };
      get_low_stock_alerts: {
        Args: { p_tenant_id: string };
        Returns: {
          id: string;
          name: string;
          current_stock: number;
          min_stock: number;
          shortage_percent: number;
        }[];
      };
    };
  };
}
