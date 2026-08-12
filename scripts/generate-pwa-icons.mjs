import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const assetsDir = path.join(publicDir, 'assets');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Standalone SVG Logo Mark
function getIconSvg(size, isMaskable = false) {
  const padding = isMaskable ? Math.round(size * 0.15) : Math.round(size * 0.05);
  const innerSize = size - padding * 2;
  const radius = isMaskable ? 0 : Math.round(size * 0.22);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A" />
        <stop offset="50%" stop-color="#090D1E" />
        <stop offset="100%" stop-color="#05070F" />
      </linearGradient>

      <linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00D4FF" />
        <stop offset="45%" stop-color="#6D5BFF" />
        <stop offset="100%" stop-color="#A855F7" />
      </linearGradient>

      <linearGradient id="accentGrad" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#38BDF8" />
        <stop offset="100%" stop-color="#818CF8" />
      </linearGradient>

      <filter id="coreGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="${size * 0.02}" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Background Card -->
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bgGrad)" />

    <!-- Icon Content Area -->
    <g transform="translate(${padding}, ${padding}) scale(${innerSize / 100})">
      <!-- Outer Precision Orbital Ring -->
      <circle
        cx="50" cy="50" r="40"
        stroke="url(#mainGrad)" stroke-width="2.5"
        stroke-dasharray="6 14 18 10" opacity="0.9"
      />

      <!-- Secondary Orbit Ring -->
      <circle
        cx="50" cy="50" r="32"
        stroke="#00D4FF" stroke-width="1.5"
        stroke-dasharray="4 20" opacity="0.65"
      />

      <!-- Orbiting Satellite Nodes -->
      <circle cx="50" cy="10" r="4" fill="#00D4FF" filter="url(#coreGlow)" />
      <circle cx="50" cy="90" r="3" fill="#A855F7" opacity="0.85" />

      <!-- Geometric Core -->
      <!-- Outer Diamond -->
      <path d="M50 18 L78 50 L50 82 L22 50 Z" stroke="url(#mainGrad)" stroke-width="3" fill="none" opacity="0.95" />

      <!-- Inner Prism -->
      <path d="M50 28 L68 50 L50 72 L32 50 Z" fill="url(#accentGrad)" opacity="0.55" />

      <!-- Neural Beam Axis -->
      <line x1="50" y1="22" x2="50" y2="78" stroke="#FFFFFF" stroke-width="2" opacity="0.8" />
      <line x1="22" y1="50" x2="78" y2="50" stroke="#FFFFFF" stroke-width="2" opacity="0.8" />

      <!-- Pulsing Center -->
      <circle cx="50" cy="50" r="7" fill="url(#mainGrad)" filter="url(#coreGlow)" />
      <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
    </g>
  </svg>`;
}

// Full Horizontal Logo SVG
function getFullLogoSvg(width = 1200, height = 630) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0D1322" />
        <stop offset="50%" stop-color="#090D1E" />
        <stop offset="100%" stop-color="#04060C" />
      </linearGradient>

      <linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00D4FF" />
        <stop offset="45%" stop-color="#6D5BFF" />
        <stop offset="100%" stop-color="#A855F7" />
      </linearGradient>

      <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#6D5BFF" />
        <stop offset="50%" stop-color="#00D4FF" />
        <stop offset="100%" stop-color="#A855F7" />
      </linearGradient>

      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#ogBg)" />

    <!-- Ambient Glow Circles -->
    <circle cx="250" cy="315" r="280" fill="#6D5BFF" opacity="0.12" filter="blur(60px)" />
    <circle cx="950" cy="315" r="220" fill="#00D4FF" opacity="0.10" filter="blur(60px)" />

    <!-- Decorative Border Frame -->
    <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="24" stroke="#6D5BFF" stroke-width="1.5" stroke-opacity="0.25" fill="none" />

    <!-- Centered Logo Mark & Title -->
    <g transform="translate(180, 195)">
      <!-- Icon Mark -->
      <g transform="scale(2.4)">
        <circle cx="50" cy="50" r="40" stroke="url(#mainGrad)" stroke-width="2.5" stroke-dasharray="6 14 18 10" opacity="0.9" />
        <circle cx="50" cy="50" r="32" stroke="#00D4FF" stroke-width="1.5" stroke-dasharray="4 20" opacity="0.6" />
        <circle cx="50" cy="10" r="4" fill="#00D4FF" />
        <path d="M50 18 L78 50 L50 82 L22 50 Z" stroke="url(#mainGrad)" stroke-width="3" fill="none" />
        <path d="M50 28 L68 50 L50 72 L32 50 Z" fill="url(#textGrad)" opacity="0.5" />
        <line x1="50" y1="22" x2="50" y2="78" stroke="#FFFFFF" stroke-width="2" opacity="0.8" />
        <line x1="22" y1="50" x2="78" y2="50" stroke="#FFFFFF" stroke-width="2" opacity="0.8" />
        <circle cx="50" cy="50" r="7" fill="url(#mainGrad)" />
        <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
      </g>

      <!-- Text Group -->
      <g transform="translate(280, 110)">
        <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="82" fill="#FFFFFF" letter-spacing="-1">
          Neo<tspan fill="url(#textGrad)">MCQ</tspan>
        </text>

        <rect x="360" y="-60" width="60" height="34" rx="8" fill="#6D5BFF" fill-opacity="0.2" stroke="#6D5BFF" stroke-opacity="0.4" />
        <text x="390" y="-36" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#00D4FF" text-anchor="middle">AI</text>

        <text y="55" font-family="system-ui, sans-serif" font-weight="600" font-size="28" fill="#94A3B8" letter-spacing="0">
          Global Exam Preparation &amp; Learning Platform
        </text>

        <text y="100" font-family="system-ui, sans-serif" font-weight="500" font-size="20" fill="#64748B">
          One AI. Every Exam. Every Country.
        </text>
      </g>
    </g>
  </svg>`;
}

async function generateAll() {
  console.log('Generating NeoMCQ Brand & PWA Icons...');

  // 1. Save SVG Favicon
  const faviconSvg = getIconSvg(64, false);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

  // 2. PNG Icon sizes
  const sizes = [
    { size: 16, name: 'favicon-16x16.png', dest: publicDir },
    { size: 32, name: 'favicon-32x32.png', dest: publicDir },
    { size: 180, name: 'apple-touch-icon.png', dest: publicDir },
    { size: 180, name: 'icon-180.png', dest: publicDir },
    { size: 180, name: 'icon-180.png', dest: iconsDir },
    { size: 192, name: 'icon-192.png', dest: publicDir },
    { size: 192, name: 'icon-192.png', dest: iconsDir },
    { size: 384, name: 'icon-384.png', dest: publicDir },
    { size: 384, name: 'icon-384.png', dest: iconsDir },
    { size: 512, name: 'icon-512.png', dest: publicDir },
    { size: 512, name: 'icon-512.png', dest: iconsDir },
  ];

  for (const item of sizes) {
    const svgStr = getIconSvg(item.size, false);
    const outputPath = path.join(item.dest, item.name);
    await sharp(Buffer.from(svgStr)).png().toFile(outputPath);
    console.log(`Generated: ${outputPath}`);
  }

  // 3. Maskable Icon (512x512)
  const maskableSvg = getIconSvg(512, true);
  await sharp(Buffer.from(maskableSvg)).png().toFile(path.join(publicDir, 'icon-512-maskable.png'));
  await sharp(Buffer.from(maskableSvg)).png().toFile(path.join(iconsDir, 'icon-512-maskable.png'));
  console.log('Generated maskable icons');

  // 4. Favicon.ico (using 32x32 png)
  await sharp(Buffer.from(getIconSvg(32, false))).png().toFile(path.join(publicDir, 'favicon.ico'));

  // 5. Assets Logos & OG Image
  const ogSvg = getFullLogoSvg(1200, 630);
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(assetsDir, 'og-image.png'));
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(publicDir, 'og-image.png'));

  const logoSvg = getIconSvg(256, false);
  await sharp(Buffer.from(logoSvg)).png().toFile(path.join(assetsDir, 'logo.png'));
  await sharp(Buffer.from(logoSvg)).png().toFile(path.join(assetsDir, 'logo-dark.png'));
  await sharp(Buffer.from(logoSvg)).png().toFile(path.join(assetsDir, 'logo-login.png'));
  await sharp(Buffer.from(logoSvg)).png().toFile(path.join(assetsDir, 'logo-email.png'));

  console.log('All NeoMCQ PWA & Brand icons generated successfully!');
}

generateAll().catch(console.error);
