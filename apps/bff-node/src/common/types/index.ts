export interface Money {
  amount: number;
  currency: string;
}

export enum AvailabilityStatus {
  IN_STOCK = 'IN_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  PREORDER = 'PREORDER',
}

export interface Availability {
  inStock: boolean;
  quantity?: number;
  status: AvailabilityStatus;
}

export interface ProductSummary {
  id: string;
  provider: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  price: Money;
  imageUrl?: string;
  availability: Availability;
  rating?: number;
  reviewCount?: number;
  attributes?: Record<string, any>;
}

export interface ProductDetails extends ProductSummary {
  longDescription?: string;
  specifications?: Record<string, string>;
  images?: string[];
  variants?: any[];
}

export interface CartItem {
  productId: string;
  provider: string;
  quantity: number;
  unitPrice: Money;
  product?: ProductSummary;
  metadata?: Record<string, any>;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: Money;
  tax?: Money;
  total: Money;
  currency: string;
  itemCount: number;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  COD = 'COD',
  CARD = 'CARD',
  UPI = 'UPI',
  WALLET = 'WALLET',
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pincode: string;
  country: string;
}

export interface Order {
  id: string;
  userId: string;
  provider: string;
  providerOrderId?: string;
  status: OrderStatus;
  items: CartItem[];
  total: Money;
  paymentMethod: PaymentMethod;
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface OrderEvent {
  status: string;
  message?: string;
  timestamp: string;
}

export enum ToolErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ToolError {
  code: ToolErrorCode;
  message: string;
  details?: Record<string, any>;
  provider?: string;
}

export interface ToolResponse<T = any> {
  ok: boolean;
  traceId: string;
  data?: T;
  error?: ToolError;
}

export interface Pagination {
  page: number;
  limit: number;
  total?: number;
  hasMore?: boolean;
}

export interface SearchFilters {
  categories?: string[];
  priceMin?: number;
  priceMax?: number;
  brands?: string[];
  inStock?: boolean;
  rating?: number;
}

export enum SortBy {
  RELEVANCE = 'relevance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING = 'rating',
  NEWEST = 'newest',
}

export interface SearchProductsRequest {
  query: string;
  filters?: SearchFilters;
  pagination?: Partial<Pagination>;
  sortBy?: SortBy;
}

export interface SearchProductsResponse {
  products: ProductSummary[];
  total: number;
  pagination?: Pagination;
}

export interface CompareProductsRequest {
  productIds: string[];
}

export interface CompareProductsResponse {
  products: ProductDetails[];
  comparisonMatrix?: Record<string, string[]>;
  recommendation?: string;
}

export interface AddItemRequest {
  userId: string;
  productId: string;
  provider: string;
  quantity: number;
  idempotencyKey?: string;
}

export interface UpdateItemQtyRequest {
  userId: string;
  productId: string;
  quantity: number;
  idempotencyKey?: string;
}

export interface RemoveItemRequest {
  userId: string;
  productId: string;
  idempotencyKey?: string;
}

export interface GetCartRequest {
  userId: string;
}

export interface CreateOrderRequest {
  userId: string;
  cartId: string;
  addressId: string;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
}

export interface GetOrderStatusRequest {
  userId: string;
  orderId: string;
}

export interface GetOrderStatusResponse {
  order: Order;
  events?: OrderEvent[];
}

export enum Intent {
  PRODUCT_SEARCH = 'PRODUCT_SEARCH',
  PRODUCT_COMPARE = 'PRODUCT_COMPARE',
  ADD_TO_CART = 'ADD_TO_CART',
  UPDATE_CART_QTY = 'UPDATE_CART_QTY',
  REMOVE_FROM_CART = 'REMOVE_FROM_CART',
  CHECKOUT = 'CHECKOUT',
  CREATE_ORDER = 'CREATE_ORDER',
  ORDER_STATUS = 'ORDER_STATUS',
  POLICY_QA = 'POLICY_QA',
  GENERAL_CHAT = 'GENERAL_CHAT',
}

export interface IntentFrame {
  intent: Intent;
  canonicalCategoryId?: string;
  filters?: SearchFilters;
  query?: string;
  entities?: Record<string, any>;
  needClarification: boolean;
  confidence: number;
}
