// Vitest globalSetup: starts the fixture server once for the whole
// `integration` project run, exposes the server URL via Vitest's
// `provide`/`inject` channel, and shuts the server down at teardown.
//
// Phase 3, Sprint 5c — Wave A harness.

import type { TestProject } from 'vitest/node';
import { startFixtureServer } from './fixture-server';
import { FIXTURE_URL_KEY } from './inject-keys';

export default async function setup({ provide }: TestProject) {
  const server = await startFixtureServer();
  provide(FIXTURE_URL_KEY, server.url);
  return async () => {
    await server.close();
  };
}
