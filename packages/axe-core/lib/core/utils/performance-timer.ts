import log from '../log';

const performanceTimer = (() => {
  function now(): number | undefined {
    if (window.performance && window.performance) {
      return window.performance.now();
    }
  }
  let axeStartTime = now();
  let axeStarted = false;

  return {
    start() {
      this.reset();
      axeStarted = true;
      this.mark('mark_axe_start');
    },

    end() {
      this.mark('mark_axe_end');
      this.measure('axe', 'mark_axe_start', 'mark_axe_end', true);
      this.logMeasures('axe');
      this.clearMark('mark_axe_start', 'mark_axe_end');
      axeStarted = false;
    },

    auditStart() {
      if (!axeStarted) {
        this.reset();
      }
      this.mark('mark_audit_start');
    },

    auditEnd() {
      this.mark('mark_audit_end');
      this.measure(
        'audit_start_to_end',
        'mark_audit_start',
        'mark_audit_end',
        true
      );
      this.logMeasures();
      this.clearMark('mark_audit_start', 'mark_audit_end');
    },

    mark(markName: string) {
      if (window.performance?.mark) {
        window.performance.mark(markName);
      }
    },

    measure(
      measureName: string,
      startMark: string,
      endMark: string,
      keepMarks = false
    ) {
      if (!window.performance?.measure) {
        return;
      }
      try {
        window.performance.measure(measureName, startMark, endMark);
      } catch (e) {
        this._log(e);
      }
      if (!keepMarks) {
        this.clearMark(startMark, endMark);
      }
    },

    logMeasures(measureName?: string) {
      const last = (arr: unknown[]) =>
        Array.isArray(arr) ? arr[arr.length - 1] : arr;
      const logMeasure = (req: PerformanceEntry) => {
        this._log('Measure ' + req.name + ' took ' + req.duration + 'ms');
      };
      if (
        !window.performance?.getEntriesByType ||
        !window.performance?.getEntriesByName
      ) {
        return;
      }
      const axeStart =
        last(
          window.performance.getEntriesByName('mark_axe_start') as unknown[]
        ) ||
        last(
          window.performance.getEntriesByName('mark_audit_start') as unknown[]
        );
      if (!axeStart) {
        this._log('Axe must be started before using performanceTimer');
        return;
      }

      const measures = window.performance
        .getEntriesByType('measure')
        .filter(
          measure =>
            measure.startTime >= (axeStart as PerformanceEntry).startTime
        );
      for (let i = 0; i < measures.length; ++i) {
        const req = measures[i]!;
        if (req.name === measureName) {
          logMeasure(req);
          return;
        } else if (!measureName) {
          logMeasure(req);
        }
      }
    },

    timeElapsed(): number | undefined {
      const currentTime = now();
      return currentTime! - axeStartTime!;
    },

    clearMark(...markNames: string[]) {
      if (!window.performance?.clearMarks) {
        return;
      }
      for (const markName of markNames) {
        window.performance.clearMarks(markName);
      }
    },

    reset() {
      axeStartTime = now();
    },

    _log(message: unknown) {
      log(message);
    }
  };
})();

export default performanceTimer;
