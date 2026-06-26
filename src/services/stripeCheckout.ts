import { Capacitor } from '@capacitor/core';
import { PaymentSheetEventsEnum, Stripe } from '@capacitor-community/stripe';
import type { CheckoutPrepareResponse, PaymentConfig } from '@/types/api';

let initializedKey: string | null = null;
let initializedAccount: string | null | undefined;

export async function ensureStripeInitialized(config: PaymentConfig): Promise<void> {
  const account = config.stripe_account ?? undefined;

  if (initializedKey === config.publishable_key && initializedAccount === account) {
    return;
  }

  await Stripe.initialize({
    publishableKey: config.publishable_key,
    stripeAccount: account,
  });

  initializedKey = config.publishable_key;
  initializedAccount = account;
}

export async function presentSubscriptionPaymentSheet(
  config: PaymentConfig,
  prepare: CheckoutPrepareResponse,
): Promise<void> {
  await ensureStripeInitialized(config);

  const platform = Capacitor.getPlatform();

  await Stripe.createPaymentSheet({
    paymentIntentClientSecret: prepare.payment_intent_client_secret,
    customerId: prepare.customer_id,
    customerEphemeralKeySecret: prepare.customer_ephemeral_key_secret,
    merchantDisplayName: config.merchant_display_name,
    countryCode: 'BR',
    currencyCode: config.currency.toUpperCase(),
    enableApplePay: platform === 'ios' && Boolean(config.apple_pay_merchant_id),
    applePayMerchantId: config.apple_pay_merchant_id ?? undefined,
    enableGooglePay: platform === 'android',
    GooglePayIsTesting: config.google_pay_test_env,
    style: 'alwaysLight',
  });

  const { paymentResult } = await Stripe.presentPaymentSheet();

  if (paymentResult === PaymentSheetEventsEnum.Canceled) {
    throw new Error('Pagamento cancelado.');
  }

  if (paymentResult === PaymentSheetEventsEnum.Failed) {
    throw new Error('Não foi possível concluir o pagamento.');
  }
}
