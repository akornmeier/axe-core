// @deprecated
function windowIsTopMatches(node: HTMLElement): boolean {
  return (
    node.ownerDocument.defaultView!.self === node.ownerDocument.defaultView!.top
  );
}

export default windowIsTopMatches;
