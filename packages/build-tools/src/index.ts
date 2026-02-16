// @axe-core/build-tools — Internal Vite plugins for axe-core
export {
  axeAriaPlugin,
  generateAriaSupportedDoc,
} from "./vite-plugin-axe-aria";
export type { AxeAriaPluginOptions } from "./vite-plugin-axe-aria";
export {
  axeMetadataPlugin,
  generateConfig,
  generateDefaultConfig,
  type AxeMetadataPluginOptions,
  type LocaleData
} from './vite-plugin-axe-metadata';
export { generateLocaleTemplate } from './build-locales';
