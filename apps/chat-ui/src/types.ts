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
  attributes?: Record<string, unknown>;
}

export interface CartItem {
  productId: string;
  provider: string;
  quantity: number;
  unitPrice: Money;
  product?: ProductSummary;
  metadata?: Record<string, unknown>;
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

export interface ToolResponse<T> {
  ok: boolean;
  traceId: string;
  data?: T;
  error?: { code: string; message: string };
}

export interface ChatMessageRow {
  id: string;
  role: 'user' | 'assistant';
  content_text: string;
  created_at: string;
}

export type ChatEvent =
  | { type: 'token'; content: string }
  | { type: 'clarification'; question: string; options?: string[]; intent?: string }
  | { type: 'cards'; products: ProductSummary[] }
  | { type: 'comparison'; products: ProductSummary[]; matrix?: Record<string, string[]> }
  | { type: 'cart_updated'; cart: Cart }
  | { type: 'order_created'; order: Order }
  | { type: 'followups'; suggestions: string[] }
  | { type: 'done' }
  | { type: 'error'; error: string };
