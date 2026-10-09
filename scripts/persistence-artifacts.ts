/** Render generated persistence documentation without file mutation. */

/** One repository-relative generated file and its complete UTF-8 content. */
export interface PersistenceArtifact {
  readonly path: string
  readonly content: string
}

/**
 * Render one persistence document; link validation belongs to the Markdown check.
 * @param source - Repository-relative document path.
 * @param content - Complete Markdown content.
 * @returns The generated document without writing files.
 */
export function renderPersistenceDocument(source: string, content: string): PersistenceArtifact[] {
  return [{ path: source, content }]
}
