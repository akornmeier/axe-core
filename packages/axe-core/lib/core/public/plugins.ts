/*eslint no-use-before-define:0 */

declare const axe: {
  _audit: {
    registerCommand: (command: unknown) => void;
  };
  plugins: Record<string, Plugin>;
  utils: {
    queue: () => {
      defer: (fn: (done: () => void) => void) => void;
      then: (fn: (results?: unknown) => void) => void;
    };
  };
};

interface PluginCommand {
  id: string;
  [key: string]: unknown;
}

interface PluginSpec {
  id: string;
  run: (...args: unknown[]) => unknown;
  collect: (...args: unknown[]) => unknown;
  commands: PluginCommand[];
}

interface PluginImplementation {
  id: string;
  cleanup: (done: () => void) => void;
  [key: string]: unknown;
}

class Plugin {
  _run: (...args: unknown[]) => unknown;
  _collect: (...args: unknown[]) => unknown;
  _registry: Record<string, PluginImplementation>;

  constructor(spec: PluginSpec) {
    this._run = spec.run;
    this._collect = spec.collect;
    this._registry = {};
    spec.commands.forEach(command => {
      axe._audit.registerCommand(command);
    });
  }

  run(...args: unknown[]): unknown {
    return this._run.apply(this, args);
  }

  collect(...args: unknown[]): unknown {
    return this._collect.apply(this, args);
  }

  cleanup(done: () => void): void {
    const q = axe.utils.queue();
    const that = this;
    Object.keys(this._registry).forEach(key => {
      q.defer(_done => {
        that._registry[key]!.cleanup(_done);
      });
    });
    q.then(done);
  }

  add(impl: PluginImplementation): void {
    this._registry[impl.id] = impl;
  }
}

function registerPlugin(plugin: PluginSpec): void {
  axe.plugins[plugin.id] = new Plugin(plugin);
}

export default registerPlugin;
