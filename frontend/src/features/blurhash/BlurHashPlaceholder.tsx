import React, { useEffect, useRef } from 'react';

interface BlurHashPlaceholderProps {
  hash: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const BASE83_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-./:;=?@[]^_{|}~";

function decode83(str: string): number {
  let value = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str[i];
    const index = BASE83_CHARS.indexOf(code);
    if (index === -1) throw new Error("Invalid base83 character: " + code);
    value = value * 83 + index;
  }
  return value;
}

function srgb_to_linear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linear_to_srgb(value: number): number {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308 ? Math.round(v * 12.92 * 255) : Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255);
}

function sign_pow(value: number, exp: number): number {
  return Math.sign(value) * Math.pow(Math.abs(value), exp);
}

export function decodeBlurHash(hash: string, width: number, height: number, punch: number = 1.0): Uint8ClampedArray {
  if (!hash || hash.length < 6) {
    throw new Error("BlurHash must be at least 6 characters long");
  }

  const sizeFlag = decode83(hash[0]);
  const numX = (sizeFlag % 9) + 1;
  const numY = Math.floor(sizeFlag / 9) + 1;

  if (hash.length !== 4 + 2 * numX * numY) {
    throw new Error(`Invalid hash length: ${hash.length} (expected ${4 + 2 * numX * numY})`);
  }

  const quantMaxValue = decode83(hash[1]);
  const maxValue = (quantMaxValue + 1) / 166;

  const colors: Array<[number, number, number]> = [];
  
  // DC value
  const dcVal = decode83(hash.substring(2, 6));
  colors.push([
    srgb_to_linear((dcVal >> 16) & 255),
    srgb_to_linear((dcVal >> 8) & 255),
    srgb_to_linear(dcVal & 255)
  ]);

  // AC values
  for (let i = 1; i < numX * numY; i++) {
    const acVal = decode83(hash.substring(6 + 2 * (i - 1), 6 + 2 * i));
    const r = (Math.floor(acVal / (19 * 19)) % 19) - 9;
    const g = (Math.floor(acVal / 19) % 19) - 9;
    const b = (acVal % 19) - 9;
    colors.push([
      sign_pow(r / 9, 2.0) * maxValue * punch,
      sign_pow(g / 9, 2.0) * maxValue * punch,
      sign_pow(b / 9, 2.0) * maxValue * punch
    ]);
  }

  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let j = 0; j < numY; j++) {
        for (let i = 0; i < numX; i++) {
          const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
          const color = colors[i + j * numX];
          r += color[0] * basis;
          g += color[1] * basis;
          b += color[2] * basis;
        }
      }

      const pixelIdx = (x + y * width) * 4;
      pixels[pixelIdx] = linear_to_srgb(r);
      pixels[pixelIdx + 1] = linear_to_srgb(g);
      pixels[pixelIdx + 2] = linear_to_srgb(b);
      pixels[pixelIdx + 3] = 255;
    }
  }

  return pixels;
}

export const BlurHashPlaceholder: React.FC<BlurHashPlaceholderProps> = ({
  hash,
  width = 32,
  height = 32,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!hash || !canvasRef.current) return;

    try {
      const pixels = decodeBlurHash(hash, width, height);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
      }
    } catch (error) {
      console.error('[BlurHash] Ошибка декодирования:', error);
    }
  }, [hash, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );
};
