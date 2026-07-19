/**
 * Image generation helper using the built-in ImageService when available, with
 * a Vertex AI Gemini native-image fallback for production Cloud Run deployments.
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

// Default model for built-in image generation. "MODEL_GPT_IMAGE_2" is the
// forge images.v1 enum for GPT Image 2 (id: gpt-image-2).
const DEFAULT_IMAGE_MODEL = "MODEL_GPT_IMAGE_2";
const DEFAULT_IMAGE_QUALITY = "medium";
const DEFAULT_VERTEX_IMAGE_MODEL = "gemini-3.1-flash-image";

type VertexAccessToken = {
  access_token?: string;
};

type VertexImagePart = {
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
};

type VertexImageCandidate = {
  content?: {
    parts?: VertexImagePart[];
  };
  finishReason?: string;
};

type VertexImageResponse = {
  candidates?: VertexImageCandidate[];
};

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  /** Forge image model enum, e.g. "MODEL_GPT_IMAGE_2". */
  model?: string;
  /** Generation quality, e.g. "medium" | "high". */
  quality?: string;
};

export type GenerateImageResponse = {
  url?: string;
  key?: string;
};

const hasForgeImageConfig = () => Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);

const hasVertexImageConfig = () => Boolean(
  ENV.vertexProjectId && ENV.vertexImageLocation && ENV.vertexImageModel
);

const getVertexAccessToken = async (): Promise<string> => {
  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } }
  );
  if (!response.ok) {
    throw new Error("Vertex AI could not obtain the Cloud Run service-identity token.");
  }

  const token = (await response.json()) as VertexAccessToken;
  if (!token.access_token) {
    throw new Error("Vertex AI returned no Cloud Run service-identity token.");
  }
  return token.access_token;
};

const resolveVertexImageApiUrl = () => {
  const host = ENV.vertexImageLocation === "global"
    ? "https://aiplatform.googleapis.com"
    : `https://${ENV.vertexImageLocation}-aiplatform.googleapis.com`;
  return `${host}/v1/projects/${encodeURIComponent(ENV.vertexProjectId)}/locations/${encodeURIComponent(ENV.vertexImageLocation)}/publishers/google/models/${encodeURIComponent(ENV.vertexImageModel || DEFAULT_VERTEX_IMAGE_MODEL)}:generateContent`;
};

const saveGeneratedImage = async (base64Data: string, mimeType: string) => {
  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length === 0) {
    throw new Error("Image generation returned empty image data.");
  }

  const extension = mimeType === "image/jpeg" ? "jpg" : "png";
  return storagePut(`generated/${Date.now()}.${extension}`, buffer, mimeType);
};

const generateWithForge = async (
  options: GenerateImageOptions
): Promise<GenerateImageResponse> => {
  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const model = options.model ?? DEFAULT_IMAGE_MODEL;
  const quality = options.quality
    ?? (model === DEFAULT_IMAGE_MODEL ? DEFAULT_IMAGE_QUALITY : undefined);

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
      model,
      ...(quality ? { quality } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: { b64Json: string; mimeType: string };
  };
  const { key, url } = await saveGeneratedImage(
    result.image.b64Json,
    result.image.mimeType
  );
  return { key, url };
};

const generateWithVertex = async (
  options: GenerateImageOptions
): Promise<GenerateImageResponse> => {
  if (options.originalImages?.length) {
    throw new Error("The Vertex AI image fallback supports new image generation only, not image editing.");
  }

  const accessToken = await getVertexAccessToken();
  const model = ENV.vertexImageModel || DEFAULT_VERTEX_IMAGE_MODEL;
  const response = await fetch(resolveVertexImageApiUrl(), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: options.prompt }],
      }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "3:2" },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Vertex AI image generation failed for ${model} in ${ENV.vertexImageLocation} (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as VertexImageResponse;
  const imagePart = result.candidates
    ?.flatMap(candidate => candidate.content?.parts ?? [])
    .find(part => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const finishReasons = result.candidates
      ?.map(candidate => candidate.finishReason)
      .filter((reason): reason is string => Boolean(reason));
    const reasonDetail = finishReasons?.length
      ? ` (finish reason: ${finishReasons.join(", ")})`
      : "";
    throw new Error(`Vertex AI returned no usable generated image${reasonDetail}.`);
  }

  const { key, url } = await saveGeneratedImage(
    imagePart.inlineData.data,
    imagePart.inlineData.mimeType || "image/png"
  );
  return { key, url };
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (hasForgeImageConfig()) {
    return generateWithForge(options);
  }
  if (hasVertexImageConfig()) {
    return generateWithVertex(options);
  }

  throw new Error(
    "Image generation is not configured. Configure BUILT_IN_FORGE_API_KEY or Vertex AI image runtime settings."
  );
}

export type ImageModelInfo = {
  /** Forge model enum, e.g. "MODEL_GPT_IMAGE_2". Pass into generateImage({ model }). */
  model?: string;
  /** Stable model id, e.g. "gpt-image-2". */
  id?: string;
};

export type ListImageModelsResponse = {
  models: ImageModelInfo[];
};

/**
 * List the image models the current runtime can use. In production without a
 * Forge key, the Vertex fallback exposes its configured Gemini image model.
 */
export async function listImageModels(): Promise<ListImageModelsResponse> {
  if (!hasForgeImageConfig()) {
    if (hasVertexImageConfig()) {
      return {
        models: [{
          model: ENV.vertexImageModel || DEFAULT_VERTEX_IMAGE_MODEL,
          id: ENV.vertexImageModel || DEFAULT_VERTEX_IMAGE_MODEL,
        }],
      };
    }
    throw new Error("Image generation is not configured.");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/ListModels",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: "{}",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `List image models failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as { models?: ImageModelInfo[] };
  return { models: result.models ?? [] };
}
