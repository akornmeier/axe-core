const roundingMargin = 0.05;

export default function rectHasMinimumSize(
  minSize: number,
  { width, height }: { width: number; height: number }
): boolean {
  return (
    width + roundingMargin >= minSize && height + roundingMargin >= minSize
  );
}
