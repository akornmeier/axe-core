import { findUpVirtual } from '../../commons/dom';

function normalizeFontWeight(weight: string): number {
  switch (weight) {
    case 'lighter':
      return 100;
    case 'normal':
      return 400;
    case 'bold':
      return 700;
    case 'bolder':
      return 900;
  }
  const parsed = parseInt(weight);
  return !isNaN(parsed) ? parsed : 400;
}

function getTextContainer(elm: HTMLElement): HTMLElement {
  let nextNode: HTMLElement | undefined = elm;
  const outerText = elm.textContent!.trim();
  let innerText = outerText;

  while (innerText === outerText && nextNode !== undefined) {
    let i = -1;
    elm = nextNode;
    if (elm.children.length === 0) {
      return elm;
    }

    do {
      i++;
      innerText = elm.children[i]!.textContent!.trim();
    } while (innerText === '' && i + 1 < elm.children.length);
    nextNode = elm.children[i] as HTMLElement;
  }

  return elm;
}

function getStyleValues(node: HTMLElement): {
  fontWeight: number;
  fontSize: number;
  isItalic: boolean;
} {
  const style = window.getComputedStyle(getTextContainer(node));
  return {
    fontWeight: normalizeFontWeight(style.getPropertyValue('font-weight')),
    fontSize: parseInt(style.getPropertyValue('font-size')),
    isItalic: style.getPropertyValue('font-style') === 'italic'
  };
}

function isHeaderStyle(styleA: any, styleB: any, margins: any[]): boolean {
  return margins.reduce((out: boolean, margin: any) => {
    return (
      out ||
      ((!margin.size || styleA.fontSize / margin.size > styleB.fontSize) &&
        (!margin.weight ||
          styleA.fontWeight - margin.weight > styleB.fontWeight) &&
        (!margin.italic || (styleA.isItalic && !styleB.isItalic)))
    );
  }, false);
}

function pAsHeadingEvaluate(
  node: HTMLElement,
  options: any,
  virtualNode: any
): boolean | undefined {
  const siblings = Array.from(node.parentNode!.children) as HTMLElement[];
  const currentIndex = siblings.indexOf(node);

  options = options || {};
  const margins = options.margins || [];

  const nextSibling = siblings
    .slice(currentIndex + 1)
    .find(elm => elm.nodeName.toUpperCase() === 'P');

  const prevSibling = siblings
    .slice(0, currentIndex)
    .reverse()
    .find(elm => elm.nodeName.toUpperCase() === 'P');

  const currStyle = getStyleValues(node);
  const nextStyle = nextSibling ? getStyleValues(nextSibling) : null;
  const prevStyle = prevSibling ? getStyleValues(prevSibling) : null;

  const optionsPassLength = options.passLength;
  const optionsFailLength = options.failLength;

  const headingLength = node.textContent!.trim().length;
  const paragraphLength = nextSibling?.textContent?.trim().length;

  if (headingLength > paragraphLength! * optionsPassLength) {
    return true;
  }

  if (!nextStyle || !isHeaderStyle(currStyle, nextStyle, margins)) {
    return true;
  }

  const blockquote = findUpVirtual(virtualNode, 'blockquote');
  if (blockquote && blockquote.nodeName.toUpperCase() === 'BLOCKQUOTE') {
    return undefined;
  }

  if (prevStyle && !isHeaderStyle(currStyle, prevStyle, margins)) {
    return undefined;
  }

  if (headingLength > paragraphLength! * optionsFailLength) {
    return undefined;
  }
  return false;
}

export default pAsHeadingEvaluate;
