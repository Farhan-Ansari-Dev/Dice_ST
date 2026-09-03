/**
 * The single source of truth for the AI consent/disclosure copy.
 *
 * Apple Guidelines 5.1.1(i) / 5.1.2(i) require that, BEFORE any personal or
 * business data is shared with a third-party AI service, the app clearly
 * discloses what is shared, who receives it, and why — and lets the user
 * decline. Every surface (the first-use sheet, the Settings screen, and the
 * Privacy Policy) draws its wording from here so they can never drift apart.
 *
 * ACCURACY RULES (do not violate — this is a legal disclosure):
 *   • Name only the provider actually configured in production. Verified on
 *     2026-09-03 against GET /api/v2/remote-config → aiSettings.provider ===
 *     'openai', baseUrl === '' (⇒ OpenAI's own api.openai.com). See below.
 *   • The data categories below mirror exactly what the backend forwards
 *     (buildCustomerContext + the request payloads). Do not add categories the
 *     backend does not send, and do not omit ones it does.
 *   • Make NO claims about anonymization, encryption, retention, deletion, or
 *     model-training by the provider — none of that is verifiable from our
 *     configuration.
 */

/**
 * The third-party AI provider that receives data in the CURRENT production
 * configuration. If production is ever reconfigured to a different provider
 * (aiSettings.provider), this string and the Privacy Policy MUST be updated to
 * match, or the disclosure becomes inaccurate.
 */
export const AI_PROVIDER_NAME = 'OpenAI';

/** Consent-terms version. Authoritative value comes from the backend; kept here for display only. */
export const AI_CONSENT_TERMS_VERSION = '1.0';

export const AI_CONSENT_TITLE = 'AI-Powered Features';

export const AI_CONSENT_INTRO =
  `Some features in this app are powered by AI. When you use them, the ` +
  `information needed to answer your request is sent to ${AI_PROVIDER_NAME}, a ` +
  `third-party AI service provider, to process it and return a result.`;

/** What is actually shared — mirrors the backend request payloads + buildCustomerContext. */
export const AI_DATA_CATEGORIES: Array<{ icon: string; label: string; detail: string }> = [
  {
    icon: 'business-outline',
    label: 'Your business profile',
    detail:
      'Company name, business role, company size, industries, target export markets, ' +
      'certifications of interest, and country — so answers fit your business.',
  },
  {
    icon: 'chatbubbles-outline',
    label: 'What you type into AI features',
    detail:
      'Your questions and the product details you enter — such as product names, ' +
      'descriptions, HS codes, markets, and trade or risk context.',
  },
  {
    icon: 'document-attach-outline',
    label: 'Documents and photos you choose to analyze',
    detail:
      'Product photos you upload to the AI Quality Analyzer, and the text of any ' +
      'document you submit for AI analysis.',
  },
];

export const AI_CONSENT_PURPOSE =
  `This is used only to generate your result — classifying products, analyzing ` +
  `compliance requirements and risks, and answering your questions.`;

/** Honest boundaries — no unsupported guarantees about the provider. */
export const AI_CONSENT_NOTES: string[] = [
  `${AI_PROVIDER_NAME} processes this information as a third party. We do not control ` +
    `how it handles data beyond our agreement with them; see our Privacy Policy for details.`,
  `You can decline. Declining only turns off AI-powered features — the rest of the app ` +
    `(applications, certifications, documents, payments and more) keeps working normally.`,
  `You can review or withdraw your consent anytime in Settings → AI Features & Privacy.`,
];

export const AI_CONSENT_ALLOW_LABEL = 'Allow AI Features';
export const AI_CONSENT_DECLINE_LABEL = 'Not Now';
