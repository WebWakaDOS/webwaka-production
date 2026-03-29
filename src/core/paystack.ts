/**
 * WebWaka Production Suite — Paystack Integration Stub
 * Blueprint Reference: Part 5.4 — Payment Processing
 *
 * Invariant 5: Nigeria First
 * Paystack is the primary payment gateway for the Nigerian market.
 * ALL monetary values are in kobo (integer). NEVER use floats for money.
 *
 * This stub provides the interface contract that the Replit Agent must implement.
 * The full implementation connects to the Paystack API via fetch().
 */

// ─── Paystack Types ───────────────────────────────────────────────────────────
export interface PaystackInitializeRequest {
  email: string;
  amountKobo: number; // ALWAYS in kobo — e.g., ₦1,000 = 100000 kobo
  reference?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  channels?: ('card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer')[];
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amountKobo: number; // Returned in kobo by Paystack
    currency: 'NGN';
    paidAt: string;
    customer: {
      email: string;
      name: string | null;
    };
  };
}

// ─── Paystack Client ──────────────────────────────────────────────────────────
export class PaystackClient {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  /**
   * Initialize a Paystack payment transaction.
   * Returns the authorization URL to redirect the user to.
   * Blueprint Reference: Part 5.4.1 — Payment Initialization
   */
  async initializePayment(
    request: PaystackInitializeRequest
  ): Promise<PaystackInitializeResponse> {
    // TODO (Replit Agent): Implement full Paystack API call
    // Reference: https://paystack.com/docs/api/transaction/#initialize
    throw new Error(
      'PaystackClient.initializePayment() — stub not yet implemented. ' +
      'Replit Agent: implement this using fetch() to POST to https://api.paystack.co/transaction/initialize'
    );
  }

  /**
   * Verify a Paystack payment by reference.
   * ALWAYS verify server-side before crediting any account.
   * Blueprint Reference: Part 5.4.2 — Payment Verification
   */
  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    // TODO (Replit Agent): Implement full Paystack API call
    // Reference: https://paystack.com/docs/api/transaction/#verify
    throw new Error(
      'PaystackClient.verifyPayment() — stub not yet implemented. ' +
      'Replit Agent: implement this using fetch() to GET https://api.paystack.co/transaction/verify/:reference'
    );
  }
}

// ─── Utility Functions ────────────────────────────────────────────────────────
/**
 * Generate a unique Paystack payment reference.
 * Format: PROD-{tenantId}-{timestamp}-{random}
 */
export function generatePaymentReference(tenantId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PROD-${tenantId.substring(0, 8)}-${timestamp}-${random}`;
}

/**
 * Format kobo amount for display.
 * ALWAYS store as kobo, only convert for display.
 */
export function formatKoboAmount(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}
