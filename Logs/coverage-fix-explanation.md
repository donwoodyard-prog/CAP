# Coverage Detection Bug - Flight Path vs GPS Points

## Problem

The current algorithm marks cells as "covered" based on proximity to individual GPS POINTS, not the continuous FLIGHT PATH. This causes gaps in coverage where the flight path clearly passes through cells.

## Current Algorithm (Incorrect)

```javascript
// For each GPS point
flight.coordinates.forEach(coord => {
  // Mark all cells within 0.5 NM of THIS POINT
  if (dist <= coverageWidth) {
    coverageGrid[i][j] = true;
  }
});
```

**Result:** Only cells near GPS points are marked, not cells along the path between points.

## Correct Algorithm (Needed)

```javascript
// For each GPS point AND the line segment to the next point
for (let idx = 0; idx < flight.coordinates.length; idx++) {
  const coord = flight.coordinates[idx];
  const nextCoord = flight.coordinates[idx + 1];
  
  // Mark cells within 0.5 NM of this POINT
  markCellsNearPoint(coord);
  
  // Mark cells within 0.5 NM of the LINE between this point and next
  if (nextCoord) {
    markCellsNearLineSegment(coord, nextCoord);
  }
}
```

## Why This Matters

**GPS Sampling Rate:** 
- Typical GPS: 1-10 second updates
- Aircraft speed: 120 knots = 2 NM/minute = 0.33 NM every 10 seconds
- Result: 0.33 NM gaps between GPS points

**Coverage Width:**
- 0.5 NM coverage radius
- Cell size: 0.1 NM × 0.1 NM

**The Math:**
- If GPS points are 0.33 NM apart
- And coverage radius is 0.5 NM
- Cells along the path between points may be >0.5 NM from BOTH points
- But only 0.1 NM from the LINE connecting them

## Example Scenario

```
Your CAP594 flight:
- 1,351 GPS points
- Flight duration: ~2 hours
- Average: 1 point every 5.3 seconds
- At 120 knots: 0.28 NM between points

Cells affected:
- Cells along straight flight paths between GPS points
- Diagonal paths through the grid
- High-speed segments with fewer GPS updates
```

## Solution Implementation

Need to add a function to calculate point-to-line-segment distance:

```javascript
function distanceToLineSegment(point, lineStart, lineEnd) {
  // Vector from lineStart to lineEnd
  const dx = lineEnd.lon - lineStart.lon;
  const dy = lineEnd.lat - lineStart.lat;
  
  // If line segment is a point, return point-to-point distance
  if (dx === 0 && dy === 0) {
    return distance(point, lineStart);
  }
  
  // Parameter t: where along the line segment is the closest point?
  const t = Math.max(0, Math.min(1, 
    ((point.lon - lineStart.lon) * dx + (point.lat - lineStart.lat) * dy) / 
    (dx * dx + dy * dy)
  ));
  
  // Closest point on line segment
  const closestLat = lineStart.lat + t * dy;
  const closestLon = lineStart.lon + t * dx;
  
  // Distance from point to closest point on segment
  return distance(point, {lat: closestLat, lon: closestLon});
}
```

Then modify the coverage algorithm:

```javascript
// For each flight path segment
for (let idx = 0; idx < flight.coordinates.length - 1; idx++) {
  const p1 = flight.coordinates[idx];
  const p2 = flight.coordinates[idx + 1];
  
  // For each cell in the grid
  for (let i = 0; i < numLatCells; i++) {
    for (let j = 0; j < numLonCells; j++) {
      if (coverageGrid[i][j]) continue; // Already covered
      
      const cellCenter = {
        lat: minLat + (i + 0.5) * latStep,
        lon: minLon + (j + 0.5) * lonStep
      };
      
      // Distance from cell center to line segment
      const dist = distanceToLineSegment(cellCenter, p1, p2);
      
      if (dist <= coverageWidth) {
        coverageGrid[i][j] = true;
      }
    }
  }
}
```

## Performance Impact

**Current:** O(points × cells in coverage radius)
**Fixed:** O(segments × ALL cells)

This is slower but more accurate. Optimizations:
1. Only check cells near the bounding box of each segment
2. Use spatial indexing for cells
3. Pre-filter segments that can't possibly affect each cell

## Verification

After fix, you should see:
- ✅ No red cells under visible flight tracks
- ✅ Coverage follows the actual path, not just GPS points
- ✅ Diagonal flight paths fully covered
- ✅ No gaps in straight-line flight segments
