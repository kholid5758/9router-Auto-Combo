import crypto from "crypto";
import { sleep, nowSec } from "./_base.js";

const SUBMIT_URL = "https://firefly-3p.ff.adobe.io/v2/3p-images/generate-async";

export default {
  async: true,
  buildUrl: () => SUBMIT_URL,
  buildHeaders: (creds) => {
    const headers = { 
      "Content-Type": "application/json",
      "x-api-key": "clio-playground-web",
      "x-nonce": crypto.randomBytes(16).toString('hex'),
      "x-arp-session-id": crypto.randomBytes(8).toString('hex'),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      "Origin": "https://firefly.adobe.com",
      "Referer": "https://firefly.adobe.com/",
      "Accept": "*/*"
    };
    const key = creds?.apiKey || creds?.accessToken;
    if (key) headers["Authorization"] = `Bearer ${key}`;
    return headers;
  },
  buildBody: (model, body) => {
    let modelId = "gpt-image";
    let modelVersion = "2";
    if (model === "nano-banana-pro") {
      modelId = "gemini-flash";
      modelVersion = "nano-banana-2";
    } else if (model === "nano-banana-2") {
      modelId = "gemini-flash";
      modelVersion = "nano-banana-3";
    } else if (model === "flux-pro") {
      modelId = "flux";
      modelVersion = "fluxPro";
    } else if (model === "flux-ultra") {
      modelId = "flux";
      modelVersion = "fluxUltra";
    }
    
    return {
      prompt: body.prompt,
      aspectRatio: body.size ? (body.size.includes('x') ? '1:1' : body.size) : "1:1",
      outputResolution: "standard",
      modelId,
      modelVersion,
      referenceBlobs: []
    };
  },
  async parseResponse(response, { headers }) {
    const submitData = await response.json();
    const resultUrl = submitData.links?.result || submitData.jobUrl || submitData.pollUrl;
    if (!resultUrl) throw new Error("Adobe Firefly submit failed, no poll URL returned");

    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      await sleep(3000);
      const r = await fetch(resultUrl, { headers });
      if (!r.ok) throw new Error(`Adobe Firefly poll status ${r.status}`);
      const s = await r.json();
      
      if (s.status === 'succeeded') return s;
      if (s.status === 'failed') throw new Error("Adobe Firefly generation failed");
    }
    throw new Error("Adobe Firefly polling timeout");
  },
  normalize: (responseBody, prompt) => {
    let url = responseBody.outputs?.[0]?.presignedUrl || responseBody.result?.url || responseBody.links?.result_image;
    if (!url && responseBody.outputs && responseBody.outputs[0]) {
      url = responseBody.outputs[0].image?.url || responseBody.outputs[0].url;
    }
    if (url) return { created: nowSec(), data: [{ url, revised_prompt: prompt }] };
    return { created: nowSec(), data: [] };
  },
};
