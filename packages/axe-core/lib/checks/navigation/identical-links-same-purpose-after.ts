function isIdenticalObject(a: any, b: any): boolean {
  if (!a || !b) {
    return false;
  }

  const aProps = Object.getOwnPropertyNames(a);
  const bProps = Object.getOwnPropertyNames(b);

  if (aProps.length !== bProps.length) {
    return false;
  }

  const result = aProps.every(propName => {
    const aValue = a[propName];
    const bValue = b[propName];

    if (typeof aValue !== typeof bValue) {
      return false;
    }

    if (typeof aValue === `object` || typeof bValue === `object`) {
      return isIdenticalObject(aValue, bValue);
    }

    return aValue === bValue;
  });

  return result;
}

function identicalLinksSamePurposeAfter(results: any[]): any[] {
  if (results.length < 2) {
    return results;
  }

  const incompleteResults = results.filter(
    ({ result }: any) => result !== undefined
  );

  const uniqueResults: any[] = [];
  const nameMap: Record<string, any> = {};

  for (let index = 0; index < incompleteResults.length; index++) {
    const currentResult = incompleteResults[index];

    const { name, urlProps } = currentResult.data;
    if (nameMap[name]) {
      continue;
    }

    const sameNameResults = incompleteResults.filter(
      ({ data }: any, resultNum: number) =>
        data.name === name && resultNum !== index
    );
    const isSameUrl = sameNameResults.every(({ data }: any) =>
      isIdenticalObject(data.urlProps, urlProps)
    );

    if (sameNameResults.length && !isSameUrl) {
      currentResult.result = undefined;
    }

    currentResult.relatedNodes = [];
    currentResult.relatedNodes.push(
      ...sameNameResults.map((node: any) => node.relatedNodes[0])
    );

    nameMap[name] = sameNameResults;

    uniqueResults.push(currentResult);
  }

  return uniqueResults;
}

export default identicalLinksSamePurposeAfter;
