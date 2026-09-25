/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const assert = require("node:assert/strict");
const {spawnSync} = require("node:child_process");
const test = require("node:test");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const configPath = path.resolve(appRoot, "services/config.js");
const validEnvironment = {
  ...process.env,
  ACCESS_TOKEN: "test-access-token",
  APP_SECRET: "test-app-secret",
  VERIFY_TOKEN: "test-verify-token",
  PHONE_NUMBER_ID: "test-phone-number-id",
  GRAPH_API_VERSION: "v23.0",
  GROCERIES_MEDIA_ID: "groceries-media-id",
  STRAWBERRIES_MEDIA_ID: "strawberries-media-id",
  SHEET_PAN_DINNER_MEDIA_ID: "sheet-pan-media-id",
  SALAD_BOWL_MEDIA_ID: "salad-bowl-media-id",
};

function runConfigCheck(environment = validEnvironment) {
  return spawnSync(
    process.execPath,
    ["-e", `require(${JSON.stringify(configPath)}).checkEnvVariables()`],
    {
      cwd: __dirname,
      encoding: "utf8",
      env: environment,
    },
  );
}

test("exports normalized configured media IDs", () => {
  const environment = {
    ...validEnvironment,
    GROCERIES_MEDIA_ID: "  groceries-media-id  ",
  };
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      `const config = require(${JSON.stringify(configPath)});
       process.stdout.write(JSON.stringify({
         groceriesMediaId: config.groceriesMediaId,
         strawberriesMediaId: config.strawberriesMediaId,
         sheetPanDinnerMediaId: config.sheetPanDinnerMediaId,
         saladBowlMediaId: config.saladBowlMediaId,
       }));`,
    ],
    {
      cwd: __dirname,
      encoding: "utf8",
      env: environment,
    },
  );

  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    groceriesMediaId: "groceries-media-id",
    strawberriesMediaId: "strawberries-media-id",
    sheetPanDinnerMediaId: "sheet-pan-media-id",
    saladBowlMediaId: "salad-bowl-media-id",
  });
});

test("accepts core configuration without media IDs", () => {
  const environment = {...validEnvironment};
  delete environment.GROCERIES_MEDIA_ID;
  delete environment.STRAWBERRIES_MEDIA_ID;
  delete environment.SHEET_PAN_DINNER_MEDIA_ID;
  delete environment.SALAD_BOWL_MEDIA_ID;

  const result = runConfigCheck(environment);

  assert.equal(result.status, 0, result.stderr);
});

test("accepts complete media configuration", () => {
  const result = runConfigCheck();

  assert.equal(result.status, 0, result.stderr);
});
