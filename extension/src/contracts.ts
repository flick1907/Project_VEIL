export type PiiCategory = "password" | "email" | "phone" | "configured" | "id";
export type RedactionTransform = "blackout" | "mask" | "blur";

export interface Region {
  selector?: string;
  box?: [number, number, number, number]; // [x, y, width, height]
  category: PiiCategory;
  transform: RedactionTransform;
  source: "dom" | "pattern" | "face" | "ocr";
}

export interface RedactionConfig {
  maskPasswords: boolean;
  maskPii: boolean;
  blurFaces: boolean;
}

export interface SafeElement {
  selector: string;
  tag: "input" | "button" | "p" | "span" | "div";
  role: string | null;
  label: string | null;
  text: string | null;
  inputType?: string;
  valueState?: "empty" | "redacted" | "not_applicable";
}

export interface SanitizedPayload {
  protocolVersion: "veil.v2";
  pageOrigin: string;
  captureId: string;
  redactions: Region[];
  elements: SafeElement[];
  allowedActions: ActionType[];
}

const token = Symbol("veil.sanitized-context");

/**
 * This class is the only input accepted by transport. Its constructor and
 * token are module-private, so raw DOM data cannot be passed by accident.
 */
export class SanitizedContext {
  readonly #token = token;
  readonly #payload: Readonly<SanitizedPayload>;

  private constructor(payload: SanitizedPayload) {
    this.#payload = Object.freeze(payload);
  }

  static fromVerifiedPayload(payload: SanitizedPayload): SanitizedContext {
    if (payload.protocolVersion !== "veil.v2") {
      throw new Error("Invalid protocol version");
    }
    return new SanitizedContext(payload);
  }

  toPayload(): SanitizedPayload {
    if (this.#token !== token) {
      throw new Error("Untrusted sanitized context");
    }
    return structuredClone(this.#payload);
  }
}

export type ActionType = "click" | "type" | "scroll" | "extract_safe_text" | "navigate";

export interface TypedAction {
  actionType: ActionType;
  selector?: string;
  expectedTag?: string;
  text?: string;
  scrollY?: number;
  url?: string;
  reason: string;
  expiresAt: string;
}

export interface ActionResponse {
  action: TypedAction;
}
