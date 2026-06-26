export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number;
  rating: number;
  createdAt: string;
  features?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'failed';
  paymentId?: string;
  shippingAddress: ShippingAddress;
  createdAt: string;
  updatedAt: string;
  assignedCourierUid?: string;
  assignedCourierName?: string;
  deliveryNotes?: string;
  deliveryUpdateDate?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  updatedAt: string;
}
