/**
 * Whiteboard Operations Handler (Server)
 * Manages operation versioning, validation, and broadcasting
 */

import type { WebSocket } from "ws";
import type {
  WhiteboardDocument,
  OperationEnvelope,
  ServerOperation,
} from "@kanban/shared";

export class WhiteboardManager {
  private documents = new Map<string, WhiteboardDocument>();
  private versionByDocument = new Map<string, number>();

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
    const serverVersion = currentVersion + 1;

    // Create server operation with assigned version
    const serverOp: ServerOperation = {
      ...envelope,
      serverVersion,
    };

    // Update document version
    this.versionByDocument.set(documentId, serverVersion);

    // In production, would apply operation to document here
    // For now, just track version
    // doc = applyOperation(doc, envelope);
    // this.documents.set(documentId, doc);

    return serverOp;
  }

  /**
   * Get operations since a specific version for reconnection
   */
  getOperationsSince(
    documentId: string,
    fromVersion: number
  ): OperationEnvelope[] {
    // In production, store operation history and return missing operations
    // For now, return empty (client should request full snapshot)
    return [];
  }
}
