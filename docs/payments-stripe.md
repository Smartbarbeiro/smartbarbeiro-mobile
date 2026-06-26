# Pagamentos com Stripe

O app usa `@capacitor-community/stripe` (Payment Sheet) para cartão, Google Pay e Apple Pay no mesmo fluxo nativo. O backend Laravel cria a assinatura Stripe e devolve os segredos do Payment Sheet.

## Fluxo no app

1. Cliente cadastra e escolhe o plano.
2. Abre o modal de pagamento e toca em **Pagar**.
3. O app chama `POST .../checkout/prepare` e recebe `customer_id`, `customer_ephemeral_key_secret`, `payment_intent_client_secret` e `subscription_id`.
4. A Stripe Payment Sheet abre (cartão / Google Pay / Apple Pay).
5. Após sucesso, o app chama `POST .../checkout/confirm` com `subscription_id`.
6. O Laravel confirma a assinatura (e processa webhooks Stripe).

## API esperada (Laravel)

### Perfil da barbearia (`GET /api/v1/barbearias/{username}`)

```json
{
  "stripe_configured": true,
  "payment_config": {
    "publishable_key": "pk_test_...",
    "currency": "brl",
    "merchant_display_name": "Barbearia Exemplo",
    "apple_pay_merchant_id": "merchant.com.smartbarbeiro.client",
    "google_pay_test_env": true,
    "stripe_account": "acct_..."
  }
}
```

`stripe_account` é o Connected Account da barbearia (Stripe Connect). Omita ou `null` se usar conta única da plataforma.

### Preparar pagamento

`POST /api/v1/barbearias/{username}/service-plans/checkout/prepare`

Body:

```json
{
  "package_type": "cut",
  "addon_ids": [1, 2]
}
```

Resposta:

```json
{
  "customer_id": "cus_...",
  "customer_ephemeral_key_secret": "ek_...",
  "payment_intent_client_secret": "pi_..._secret_...",
  "subscription_id": "sub_...",
  "status": "requires_payment"
}
```

No servidor, crie a assinatura com `payment_behavior: 'default_incomplete'` e expanda `latest_invoice.payment_intent`.

### Confirmar

`POST /api/v1/barbearias/{username}/service-plans/checkout/confirm`

Body:

```json
{
  "subscription_id": "sub_..."
}
```

Resposta:

```json
{
  "status": "authorized",
  "message": "Assinatura ativada com sucesso."
}
```

## Backend (Laravel `.env`)

```env
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MERCHANT_DISPLAY_NAME=Smart Barbeiro

# Apple Pay — Merchant ID no Apple Developer + certificado no Stripe Dashboard
STRIPE_APPLE_PAY_MERCHANT_ID=merchant.com.smartbarbeiro.client

# Google Pay — false em produção
STRIPE_GOOGLE_PAY_TEST_ENV=true
```

Configure **Stripe Connect** para cada barbearia receber repasses. Webhooks recomendados: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.

## iOS (Apple Pay)

1. Merchant ID no Apple Developer (já usado: `merchant.com.smartbarbeiro.client`).
2. Xcode → **Apple Pay** capability.
3. Stripe Dashboard → [iOS certificates](https://dashboard.stripe.com/settings/ios_certificates).

## Android (Google Pay)

1. Habilite Google Pay API no `AndroidManifest.xml` (o plugin `@capacitor-community/stripe` documenta o meta-data necessário).
2. Execute `npm run cap:sync:android` após instalar o plugin.

## Sincronizar após mudanças

```bash
npm run cap:sync:android
npm run cap:sync:ios
```
