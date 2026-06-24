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
}

export interface CheckoutResponse {
  checkout_url: string | null;
  status: 'checkout' | 'pending';
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
