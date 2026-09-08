import { ActionType, TypedAction } from "./contracts.js";

const SAFE_ACTIONS = new Set<ActionType>(["click", "type", "scroll", "extract_safe_text"]);

export function validateAction(action: TypedAction, document: Document, origin: string): string | null {
  if (!SAFE_ACTIONS.has(action.actionType)) return "Action is not allowlisted";
  if (Number.isNaN(Date.parse(action.expiresAt)) || Date.parse(action.expiresAt) < Date.now()) return "Action has expired";
  if (action.actionType === "scroll") return typeof action.scrollY === "number" ? null : "Scroll action needs scrollY";
  if (!action.selector || !action.expectedTag) return "Action target is incomplete";
  if (!action.selector.startsWith("#")) return "Only stable id selectors are allowed";
  const target = document.querySelector(action.selector);
  if (!target) return "Target is no longer present";
  if (target.tagName.toLowerCase() !== action.expectedTag.toLowerCase()) return "Target tag changed";
  if (action.actionType === "type" && target instanceof HTMLInputElement && target.type === "password") return "Typing into password fields is forbidden";
  if (action.actionType === "navigate" && !action.url?.startsWith(origin)) return "Cross-origin navigation is forbidden";
  return null;
}

export function executeAction(action: TypedAction, document: Document, window: Window): string {
  const error = validateAction(action, document, window.location.origin);
  if (error) throw new Error(error);
  if (action.actionType === "scroll") {
    window.scrollBy({ top: action.scrollY!, behavior: "smooth" });
    return "Scrolled safely";
  }
  const target = document.querySelector(action.selector!)!;
  if (action.actionType === "click") {
    (target as HTMLElement).click();
    return `Clicked ${action.selector}`;
  }
  if (action.actionType === "type") {
    const input = target as HTMLInputElement;
    input.value = action.text ?? "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return `Typed into ${action.selector}`;
  }
  return (target.textContent ?? "").trim().slice(0, 160);
}
