/**
 * Add information about the environment axe was run in.
 * @return {EnvironmentData}
 */
export default function getEnvironmentData(
  metadata: unknown = null,
  win: Window & typeof globalThis = window
): Record<string, unknown> {
  if (metadata && typeof metadata === 'object') {
    return metadata as Record<string, unknown>;
  } else if (typeof win !== 'object') {
    return {};
  }

  return {
    testEngine: {
      name: 'axe-core',
      version: axe.version
    },
    testRunner: {
      // @ts-expect-error - axe is a global
      name: axe._audit.brand
    },
    testEnvironment: getTestEnvironment(win),
    timestamp: new Date().toISOString(),
    url: win.location?.href
  };
}

function getTestEnvironment(
  win: Window & typeof globalThis
): Record<string, unknown> {
  if (!win.navigator || typeof win.navigator !== 'object') {
    return {};
  }
  const { navigator, innerHeight, innerWidth } = win;
  const { angle, type } =
    getOrientation(win as unknown as { screen: Record<string, unknown> }) ||
    ({} as Record<string, unknown>);
  return {
    userAgent: navigator.userAgent,
    windowWidth: innerWidth,
    windowHeight: innerHeight,
    orientationAngle: angle,
    orientationType: type
  };
}

function getOrientation(win: {
  screen: Record<string, unknown>;
}): { angle?: unknown; type?: unknown } | undefined {
  return ((win.screen as Record<string, unknown>).orientation ||
    (win.screen as Record<string, unknown>).msOrientation ||
    (win.screen as Record<string, unknown>).mozOrientation) as
    | { angle?: unknown; type?: unknown }
    | undefined;
}
