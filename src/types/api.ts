export interface ApiUser {
  id: number;
  name: string;
  email: string;
  username: string | null;
  is_barbershop: boolean;
  profile_photo_url: string | null;
  primary_barbershop_username: string | null;
}

export interface ServicePackage {
  type: string;
  label: string;
  monthly_price: number;
  formatted_price: string;
  is_enabled: boolean;
}

export interface ServiceAddon {
  id: number;
  label: string;
  monthly_price: number;
  formatted_price: string;
  is_enabled: boolean;
}

export interface BarbershopProfileResponse {
  profile: {
    name: string;
    username: string;
    profile_url: string;
    profile_photo_url: string | null;
    member_since: string;
  };
  service_plans: {
    packages: ServicePackage[];
    addons: ServiceAddon[];
  };
  mercadopago_configured: boolean;
  payment_config: PaymentConfig | null;
}

export interface PaymentConfig {
  public_key: string;
  currency_id: string;
  merchant_name: string;
  apple_pay_merchant_id: string | null;
  google_pay_merchant_id: string | null;
  google_pay_gateway: string;
  google_pay_gateway_merchant_id: string | null;
  google_pay_environment: string;
}

export type CheckoutPaymentPayload =
  | { type: 'card_token'; card_token_id: string }
  | { type: 'wallet'; wallet_type: 'google_pay' | 'apple_pay'; wallet_token: string };

export interface CheckoutResponse {
  checkout_url: string | null;
  status: 'checkout' | 'pending' | 'authorized';
  message?: string;
}

export interface GoogleConfigResponse {
  enabled: boolean;
  client_id: string | null;
}

export interface GoogleRegistrationRequiredResponse {
  status: 'registration_required';
  google_user: {
    name: string;
    email: string;
  };
}
