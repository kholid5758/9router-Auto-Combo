// NanoBanana API — async submit + poll record-info
// Models: nanobanana-flash → /generate, nanobanana-pro → /generate-pro, nanobanana-2 → /generate-2
import { sleep, nowSec, sizeToAspectRatio, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from "./_base.js";
import { PROVIDER_MEDIA } from "../../providers/index.js";

const IMG_CFG = PROVIDER_MEDIA["nanobanana"]?.imageConfig || {};
const SUBMIT_URL   = IMG_CFG.baseUrl;   // /generate       (flash / default)
const SUBMIT_PRO   = IMG_CFG.proUrl;    // /generate-pro   (pro)
const SUBMIT_V2    = IMG_CFG.v2Url;     // /generate-2     (nanobanana-2)
const POLL_BASE    = IMG_CFG.pollUrl;

/** Pick the right submit URL based on model id */
function resolveSubmitUrl(model) {
  if (model === "nanobanana-pro") return SUBMIT_PRO || SUBMIT_URL;
  if (model === "nanobanana-2")   return SUBMIT_V2  || SUBMIT_URL;
  return SUBMIT_URL;
}

export default {
  async: true,
  buildUrl: (_model, _body, model) => resolveSubmitUrl(model),
  buildHeaders: (creds) => {
    const headers = { "Content-Type": "application/json" };
    const key = creds?.apiKey || creds?.accessToken;
    if (key) headers["Authorization"] = `Bearer ${key}`;
    return headers;
  },
  buildBody: (model, body) => {
    const ratio = sizeToAspectRatio(body.size);
    const isEdit = !!(body.image || (Array.isArray(body.images) && body.images.length));

    // Pro model uses aspectRatio + resolution instead of image_size
    if (model === "nanobanana-pro") {
      const req = {
        prompt: body.prompt,
        imageUrls: [""],
        aspectRatio: ratio || "1:1",
        resolution: body.resolution || "1K",
        callBackUrl: "https://localhost/callback",
      };
      if (isEdit) {
        const urls = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
        if (body.image) urls.push(body.image);
        req.imageUrls = urls;
      }
      return req;
    }

    // Flash / NanoBanana-2: standard format
    const req = {
      prompt: body.prompt,
      type: isEdit ? "IMAGETOIAMGE" : "TEXTTOIAMGE",
      numImages: body.n || 1,
      image_size: ratio || "1:1",
      // API requires callBackUrl; we poll instead so a dummy URL is fine.
      callBackUrl: "https://localhost/callback",
    };
    if (isEdit) {
      const urls = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
      if (body.image) urls.push(body.image);
      req.imageUrls = urls;
    }
    return req;
  },
  // Async: parse submit → poll until SUCCESS, return raw poll data
  async parseResponse(response, { headers }) {
    const submitData = await response.json();
    if (submitData.code !== 200) throw new Error(submitData.msg || "NanoBanana submit failed");
    const taskId = submitData.data?.taskId;
    if (!taskId) throw new Error("NanoBanana: no taskId returned");
    const pollUrl = `${POLL_BASE}?taskId=${encodeURIComponent(taskId)}`;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const r = await fetch(pollUrl, { headers });
      if (!r.ok) throw new Error(`NanoBanana status ${r.status}`);
      const s = await r.json();
      const flag = s.data?.successFlag;
      if (flag === 1) return s.data;
      if (flag === 2 || flag === 3) throw new Error(s.data?.errorMessage || "NanoBanana generation failed");
    }
    throw new Error("NanoBanana polling timeout");
  },
  normalize: (responseBody, prompt) => {
    const url = responseBody.response?.resultImageUrl || responseBody.response?.originImageUrl;
    if (url) return { created: nowSec(), data: [{ url, revised_prompt: prompt }] };
    return { created: nowSec(), data: [] };
  },
};
