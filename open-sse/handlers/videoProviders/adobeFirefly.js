import crypto from "crypto";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const nowSec = () => Math.floor(Date.now() / 1000);

const SUBMIT_URL = "https://firefly-3p.ff.adobe.io/v2/3p-videos/generate-async";

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
    let modelName = model;
    if (model === "sora-2") {
      modelName = "openai:firefly:colligo:sora2";
    } else if (model === "veo-3.1") {
      modelName = "google:firefly:colligo:veo31";
    } else if (model === "kling-3") {
      modelName = "kling:firefly:colligo:kling3";
    }
    
    return {
      prompt: body.prompt,
      aspectRatio: "16:9",
      duration: 8,
      resolution: "720p",
      model: {
        name: modelName
      }
    };
  },
  async parseResponse(response, { headers }) {
    const submitData = await response.json();
    const resultUrl = submitData.links?.result || submitData.jobUrl || submitData.pollUrl;
    if (!resultUrl) throw new Error("Adobe Firefly video submit failed, no poll URL returned");

    const deadline = Date.now() + 300000;
    while (Date.now() < deadline) {
      await sleep(3000);
      const r = await fetch(resultUrl, { headers });
      if (!r.ok) throw new Error(`Adobe Firefly video poll status ${r.status}`);
      const s = await r.json();
      
      if (s.status === 'succeeded') return s;
      if (s.status === 'failed') throw new Error("Adobe Firefly video generation failed");
    }
    throw new Error("Adobe Firefly video polling timeout");
  },
  normalize: (responseBody, prompt) => {
    const url = responseBody.outputs?.[0]?.presignedUrl || responseBody.result?.url || responseBody.video_url;
    if (url) return { created: nowSec(), data: [{ url, revised_prompt: prompt }] };
    return { created: nowSec(), data: [] };
  },
};
