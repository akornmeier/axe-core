function uniqueFrameTitleAfter(results: any[]): any[] {
  const titles: Record<string, number> = {};
  results.forEach((r: any) => {
    titles[r.data] = titles[r.data] !== undefined ? ++titles[r.data]! : 0;
  });
  results.forEach((r: any) => {
    r.result = !!titles[r.data];
  });

  return results;
}

export default uniqueFrameTitleAfter;
