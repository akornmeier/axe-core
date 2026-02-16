function pageNoDuplicateAfter(results: any[]): any[] {
  // ignore results
  return results.filter((checkResult: any) => checkResult.data !== 'ignored');
}

export default pageNoDuplicateAfter;
