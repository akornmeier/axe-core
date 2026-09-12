import type { Commands, PageId } from "../../src/contracts.js";
import type { Request } from "../../src/validation.js";

declare const pageId: PageId;
declare const request: Request;
if (request.command === "scan") {
  const input: Commands["scan"]["input"] = request.input;
  // @ts-expect-error - parsed inputs are readonly
  input.scan.mode = "full";
}
// @ts-expect-error - portable contracts do not acquire ambient DOM types
export type NoDom = HTMLElement;
// @ts-expect-error - portable contracts do not acquire ambient Node globals
export const noNode = process;
// @ts-expect-error - page identities cannot select a session
export const wrongSession: Commands["end"]["input"]["sessionId"] = pageId;
// @ts-expect-error - explicit scans cannot silently select zero rules
export const noRules: Commands["scan"]["input"]["scan"]["rules"] = { kind: "explicit", rules: [] };
export const selfOwned: Commands["open"]["input"]["target"] = {
  kind: "managed",
  browser: "chromium",
  // @ts-expect-error - managed targets cannot self-assert ownership
  ownership: "owned",
};
