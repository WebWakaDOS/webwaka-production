/**
 * WebWaka Production Suite — Paystack Integration
 * Blueprint Reference: Part 5.4 — Payment Processing
 *
 * Invariant 5: Nigeria First
 * Paystack is the primary payment gateway for the Nigerian market.
 * ALL monetary values are in kobo (integer). NEVER use floats for money.
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

// Raw Paystack API shapes (snake_case from their API)
interface PaystackRawInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackRawVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number; // kobo from Paystack
    currency: 'NGN';
    paid_at: string;
    customer: {
      email: string;
      first_name: string | null;
      last_name: string | null;
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize a Paystack payment transaction.
   * Returns the authorization URL to redirect the user to.
   * Blueprint Reference: Part 5.4.1 — Payment Initialization
   */
  async initializePayment(
    request: PaystackInitializeRequest
  ): Promise<PaystackInitializeResponse> {
    const body: Record<string, unknown> = {
      email: request.email,
      amount: request.amountKobo, // Paystack API expects amount in kobo
      currency: 'NGN',
    };
    if (request.reference !== undefined) body['reference'] = request.reference;
    if (request.callbackUrl !== undefined) body['callback_url'] = request.callbackUrl;
    if (request.metadata !== undefined) body['metadata'] = request.metadata;
    if (request.channels !== undefined) body['channels'] = request.channels;

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Paystack initialize failed (${res.status}): ${errorText}`);
    }

    const raw = await res.json() as PaystackRawInitResponse;

    return {
      status: raw.status,
      message: raw.message,
      data: {
        authorizationUrl: raw.data.authorization_url,
        accessCode: raw.data.access_code,
        reference: raw.data.reference,
      },
    };
  }

  /**
   * Verify a Paystack payment by reference.
   * ALWAYS verify server-side before crediting any account.
   * Blueprint Reference: Part 5.4.2 — Payment Verification
   */
  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    const encodedRef = encodeURIComponent(reference);
    const res = await fetch(`${this.baseUrl}/transaction/verify/${encodedRef}`, {
      method: 'GET',
      headers: this.headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Paystack verify failed (${res.status}): ${errorText}`);
    }

    const raw = await res.json() as PaystackRawVerifyResponse;
    const customer = raw.data.customer;
    const nameParts = [customer.first_name, customer.last_name].filter(Boolean);

    return {
      status: raw.status,
      message: raw.message,
      data: {
        status: raw.data.status,
        reference: raw.data.reference,
        amountKobo: raw.data.amount, // Already in kobo
        currency: raw.data.currency,
        paidAt: raw.data.paid_at,
        customer: {
          email: customer.email,
          name: nameParts.length > 0 ? nameParts.join(' ') : null,
        },
      },
    };
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
