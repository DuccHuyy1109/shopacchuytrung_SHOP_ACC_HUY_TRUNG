export interface User {
  id: number;
  username: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: "user" | "admin";
  is_active: boolean;
  balance: number;
  created_at: string | null;
}

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface PriceCategory {
  id: number;
  name: string;
  slug: string;
  min_price: number | null;
  max_price: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface Shop {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface AccountImage {
  id: number;
  image_url: string;
  sort_order: number;
}

export interface AccountListItem {
  id: number;
  account_code: string;
  category_type: string;
  price_category_id: number | null;
  original_price: number;
  sale_price: number;
  upgraded_guns_count: number;
  vip_level: number;
  status: string;
  is_featured: boolean;
  thumbnail: string | null;
  created_at: string | null;
}

export interface ContactInfo {
  name: string;
  zalo_link: string | null;
  facebook_link: string | null;
  phone: string | null;
}

export interface AccountDetail {
  id: number;
  account_code: string;
  category_type: string;
  price_category_id: number | null;
  shop_id?: number | null;
  contact_id: number | null;
  original_price: number;
  sale_price: number;
  upgraded_guns_count: number;
  vip_level: number;
  description: string | null;
  status: string;
  is_featured: boolean;
  view_count: number;
  created_at: string | null;
  updated_at: string | null;
  images: AccountImage[];
  price_category: PriceCategory | null;
  shop?: Shop | null;
  contact: ContactInfo | null;
}

export interface DescriptionTag {
  tag_type: number;
  id: number;
  text: string;
  gia_tien: number;
  sort_order: number;
}

export interface OrderFormField {
  id: number;
  field_key: string;
  label: string;
  field_type: "text" | "textarea" | "number" | "select" | "multiselect";
  options: string[] | null;
  placeholder: string | null;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface BankInfo {
  bank_code: string;
  bank_name: string | null;
  account_number: string;
  account_name: string;
}

export interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  form_data: Record<string, unknown> | null;
  desired_price: number | null;
  vip: number | null;
  note: string | null;
  amount: number | null;
  status: string;
  payment_status: string;
  bill_images?: string[] | null;
  created_at: string | null;
}

export interface OrderCreateResponse {
  order: Order;
  amount: number;
  balance: number;
}

export interface OrderPayResponse {
  order: Order;
  balance: number;
  contact: ContactInfo;
  message: string;
}

export interface DepositRequest {
  id: number;
  deposit_code: string;
  amount: number;
  transfer_content: string;
  status: "pending" | "confirmed" | "rejected";
  bill_images: string[] | null;
  admin_note: string | null;
  created_at: string | null;
  confirmed_at: string | null;
}

export interface DepositPrepareResponse {
  deposit_code: string;
  amount: number;
  transfer_content: string;
  qr_url: string;
  bank: BankInfo;
}

export interface WalletTransaction {
  id: number;
  type: "deposit" | "order_payment" | "adjust" | "refund";
  amount: number;
  balance_after: number;
  ref_type: string | null;
  ref_id: number | null;
  note: string | null;
  created_at: string | null;
}

export interface WalletMe {
  balance: number;
  transactions: WalletTransaction[];
}

export interface AccountBuyResponse {
  account_code: string;
  balance: number;
  contact: ContactInfo;
  message: string;
}

export interface PurchasedAccount {
  account_id: number;
  account_code: string;
  amount: number;
  purchased_at: string | null;
  thumbnail: string | null;
  status: string;
  contact: ContactInfo | null;
}

export interface PostImage {
  id: number;
  image_url: string;
  sort_order: number;
}

export interface Post {
  id: number;
  post_type: "buy" | "sell";
  title: string | null;
  caption: string | null;
  price: number | null;
  status: string;
  is_pinned?: boolean;
  created_at: string | null;
  updated_at?: string | null;
  images: PostImage[];
}

export interface Announcement {
  id: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Guide {
  id: number;
  slug: string;
  title: string;
  content: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface WikiItem {
  id: number;
  name_vi: string;
  icon: string | null;
  category: number;
  genre: number;
  rare: number;
  gender: number;
  level: number | null;
  tags: string | null;
  sub_items: string | null;
}

export interface WikiItemDetail {
  item: WikiItem;
  pieces: WikiItem[];
  bundles: WikiItem[];
}

export interface WikiFacet {
  id: number;
  label: string;
  count: number;
}

export interface WikiMeta {
  genres: WikiFacet[];
  rares: WikiFacet[];
  total: number;
}

export interface DashboardTimePoint {
  date: string;
  accounts: number;
  orders: number;
}

export interface DashboardTopAccount {
  id: number;
  account_code: string;
  sale_price: number;
  contact_count: number;
  view_count: number;
}

export interface DashboardStats {
  total_users: number;
  total_accounts: number;
  available_accounts: number;
  sold_accounts: number;
  total_orders: number;
  pending_orders: number;
  paid_orders: number;
  total_posts: number;
  pending_posts: number;
  approved_posts: number;
  total_account_contacts: number;
  total_post_contacts: number;
  deposit_revenue: number;
  revenue_this_month: number;
  orders_pending_confirm: number;
  timeseries: DashboardTimePoint[];
  top_accounts: DashboardTopAccount[];
  top_viewed: DashboardTopAccount[];
}
