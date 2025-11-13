/**
 * PayPal JavaScript SDK v6 Integration Service
 * Supports: PayPal, Pay Later, PayPal Credit, Google Pay, Apple Pay
 */

// Types for PayPal SDK v6
interface PayPalSDKInstance {
    findEligibleMethods: (options: { currencyCode: string }) => Promise<EligibleMethods>;
    createPayPalOneTimePaymentSession: (options: PaymentSessionOptions) => PaymentSession;
    createPayLaterOneTimePaymentSession: (options: PaymentSessionOptions) => PaymentSession;
    createPayPalCreditOneTimePaymentSession: (options: PaymentSessionOptions) => PaymentSession;
    createGooglePayOneTimePaymentSession: (options: PaymentSessionOptions) => PaymentSession;
    createApplePayOneTimePaymentSession: (options: PaymentSessionOptions) => PaymentSession;
}

interface EligibleMethods {
    isEligible: (method: string) => boolean;
    getDetails: (method: string) => PaymentMethodDetails;
}

interface PaymentMethodDetails {
    productCode?: string;
    countryCode?: string;
}

interface PaymentSessionOptions {
    onApprove: (data: { orderId: string }) => Promise<void>;
    onCancel?: (data: any) => void;
    onError?: (error: any) => void;
}

interface PaymentSession {
    start: (config: { presentationMode: string }, orderPromise: Promise<{ orderId: string }>) => Promise<void>;
}

interface CreateOrderOptions {
    amount: number;
    currency: string;
    description: string;
    isSubscription?: boolean;
    items?: Array<{
        id: string;
        name: string;
        quantity: number;
        price: number;
    }>;
}

class PayPalSDKv6Service {
    private sdkInstance: PayPalSDKInstance | null = null;
    private isInitialized = false;
    private initializationPromise: Promise<PayPalSDKInstance> | null = null;    /**
     * Load PayPal SDK v6 script
     */
    private async loadSDK(): Promise<void> {
        if (document.getElementById('paypal-sdk-v6-script')) {
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = 'paypal-sdk-v6-script';
            script.src = 'https://www.sandbox.paypal.com/web-sdk/v6/core';
            script.async = true;

            script.onload = () => {
                console.log('[PayPal SDK v6] Script loaded successfully');
                resolve();
            };

            script.onerror = () => {
                console.error('[PayPal SDK v6] Failed to load script');
                reject(new Error('Failed to load PayPal SDK v6'));
            };

            document.body.appendChild(script);
        });
    }

    /**
     * Get client token from server
     */
    private async getClientToken(): Promise<string> {
        try {
            const response = await fetch('/api/paypal/auth/client-token', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Failed to get client token');
            }

            const data = await response.json();
            return data.clientToken;
        } catch (error) {
            console.error('[PayPal SDK v6] Error getting client token:', error);
            throw error;
        }
    }

    /**
     * Initialize PayPal SDK v6
     */
    async initialize(): Promise<PayPalSDKInstance> {
        if (this.isInitialized && this.sdkInstance) {
            return this.sdkInstance;
        }

        if (this.initializationPromise) {
            await this.initializationPromise;
            return this.sdkInstance!;
        }

        this.initializationPromise = (async (): Promise<PayPalSDKInstance> => {
            try {
                console.log('[PayPal SDK v6] Initializing...');

                // Load SDK script
                await this.loadSDK();

                // Wait for window.paypal to be available
                if (!window.paypal) {
                    throw new Error('PayPal SDK not loaded');
                }

                const paypal = window.paypal as any;
                if (!paypal.createInstance) {
                    throw new Error('PayPal createInstance not available');
                }

                // Get client token
                const clientToken = await this.getClientToken();

                // Create SDK instance
                this.sdkInstance = await paypal.createInstance({
                    clientToken,
                    components: ['paypal-payments'],
                    pageType: 'checkout',
                }); this.isInitialized = true;
                console.log('[PayPal SDK v6] Initialized successfully');

                if (!this.sdkInstance) {
                    throw new Error('Failed to create SDK instance');
                }

                return this.sdkInstance;
            } catch (error) {
                console.error('[PayPal SDK v6] Initialization failed:', error);
                this.initializationPromise = null;
                throw error;
            }
        })(); await this.initializationPromise;
        return this.sdkInstance!;
    }

    /**
     * Check eligible payment methods
     */
    async checkEligibility(currencyCode: string = 'USD'): Promise<{
        paypal: boolean;
        paylater: boolean;
        credit: boolean;
        googlepay: boolean;
        applepay: boolean;
        details: {
            paylater?: PaymentMethodDetails;
            credit?: PaymentMethodDetails;
        };
    }> {
        try {
            const sdkInstance = await this.initialize();
            const methods = await sdkInstance.findEligibleMethods({ currencyCode });

            return {
                paypal: methods.isEligible('paypal'),
                paylater: methods.isEligible('paylater'),
                credit: methods.isEligible('credit'),
                googlepay: methods.isEligible('googlepay'),
                applepay: methods.isEligible('applepay'),
                details: {
                    paylater: methods.isEligible('paylater') ? methods.getDetails('paylater') : undefined,
                    credit: methods.isEligible('credit') ? methods.getDetails('credit') : undefined,
                },
            };
        } catch (error) {
            console.error('[PayPal SDK v6] Error checking eligibility:', error);
            return {
                paypal: false,
                paylater: false,
                credit: false,
                googlepay: false,
                applepay: false,
                details: {},
            };
        }
    }

    /**
     * Create order on server
     */
    async createOrder(options: CreateOrderOptions): Promise<{ orderId: string }> {
        try {
            const response = await fetch('/api/paypal/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options),
            });

            if (!response.ok) {
                throw new Error('Failed to create order');
            }

            const data = await response.json();
            return { orderId: data.id };
        } catch (error) {
            console.error('[PayPal SDK v6] Error creating order:', error);
            throw error;
        }
    }

    /**
     * Capture order on server
     */
    async captureOrder(orderId: string): Promise<any> {
        try {
            const response = await fetch(`/api/paypal/orders/${orderId}/capture`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Failed to capture order');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[PayPal SDK v6] Error capturing order:', error);
            throw error;
        }
    }

    /**
     * Setup PayPal button
     */
    async setupPayPalButton(
        elementId: string,
        createOrderOptions: CreateOrderOptions,
        onSuccess: (data: any) => void,
        onError: (error: any) => void
    ): Promise<void> {
        try {
            const sdkInstance = await this.initialize();

            const paymentSession = sdkInstance.createPayPalOneTimePaymentSession({
                onApprove: async (data) => {
                    try {
                        const orderData = await this.captureOrder(data.orderId);
                        onSuccess(orderData);
                    } catch (error) {
                        onError(error);
                    }
                },
                onCancel: (data) => {
                    console.log('[PayPal] Payment cancelled:', data);
                },
                onError: (error) => {
                    console.error('[PayPal] Payment error:', error);
                    onError(error);
                },
            });

            const button = document.getElementById(elementId);
            if (button) {
                button.removeAttribute('hidden');
                button.addEventListener('click', async () => {
                    try {
                        await paymentSession.start(
                            { presentationMode: 'auto' },
                            this.createOrder(createOrderOptions)
                        );
                    } catch (error) {
                        console.error('[PayPal] Start error:', error);
                        onError(error);
                    }
                });
            }
        } catch (error) {
            console.error('[PayPal SDK v6] Setup PayPal button failed:', error);
            throw error;
        }
    }

    /**
     * Setup Pay Later button
     */
    async setupPayLaterButton(
        elementId: string,
        createOrderOptions: CreateOrderOptions,
        paymentMethodDetails: PaymentMethodDetails,
        onSuccess: (data: any) => void,
        onError: (error: any) => void
    ): Promise<void> {
        try {
            const sdkInstance = await this.initialize();

            const paymentSession = sdkInstance.createPayLaterOneTimePaymentSession({
                onApprove: async (data) => {
                    try {
                        const orderData = await this.captureOrder(data.orderId);
                        onSuccess(orderData);
                    } catch (error) {
                        onError(error);
                    }
                },
                onCancel: (data) => {
                    console.log('[Pay Later] Payment cancelled:', data);
                },
                onError: (error) => {
                    console.error('[Pay Later] Payment error:', error);
                    onError(error);
                },
            });

            const button = document.getElementById(elementId) as any;
            if (button) {
                if (paymentMethodDetails.productCode) {
                    button.productCode = paymentMethodDetails.productCode;
                }
                if (paymentMethodDetails.countryCode) {
                    button.countryCode = paymentMethodDetails.countryCode;
                }
                button.removeAttribute('hidden');
                button.addEventListener('click', async () => {
                    try {
                        await paymentSession.start(
                            { presentationMode: 'auto' },
                            this.createOrder(createOrderOptions)
                        );
                    } catch (error) {
                        console.error('[Pay Later] Start error:', error);
                        onError(error);
                    }
                });
            }
        } catch (error) {
            console.error('[PayPal SDK v6] Setup Pay Later button failed:', error);
            throw error;
        }
    }

    /**
     * Setup PayPal Credit button
     */
    async setupCreditButton(
        elementId: string,
        createOrderOptions: CreateOrderOptions,
        paymentMethodDetails: PaymentMethodDetails,
        onSuccess: (data: any) => void,
        onError: (error: any) => void
    ): Promise<void> {
        try {
            const sdkInstance = await this.initialize();

            const paymentSession = sdkInstance.createPayPalCreditOneTimePaymentSession({
                onApprove: async (data) => {
                    try {
                        const orderData = await this.captureOrder(data.orderId);
                        onSuccess(orderData);
                    } catch (error) {
                        onError(error);
                    }
                },
                onCancel: (data) => {
                    console.log('[Credit] Payment cancelled:', data);
                },
                onError: (error) => {
                    console.error('[Credit] Payment error:', error);
                    onError(error);
                },
            });

            const button = document.getElementById(elementId) as any;
            if (button) {
                if (paymentMethodDetails.countryCode) {
                    button.countryCode = paymentMethodDetails.countryCode;
                }
                button.removeAttribute('hidden');
                button.addEventListener('click', async () => {
                    try {
                        await paymentSession.start(
                            { presentationMode: 'auto' },
                            this.createOrder(createOrderOptions)
                        );
                    } catch (error) {
                        console.error('[Credit] Start error:', error);
                        onError(error);
                    }
                });
            }
        } catch (error) {
            console.error('[PayPal SDK v6] Setup Credit button failed:', error);
            throw error;
        }
    }

    /**
     * Setup Google Pay button
     */
    async setupGooglePayButton(
        elementId: string,
        createOrderOptions: CreateOrderOptions,
        onSuccess: (data: any) => void,
        onError: (error: any) => void
    ): Promise<void> {
        try {
            const sdkInstance = await this.initialize();

            const paymentSession = sdkInstance.createGooglePayOneTimePaymentSession({
                onApprove: async (data) => {
                    try {
                        const orderData = await this.captureOrder(data.orderId);
                        onSuccess(orderData);
                    } catch (error) {
                        onError(error);
                    }
                },
                onCancel: (data) => {
                    console.log('[Google Pay] Payment cancelled:', data);
                },
                onError: (error) => {
                    console.error('[Google Pay] Payment error:', error);
                    onError(error);
                },
            });

            const button = document.getElementById(elementId);
            if (button) {
                button.removeAttribute('hidden');
                button.addEventListener('click', async () => {
                    try {
                        await paymentSession.start(
                            { presentationMode: 'auto' },
                            this.createOrder(createOrderOptions)
                        );
                    } catch (error) {
                        console.error('[Google Pay] Start error:', error);
                        onError(error);
                    }
                });
            }
        } catch (error) {
            console.error('[PayPal SDK v6] Setup Google Pay button failed:', error);
            throw error;
        }
    }

    /**
     * Setup Apple Pay button
     */
    async setupApplePayButton(
        elementId: string,
        createOrderOptions: CreateOrderOptions,
        onSuccess: (data: any) => void,
        onError: (error: any) => void
    ): Promise<void> {
        try {
            const sdkInstance = await this.initialize();

            const paymentSession = sdkInstance.createApplePayOneTimePaymentSession({
                onApprove: async (data) => {
                    try {
                        const orderData = await this.captureOrder(data.orderId);
                        onSuccess(orderData);
                    } catch (error) {
                        onError(error);
                    }
                },
                onCancel: (data) => {
                    console.log('[Apple Pay] Payment cancelled:', data);
                },
                onError: (error) => {
                    console.error('[Apple Pay] Payment error:', error);
                    onError(error);
                },
            });

            const button = document.getElementById(elementId);
            if (button) {
                button.removeAttribute('hidden');
                button.addEventListener('click', async () => {
                    try {
                        await paymentSession.start(
                            { presentationMode: 'auto' },
                            this.createOrder(createOrderOptions)
                        );
                    } catch (error) {
                        console.error('[Apple Pay] Start error:', error);
                        onError(error);
                    }
                });
            }
        } catch (error) {
            console.error('[PayPal SDK v6] Setup Apple Pay button failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const paypalSDKv6 = new PayPalSDKv6Service();
export type { CreateOrderOptions, PaymentMethodDetails };
