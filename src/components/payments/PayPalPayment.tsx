import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import React, { useState } from 'react';

interface PayPalPaymentProps {
  amount: string;
  currency?: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}

const PayPalPayment: React.FC<PayPalPaymentProps> = ({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);

  const initialOptions = {
    'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    currency: currency,
    intent: 'capture',
    'enable-funding': 'venmo,paylater',
    'disable-funding': '',
    'buyer-country': 'US',
    components: 'buttons,marks,messages'
  };

  const createOrder = (data: any, actions: any) => {
    setLoading(true);
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: amount,
            currency_code: currency
          }
        }
      ]
    });
  };

  const onApprove = async (data: any, actions: any) => {
    try {
      const details = await actions.order.capture();
      console.log('PayPal payment completed:', details);
      
      // Verificar o status do pagamento
      if (details.status === 'COMPLETED') {
        onSuccess?.(details);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('PayPal payment error:', error);
      onError?.(error);
      setLoading(false);
    }
  };

  const onErrorHandler = (error: any) => {
    console.error('PayPal error:', error);
    onError?.(error);
    setLoading(false);
  };

  const onCancelHandler = () => {
    console.log('PayPal payment cancelled');
    onCancel?.();
    setLoading(false);
  };

  if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 rounded">
        <p className="text-red-700">PayPal Client ID não configurado</p>
      </div>
    );
  }

  return (
    <div className="paypal-container">
      {loading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2">Processando pagamento...</span>
        </div>
      )}
      
      <PayPalScriptProvider options={initialOptions}>
        <PayPalButtons
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onErrorHandler}
          onCancel={onCancelHandler}
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal',
            height: 40
          }}
        />
      </PayPalScriptProvider>
      
      <style jsx>{`
        .paypal-container :global(.paypal-buttons) {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default PayPalPayment;
