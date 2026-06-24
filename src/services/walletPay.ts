import { Capacitor } from '@capacitor/core';
import { Pay, type GooglePayPaymentDataRequest } from '@capgo/capacitor-pay';
import type { PaymentConfig } from '@/types/api';

export type WalletType = 'google_pay' | 'apple_pay';

export interface WalletPaymentResult {
  wallet_type: WalletType;
  wallet_token: string;
}

export type WalletPlatform = 'ios' | 'android' | 'web';

export async function getWalletPlatform(): Promise<WalletPlatform> {
  const platform = Capacitor.getPlatform();

  if (platform === 'ios' || platform === 'android') {
    return platform;
  }

  return 'web';
}

export async function isWalletPayAvailable(
  config: PaymentConfig | null | undefined,
): Promise<{ available: boolean; platform: WalletPlatform }> {
  const platform = await getWalletPlatform();

  if (!config || platform === 'web') {
    return { available: false, platform };
  }

  if (platform === 'ios' && !config.apple_pay_merchant_id) {
    return { available: false, platform };
  }

  try {
    const availability = await Pay.isPayAvailable({
      apple:
        platform === 'ios'
          ? {
              supportedNetworks: ['visa', 'masterCard', 'Elo', 'amex'],
            }
          : undefined,
      google:
        platform === 'android'
          ? {
              isReadyToPayRequest: {
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: [
                  {
                    type: 'CARD',
                    parameters: {
                      allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                      allowedCardNetworks: ['AMEX', 'MASTERCARD', 'VISA', 'ELO'],
                    },
                  },
                ],
              },
            }
          : undefined,
    });

    return { available: availability.available, platform };
  } catch {
    return { available: false, platform };
  }
}

export async function requestWalletPayment(
  config: PaymentConfig,
  amount: number,
  planLabel: string,
): Promise<WalletPaymentResult> {
  const platform = await getWalletPlatform();
  const amountStr = amount.toFixed(2);

  if (platform === 'ios') {
    if (!config.apple_pay_merchant_id) {
      throw new Error('Apple Pay não está configurado.');
    }

    const result = await Pay.requestPayment({
      apple: {
        merchantIdentifier: config.apple_pay_merchant_id,
        countryCode: 'BR',
        currencyCode: config.currency_id,
        supportedNetworks: ['visa', 'masterCard', 'Elo', 'amex'],
        paymentSummaryItems: [
          { label: planLabel, amount: amountStr },
          { label: config.merchant_name, amount: amountStr },
        ],
        recurringPaymentRequest: {
          paymentDescription: planLabel,
          managementURL: 'https://smartbarbeiro.com.br/assinaturas',
          regularBilling: {
            label: planLabel,
            amount: amountStr,
            intervalUnit: 'month',
            intervalCount: 1,
            startDate: Date.now(),
          },
        },
      },
    });

    if (result.platform !== 'ios') {
      throw new Error('Pagamento cancelado.');
    }

    const paymentData = result.apple?.paymentData;

    if (!paymentData) {
      throw new Error('Pagamento cancelado.');
    }

    return { wallet_type: 'apple_pay', wallet_token: paymentData };
  }

  if (platform === 'android') {
    const paymentDataRequest: GooglePayPaymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['AMEX', 'MASTERCARD', 'VISA', 'ELO'],
            billingAddressRequired: false,
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: config.google_pay_gateway || 'example',
              gatewayMerchantId: config.google_pay_gateway_merchant_id || 'exampleGatewayMerchantId',
            },
          },
        },
      ],
      merchantInfo: {
        merchantId: config.google_pay_merchant_id ?? undefined,
        merchantName: config.merchant_name,
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: amountStr,
        currencyCode: config.currency_id,
        countryCode: 'BR',
      },
    };

    const result = await Pay.requestPayment({
      google: {
        environment: config.google_pay_environment === 'production' ? 'production' : 'test',
        paymentDataRequest,
      },
    });

    if (result.platform !== 'android') {
      throw new Error('Pagamento cancelado.');
    }

    const paymentData = result.google?.paymentData;

    if (!paymentData) {
      throw new Error('Pagamento cancelado.');
    }

    return {
      wallet_type: 'google_pay',
      wallet_token: typeof paymentData === 'string' ? paymentData : JSON.stringify(paymentData),
    };
  }

  throw new Error('Google Pay ou Apple Pay não estão disponíveis neste dispositivo.');
}
