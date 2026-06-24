import { loadMercadoPago } from '@mercadopago/sdk-js';

type BrickController = {
  unmount: () => void;
};

type MercadoPagoInstance = {
  initialize: (options: { publicKey: string }) => Promise<void>;
  bricks: () => {
    create: (
      brick: string,
      containerId: string,
      settings: Record<string, unknown>,
    ) => Promise<BrickController>;
  };
};

export async function mountCardPaymentBrick(
  containerId: string,
  publicKey: string,
  amount: number,
  onToken: (token: string) => void | Promise<void>,
): Promise<() => void> {
  const mp = (await loadMercadoPago()) as MercadoPagoInstance;
  await mp.initialize({ publicKey });

  const bricksBuilder = mp.bricks();
  const controller = await bricksBuilder.create('cardPayment', containerId, {
    initialization: {
      amount,
    },
    callbacks: {
      onSubmit: async (cardFormData: { token?: string }) => {
        if (!cardFormData.token) {
          throw new Error('Não foi possível tokenizar o cartão.');
        }

        await onToken(cardFormData.token);
      },
      onError: (error: unknown) => {
        console.error('Mercado Pago brick error', error);
      },
    },
  }) as BrickController;

  return () => controller.unmount();
}