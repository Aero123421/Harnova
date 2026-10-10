/**
 * Browser-safe failure vocabulary of the configuration surfaces this package
 * serves. The redacted views themselves live with their seam in
 * `@deepseek-ai/dsh-settings/types`, whose Cordis event declarations already
 * register that file for the Client compilation face.
 *
 * @module @deepseek-ai/dsh-api-settings-controller/types
 */

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /**
     * Every seam refusal that is not a stale write: an unregistered or malformed
     * namespace, a read-only provider, schema validation, storage.
     */
    'settings/rejected': { readonly ns: string }
    /**
     * The stored revision moved after the caller read it. Its own outcome rather
     * than an invalid request: the caller must re-read and re-apply.
     */
    'settings/conflict': { readonly ns: string; readonly expected: number; readonly actual: number }
    /**
     * The provider refused a valid credential write, for example because a
     * read-only source shadows the reference. The details name only the
     * reference, never the value.
     */
    'credential/rejected': { readonly ref: string }
  }
}

/** Confirmation that the settings document was handed to the native editor. */
export interface SettingsDocumentOpenValue {
  readonly opened: true
}

/** Only public state of a credential-obtaining flow crosses to Settings. */
export interface ProviderAuthorizationView {
  key: string
  label: string
  methods: { id: string; label: string }[]
  inFlight: boolean
  configured: boolean
}

/** Private downlink of the initiating login window; never forwarded as Cordis events. */
export type ProviderAuthorizationFrame =
  | { type: 'notice'; message: string; url?: string; code?: string }
  | { type: 'prompt'; id: number; kind: 'text' | 'secret' | 'select'; message: string; placeholder?: string; options?: { id: string; label: string }[] }
  | { type: 'withdraw'; id: number }
  | { type: 'result'; status: 'authorized' | 'cancelled' | 'failed' }

/** A response is valid only for a question on this same Remote stream. */
export interface ProviderAuthorizationAnswer {
  id: number
  value: string
}
