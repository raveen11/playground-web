import type { Operation, OperationEnvelope } from "./operations.types.js";
import type { WhiteboardDocument, WhiteboardElement } from "./whiteboard.types.js";

export function applyWhiteboardOperation(document: WhiteboardDocument, envelope: OperationEnvelope): WhiteboardDocument {
  const operation = envelope.operation;
  const update = (elementId: string, change: (element: WhiteboardElement) => WhiteboardElement) => {
    const index = document.elements.findIndex((element) => element.id === elementId);
    if (index === -1) throw new Error(`Element "${elementId}" was not found.`);
    return { ...document, elements: document.elements.map((element, current) => current === index ? change(element) : element) };
  };
  switch (operation.type) {
    case "element.create":
      return document.elements.some((element) => element.id === operation.element.id) ? document : { ...document, elements: [...document.elements, operation.element] };
    case "element.update": return update(operation.elementId, (element) => ({ ...element, ...operation.changes, id: element.id }));
    case "element.move": return update(operation.elementId, (element) => ({ ...element, position: operation.position }));
    case "element.resize": return update(operation.elementId, (element) => ({ ...element, size: operation.size }));
    case "element.rotate": return update(operation.elementId, (element) => ({ ...element, rotation: operation.rotation }));
    case "element.delete":
      if (!document.elements.some((element) => element.id === operation.elementId)) throw new Error(`Element "${operation.elementId}" was not found.`);
      return { ...document, elements: document.elements.filter((element) => element.id !== operation.elementId) };
    case "text.update": return update(operation.elementId, (element) => {
      if (element.type !== "text") throw new Error(`Element "${operation.elementId}" is not text.`);
      return { ...element, content: operation.content };
    });
    case "style.update": return update(operation.elementId, (element) => ({ ...element, style: { ...element.style, ...operation.style } }));
    default: {
      const exhaustive: never = operation;
      return exhaustive;
    }
  }
}
