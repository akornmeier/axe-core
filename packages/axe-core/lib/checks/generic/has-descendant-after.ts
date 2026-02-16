function pageHasElmAfter(results: any[]): any[] {
  const elmUsedAnywhere = results.some(
    (frameResult: any) => frameResult.result === true
  );

  // If the element exists in any frame, set them all to true
  if (elmUsedAnywhere) {
    results.forEach((result: any) => {
      result.result = true;
    });
  }
  return results;
}

export default pageHasElmAfter;
