# Smart Barbeiro — App do Cliente (Ionic 8)

App mobile para clientes de barbearias: onboarding, leitura de QR Code, montagem de plano e cadastro com checkout Mercado Pago via API Laravel.

## Pré-requisitos

- Node.js 18+
- Laravel backend rodando (`c:\barbearia-app\laravel-cursor`)
- Google OAuth configurado no Laravel (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

## Configuração

```bash
cp .env.example .env
```

Edite `VITE_API_URL` para apontar ao backend:

| Ambiente | URL |
|----------|-----|
| Local (browser) | `http://127.0.0.1:8000` |
| ngrok | `https://seu-subdominio.ngrok-free.dev` |
| Android emulator | `http://10.0.2.2:8000` |
| Celular na rede | `http://192.168.x.x:8000` |

O app busca o Google Client ID automaticamente em `GET /api/v1/auth/google/config`. Opcionalmente defina `VITE_GOOGLE_CLIENT_ID` no `.env`.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build e Android

```bash
npm run build
npx cap sync android
npx cap open android
```

### Permissões

- **Câmera** — já configurada em `android/app/src/main/AndroidManifest.xml` para o scanner QR.

### Google Sign-In no Android

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um **OAuth Web Client** (mesmo usado no Laravel).
2. Crie um **OAuth Android Client** com o package `com.smartbarbeiro.client` e SHA-1 do keystore de debug:

```bash
cd android
./gradlew signingReport
```

3. Use o **Web Client ID** no Laravel `.env` (`GOOGLE_CLIENT_ID`).
4. O plugin `@capgo/capacitor-social-login` usa o Web Client ID em todas as plataformas.

## Fluxo do app

1. **Primeira abertura:** onboarding → escanear QR → montar plano + cadastro (e-mail/senha ou Google)
2. **Próximas aberturas:** login (e-mail/senha ou Google)
3. **Autenticado:** tela inicial com dados da conta

## API Laravel

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/v1/auth/google/config` | Config Google OAuth |
| `POST /api/v1/auth/login` | Login e-mail/senha |
| `POST /api/v1/auth/google` | Login Google (token) |
| `POST /api/v1/auth/google/register` | Cadastro Google + CPF + barbearia |
| `POST /api/v1/auth/register` | Cadastro e-mail/senha |
| `GET /api/v1/barbearias/{username}` | Perfil e planos |
| `POST /api/v1/barbearias/{username}/service-plans/checkout` | Checkout Mercado Pago |

Autenticação via Bearer token (Laravel Sanctum).
