/**
 * Whiteboard Operations Handler (Server)
 * Manages operation versioning, validation, and broadcasting
 */

import type {
  WhiteboardDocument,
  OperationEnvelope,
  ServerOperation,
} from "@kanban/shared";
import { applyWhiteboardOperation } from "@kanban/shared";

/**
 * Upper bound on the replay log per document.
 * Collaborative code typing emits far more operations than shape editing, so the
 * log is trimmed and reconnecting clients that fall outside the window get a
 * fresh snapshot instead of an incomplete replay.
 */
const MAX_RETAINED_OPERATIONS = 2_000;

export class WhiteboardManager {
  private documents = new Map<string, WhiteboardDocument>();
  private versionByDocument = new Map<string, number>();
  private operationsByDocument = new Map<string, ServerOperation[]>();

  /**
   * Get or create a document
   */
  getDocument(documentId: string, userId: string): WhiteboardDocument {
    let doc = this.documents.get(documentId);

    if (!doc) {
      doc = {
        id: documentId,
        version: 0,
        elements: [],
        createdAt: Date.now(),
        createdBy: userId,
      };
      this.documents.set(documentId, doc);
      this.versionByDocument.set(documentId, 0);
      this.operationsByDocument.set(documentId, []);
    }

    return doc;
  }

  /**
   * Get current document version
   */
  getVersion(documentId: string): number {
    return this.versionByDocument.get(documentId) ?? 0;
  }

  /**
   * Apply operation on server
   * Returns server operation with assigned version, or null if rejected
   */
  applyOperation(
    documentId: string,
    envelope: OperationEnvelope
  ): ServerOperation | null {
    const doc = this.documents.get(documentId);
    if (!doc) {
      console.error(`Document ${documentId} not found`);
      return null;
    }

    const currentVersion = this.versionByDocument.get(documentId) ?? 0;
    const duplicate = this.operationsByDocument.get(documentId)?.find((operation) => operation.operationId === envelope.operationId);
    if (duplicate) return duplicate;

    const serverVersion = currentVersion + 1;

    // Create server operation with assigned version
    const serverOp: ServerOperation = {
      ...envelope,
      serverVersion,
    };

    const nextDocument = applyWhiteboardOperation(doc, envelope);
    nextDocument.version = serverVersion;
    this.documents.set(documentId, nextDocument);
    this.versionByDocument.set(documentId, serverVersion);
    this.operationsByDocument.set(
      documentId,
      [...(this.operationsByDocument.get(documentId) ?? []), serverOp].slice(-MAX_RETAINED_OPERATIONS),
    );

    return serverOp;
  }

  /**
   * Get operations since a specific version for reconnection
   */
  getOperationsSince(
    documentId: string,
    fromVersion: number
  ): ServerOperation[] {
    return (this.operationsByDocument.get(documentId) ?? []).filter((operation) => operation.serverVersion > fromVersion);
  }

  /**
   * Whether the retained log can still replay every operation after `fromVersion`.
   * When it cannot, the caller must send a full snapshot instead.
   */
  canReplayFrom(documentId: string, fromVersion: number): boolean {
    const operations = this.operationsByDocument.get(documentId) ?? [];
    const oldest = operations[0];
    if (!oldest) return fromVersion === this.getVersion(documentId);
    return oldest.serverVersion <= fromVersion + 1;
  }
}
