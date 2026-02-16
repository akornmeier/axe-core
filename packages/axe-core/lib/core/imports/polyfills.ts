import es6promise from 'es6-promise';
// @ts-expect-error - no type declarations for typedarray
import { Uint32Array } from 'typedarray';
import 'weakmap-polyfill';
// @ts-expect-error - no type declarations for core-js-pure
import hasOwn from 'core-js-pure/actual/object/has-own';
// @ts-expect-error - no type declarations for core-js-pure
import values from 'core-js-pure/actual/object/values';
// @ts-expect-error - no type declarations for core-js-pure
import ArrayFrom from 'core-js-pure/actual/array/from';

if (!('hasOwn' in Object)) {
  (Object as unknown as Record<string, unknown>).hasOwn = hasOwn;
}

if (!('values' in Object)) {
  (Object as unknown as Record<string, unknown>).values = values;
}

if (!('Promise' in window)) {
  es6promise.polyfill();
}

if (!('Uint32Array' in window)) {
  (window as unknown as Record<string, unknown>).Uint32Array = Uint32Array;
}
if (window.Uint32Array) {
  // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/some
  if (!('some' in window.Uint32Array.prototype)) {
    Object.defineProperty(window.Uint32Array.prototype, 'some', {
      value: Array.prototype.some
    });
  }

  if (!('reduce' in window.Uint32Array.prototype)) {
    // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/reduce
    Object.defineProperty(window.Uint32Array.prototype, 'reduce', {
      value: Array.prototype.reduce
    });
  }
}

/*
 These polyfills came directly from the ES Specification itself
 Contained within:
  - Object.assign
  - Array.prototype.find
*/
if (typeof Object.assign !== 'function') {
  (function () {
    Object.assign = function (target: unknown) {
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      let output = Object(target);
      for (let index = 1; index < arguments.length; index++) {
        let source = arguments[index];
        if (source !== undefined && source !== null) {
          for (let nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}

if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function (predicate: (...args: unknown[]) => boolean) {
      if (this === null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      let list = Object(this);
      let length = list.length >>> 0;
      let thisArg = arguments[1];
      let value: unknown;

      for (let i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) {
          return value;
        }
      }
      return undefined;
    }
  });
}

if (!Array.prototype.findIndex) {
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function (
      predicate: (...args: unknown[]) => boolean,
      thisArg: unknown
    ) {
      if (this === null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      let list = Object(this);
      let length = list.length >>> 0;
      let value: unknown;

      for (let i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) {
          return i;
        }
      }
      return -1;
    }
  });
}

if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function (searchElement: unknown) {
      let O = Object(this);
      let len = parseInt(O.length, 10) || 0;
      if (len === 0) {
        return false;
      }
      let n = parseInt(arguments[1], 10) || 0;
      let k: number;
      if (n >= 0) {
        k = n;
      } else {
        k = len + n;
        if (k < 0) {
          k = 0;
        }
      }
      let currentElement: unknown;
      while (k < len) {
        currentElement = O[k];
        if (
          searchElement === currentElement ||
          (searchElement !== searchElement && currentElement !== currentElement)
        ) {
          // NaN !== NaN
          return true;
        }
        k++;
      }
      return false;
    }
  });
}

// Production steps of ECMA-262, Edition 5, 15.4.4.17
// Reference: http://es5.github.io/#x15.4.4.17
if (!Array.prototype.some) {
  Object.defineProperty(Array.prototype, 'some', {
    value: function (fun: (...args: unknown[]) => boolean) {
      if (this == null) {
        throw new TypeError('Array.prototype.some called on null or undefined');
      }

      if (typeof fun !== 'function') {
        throw new TypeError();
      }

      let t = Object(this);
      let len = t.length >>> 0;

      let thisArg = arguments.length >= 2 ? arguments[1] : void 0;
      for (let i = 0; i < len; i++) {
        if (i in t && fun.call(thisArg, t[i], i, t)) {
          return true;
        }
      }

      return false;
    }
  });
}

if (!Array.from) {
  Array.from = ArrayFrom;
}

if (!String.prototype.includes) {
  String.prototype.includes = function (
    search: string,
    start?: number
  ): boolean {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// @see https://github.com/jonathantneal/array-flat-polyfill/blob/master/src/polyfill-flat.js
if (!Array.prototype.flat) {
  Object.defineProperty(Array.prototype, 'flat', {
    configurable: true,
    value: function flat(this: unknown[], ...args: unknown[]) {
      let depth = isNaN(args[0] as number) ? 1 : Number(args[0]);

      return depth
        ? Array.prototype.reduce.call(
            this,
            function (acc: unknown, cur: unknown) {
              const arr = acc as unknown[];
              if (Array.isArray(cur)) {
                arr.push.apply(arr, flat.call(cur, depth - 1) as unknown[]);
              } else {
                arr.push(cur);
              }

              return arr;
            },
            [] as unknown[]
          )
        : Array.prototype.slice.call(this);
    },
    writable: true
  });
}

// linked from MDN docs on isConnected
// @see https://gist.github.com/eligrey/f109a6d0bf4efe3461201c3d7b745e8f
if (window.Node && !('isConnected' in window.Node.prototype)) {
  Object.defineProperty(window.Node.prototype, 'isConnected', {
    get() {
      return (
        !this.ownerDocument ||
        !(
          this.ownerDocument.compareDocumentPosition(this) &
          this.DOCUMENT_POSITION_DISCONNECTED
        )
      );
    }
  });
}
