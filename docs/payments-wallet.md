# Pagamentos nativos (Google Pay / Apple Pay)

O app usa `@capgo/capacitor-pay` para abrir as carteiras nativas do Android e iPhone. O backend Mercado Pago cria a assinatura recorrente com `card_token_id` (status `authorized`).

## Fluxo

1. Cliente cadastra e escolhe o plano.
2. Abre o modal de pagamento com **Google Pay** (Android), **Apple Pay** (iOS) ou **cartão** (Mercado Pago Card Brick).
3. O token é enviado para `POST /api/v1/barbearias/{username}/service-plans/checkout` com `payment`.
4. O Laravel autoriza a assinatura no Mercado Pago sem redirecionar para o navegador.

## Backend (Laravel)

Adicione no `.env`:

```env
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_MERCHANT_NAME=Smart Barbeiro

# Apple Pay (iOS) — Merchant ID criado no Apple Developer
MERCADOPAGO_APPLE_PAY_MERCHANT_ID=merchant.com.smartbarbeiro.client

# Google Pay (Android) — após aprovação no Google Pay Business Console
MERCADOPAGO_GOOGLE_PAY_MERCHANT_ID=
MERCADOPAGO_GOOGLE_PAY_GATEWAY=example
MERCADOPAGO_GOOGLE_PAY_GATEWAY_MERCHANT_ID=exampleGatewayMerchantId
MERCADOPAGO_GOOGLE_PAY_ENVIRONMENT=test
```

Em **produção**, configure o gateway do Google Pay com as credenciais fornecidas pelo Mercado Pago (substitua `example` / `exampleGatewayMerchantId`). Em **teste**, o gateway `example` permite validar o fluxo da interface, mas não gera cobranças reais.

## iOS (Apple Pay)

1. No [Apple Developer](https://developer.apple.com), crie um **Merchant ID** (ex.: `merchant.com.smartbarbeiro.client`).
2. No Xcode, abra `ios/App/App.xcworkspace` → target **App** → **Signing & Capabilities** → adicione **Apple Pay** com o mesmo Merchant ID.
3. Confirme que `ios/App/App/App.entitlements` lista o Merchant ID.
4. Registre o domínio/certificado com o Mercado Pago conforme a documentação deles para Apple Pay.
5. Defina `MERCADOPAGO_APPLE_PAY_MERCHANT_ID` no `.env` do Laravel.

Requer Mac + Xcode para build em dispositivo físico (Apple Pay não funciona no simulador para pagamentos reais).

## Android (Google Pay)

1. Configure o perfil comercial no [Google Pay Business Console](https://pay.google.com/business/console).
2. Obtenha o **Merchant ID** do Google e as credenciais de gateway do Mercado Pago.
3. Atualize o `.env` do Laravel com `MERCADOPAGO_GOOGLE_PAY_*`.
4. Execute `npm run cap:sync:android` e teste em dispositivo com Google Pay configurado.

## Fallback com cartão

Se a carteira digital não estiver disponível, o modal exibe o **Mercado Pago Card Payment Brick**, que tokeniza o cartão no dispositivo e envia `card_token_id` ao backend — sem abrir o navegador externo.

## Sincronizar após mudanças

```bash
npm run cap:sync:android
npm run cap:sync:ios
```
