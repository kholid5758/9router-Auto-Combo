import adobeFirefly from "./adobeFirefly.js";

const ADAPTERS = {
  "adobe-firefly": adobeFirefly,
};

export function getVideoAdapter(provider) {
  return ADAPTERS[provider] || null;
}

export function isVideoProvider(provider) {
  return provider in ADAPTERS;
}
