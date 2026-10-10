/** Exact known capabilities, maintained alongside Pi upgrades; never infer from a name prefix. */
import type { Api, Model } from '@earendil-works/pi-ai'
import type { ResolvedPiAiProviderProfile } from './config.ts'

// OpenAI's speed guide documents these models. Account eligibility and the
// tier actually served remain the provider's decision.
// https://developers.openai.com/codex/speed
const FAST_MODELS = new Set(['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna', 'gpt-5.6-sol', 'gpt-5.5'])

/** Custom endpoints and protocol overrides do not inherit OpenAI capabilities. */
export function supportsFastMode(profile: ResolvedPiAiProviderProfile, model: Model<Api>): boolean {
  if (profile.api !== undefined || !FAST_MODELS.has(model.id)) return false
  if (profile.provider !== 'openai' && profile.provider !== 'openai-codex') return false
  if (model.api !== 'openai-responses' && model.api !== 'openai-codex-responses') return false
  const endpoint = new URL(model.baseUrl)
  return endpoint.protocol === 'https:' && (profile.provider === 'openai'
    ? endpoint.hostname === 'api.openai.com'
    : endpoint.hostname === 'chatgpt.com')
}
