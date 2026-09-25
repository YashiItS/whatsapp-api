/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

function requireMediaId(imageId) {
  if (
    typeof imageId !== "string" ||
    !imageId.trim() ||
    imageId === "1234567890" ||
    imageId.startsWith("ADD_")
  ) {
    throw new Error("A valid media ID is required for this template.");
  }

  return imageId.trim();
}

function buildUtilityTemplatePayload(options) {
  const {
    recipientPhoneNumber,
    templateName,
    locale,
    imageId,
  } = options;
  const mediaId = requireMediaId(imageId);

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: locale,
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                id: mediaId,
              },
            },
          ],
        },
      ],
    },
  };
}

function buildLimitedTimeOfferTemplatePayload(options) {
  const {
    recipientPhoneNumber,
    templateName,
    locale,
    imageId,
    offerCode,
    expirationTimeMs,
  } = options;
  const mediaId = requireMediaId(imageId);

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: locale,
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                id: mediaId,
              },
            },
          ],
        },
        {
          type: "limited_time_offer",
          parameters: [
            {
              type: "limited_time_offer",
              limited_time_offer: {
                expiration_time_ms: expirationTimeMs,
              },
            },
          ],
        },
        {
          type: "button",
          sub_type: "copy_code",
          index: 0,
          parameters: [
            {
              type: "coupon_code",
              coupon_code: offerCode,
            },
          ],
        },
      ],
    },
  };
}

function buildMediaCardCarouselPayload(options) {
  const {
    recipientPhoneNumber,
    templateName,
    locale,
    imageIds,
  } = options;
  const mediaIdList = imageIds.map(requireMediaId);

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: locale,
      },
      components: [
        {
          type: "carousel",
          cards: mediaIdList.map((imageId, index) => ({
            card_index: index,
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: {
                      id: imageId,
                    },
                  },
                ],
              },
            ],
          })),
        },
      ],
    },
  };
}

module.exports = {
  buildLimitedTimeOfferTemplatePayload,
  buildMediaCardCarouselPayload,
  buildUtilityTemplatePayload,
};
