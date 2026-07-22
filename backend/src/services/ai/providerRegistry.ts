/**
 * Provider routing table.
 *
 * Every supported provider is reachable through the OpenAI-compatible client we
 * already depend on — NVIDIA NIM, Google Gemini and Anthropic all publish
 * OpenAI-compatible endpoints, and Ollama implements the same surface. That
 * means switching provider is a base-URL and model change, with no new SDK and
 * no new dependency.
 *
 * Adding a provider = one entry here.
 */
import type { ProviderName } from '../../models/AIProviderCredential';

export interface ProviderSpec {
  label: string;
  /** undefined = the OpenAI SDK default (api.openai.com). */
  baseUrl?: string;
  /** Used when Remote Config does not name a model. */
  defaultChatModel: string;
  /** Vision-capable model. null = this provider cannot do vision here. */
  defaultVisionModel: string | null;
  /** Whether a key is required. Ollama is typically unauthenticated. */
  requiresKey: boolean;
  /** Blocked as a production provider — see productionEligible checks. */
  developmentOnly?: boolean;
}

export const PROVIDERS: Record<ProviderName, ProviderSpec> = {
  nvidia: {
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultChatModel: 'meta/llama-3.3-70b-instruct',
    defaultVisionModel: 'meta/llama-3.2-90b-vision-instruct',
    requiresKey: true,
  },
  openai: {
    label: 'OpenAI',
    baseUrl: undefined,
    defaultChatModel: 'gpt-4o-mini',
    defaultVisionModel: 'gpt-4o',
    requiresKey: true,
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultChatModel: 'gemini-2.0-flash',
    defaultVisionModel: 'gemini-2.0-flash',
    requiresKey: true,
  },
  claude: {
    label: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1/',
    defaultChatModel: 'claude-sonnet-4-5',
    defaultVisionModel: 'claude-sonnet-4-5',
    requiresKey: true,
  },
  azure: {
    label: 'Azure OpenAI',
    // Azure is per-resource; the endpoint must be supplied via
    // aiSettings.baseUrl because it embeds the customer's resource name.
    baseUrl: undefined,
    defaultChatModel: 'gpt-4o-mini',
    defaultVisionModel: 'gpt-4o',
    requiresKey: true,
  },
  ollama: {
    label: 'Ollama (local)',
    baseUrl: 'http://127.0.0.1:11434/v1',
    defaultChatModel: 'llama3.1',
    defaultVisionModel: 'llama3.2-vision',
    requiresKey: false,
    developmentOnly: true,
  },
};

export const PROVIDER_LIST = Object.keys(PROVIDERS) as ProviderName[];

export function isKnownProvider(name: string): name is ProviderName {
  return PROVIDER_LIST.includes(name as ProviderName);
}

/** Ollama is never a production provider — unmanaged local models must not
 *  produce compliance output for customers. */
export function isProviderAllowedHere(name: ProviderName): boolean {
  if (!PROVIDERS[name].developmentOnly) return true;
  return process.env.NODE_ENV !== 'production';
}
