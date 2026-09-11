import { getReporter } from './reporter';
import type { ReporterCallback } from './reporter';
import {
  mergeResults,
  publishMetaData,
  finalizeRuleResult,
  nodeSerializer,
  clone,
  normalizeRunOptions
} from '../utils';
import type { EnvironmentData } from '@axe-core/schemas';

declare const axe: {
  _audit: {
    reporter: string;
    after: (
      results: Record<string, unknown>[],
      options: Record<string, unknown>
    ) => Record<string, unknown>[];
  } | null;
};

interface PartialResultItem {
  results?: unknown[];
  frames?: Record<string, unknown>[];
  environmentData?: EnvironmentData | undefined;
  frameSpec?: Record<string, unknown> | null;
  [key: string]: unknown;
}

interface FinishRunOptions extends Record<string, unknown> {
  reporter?: string | undefined;
  environmentData?: EnvironmentData | undefined;
}

export default function finishRun(
  partialResults: PartialResultItem[],
  options: FinishRunOptions = {}
): Promise<unknown> {
  options = clone(options) as FinishRunOptions;
  const { environmentData } =
    partialResults.find(r => r?.environmentData) || {};

  // normalize the runOnly option for the output of reporters toolOptions
  normalizeRunOptions(options as Record<string, unknown>);
  options.reporter = options.reporter ?? axe._audit?.reporter ?? 'v1';

  setFrameSpec(partialResults);
  let results = mergeResults(
    partialResults as unknown as Record<string, unknown>[],
    options as Record<string, unknown>
  );
  results = axe._audit!.after(results, options as Record<string, unknown>);
  results.forEach(publishMetaData);
  results = results.map(finalizeRuleResult);

  return createReport(results, { environmentData, ...options });
}

function setFrameSpec(partialResults: PartialResultItem[]): void {
  const frameStack: Array<Record<string, unknown>[]> = [];
  for (const partialResult of partialResults) {
    const frameSpec = frameStack.shift();
    if (!partialResult) {
      continue;
    }

    partialResult.frameSpec =
      frameSpec?.[0] !== undefined
        ? (frameSpec as unknown as Record<string, unknown>)
        : null;
    const frameSpecs = getMergedFrameSpecs(partialResult);
    frameStack.unshift(
      ...(frameSpecs as unknown as Array<Record<string, unknown>[]>)
    );
  }
}

function getMergedFrameSpecs({
  frames: childFrameSpecs,
  frameSpec: parentFrameSpec
}: {
  frames?: Record<string, unknown>[] | undefined;
  frameSpec?: Record<string, unknown> | null | undefined;
}): Record<string, unknown>[] {
  if (!parentFrameSpec) {
    return childFrameSpecs || [];
  }
  // Include the selector/ancestry/... from the parent frames
  return (childFrameSpecs || []).map(childFrameSpec => {
    return nodeSerializer.mergeSpecs(childFrameSpec, parentFrameSpec);
  });
}

function createReport(
  results: Record<string, unknown>[],
  options: FinishRunOptions
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reporter = getReporter(options.reporter) as ReporterCallback;
    reporter(results, options, resolve, reject);
  });
}
