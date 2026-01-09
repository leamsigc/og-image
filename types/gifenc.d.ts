declare module 'gifenc' {
  interface GifencModule {
    GIFEncoder(): {
      writeFrame(
        index: Uint8Array,
        width: number,
        height: number,
        options?: {
          palette?: number[][];
          delay?: number;
          dispose?: number;
          transparent?: boolean;
          transparentIndex?: number;
        }
      ): void;
      finish(): void;
      bytes(): Uint8Array;
      bytesView(): Uint8Array;
    };

    quantize(
      rgba: Uint8Array,
      maxColors: number,
      options?: {
        format?: string;
        oneBitAlpha?: boolean;
      }
    ): number[][];

    applyPalette(
      rgba: Uint8Array,
      palette: number[][],
      format?: string
    ): Uint8Array;

    nearestColorIndex(
      palette: number[][],
      pixel: number[]
    ): number;

    nearestColorIndexWithDistance(
      palette: number[][],
      pixel: number[]
    ): [number, number];

    snapColorsToPalette(
      palette: number[][],
      knownColors: number[][],
      threshold?: number
    ): void;

    prequantize(
      rgba: Uint8Array,
      options?: { oneBitAlpha?: boolean }
    ): void;
  }

  const gifenc: GifencModule;
  export default gifenc;

  // Also export individual functions for named imports
  export function GIFEncoder(): {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: number[][];
        delay?: number;
        dispose?: number;
        transparent?: boolean;
        transparentIndex?: number;
      }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  };

  export function quantize(
    rgba: Uint8Array,
    maxColors: number,
    options?: {
      format?: string;
      oneBitAlpha?: boolean;
    }
  ): number[][];

  export function applyPalette(
    rgba: Uint8Array,
    palette: number[][],
    format?: string
  ): Uint8Array;

  export function nearestColorIndex(
    palette: number[][],
    pixel: number[]
  ): number;

  export function nearestColorIndexWithDistance(
    palette: number[][],
    pixel: number[]
  ): [number, number];

  export function snapColorsToPalette(
    palette: number[][],
    knownColors: number[][],
    threshold?: number
  ): void;

  export function prequantize(
    rgba: Uint8Array,
    options?: { oneBitAlpha?: boolean }
  ): void;
}
