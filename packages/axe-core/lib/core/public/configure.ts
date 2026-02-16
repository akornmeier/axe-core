import { hasReporter } from './reporter';
import { configureStandards } from '../../standards';
import constants from '../constants';
import type { AxeConfiguration } from '@axe-core/schemas';

declare const axe: {
  _audit: {
    reporter: string | ((...args: unknown[]) => unknown);
    addCheck: (check: unknown) => void;
    addRule: (rule: unknown) => void;
    rules: Array<{ id: string; enabled: boolean; tags: string[] }>;
    setBranding: (branding: unknown) => void;
    _constructHelpUrls: () => void;
    tagExclude: string[];
    applyLocale: (locale: unknown) => void;
    noHtml: boolean;
    setAllowedOrigins: (origins: string[]) => void;
  } | null;
  version: string;
};

interface ConfigureSpec extends AxeConfiguration {
  tagExclude?: string[];
  [key: string]: unknown;
}

function configure(spec: ConfigureSpec): void {
  const audit = axe._audit;

  if (!audit) {
    throw new Error('No audit configured');
  }

  if (spec.axeVersion || spec.ver) {
    const specVersion = spec.axeVersion || spec.ver;
    if (!/^\d+\.\d+\.\d+(-canary)?/.test(specVersion!)) {
      throw new Error(`Invalid configured version ${specVersion}`);
    }

    const [version, canary] = specVersion!.split('-');
    const versionParts = version!.split('.').map(Number);
    const major = versionParts[0]!;
    const minor = versionParts[1]!;
    const patch = versionParts[2]!;

    const [axeVersion, axeCanary] = axe.version.split('-');
    const axeVersionParts = axeVersion!.split('.').map(Number);
    const axeMajor = axeVersionParts[0]!;
    const axeMinor = axeVersionParts[1]!;
    const axePatch = axeVersionParts[2]!;

    if (
      major !== axeMajor ||
      axeMinor < minor ||
      (axeMinor === minor && axePatch < patch) ||
      (major === axeMajor &&
        minor === axeMinor &&
        patch === axePatch &&
        canary &&
        canary !== axeCanary)
    ) {
      throw new Error(
        `Configured version ${specVersion} is not compatible with current axe version ${axe.version}`
      );
    }
  }

  if (
    spec.reporter &&
    (typeof spec.reporter === 'function' ||
      hasReporter(spec.reporter as string))
  ) {
    audit.reporter = spec.reporter as
      | string
      | ((...args: unknown[]) => unknown);
  }

  if (spec.checks) {
    if (!Array.isArray(spec.checks)) {
      throw new TypeError('Checks property must be an array');
    }

    spec.checks.forEach(check => {
      if (!(check as Record<string, unknown>).id) {
        throw new TypeError(
          `Configured check ${JSON.stringify(
            check
          )} is invalid. Checks must be an object with at least an id property`
        );
      }

      audit.addCheck(check);
    });
  }

  const modifiedRules: string[] = [];
  if (spec.rules) {
    if (!Array.isArray(spec.rules)) {
      throw new TypeError('Rules property must be an array');
    }

    spec.rules.forEach(rule => {
      if (!(rule as Record<string, unknown>).id) {
        throw new TypeError(
          `Configured rule ${JSON.stringify(
            rule
          )} is invalid. Rules must be an object with at least an id property`
        );
      }

      modifiedRules.push((rule as Record<string, unknown>).id as string);
      audit.addRule(rule);
    });
  }

  if (spec.disableOtherRules) {
    audit.rules.forEach(rule => {
      if (modifiedRules.includes(rule.id) === false) {
        rule.enabled = false;
      }
    });
  }

  if (typeof spec.branding !== 'undefined') {
    audit.setBranding(spec.branding);
  } else {
    audit._constructHelpUrls();
  }

  if (spec.tagExclude) {
    audit.tagExclude = spec.tagExclude;
  }

  // Support runtime localization
  if (spec.locale) {
    audit.applyLocale(spec.locale);
  }

  if (spec.standards) {
    configureStandards(
      spec.standards as Partial<Record<string, Record<string, unknown>>>
    );
  }

  if (spec.noHtml) {
    audit.noHtml = true;
  }

  if (spec.allowedOrigins) {
    if (!Array.isArray(spec.allowedOrigins)) {
      throw new TypeError('Allowed origins property must be an array');
    }

    if (spec.allowedOrigins.includes('*')) {
      throw new Error(
        `"*" is not allowed. Use "${constants.allOrigins}" instead`
      );
    }

    audit.setAllowedOrigins(spec.allowedOrigins);
  }
}

export default configure;
