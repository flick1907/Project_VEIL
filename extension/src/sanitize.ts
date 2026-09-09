import {
  ActionType,
  PiiCategory,
  RedactionConfig,
  Region,
  SafeElement,
  SanitizedContext,
  SanitizedPayload,
} from "./contracts.js";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+91[\s-]?)?[6-9]\d{9}\b/;
const CONFIGURABLE_PATTERNS: ReadonlyArray<{ category: PiiCategory; expression: RegExp }> = [
  { category: "configured", expression: /\b(?:BOOK|ORDER)-\d{4,}\b/i },
];

const ALLOWED_TAGS = new Set(["input", "button", "p", "span", "div"]);
const ALLOWED_ACTIONS: ActionType[] = ["click", "type", "scroll", "extract_safe_text"];

function selectorFor(element: Element, index: number): string {
  if (element.id) return `#${CSS.escape(element.id)}`;
  return `[data-veil-observe="true"]:nth-of-type(${index + 1})`;
}

function categoryFor(value: string, input: HTMLInputElement | null, config: RedactionConfig): PiiCategory | null {
  if (config.maskPasswords && (input?.type === "password" || /password|secret/i.test(value))) return "password";
  if (config.maskPii && EMAIL.test(value)) return "email";
  if (config.maskPii && PHONE.test(value)) return "phone";
  return CONFIGURABLE_PATTERNS.find(({ expression }) => expression.test(value))?.category ?? null;
}

function safeText(element: Element, category: PiiCategory | null): string | null {
  if (category) return null;
  const text = (element.textContent ?? "").trim();
  return text.length > 0 ? text.slice(0, 160) : null;
}

/** Strict observation: inspect only explicit fixture/demo nodes, never full DOM/HTML. */
export function observeAndSanitize(document: Document, origin: string, config: RedactionConfig, mlRegions: Region[] = [], captureId = crypto.randomUUID()): SanitizedContext {
  const regions: Region[] = [...mlRegions];
  const elements: SafeElement[] = [];
  const observed = Array.from(document.querySelectorAll("[data-veil-observe='true']"));

  observed.forEach((element, index) => {
    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return;
    const input = element instanceof HTMLInputElement ? element : null;
    const candidate = input ? input.value : element.textContent ?? "";
    const category = categoryFor(candidate, input, config);
    const selector = selectorFor(element, index);

    if (category) {
      regions.push({
        selector,
        category,
        transform: category === "password" ? "blackout" : "mask",
        source: category === "password" ? "dom" : "pattern",
      });
    }

    const label = element.getAttribute("aria-label") ?? element.getAttribute("data-veil-label");
    elements.push({
      selector,
      tag: tag as SafeElement["tag"],
      role: element.getAttribute("role"),
      label: label && !categoryFor(label, null, config) ? label.slice(0, 120) : null,
      text: input ? null : safeText(element, category),
      ...(input
        ? {
            inputType: input.type,
            valueState: category ? "redacted" : input.value ? "redacted" : "empty",
          }
        : { valueState: "not_applicable" }),
    });
  });

  const payload: SanitizedPayload = {
    protocolVersion: "veil.v2",
    pageOrigin: origin,
    captureId,
    redactions: regions,
    elements,
    allowedActions: ALLOWED_ACTIONS,
  };
  return verifyAndCreateSanitizedContext(payload);
}

/** Privacy gate: reconstruct only schema-approved data before branding it. */
export function verifyAndCreateSanitizedContext(candidate: SanitizedPayload): SanitizedContext {
  if (candidate.protocolVersion !== "veil.v2") throw new Error("Unsupported protocol version");
  if (!/^https?:\/\//.test(candidate.pageOrigin)) throw new Error("Invalid page origin");
  if (!candidate.captureId || candidate.captureId.length > 128) throw new Error("Invalid capture id");
  if (!Array.isArray(candidate.redactions) || !Array.isArray(candidate.elements)) throw new Error("Invalid context arrays");
  const forbiddenKeys = new Set(["password", "rawScreenshot", "dataUrl", "rawOcr", "fullDom", "html", "inputValue"]);
  if (Object.keys(candidate as object).some((key) => forbiddenKeys.has(key))) {
    throw new Error("Sensitive raw field detected in candidate payload");
  }

  const redactions: Region[] = candidate.redactions.map((region) => ({
    ...(region.selector ? { selector: requireSelector(region.selector) } : {}),
    ...(region.box ? { box: requireBox(region.box) } : {}),
    category: requireCategory(region.category),
    transform: (region.transform === "blackout" ? "blackout" : region.transform === "blur" ? "blur" : "mask") as Region["transform"],
    source: (region.source === "dom" ? "dom" : region.source === "pattern" ? "pattern" : region.source === "face" ? "face" : "ocr") as Region["source"],
  }));
  const elements = candidate.elements.map((element) => ({
    selector: requireSelector(element.selector),
    tag: requireTag(element.tag),
    role: nullableShortString(element.role),
    label: nullableShortString(element.label),
    text: nullableShortString(element.text),
    ...(element.inputType ? { inputType: shortString(element.inputType) } : {}),
    valueState: element.valueState ?? "not_applicable",
  }));
  const allowedActions = candidate.allowedActions.filter((action): action is ActionType => ALLOWED_ACTIONS.includes(action));
  if (allowedActions.length === 0) throw new Error("No permitted actions");

  return SanitizedContext.fromVerifiedPayload({
    protocolVersion: "veil.v2",
    pageOrigin: candidate.pageOrigin,
    captureId: candidate.captureId,
    redactions,
    elements,
    allowedActions,
  });
}

function shortString(value: string): string {
  if (typeof value !== "string" || value.length > 160) throw new Error("Invalid string");
  return value;
}
function nullableShortString(value: string | null): string | null {
  return value === null ? null : shortString(value);
}
function requireSelector(value: string): string {
  if (typeof value !== "string" || !/^(#|\[data-veil-observe|body)/.test(value)) throw new Error("Unsafe selector");
  return value;
}
function requireCategory(value: PiiCategory): PiiCategory {
  if (!["password", "email", "phone", "configured"].includes(value)) throw new Error("Unknown PII category");
  return value;
}
function requireTag(value: SafeElement["tag"]): SafeElement["tag"] {
  if (!ALLOWED_TAGS.has(value)) throw new Error("Unsafe element tag");
  return value;
}
function requireBox(value: any): [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4) throw new Error("Invalid box");
  return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])];
}
