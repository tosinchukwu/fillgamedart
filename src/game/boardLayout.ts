// Board layout - 4 rings from innermost (ring 0) to outermost (ring 3)
// Ring 0 (innermost): 14, 13
// Ring 1: 5, 9, 10, 11
// Ring 2: 1, 3, 12, 8
// Ring 3 (outermost): 7, 4, 2, 6

export interface NumberPosition {
  number: number;
  ring: number; // 0=innermost, 1, 2, 3=outermost
  angle: number; // degrees from top (clockwise)
  color: 'red' | 'green';
}

// Angles based on original image positions, redistributed across new rings
export const BOARD_LAYOUT: NumberPosition[] = [
  // Ring 0 - innermost (2 numbers, ~180° apart)
  { number: 14, ring: 0, angle: 310, color: 'green' },
  { number: 13, ring: 0, angle: 130, color: 'red' },

  // Ring 1 (4 numbers)
  { number: 11, ring: 1, angle: 340, color: 'green' },
  { number: 5, ring: 1, angle: 20, color: 'green' },
  { number: 9, ring: 1, angle: 290, color: 'red' },
  { number: 10, ring: 1, angle: 200, color: 'red' },

  // Ring 2 (4 numbers)
  { number: 1, ring: 2, angle: 170, color: 'red' },
  { number: 3, ring: 2, angle: 225, color: 'green' },
  { number: 12, ring: 2, angle: 80, color: 'green' },
  { number: 8, ring: 2, angle: 100, color: 'red' },

  // Ring 3 - outermost (4 numbers)
  { number: 7, ring: 3, angle: 270, color: 'green' },
  { number: 4, ring: 3, angle: 35, color: 'red' },
  { number: 2, ring: 3, angle: 145, color: 'red' },
  { number: 6, ring: 3, angle: 200, color: 'red' },
];

// Which numbers are on each ring
export const RING_NUMBERS: Record<number, number[]> = {
  0: [14, 13],
  1: [11, 5, 9, 10],
  2: [1, 3, 12, 8],
  3: [7, 4, 2, 6],
};

export const RING_RADII = [
  { inner: 0, outer: 55 }, // ring 0 - innermost
  { inner: 55, outer: 115 }, // ring 1
  { inner: 115, outer: 175 }, // ring 2
  { inner: 175, outer: 230 }, // ring 3 - outermost
];

export const TOTAL_NUMBERS = 14;
export const TARGET_SCORE = 221.5;
