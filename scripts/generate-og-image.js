// node scripts/generate-og-image.js
import { createCanvas } from "canvas";
import fs from "fs";

const W = 1200;
const H = 630;
const P = 80;
const LOGO_W = 260;
const GAP = 60;
const TEXT_W = W - P * 2 - LOGO_W - GAP;

const TITLE = "SeatScape";
const SUB = "Pick the perfect seat for sun and city views";

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function draw() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#69a8ff");
  g.addColorStop(1, "#1f3f8a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Text shadow for legibility
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Title
  ctx.fillStyle = "#fff";
  const titleSize = 100;
  ctx.font = `bold ${titleSize}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif`;
  const titleHeight = titleSize;

  // Subtitle (wrap)
  const subFontSize = 48;
  ctx.font = `400 ${subFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif`;
  const subLines = wrapLines(ctx, SUB, TEXT_W);

  // Total text block height
  const blockH =
    titleHeight +
    20 +
    subLines.length * subFontSize +
    (subLines.length - 1) * 10;

  // Vertically center
  const yStart = (H - blockH) / 2;

  // Draw title
  ctx.font = `bold ${titleSize}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillText(TITLE, P, yStart + titleHeight);

  // Draw subtitle lines
  ctx.font = `400 ${subFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif`;
  subLines.forEach((line, i) => {
    ctx.fillText(line, P, yStart + titleHeight + 20 + i * (subFontSize + 10));
  });

  // Remove shadow for icon
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Window icon block
  const blockX = W - P - LOGO_W;
  const blockY = H / 2 - 180;
  const blockH2 = 360;
  const r = 72;

  ctx.fillStyle = "#2455e6";
  roundRect(ctx, blockX, blockY, LOGO_W, blockH2, r);
  ctx.fill();

  ctx.fillStyle = "#2e6bff";
  roundRect(ctx, blockX + 18, blockY + 18, LOGO_W - 36, blockH2 - 36, r - 28);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(blockX + LOGO_W / 2, blockY + blockH2 / 2 - 20, 54, 0, Math.PI * 2);
  ctx.fillStyle = "#facc15";
  ctx.fill();

  ctx.fillStyle = "rgba(10, 23, 70, 0.6)";
  ctx.fillRect(blockX + 18, blockY + blockH2 - 110, LOGO_W - 36, 8);

  fs.writeFileSync("./public/og-image.png", canvas.toBuffer("image/png"));
  console.log("✅ OG image saved to public/og-image.png");
}

draw();
