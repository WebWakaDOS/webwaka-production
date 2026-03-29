/**
 * WebWaka Production Suite — Internationalisation (i18n)
 * Blueprint Reference: Part 5.3 — Localisation Strategy
 *
 * Invariant 6: Africa First
 * Default locale is en-NG (Nigerian English).
 * Currency is NGN, formatted in kobo (integer) → naira display.
 * All monetary values stored as integers in kobo (100 kobo = ₦1).
 *
 * Invariant 5: Nigeria First
 * Nigerian states, LGAs, and common manufacturing terms are pre-loaded.
 */

// ─── Locale Types ─────────────────────────────────────────────────────────────
export type SupportedLocale = 'en-NG' | 'en-GH' | 'en-KE' | 'fr-CI' | 'yo-NG' | 'ha-NG' | 'ig-NG';

export const DEFAULT_LOCALE: SupportedLocale = 'en-NG';

// ─── Translation Keys ─────────────────────────────────────────────────────────
type TranslationKey =
  // Common UI
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.view'
  | 'common.loading'
  | 'common.error'
  | 'common.success'
  | 'common.search'
  | 'common.filter'
  | 'common.export'
  | 'common.noData'
  // Auth
  | 'auth.login'
  | 'auth.logout'
  | 'auth.unauthorized'
  | 'auth.sessionExpired'
  // Production Orders
  | 'production.order.create'
  | 'production.order.list'
  | 'production.order.status.draft'
  | 'production.order.status.inProgress'
  | 'production.order.status.completed'
  | 'production.order.status.cancelled'
  // BOM
  | 'production.bom.title'
  | 'production.bom.component'
  | 'production.bom.quantity'
  // Quality
  | 'production.quality.check'
  | 'production.quality.pass'
  | 'production.quality.fail'
  // Errors
  | 'error.network'
  | 'error.unauthorized'
  | 'error.notFound'
  | 'error.serverError'
  // Offline
  | 'offline.banner'
  | 'offline.syncing'
  | 'offline.syncComplete';

// ─── Translations ─────────────────────────────────────────────────────────────
const translations: Record<SupportedLocale, Partial<Record<TranslationKey, string>>> = {
  'en-NG': {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Successful',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.noData': 'No records found',
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.unauthorized': 'You are not authorised to perform this action',
    'auth.sessionExpired': 'Your session has expired. Please login again.',
    'production.order.create': 'Create Production Order',
    'production.order.list': 'Production Orders',
    'production.order.status.draft': 'Draft',
    'production.order.status.inProgress': 'In Progress',
    'production.order.status.completed': 'Completed',
    'production.order.status.cancelled': 'Cancelled',
    'production.bom.title': 'Bill of Materials',
    'production.bom.component': 'Component',
    'production.bom.quantity': 'Quantity',
    'production.quality.check': 'Quality Check',
    'production.quality.pass': 'Pass',
    'production.quality.fail': 'Fail',
    'error.network': 'Network error. Please check your connection.',
    'error.unauthorized': 'Unauthorised. Please login.',
    'error.notFound': 'Record not found.',
    'error.serverError': 'Server error. Please try again.',
    'offline.banner': 'You are offline. Changes will sync when connected.',
    'offline.syncing': 'Syncing...',
    'offline.syncComplete': 'All changes synced.',
  },
  'en-GH': {},
  'en-KE': {},
  'fr-CI': {},
  'yo-NG': {},
  'ha-NG': {},
  'ig-NG': {},
};

// ─── Translation Function ─────────────────────────────────────────────────────
let currentLocale: SupportedLocale = DEFAULT_LOCALE;

export function setLocale(locale: SupportedLocale): void {
  currentLocale = locale;
}

export function t(key: TranslationKey, params?: Record<string, string>): string {
  const localeTranslations = translations[currentLocale];
  const fallback = translations[DEFAULT_LOCALE];
  let text = localeTranslations[key] ?? fallback[key] ?? key;

  if (params) {
    for (const [param, value] of Object.entries(params)) {
      text = text.replace(`{{${param}}}`, value);
    }
  }

  return text;
}

// ─── Currency Formatting (Invariant 5: Nigeria First) ────────────────────────
/**
 * Format kobo (integer) to Nigerian Naira display string.
 * ALL monetary values in the platform are stored as integers in kobo.
 * NEVER use floats for money.
 * Blueprint Reference: Part 5.4 — Currency Handling
 */
export function formatKobo(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(naira);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

// ─── Nigerian States (Invariant 5: Nigeria First) ────────────────────────────
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const;

export type NigerianState = (typeof NIGERIAN_STATES)[number];
