import { AgentDIDDocument } from '../core/types';
import { generateAgentMetadataHash } from '../crypto/hash';
import {
  DIDResolver,
  ResolverResolutionEvent,
  ResolverCacheStats,
  UniversalResolverConfig
} from './types';

interface CachedDocument {
  document: AgentDIDDocument;
  expiresAt: number;
}

export class UniversalResolverClient implements DIDResolver {
  private readonly registry;
  private readonly documentSource;
  private readonly fallbackResolver;
  private readonly cacheTtlMs: number;
  private readonly onResolutionEvent;
  private readonly cache = new Map<string, CachedDocument>();
  private hits = 0;
  private misses = 0;

  constructor(private readonly config: UniversalResolverConfig) {
    this.registry = config.registry;
    this.documentSource = config.documentSource;
    this.fallbackResolver = config.fallbackResolver;
    this.cacheTtlMs = config.cacheTtlMs ?? 60_000;
    this.onResolutionEvent = config.onResolutionEvent;
  }

  public registerDocument(document: AgentDIDDocument): void {
    const did = document.id;
    this.cache.set(did, {
      document: this.clone(document),
      expiresAt: Date.now() + this.cacheTtlMs
    });

    if (this.documentSource.storeByReference) {
      const documentRef = this.computeDocumentReference(document);
      this.documentSource.storeByReference(documentRef, this.clone(document)).catch(() => {
        // Non-critical: cache is already updated, external store failure is tolerable
      });
    }
  }

  public async resolve(did: string): Promise<AgentDIDDocument> {
    const startedAt = Date.now();
    const cached = this.cache.get(did);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      this.hits += 1;
      this.emitEvent({ did, stage: 'cache-hit', durationMs: Date.now() - startedAt });
      return this.clone(cached.document);
    }

    this.misses += 1;
    this.emitEvent({ did, stage: 'cache-miss', durationMs: Date.now() - startedAt });
    this.emitEvent({ did, stage: 'registry-lookup', durationMs: Date.now() - startedAt });
    const record = await this.registry.getRecord(did);

    if (!record) {
      return this.resolveWithFallback(did, `DID not found in registry: ${did}`, startedAt);
    }

    if (!record.documentRef) {
      return this.resolveWithFallback(did, `Missing documentRef for DID: ${did}`, startedAt);
    }

    this.emitEvent({
      did,
      stage: 'source-fetch',
      durationMs: Date.now() - startedAt,
      message: `documentRef=${record.documentRef}`
    });

    const resolved = await this.documentSource.getByReference(record.documentRef).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.emitEvent({ did, stage: 'error', durationMs: Date.now() - startedAt, message });
      return this.resolveWithFallback(did, message, startedAt);
    });

    if (!resolved) {
      return this.resolveWithFallback(did, `Document not found for reference: ${record.documentRef}`, startedAt);
    }

    if (resolved.id !== did) {
      throw new Error(`Resolved document DID mismatch. Expected ${did}, got ${resolved.id}`);
    }

    this.emitEvent({ did, stage: 'source-fetched', durationMs: Date.now() - startedAt });

    this.cache.set(did, {
      document: this.clone(resolved),
      expiresAt: now + this.cacheTtlMs
    });

    this.emitEvent({ did, stage: 'resolved', durationMs: Date.now() - startedAt });

    return this.clone(resolved);
  }

  public remove(did: string): void {
    this.cache.delete(did);
    this.fallbackResolver?.remove(did);
  }

  public getCacheStats(): ResolverCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size
    };
  }

  private async resolveWithFallback(did: string, errorMessage: string, startedAt: number): Promise<AgentDIDDocument> {
    if (!this.fallbackResolver) {
      this.emitEvent({ did, stage: 'error', durationMs: Date.now() - startedAt, message: errorMessage });
      throw new Error(errorMessage);
    }

    this.emitEvent({ did, stage: 'fallback', durationMs: Date.now() - startedAt, message: errorMessage });

    const fallbackDocument = await this.fallbackResolver.resolve(did);
    this.cache.set(did, {
      document: this.clone(fallbackDocument),
      expiresAt: Date.now() + this.cacheTtlMs
    });

    this.emitEvent({ did, stage: 'resolved', durationMs: Date.now() - startedAt, message: 'fallback' });

    return this.clone(fallbackDocument);
  }

  private emitEvent(event: ResolverResolutionEvent): void {
    this.onResolutionEvent?.(event);
  }

  private computeDocumentReference(document: AgentDIDDocument): string {
    return generateAgentMetadataHash(JSON.stringify(document));
  }

  private clone(document: AgentDIDDocument): AgentDIDDocument {
    return JSON.parse(JSON.stringify(document)) as AgentDIDDocument;
  }
}
