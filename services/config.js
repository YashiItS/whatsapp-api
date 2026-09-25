/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

require("dotenv").config();

const REQUIRED_ENV_VARS = [
  "ACCESS_TOKEN",
  "APP_SECRET",
  "VERIFY_TOKEN",
  "PHONE_NUMBER_ID",
  "GRAPH_API_VERSION",
  "ADMIN_USER",
  "ADMIN_PASS",
  "SESSION_SECRET",
];

const ENV_VARS = [...REQUIRED_ENV_VARS, "WABA_ID", "DATABASE_URL"];

function getMediaId(key) {
  const value = process.env[key];
  return value && value.trim();
}

const config = {};

Object.defineProperties(config, {
  appSecret: { enumerable: true, get: () => process.env.APP_SECRET },
  accessToken: { enumerable: true, get: () => process.env.ACCESS_TOKEN },
  verifyToken: { enumerable: true, get: () => process.env.VERIFY_TOKEN },
  graphApiVersion: { enumerable: true, get: () => process.env.GRAPH_API_VERSION || "v26.0" },
  phoneNumberId: { enumerable: true, get: () => process.env.PHONE_NUMBER_ID },
  wabaId: { enumerable: true, get: () => process.env.WABA_ID },
  adminUser: { enumerable: true, get: () => process.env.ADMIN_USER },
  adminPass: { enumerable: true, get: () => process.env.ADMIN_PASS },
  sessionSecret: { enumerable: true, get: () => process.env.SESSION_SECRET },
  databaseUrl: { enumerable: true, get: () => process.env.DATABASE_URL || null },

  groceriesMediaId: { enumerable: true, get: () => getMediaId("GROCERIES_MEDIA_ID") },
  strawberriesMediaId: { enumerable: true, get: () => getMediaId("STRAWBERRIES_MEDIA_ID") },
  sheetPanDinnerMediaId: { enumerable: true, get: () => getMediaId("SHEET_PAN_DINNER_MEDIA_ID") },
  saladBowlMediaId: { enumerable: true, get: () => getMediaId("SALAD_BOWL_MEDIA_ID") },

  port: { enumerable: true, get: () => process.env.PORT || 8080 },
  redisHost: { enumerable: true, get: () => process.env.REDIS_HOST || "localhost" },
  redisPort: { enumerable: true, get: () => process.env.REDIS_PORT || 6379 },

  checkEnvVariables: {
    value: function () {
      const missingRequired = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
      if (missingRequired.length > 0) {
        throw new Error("Missing required environment variables: " + missingRequired.join(", "));
      }

      ENV_VARS.forEach(function (key) {
        if (!process.env[key] && key !== "DATABASE_URL" && key !== "WABA_ID") {
          console.warn("WARNING: Missing the environment variable " + key);
        }
      });

      if (!process.env.DATABASE_URL) {
        console.warn("WARNING: DATABASE_URL is not set. The app will use the in-memory fallback for local development.");
      }
    },
    enumerable: true,
  },
});

module.exports = config;
