/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const redis = require('redis');
const config = require('./config');

let client = null;
let connectionPromise = null;

function createClient() {
  if (client) {
    return client;
  }

  try {
    client = redis.createClient({
      socket: {
        host: config.redisHost,
        port: config.redisPort
      }
    });

    client.on('error', (err) => {
      console.warn('Redis unavailable; continuing without it:', err.message || err);
    });

    return client;
  } catch (error) {
    console.warn('Redis initialization failed; continuing without Redis:', error.message || error);
    return null;
  }
}

async function connect() {
  const activeClient = createClient();
  if (!activeClient) {
    return null;
  }

  if (!connectionPromise) {
    connectionPromise = activeClient.connect().catch((error) => {
      console.warn('Redis connection failed; continuing without Redis:', error.message || error);
      connectionPromise = null;
      return null;
    });
  }

  return connectionPromise;
}

module.exports = class Cache {
  static async insert(key) {
    const activeClient = await connect();
    if (!activeClient) {
      return false;
    }

    await activeClient.set(key, "");
    await activeClient.expire(key, 15);
    return true;
  }

  static async remove(key) {
    const activeClient = await connect();
    if (!activeClient) {
      return false;
    }

    const resp = await activeClient.del(key);
    return resp > 0;
  }
};
