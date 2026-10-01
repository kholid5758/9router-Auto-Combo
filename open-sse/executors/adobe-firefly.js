import { BaseExecutor } from "./base.js";

const ADOBE_FIREFLY_BASE_URL = "https://firefly-3p.ff.adobe.io/v2/3p-images/generate-async";

export class AdobeFireflyExecutor extends BaseExecutor {
  constructor() {
    super("adobe-firefly", { id: "adobe-firefly", baseUrl: ADOBE_FIREFLY_BASE_URL });
  }

  async execute(_input) {
    throw new Error(
      "adobe-firefly is a media-generation provider and does not support chat completions. " +
      "Use POST /v1/images/generations or /v1/videos/generations."
    );
  }
}

export default AdobeFireflyExecutor;
