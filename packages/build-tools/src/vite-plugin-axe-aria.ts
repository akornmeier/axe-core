/**
 * Vite plugin that generates `doc/aria-supported.md`.
 *
 * This replaces the legacy `aria-supported` Grunt task.  It runs in the
 * `closeBundle` hook so that the built `dist/axe.js` bundle is available
 * and we can call `axe.utils.getStandards()` to obtain the canonical
 * ARIA roles/attributes data — exactly as the Grunt task did.
 *
 * The plugin compares axe-core's internal standards against the
 * `aria-query` npm package and writes a Markdown document listing
 * which ARIA attributes are supported / unsupported.
 */

import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { writeFileSync } from "node:fs";
import type { Plugin, ResolvedConfig } from "rolldown-vite";

/** Which subset of roles / attributes to list. */
type ListType = "supported" | "unsupported" | "all";

export interface AxeAriaPluginOptions {
  /**
   * Absolute path to the axe-core package root
   * (the directory that contains `dist/axe.js` after build).
   */
  axeCorePath: string;
  /** Output file path (relative to `axeCorePath`). Default: `doc/aria-supported.md` */
  destFile?: string;
  /** Which entries to include in the tables. Default: `'unsupported'` */
  listType?: ListType;
}

/* ------------------------------------------------------------------ */
/*  Markdown heading (matches the legacy Grunt task output verbatim)   */
/* ------------------------------------------------------------------ */

function getHeading(listType: ListType): string {
  const label = listType === "all" ? "available" : listType;
  return (
    `# ARIA Roles and Attributes ${label} in axe-core.\n\n` +
    "It can be difficult to know which features of web technologies are accessible across " +
    "different platforms, and with different screen readers and other assistive technologies. " +
    "Axe-core does some of this work for you, by raising issues when accessibility features are " +
    "used that are known to cause problems.\n\n" +
    "This page contains a list of ARIA 1.1 features that axe-core raises as unsupported. " +
    'For more information, read [We\'ve got your back with "Accessibility Supported" in axe]' +
    "(https://www.deque.com/blog/weve-got-your-back-with-accessibility-supported-in-axe/).\n\n" +
    "For a detailed description about how accessibility support is decided, see [How we make " +
    "decisions on rules](accessibility-supported.md)."
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers ported from the Grunt task                                 */
/* ------------------------------------------------------------------ */

interface UnsupportedWithExceptions {
  exceptions: Array<string | ElementDescriptor>;
}

interface ElementDescriptor {
  nodeName: string;
  properties: Record<string, string | string[]>;
}

interface SubjectEntry {
  unsupported?: boolean | UnsupportedWithExceptions;
  [key: string]: unknown;
}

/**
 * Parse a list of unsupported exception elements and return a footnote string
 * detailing which HTML elements *are* supported.
 */
function getSupportedElementsAsFootnote(
  elements: Array<string | ElementDescriptor>,
): string {
  const supportedElements = elements.map((element) => {
    if (typeof element === "string") {
      return `\`<${element}>\``;
    }

    return Object.keys(element.properties)
      .map((prop) => {
        const value = element.properties[prop];
        if (typeof value === "string") {
          return `\`<${element.nodeName} ${prop}="${value}">\``;
        }
        // array of types — e.g. <input type="button" | "checkbox">
        const values = (value as string[]).map((v) => `"${v}"`).join(" | ");
        return `\`<${element.nodeName} ${prop}=${values}>\``;
      })
      .join(", ");
  });

  return "Supported on elements: " + supportedElements.join(", ");
}

/**
 * Compare a `base` Map (from aria-query) against a `subject` object
 * (from axe-core standards).  Returns markdown table rows and footnotes.
 */
function getDiff(
  base: Map<string, unknown> | Set<string>,
  subject: Record<string, SubjectEntry>,
  type: ListType,
): { diff: string[][]; notes: string[] } {
  const diff: string[][] = [];
  const notes: string[] = [];

  // Convert Map or Set entries to sorted array of keys
  const sortedKeys: string[] = Array.from(
    base instanceof Set ? base : base.keys(),
  ).sort();

  for (const key of sortedKeys) {
    const entry = subject[key];
    switch (type) {
      case "supported":
        if (
          entry &&
          Object.prototype.hasOwnProperty.call(subject, key) &&
          entry.unsupported === false
        ) {
          diff.push([key, "Yes"]);
        }
        break;

      case "unsupported":
        if (
          (entry && entry.unsupported === true) ||
          !Object.prototype.hasOwnProperty.call(subject, key)
        ) {
          diff.push([key, "No"]);
        } else if (
          entry &&
          entry.unsupported &&
          typeof entry.unsupported === "object" &&
          (entry.unsupported as UnsupportedWithExceptions).exceptions
        ) {
          diff.push([key, `Mixed[^${notes.length + 1}]`]);
          notes.push(
            getSupportedElementsAsFootnote(
              (entry.unsupported as UnsupportedWithExceptions).exceptions,
            ),
          );
        }
        break;

      case "all":
      default:
        diff.push([
          key,
          Object.prototype.hasOwnProperty.call(subject, key) &&
          entry?.unsupported === false
            ? "Yes"
            : "No",
        ]);
        break;
    }
  }

  return { diff, notes };
}

/**
 * Collect the full set of ARIA attributes known to `aria-query`.
 * This merges the top-level `aria` map keys with all `props` keys
 * from every role definition.
 */
function getAriaQueryAttributes(
  ariaProps: Map<string, unknown>,
  roles: Map<string, { props: Record<string, unknown> }>,
): Set<string> {
  const ariaKeys = Array.from(ariaProps.keys());
  const roleAriaKeys = Array.from(roles.values()).reduce<string[]>(
    (out, role) => {
      return [...out, ...Object.keys(role.props)];
    },
    [],
  );

  // Deduplicate
  const unique = [...new Set([...ariaKeys, ...roleAriaKeys])];
  return new Set(unique);
}

/* ------------------------------------------------------------------ */
/*  The actual Vite plugin                                             */
/* ------------------------------------------------------------------ */

export function axeAriaPlugin(options: AxeAriaPluginOptions): Plugin {
  const {
    axeCorePath,
    destFile = "doc/aria-supported.md",
    listType = "unsupported",
  } = options;

  let resolvedConfig: ResolvedConfig | undefined;

  return {
    name: "axe-aria-supported",
    apply: "build",

    configResolved(config) {
      resolvedConfig = config;
    },

    async closeBundle() {
      if (resolvedConfig?.mode === "minify") return; // Skip on minify pass
      try {
        await generateAriaSupportedDoc(axeCorePath, destFile, listType);
        console.log(`[axe-aria-supported] Generated ${destFile}`);
      } catch (err) {
        console.error(
          "[axe-aria-supported] Failed to generate aria-supported doc:",
          err,
        );
        throw err;
      }
    },
  };
}

/**
 * Core generation logic, also exported so it can be called as a
 * standalone script without the Vite plugin wrapper.
 */
export async function generateAriaSupportedDoc(
  axeCorePath: string,
  destFile: string,
  listType: ListType = "unsupported",
): Promise<void> {
  // ---- Load the built axe bundle via require ----
  const require = createRequire(import.meta.url);
  const axeBundlePath = resolve(axeCorePath, "dist", "axe.js");

  // Clear the require cache so we always get a fresh copy
  delete require.cache[axeBundlePath];

  // The UMD bundle references `window` — provide a shim for Node.js
  const hadWindow = "window" in globalThis;
  if (!hadWindow) {
    (globalThis as Record<string, unknown>).window = globalThis;
  }

  // The UMD bundle assigns to `module.exports` when loaded via require
  let axe: Record<string, unknown>;
  let ariaRoles: Record<string, unknown>;
  let ariaAttrs: Record<string, unknown>;
  try {
    axe = require(axeBundlePath);
    // Call getStandards() while the window shim is still active,
    // because the internal `clone()` helper references `window`.
    const standards = (axe as any).utils.getStandards();
    ariaRoles = standards.ariaRoles;
    ariaAttrs = standards.ariaAttrs;
  } finally {
    // Clean up the window shim to avoid polluting the global scope
    if (!hadWindow) {
      delete (globalThis as Record<string, unknown>).window;
    }
  }

  // ---- Load aria-query ----
  const ariaQuery = require("aria-query");
  const roles: Map<string, { props: Record<string, unknown> }> =
    ariaQuery.roles;
  const ariaProps: Map<string, unknown> = ariaQuery.aria;

  // ---- Build the attributes diff ----
  const ariaQueryAttributes = getAriaQueryAttributes(ariaProps, roles);
  const { diff: attributesTable, notes: attributesFootnotes } = getDiff(
    ariaQueryAttributes,
    ariaAttrs as Record<string, SubjectEntry>,
    listType,
  );

  // ---- Build the roles diff (kept for footnote collection) ----
  const { notes: rolesFootnotes } = getDiff(
    roles as Map<string, unknown>,
    ariaRoles as Record<string, SubjectEntry>,
    listType,
  );

  // ---- Assemble markdown ----
  const formatRow = (cols: string[]): string => `| ${cols.join(" | ")} |`;
  const tableRows = [
    ["aria-attribute", "axe-core support"],
    ["---", "---"],
    ...attributesTable,
  ];
  const attributesMarkdown = tableRows.map(formatRow).join("\n");

  const footnotes = [...rolesFootnotes, ...attributesFootnotes].map(
    (footnote, index) => `[^${index + 1}]: ${footnote}`,
  );

  const heading = getHeading(listType);
  let content = `${heading}\n\n## Attributes\n\n${attributesMarkdown}\n\n${footnotes.join("\n")}`;

  // ---- Format with Prettier (matches legacy behaviour) ----
  try {
    const prettier = require("prettier");
    const destPath = resolve(axeCorePath, destFile);
    // Read the Prettier config from axe-core's package.json
    let prettierConfig: Record<string, unknown> = {};
    try {
      const pkg = require(resolve(axeCorePath, "package.json"));
      prettierConfig = pkg.prettier || {};
    } catch {
      // Fall back to defaults if no config found
    }
    content = await prettier.format(content, {
      ...prettierConfig,
      filepath: destPath,
    });
  } catch {
    // Prettier is optional — if it's not available, write unformatted
  }

  // ---- Write output ----
  const outputPath = resolve(axeCorePath, destFile);
  writeFileSync(outputPath, content, "utf-8");
}

export default axeAriaPlugin;
