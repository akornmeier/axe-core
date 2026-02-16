function duplicateIdAfter(results: any[]): any[] {
  const uniqueIds: string[] = [];
  return results.filter(r => {
    if (uniqueIds.indexOf(r.data) === -1) {
      uniqueIds.push(r.data);
      return true;
    }
    return false;
  });
}

export default duplicateIdAfter;
