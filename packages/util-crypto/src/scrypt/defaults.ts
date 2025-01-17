// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { ScryptParams } from './types.js';

export const DEFAULT_PARAMS: ScryptParams = {
  N: 1 << 2,
  p: 1,
  r: 8
};
