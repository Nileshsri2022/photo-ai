import { OpenAI } from "openai";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import extract from "extract-zip";
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const client = new OpenAI({
  baseURL: "https://api.electronhub.ai/v1/images/generations",
  apiKey: process.env.OPENAI_API_KEY || "ek-wKxf8gp8VSz1zY3pnJQufNeZUyIMFES2wwkS5TOfy6iOjz0Ov6",
});

export class OpenAIModel {
  constructor() {}

  public async generateImage(prompt: string, modelId?: string) {
    const res = await client.images.generate({
      model: modelId || "imagen-3-fast",
      prompt,
      n: 1,
      size: "1024x1024",
    });
    // ## initial it is res.data but now this
    return res._request_id!;
  }

  public async checkTrainingStatus(jobId: string) {
    return await client.fineTuning.jobs.retrieve(jobId);
  }

  // ✅ FIXED trainModel
  public async trainModel(zipUrl: string) {
    console.log("Training model with data:", zipUrl);

    const tempDir = path.join(process.cwd(), "temp");
    const zipPath = path.join(tempDir, "images.zip");

    try {
      // Ensure temp dir exists
      await fs.mkdir(tempDir, { recursive: true });

      // Stream download instead of 'download' package
      console.log("Downloading ZIP...");
      const res = await fetch(zipUrl);
      if (!res.ok) throw new Error(`Failed to fetch ZIP: ${res.statusText}`);

      await pipeline(res.body, createWriteStream(zipPath));
      const stats = await fs.stat(zipPath);
      console.log("ZIP downloaded. Size (MB):", (stats.size / 1024 / 1024).toFixed(2));

      // Extract ZIP
      const extractPath = path.join(tempDir, "extracted");
      await extract(zipPath, { dir: extractPath });
      console.log("ZIP extracted.");

      // Collect image files
      const files = await fs.readdir(extractPath);
      const imageFiles = files.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
      if (imageFiles.length === 0) throw new Error("No images found in ZIP!");

      // Upload images to OpenAI
      const trainingFiles: string[] = [];
      for (const img of imageFiles) {
        const imagePath = path.join(extractPath, img);
        const file = await client.files.create({
          file: createReadStream(imagePath),
          purpose: "fine-tune",
        });
        trainingFiles.push(file.id);
        console.log("Uploaded:", img, "-> file_id:", file.id);
      }

      // Start fine-tuning job
      const fineTune = await client.fineTuning.jobs.create({
        training_file: trainingFiles[0], // currently only one file allowed
        model: "imagen-3-fast",
        hyperparameters: { n_epochs: 3 },
      });

      const fineTunedModelId = `ft:${fineTune.model}:${fineTune.id}`;

      // Cleanup temp folder
      await fs.rm(tempDir, { recursive: true, force: true });

      return {
        request_id: fineTune.id,
        status: fineTune.status,
        files_processed: trainingFiles.length,
        model_id: fineTunedModelId,
      };
    } catch (error) {
      console.error("Error in training:", error);
      throw new Error(`Training failed: ${error as any}`);
    }
  }

  public async generateImageSync(modelId?: string) {
    const res = await client.images.generate({
      model: modelId || "imagen-3-fast",
      prompt: "Generate a head shot for this user in front of a white background",
      n: 1,
      size: "1024x1024",
    });
    return res.data;
  }
}

// Test run
// const openai = new OpenAIModel();
// async function main() {
//   const res = await openai.trainModel(
//     "https://link.storjshare.io/raw/jxwesc5queljhtimgzcykvccly6q/photoai/models/1758105402070_0.7117738614142338.zip"
//   );
//   console.log("Training started:", res);
// }
// main();
