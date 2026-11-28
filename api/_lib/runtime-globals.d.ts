// Self-contained ambient declarations for Vercel Node.js serverless functions
// so api/tsconfig.json compiles with "types": [] and never triggers TS2688.

declare const process: {
  env: Record<string, string | undefined>;
};

interface BufferLike extends Uint8Array {
  subarray(start?: number, end?: number): BufferLike;
  toString(encoding?: string, start?: number, end?: number): string;
  write(string: string, offset?: number): number;
  writeUInt16LE(value: number, offset?: number): number;
  writeUInt32LE(value: number, offset?: number): number;
}

declare const Buffer: {
  from(input: string, encoding?: string): BufferLike;
  alloc(size: number): BufferLike;
  concat(list: readonly Uint8Array[]): BufferLike;
};
