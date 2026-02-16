import { getBaseLang } from '../../core/utils';

function xmlLangMismatchEvaluate(
  node: HTMLElement,
  options: Record<string, unknown>,
  vNode: any
): boolean {
  const primaryLangValue = getBaseLang(vNode.attr('lang'));
  const primaryXmlLangValue = getBaseLang(vNode.attr('xml:lang'));

  return primaryLangValue === primaryXmlLangValue;
}

export default xmlLangMismatchEvaluate;
