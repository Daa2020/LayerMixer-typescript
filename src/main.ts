import { createCanvas, loadImage, Canvas } from 'canvas';
import fs from 'fs/promises';
import path from 'path';

async function combineImages(images: string[]): Promise<Canvas> {
  const canvas = createCanvas(800, 800);
  const ctx = canvas.getContext('2d');

  const promisedImages = await Promise.all(
    images.map((image) => loadImage(image))
  );

  promisedImages.forEach((img, index) => {
    ctx.drawImage(img, 0, 0, 800, 800);
  });

  return canvas;
}

async function getRandomFiles(directory: string, numFiles: number): Promise<string[]> {
  try {
    const files = await fs.readdir(directory);
    const randomFiles: string[] = [];
    const numFilesToSelect = Math.min(numFiles, files.length);

    while (randomFiles.length < numFilesToSelect) {
      const randomIndex = Math.floor(Math.random() * files.length);
      const randomFile = files[randomIndex];
      randomFiles.push(path.join(directory, randomFile));
      files.splice(randomIndex, 1); // Remove selected file from the array
    }

    return randomFiles;
  } catch (error) {
    throw new Error(`Error reading directory: ${directory}`);
  }
}

async function generateCombinedImage(imageIndex: number, directories: string[]): Promise<void> {
  const images: string[] = [];
  for (const directory of directories) {
    const randomImages: string[] = await getRandomFiles(directory, 1);
    images.push(...randomImages);
  }

  try {
    const canvas = await combineImages(images);
    const buildDirectory = './build';
    if (!await fs.access(buildDirectory).catch(() => false)) {
      await fs.mkdir(buildDirectory, { recursive: true });
    }
    const outputPath = path.join(buildDirectory, `combined_${imageIndex}.png`);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);
    console.log(`Combined image ${imageIndex} saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error combining images for image ${imageIndex}:`, error);
  }
}

async function main() {
  try {
    const configFile = './src/config.json'; // Specify the path to the configuration file

    // Read the configuration file
    const configData = await fs.readFile(configFile, 'utf8');
    const config = JSON.parse(configData);

    // Retrieve the directories from the configuration file
    const directories: string[] = config.directories;
    const numImagesToBuild: number = config.numImagesToBuild;

    // Generate multiple sets of random images concurrently
    const imageGenerationPromises = Array.from({ length: numImagesToBuild }, (_, i) =>
      generateCombinedImage(i + 1, directories)
    );

    await Promise.all(imageGenerationPromises);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
