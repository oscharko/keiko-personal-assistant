#!/usr/bin/env node

/**
 * Generate favicon PNG files from SVG
 * This script converts the SVG favicon to various PNG sizes needed for different platforms
 * 
 * Requirements: Install sharp package
 * Run: node generate-favicons.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 }
];

async function generateFavicons() {
    try {
        // Try to import sharp
        const sharp = await import('sharp');
        
        const svgPath = join(__dirname, 'public', 'favicon.svg');
        const svgBuffer = readFileSync(svgPath);
        
        console.log('Generating favicon PNG files...');
        
        for (const { name, size } of sizes) {
            const outputPath = join(__dirname, 'public', name);
            
            await sharp.default(svgBuffer)
                .resize(size, size)
                .png()
                .toFile(outputPath);
            
            console.log(`Generated ${name} (${size}x${size})`);
        }
        
        console.log('\nAll favicons generated successfully!');
    } catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
            console.error('\nError: sharp package is not installed.');
            console.error('Please install it by running: npm install --save-dev sharp');
            console.error('\nAlternatively, you can use an online tool to convert the SVG to PNG:');
            console.error('1. Open public/favicon.svg in a browser');
            console.error('2. Use an online converter like https://cloudconvert.com/svg-to-png');
            console.error('3. Generate the following sizes and save them in the public folder:');
            sizes.forEach(({ name, size }) => {
                console.error(`   - ${name}: ${size}x${size}px`);
            });
        } else {
            console.error('Error generating favicons:', error);
        }
        process.exit(1);
    }
}

generateFavicons();

