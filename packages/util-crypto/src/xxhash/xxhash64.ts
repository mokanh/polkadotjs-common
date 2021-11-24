// Copyright 2017-2021 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/pierrec/js-xxhash/blob/0504e76f3d31a21ae8528a7f590c7289c9e431d2/lib/xxhash64.js
//
// xxHash64 implementation in pure Javascript
// Copyright (C) 2016, Pierre Curto
// MIT license
//
// Changes made:
//   - converted to TypeScript
//   - uses native JS BigInt (no external dependencies)
//   - support only for Uint8Array inputs
//   - no constructor function, straight fill & digest
//   - update code removed, only called once, no streams

interface State {
  seed: bigint;
  u8a: Uint8Array;
  u8asize: number;
  v1: bigint;
  v2: bigint;
  v3: bigint;
  v4: bigint;
}

const P64_1 = 11400714785074694791n;
const P64_2 = 14029467366897019727n;
const P64_3 = 1609587929392839161n;
const P64_4 = 9650029242287828579n;
const P64_5 = 2870177450012600261n;

// mask for a u64, all bits set
const U64 = 2n ** 64n - 1n;

function rotl (a: bigint, b: bigint): bigint {
  const c = a & U64;

  return ((c << b) | (c >> (64n - b))) & U64;
}

function fromU8a (u8a: Uint8Array, p: number, count: 2 | 4): bigint {
  const bigints = new Array<bigint>(count);
  let offset = 0;

  for (let i = 0; i < count; i++, offset += 2) {
    bigints[i] = BigInt(u8a[p + offset] | (u8a[p + 1 + offset] << 8));
  }

  let result = 0n;

  for (let i = count - 1; i >= 0; i--) {
    result = (result << 16n) + bigints[i];
  }

  return result;
}

function toU8a (h64: bigint): Uint8Array {
  const result = new Uint8Array(8);

  for (let i = 7; i >= 0; i--) {
    result[i] = Number(h64 % 256n);

    h64 = h64 / 256n;
  }

  return result;
}

function state (initSeed: bigint | number): State {
  const seed = BigInt(initSeed);

  return {
    seed,
    u8a: new Uint8Array(32),
    u8asize: 0,
    v1: seed + P64_1 + P64_2,
    v2: seed + P64_2,
    v3: seed,
    v4: seed - P64_1
  };
}

function init (state: State, input: Uint8Array): State {
  if (input.length < 32) {
    state.u8a.set(input);
    state.u8asize = input.length;

    return state;
  }

  const limit = input.length - 32;
  let p = 0;

  if (limit >= 0) {
    const adjustV = (v: bigint) =>
      P64_1 * rotl(v + P64_2 * fromU8a(input, p, 4), 31n);

    do {
      state.v1 = adjustV(state.v1); p += 8;
      state.v2 = adjustV(state.v2); p += 8;
      state.v3 = adjustV(state.v3); p += 8;
      state.v4 = adjustV(state.v4); p += 8;
    } while (p <= limit);
  }

  if (p < input.length) {
    state.u8a.set(input.subarray(p, input.length));
    state.u8asize = input.length - p;
  }

  return state;
}

export function xxhash64 (input: Uint8Array, initSeed: bigint | number): Uint8Array {
  const { seed, u8a, u8asize, v1, v2, v3, v4 } = init(state(initSeed), input);
  let p = 0;
  let h64 = U64 & (BigInt(input.length) + (
    input.length >= 32
      ? (((((((((rotl(v1, 1n) + rotl(v2, 7n) + rotl(v3, 12n) + rotl(v4, 18n)) ^ (P64_1 * rotl(v1 * P64_2, 31n))) * P64_1 + P64_4) ^ (P64_1 * rotl(v2 * P64_2, 31n))) * P64_1 + P64_4) ^ (P64_1 * rotl(v3 * P64_2, 31n))) * P64_1 + P64_4) ^ (P64_1 * rotl(v4 * P64_2, 31n))) * P64_1 + P64_4)
      : (seed + P64_5)
  ));

  while (p <= (u8asize - 8)) {
    h64 = U64 & (P64_4 + P64_1 * rotl(h64 ^ (P64_1 * rotl(P64_2 * fromU8a(u8a, p, 4), 31n)), 27n));
    p += 8;
  }

  if ((p + 4) <= u8asize) {
    h64 = U64 & (P64_3 + P64_2 * rotl(h64 ^ (P64_1 * fromU8a(u8a, p, 2)), 23n));
    p += 4;
  }

  while (p < u8asize) {
    h64 = U64 & (P64_1 * rotl(h64 ^ (P64_5 * BigInt(u8a[p++])), 11n));
  }

  h64 = U64 & (P64_2 * (h64 ^ (h64 >> 33n)));
  h64 = U64 & (P64_3 * (h64 ^ (h64 >> 29n)));

  return toU8a(U64 & (h64 ^ (h64 >> 32n)));
}