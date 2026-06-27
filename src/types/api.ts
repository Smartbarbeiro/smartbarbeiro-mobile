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
  stripe_configured: boolean;
  payment_config: PaymentConfig | null;
}

export interface PaymentConfig {
  publishable_key: string;
  currency: string;
  merchant_display_name: string;
  apple_pay_merchant_id: string | null;
  google_pay_test_env: boolean;
  stripe_account: string | null;
}

export interface CheckoutPrepareResponse {
  customer_id: string;
  customer_ephemeral_key_secret: string;
  payment_intent_client_secret: string;
  subscription_id: string;
  status: 'requires_payment';
}

export interface CheckoutResponse {
  checkout_url: string | null;
  status: 'checkout' | 'pending' | 'authorized';
  message?: string;
}

export interface BarbershopSearchResult {
  username: string;
  name: string;
  profile_photo_url: string | null;
}

export interface BarbershopSearchResponse {
  profile_base_url: string;
  results: BarbershopSearchResult[];
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
