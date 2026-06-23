export interface Tenant {
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
  operating_hours: OperatingHours | null;
  delivery_fee: number;
  min_order_amount: number;
  settings: TenantSettings | null;
  license_status: string;
  is_active: boolean;
}

export interface OperatingHours {
  [key: string]: {
    open: string;
    close: string;
    closed?: boolean;
  };
}

export interface TenantSettings {
  accept_cash?: boolean;
  accept_card?: boolean;
  accept_online?: boolean;
  require_phone?: boolean;
  min_delivery_time?: number;
  max_delivery_distance?: number;
  enable_notifications?: boolean;
  kitchen_display_enabled?: boolean;
  auto_print_kitchen?: boolean;
  auto_print_receipt?: boolean;
  default_printers?: {
    kitchen?: string;
    receipt?: string;
  };
}

export interface UserProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'courier';
  name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  original_price: number | null;
  preparation_time_minutes: number;
  is_available: boolean;
  is_featured: boolean;
  is_popular: boolean;
  display_order: number;
  allergens: string[];
  dietary_info: string[];
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  category?: Category;
  variants?: ProductVariant[];
  recipe?: RecipeIngredient[];
}

export interface ProductVariant {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  price_adjustment: number;
  is_available: boolean;
  display_order: number;
}

export interface RestaurantTable {
  id: string;
  tenant_id: string;
  table_number: string;
  name: string | null;
  capacity: number;
  shape: 'square' | 'circle' | 'rectangle';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  section: string | null;
  status: 'available' | 'occupied' | 'reserved' | 'bill_requested';
  is_active: boolean;
  current_order_id?: string | null;
}

export type OrderType = 'delivery' | 'pickup' | 'dine_in';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'online';

export interface Order {
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
  order_type: OrderType;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
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
  items?: OrderItem[];
  table?: RestaurantTable;
  courier?: Courier;
}

export interface OrderItem {
  id: string;
  tenant_id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
  variant_id: string | null;
  variant_name: string | null;
  variant_price_adjustment: number;
  notes: string | null;
  subtotal: number;
  status: string;
  created_at: string;
}

export interface Courier {
  id: string;
  tenant_id: string;
  user_profile_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  vehicle_type: string;
  is_available: boolean;
  is_active: boolean;
  current_lat: number | null;
  current_lng: number | null;
  total_deliveries: number;
  rating: number;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  name: string;
  sku: string | null;
  unit: string;
  current_stock: number;
  min_stock: number;
  unit_cost: number;
  supplier: string | null;
  is_active: boolean;
  last_restocked_at: string | null;
}

export interface RecipeIngredient {
  id: string;
  tenant_id: string;
  product_id: string;
  inventory_item_id: string;
  quantity: number;
  unit: string;
  inventory_item?: InventoryItem;
}

export interface DailyReport {
  id: string;
  tenant_id: string;
  report_date: string;
  report_type: string;
  total_orders: number;
  total_revenue: number;
  cash_total: number;
  card_total: number;
  online_total: number;
  delivery_orders: number;
  pickup_orders: number;
  dine_in_orders: number;
  delivery_fees_collected: number;
  top_products: Array<{ name: string; count: number; revenue: number }>;
  hourly_breakdown: Record<string, { orders: number; revenue: number }>;
  courier_deliveries: Array<{ id: string; name: string; count: number }>;
}

export interface Promotion {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface PrintJob {
  id: string;
  tenant_id: string;
  order_id: string | null;
  job_type: 'kitchen' | 'receipt' | 'courier' | 'daily_report' | 'courier_settlement';
  printer_name: string | null;
  content: string | null;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  printed_at: string | null;
  created_at: string;
}

export interface PlatformAdmin {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  role: 'super_admin' | 'admin' | 'support';
  is_active: boolean;
}

export interface PartnerRequest {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  restaurant_name: string;
  desired_slug: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  tenant_id: string | null;
  processed_by: string | null;
  processed_at: string | null;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  max_orders_per_month: number | null;
  max_users: number | null;
  max_locations: number | null;
  features: string[];
  is_popular: boolean;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// Cart types
export interface CartItem {
  product: Product;
  quantity: number;
  variant: ProductVariant | null;
  notes: string;
}

export interface Cart {
  items: CartItem[];
  orderType: OrderType;
  tableId: string | null;
  promotionCode: string | null;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    postalCode: string;
    notes: string;
  };
}
