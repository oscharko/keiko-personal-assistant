#!/usr/bin/env node

/**
 * Generate PWA icon PNG files from Icon.png
 * This script converts the Icon.png to various PNG sizes needed for PWA installation
 * 
 * Requirements: Install sharp package
 * Run: node generate-pwa-icons.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 }
];

async function generatePWAIcons() {
    try {
        // Try to import sharp
        const sharp = await import('sharp');
        
        const iconPath = join(__dirname, 'src', 'assets', 'Icon.png');
        const iconBuffer = readFileSync(iconPath);
        
        console.log('Generating PWA icon PNG files from Icon.png...');
        
        for (const { name, size } of sizes) {
            const outputPath = join(__dirname, 'public', name);
            
            await sharp.default(iconBuffer)
                .resize(size, size)
                .png()
                .toFile(outputPath);
            
            console.log(`Generated ${name} (${size}x${size})`);
        }
        
        console.log('\nAll PWA icons generated successfully!');
    } catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
            console.error('\nError: sharp package is not installed.');
            console.error('Please install it by running: npm install --save-dev sharp');
            console.error('\nAlternatively, you can use an online tool to convert the Icon.png to PNG:');
            console.error('1. Open src/assets/Icon.png');
            console.error('2. Use an online converter or image editor');
            console.error('3. Generate the following sizes and save them in the public folder:');
            sizes.forEach(({ name, size }) => {
                console.error(`   - ${name}: ${size}x${size}px`);
            });
        } else {
            console.error('Error generating PWA icons:', error);
        }
        process.exit(1);
    }
}

generatePWAIcons();

