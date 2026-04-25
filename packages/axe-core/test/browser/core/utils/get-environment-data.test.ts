import { axe } from '@helpers/check-helpers';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
// FIXME(phase-3-sprint-4b): codemod blocker — uses axe._audit (internal state)
describe('utils.getEnvironmentData', function () {
  var __audit;
  var getEnvironmentData = axe.utils.getEnvironmentData;
  beforeAll(function () {
    __audit = axe._audit;
    axe._audit = { brand: 'Deque' };
  });

  afterAll(function () {
    axe._audit = __audit;
  });

  it('returns the first argument, if it is truthy', function () {
    var input = {
      testEngine: {
        name: 'axe-core',
        version: axe.version
      }
    };
    var output = getEnvironmentData(input);
    expect(input).toBe(output);
  });

  it('should return a `testEngine` property', function () {
    var data = getEnvironmentData();
    expect(
      typeof data.testEngine === 'object' && data.testEngine !== null
    ).toBe(true);
    expect(data.testEngine.name).toBe('axe-core');
    expect(data.testEngine.version).toBe(axe.version);
  });

  it('should return a `testRunner` property', function () {
    var data = getEnvironmentData();
    expect(
      typeof data.testRunner === 'object' && data.testRunner !== null
    ).toBe(true);
    expect(data.testRunner.name).toBe(axe._audit.brand);
  });

  it('should return a `testEnvironment` property', function () {
    var data = getEnvironmentData();
    expect(
      typeof data.testEnvironment === 'object' && data.testEnvironment !== null
    ).toBe(true);
    expect(data.testEnvironment.userAgent).toBeTruthy();
    expect(data.testEnvironment.windowWidth).toBeTruthy();
    expect(data.testEnvironment.windowHeight).toBeTruthy();
    expect(data.testEnvironment.orientationAngle).not.toBeNull();
    expect(data.testEnvironment.orientationType).not.toBeNull();
  });

  it('should return a `timestamp` property`', function () {
    var data = getEnvironmentData();
    expect(data.timestamp).toBeDefined();
  });

  it('should return a `url` property', function () {
    var data = getEnvironmentData();
    expect(data.url).toBeDefined();
  });

  // TODO: remove or update test once we are testing axe-core in jsdom and
  // other supported environments as what this is testing should be done in
  // those environment tests
  it('gets data from the `win` parameter when passed', function () {
    var data = getEnvironmentData(null, {
      screen: {
        orientation: {
          type: 'fictional',
          angle: 'slanted'
        }
      },
      navigator: {
        userAgent: 'foo'
      },
      location: {
        href: 'foo://'
      },
      innerWidth: 321,
      innerHeight: 123
    });

    delete data.timestamp;
    expect(data).toEqual({
      testEngine: {
        name: 'axe-core',
        version: axe.version
      },
      testRunner: {
        name: axe._audit.brand
      },
      testEnvironment: {
        userAgent: 'foo',
        windowWidth: 321,
        windowHeight: 123,
        orientationAngle: 'slanted',
        orientationType: 'fictional'
      },
      url: 'foo://'
    });
  });
});
