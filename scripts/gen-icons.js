const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  // Simple car icon using SVG paths (no emoji text, works everywhere)
  const carPathSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea"/>
        <stop offset="100%" style="stop-color:#764ba2"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.17}" fill="url(#bg)"/>
    <g transform="translate(${size * 0.5}, ${size * 0.5}) scale(${size / 192})">
      <!-- Car body -->
      <path d="M-60,-15 L-50,-35 L-20,-50 L30,-50 L55,-30 L70,-15 L75,-15 Q80,-15 80,-10 L80,5 Q80,10 75,10 L-65,10 Q-70,10 -70,5 L-70,-10 Q-70,-15 -65,-15 Z"
            fill="white" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <!-- Windows -->
      <path d="M-45,-17 L-35,-40 L-10,-42 L-10,-17 Z" fill="rgba(255,255,255,0.5)"/>
      <path d="M-5,-17 L-5,-42 L25,-42 L45,-22 L45,-17 Z" fill="rgba(255,255,255,0.5)"/>
      <!-- Wheels -->
      <circle cx="-35" cy="15" r="12" fill="#333"/>
      <circle cx="-35" cy="15" r="5" fill="white"/>
      <circle cx="45" cy="15" r="12" fill="#333"/>
      <circle cx="45" cy="15" r="5" fill="white"/>
      <!-- Headlight -->
      <circle cx="70" cy="-5" r="4" fill="#FFE066"/>
    </g>
  </svg>`;

  await sharp(Buffer.from(carPathSvg(192))).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(Buffer.from(carPathSvg(512))).resize(512, 512).png().toFile('public/icon-512.png');

  // Maskable versions (extra padding within safe zone)
  const maskableSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea"/>
        <stop offset="100%" style="stop-color:#764ba2"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.17}" fill="url(#bg)"/>
    <g transform="translate(${size * 0.5}, ${size * 0.5}) scale(${size / 230})">
      <path d="M-60,-15 L-50,-35 L-20,-50 L30,-50 L55,-30 L70,-15 L75,-15 Q80,-15 80,-10 L80,5 Q80,10 75,10 L-65,10 Q-70,10 -70,5 L-70,-10 Q-70,-15 -65,-15 Z"
            fill="white" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <path d="M-45,-17 L-35,-40 L-10,-42 L-10,-17 Z" fill="rgba(255,255,255,0.5)"/>
      <path d="M-5,-17 L-5,-42 L25,-42 L45,-22 L45,-17 Z" fill="rgba(255,255,255,0.5)"/>
      <circle cx="-35" cy="15" r="12" fill="#333"/>
      <circle cx="-35" cy="15" r="5" fill="white"/>
      <circle cx="45" cy="15" r="12" fill="#333"/>
      <circle cx="45" cy="15" r="5" fill="white"/>
      <circle cx="70" cy="-5" r="4" fill="#FFE066"/>
    </g>
  </svg>`;

  await sharp(Buffer.from(maskableSvg(192))).resize(192, 192).png().toFile('public/icon-192-maskable.png');
  await sharp(Buffer.from(maskableSvg(512))).resize(512, 512).png().toFile('public/icon-512-maskable.png');

  for (const f of ['icon-192.png', 'icon-512.png', 'icon-192-maskable.png', 'icon-512-maskable.png']) {
    const stat = fs.statSync(`public/${f}`);
    console.log(`${f}: ${(stat.size / 1024).toFixed(1)} KB`);
  }
  console.log('Done!');
}

generateIcons().catch(console.error);
