export default {
  id: "adobe-firefly",
  alias: "firefly",
  priority: 300,
  category: "webCookie",
  display: {
    name: "Adobe Firefly (Image/Video)",
    icon: "auto_awesome",
    color: "#EB1000",
    textIcon: "FF",
    website: "https://firefly.adobe.com",
    notice: {
      text: "Adobe Firefly menggunakan sesi web browser — tidak ada API key resmi. Unofficial/experimental.",
    },
  },
  transport: null, // Tidak ada chat completions
  serviceKinds: ["image", "video"],
  imageConfig: { baseUrl: "https://firefly-3p.ff.adobe.io/v2/3p-images/generate-async" },
  videoConfig: { baseUrl: "https://firefly-3p.ff.adobe.io/v2/3p-images/generate-async" },
  authHint:
    "REKOMENDASI: Masuk ke firefly.adobe.com → F12 → Network → klik permintaan ke firefly-3p.ff.adobe.io → Request Headers → Authorization → salin token setelah 'Bearer ' (dimulai dengan eyJ…). Tempel di sini. Berfungsi hanya selama sesi masih aktif.",
  subscriptionRisk: true,
  riskNoticeVariant: "webCookie",
  models: [
    { id: "adobe-firefly/nano-banana-pro", name: "Firefly Nano Banana Pro", kind: "image" },
    { id: "adobe-firefly/nano-banana-2", name: "Firefly Nano Banana 2", kind: "image" },
    { id: "adobe-firefly/gpt-image-2", name: "Firefly GPT Image 2", kind: "image" },
    { id: "adobe-firefly/flux-pro", name: "Firefly Flux Pro", kind: "image" },
    { id: "adobe-firefly/flux-ultra", name: "Firefly Flux Ultra", kind: "image" },
    { id: "adobe-firefly/sora-2", name: "Firefly Sora 2", kind: "video" },
    { id: "adobe-firefly/veo-3.1", name: "Firefly Veo 3.1", kind: "video" },
  ],
};
