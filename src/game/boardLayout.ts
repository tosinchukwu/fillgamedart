// Board layout - 4 rings from innermost (ring 0) to outermost (ring 3)
// Ring 0 (innermost): 14, 13
// Ring 1: 12, 9, 5, 10
// Ring 2: 11, 1, 3, 8
// Ring 3 (outermost): 7, 4, 2, 6

export interface NumberPosition {
  number: number;
  ring: number; // 0=innermost, 1, 2, 3=outermost
  angle: number; // degrees from top (clockwise)
  color: 'red' | 'green';
}

// Angles based exactly on the provided image
export const BOARD_LAYOUT: NumberPosition[] = [
  // Ring 0 (innermost circle line, r=60)
  { number: 14, ring: 0, angle: 0, color: 'red' },
  { number: 13, ring: 0, angle: 180, color: 'green' },

  // Ring 1 (second circle line, r=115)
  { number: 12, ring: 1, angle: 135, color: 'red' },
  { number: 9, ring: 1, angle: 320, color: 'red' },
  { number: 5, ring: 1, angle: 40, color: 'green' },
  { number: 10, ring: 1, angle: 220, color: 'green' },

  // Ring 2 (third circle line, r=175)
  { number: 11, ring: 2, angle: 0, color: 'green' },
  { number: 1, ring: 2, angle: 180, color: 'red' },
  { number: 3, ring: 2, angle: 275, color: 'green' },
  { number: 8, ring: 2, angle: 85, color: 'green' },

  // Ring 3 (outermost circle line, r=235)
  { number: 7, ring: 3, angle: 310, color: 'green' },
  { number: 4, ring: 3, angle: 50, color: 'red' },
  { number: 2, ring: 3, angle: 130, color: 'green' },
  { number: 6, ring: 3, angle: 230, color: 'red' },
];

export const RING_NUMBERS: Record<number, number[]> = {
  0: [14, 13],
  1: [12, 9, 5, 10],
  2: [11, 1, 3, 8],
  3: [7, 4, 2, 6],
};

// Radii of the drawn white ring boundaries
export const RING_RADII = [
  { inner: 0, outer: 60 },     // Ring 0 line is at r=60
  { inner: 60, outer: 115 },   // Ring 1 line is at r=115
  { inner: 115, outer: 175 },  // Ring 2 line is at r=175
  { inner: 175, outer: 235 },  // Ring 3 line is at r=235
];

export const TOTAL_NUMBERS = 14;
export const TARGET_SCORE = 221.5;
