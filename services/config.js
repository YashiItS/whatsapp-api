/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

// Use dotenv to read .env vars into Node
require("dotenv").config();

// Required environment variables
const ENV_VARS = [
  "ACCESS_TOKEN",
  "APP_SECRET",
  "VERIFY_TOKEN",
  "PHONE_NUMBER_ID",
  "GRAPH_API_VERSION"
];

function getMediaId(key) {
  const value = process.env[key];
  return value && value.trim();
}

module.exports = Object.freeze({
  // Application information
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  verifyToken: process.env.VERIFY_TOKEN,
  graphApiVersion: process.env.GRAPH_API_VERSION,

  // WhatsApp media uploaded for outbound templates
  groceriesMediaId: getMediaId("GROCERIES_MEDIA_ID"),
  strawberriesMediaId: getMediaId("STRAWBERRIES_MEDIA_ID"),
  sheetPanDinnerMediaId: getMediaId("SHEET_PAN_DINNER_MEDIA_ID"),
  saladBowlMediaId: getMediaId("SALAD_BOWL_MEDIA_ID"),

  // Server configuration
  port: process.env.PORT || 8080,
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: process.env.REDIS_PORT || 6379,

  checkEnvVariables: function () {
    ENV_VARS.forEach(function (key) {
      if (!process.env[key]) {
        console.warn("WARNING: Missing the environment variable " + key);
      }
    });
  }
});
