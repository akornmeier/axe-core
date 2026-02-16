#!/bin/bash
# Find and delete .js files that have .ts counterparts in packages/axe-core/lib/
BASE="/Users/tk/Code/axe-core/packages/axe-core/lib"
count=0

# Use glob expansion to iterate over all .ts files
for tsfile in $(cd "$BASE" && find . -name "*.ts" -type f); do
  jsfile="${tsfile%.ts}.js"
  full_js="$BASE/$jsfile"
  if [ -f "$full_js" ]; then
    echo "Deleting: $full_js"
    rm "$full_js"
    count=$((count + 1))
  fi
done

echo ""
echo "Total .js files deleted: $count"
echo ""
echo "Remaining .js files:"
find "$BASE" -name "*.js" -type f | wc -l
