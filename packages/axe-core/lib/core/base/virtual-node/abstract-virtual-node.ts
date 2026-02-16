const whitespaceRegex = /[\t\r\n\f]/g;

interface VirtualNodeProps {
  nodeType: number;
  nodeName: string;
  [key: string]: unknown;
}

class AbstractVirtualNode {
  parent: AbstractVirtualNode | undefined;

  constructor() {
    this.parent = undefined;
  }

  get props(): VirtualNodeProps {
    throw new Error(
      'VirtualNode class must have a "props" object consisting ' +
        'of "nodeType" and "nodeName" properties'
    );
  }

  get attrNames(): string[] {
    throw new Error('VirtualNode class must have an "attrNames" property');
  }

  attr(_attrName: string): string | null {
    throw new Error('VirtualNode class must have an "attr" function');
  }

  hasAttr(_attrName: string): boolean {
    throw new Error('VirtualNode class must have a "hasAttr" function');
  }

  hasClass(className: string): boolean {
    // get the value of the class attribute as svgs return a SVGAnimatedString
    // if you access the className property
    const classAttr = this.attr('class');
    if (!classAttr) {
      return false;
    }

    const selector = ' ' + className + ' ';
    return (
      (' ' + classAttr + ' ').replace(whitespaceRegex, ' ').indexOf(selector) >=
      0
    );
  }
}

export default AbstractVirtualNode;
