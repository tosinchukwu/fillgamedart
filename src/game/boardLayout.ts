// Board layout matching the uploaded image
// Ring 0 (outermost) → Ring 3 (innermost/bullseye area)
// Numbers are positioned around concentric rings

export interface NumberPosition {
  number: number;
  ring: number; // 0=outer, 1=mid-outer, 2=mid-inner, 3=inner
  angle: number; // degrees from top (clockwise)
  color: 'red' | 'green';
}

// Mapping from the image - numbers arranged on rings with red/green dots
export const BOARD_LAYOUT: NumberPosition[] = [
  // Outer ring (ring 0)
  { number: 7,  ring: 0, angle: 270, color: 'green' },
  { number: 4,  ring: 0, angle: 35,  color: 'red' },
  { number: 3,  ring: 0, angle: 225, color: 'green' },
  { number: 6,  ring: 0, angle: 200, color: 'red' },
  { number: 2,  ring: 0, angle: 145, color: 'red' },

  // Second ring (ring 1)
  { number: 11, ring: 1, angle: 340, color: 'green' },
  { number: 5,  ring: 1, angle: 20,  color: 'green' },
  { number: 9,  ring: 1, angle: 290, color: 'red' },
  { number: 8,  ring: 1, angle: 80,  color: 'green' },
  { number: 10, ring: 1, angle: 230, color: 'red' },
  { number: 1,  ring: 1, angle: 170, color: 'red' },

  // Third ring (ring 2)
  { number: 14, ring: 2, angle: 310, color: 'green' },
  { number: 12, ring: 2, angle: 130, color: 'green' },
  { number: 13, ring: 2, angle: 210, color: 'red' },
];

// Which numbers are on each ring
export const RING_NUMBERS: Record<number, number[]> = {
  0: [7, 4, 3, 6, 2],
  1: [11, 5, 9, 8, 10, 1],
  2: [14, 12, 13],
  3: [], // bullseye - special
};

export const RING_RADII = [
  { inner: 180, outer: 220 }, // ring 0
  { inner: 120, outer: 180 }, // ring 1
  { inner: 60,  outer: 120 }, // ring 2
  { inner: 0,   outer: 60 },  // ring 3 (bullseye)
];

export const TOTAL_NUMBERS = 14;
export const TARGET_SCORE = 221.5;
