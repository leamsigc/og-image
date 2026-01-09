import type { SatoriOptions } from 'satori'
import type { JpegOptions } from 'sharp'
import type { OgImageRenderEventContext, Renderer, ResolvedFontConfig, OgImageFrameInfo } from '../../../types'
import { fontCache } from '#og-image-cache'
import { theme } from '#og-image-virtual/unocss-config.mjs'
// @ts-expect-error untyped
import compatibility from '#og-image/compatibility'
import { defu } from 'defu'
import { sendError } from 'h3'
import { normaliseFontInput } from '../../../shared'
import { useOgImageRuntimeConfig } from '../../utils'
import { loadFont } from './font'
import { useResvg, useSatori, useSharp } from './instances'
import { createVNodes } from './vnodes'

const fontPromises: Record<string, Promise<ResolvedFontConfig>> = {}

async function resolveFonts(event: OgImageRenderEventContext) {
  const { fonts } = useOgImageRuntimeConfig()
  const normalisedFonts = normaliseFontInput([...event.options.fonts || [], ...fonts])
  const localFontPromises: Promise<ResolvedFontConfig>[] = []
  const preloadedFonts: ResolvedFontConfig[] = []
  if (fontCache) {
    for (const font of normalisedFonts) {
      if (await fontCache.hasItem(font.cacheKey)) {
        font.data = (await fontCache.getItemRaw(font.cacheKey)) || undefined
        preloadedFonts.push(font)
      }
      else {
        if (!fontPromises[font.cacheKey]) {
          fontPromises[font.cacheKey] = loadFont(event, font).then(async (_font) => {
            if (_font?.data)
              await fontCache?.setItemRaw(_font.cacheKey, _font.data)
            return _font
          })
        }
        localFontPromises.push(fontPromises[font.cacheKey]!)
      }
    }
  }
  const awaitedFonts = await Promise.all(localFontPromises)
  return [...preloadedFonts, ...awaitedFonts].map((_f) => {
    // weight must be a number
    return { name: _f.name, data: _f.data, style: _f.style, weight: Number(_f.weight) as SatoriOptions['fonts'][number]['weight'] }
  })
}

export async function createSvg(event: OgImageRenderEventContext) {
  const { options } = event
  const { satoriOptions: _satoriOptions } = useOgImageRuntimeConfig()
  // perform operations async
  const [satori, vnodes, fonts] = await Promise.all([
    useSatori(),
    createVNodes(event),
    resolveFonts(event),
  ])

  await event._nitro.hooks.callHook('nuxt-og-image:satori:vnodes', vnodes, event)
  const satoriOptions: SatoriOptions = defu(options.satori, _satoriOptions, <SatoriOptions>{
    fonts,
    tailwindConfig: { theme },
    embedFont: true,
    width: options.width!,
    height: options.height!,
  }) as SatoriOptions
  return satori(vnodes, satoriOptions).catch((err) => {
    return sendError(event.e, err, import.meta.dev)
  })
}

async function createPng(event: OgImageRenderEventContext) {
  const { resvgOptions } = useOgImageRuntimeConfig()
  const svg = await createSvg(event)
  if (!svg)
    throw new Error('Failed to create SVG')
  const Resvg = await useResvg()
  const resvg = new Resvg(svg, defu(
    event.options.resvg,
    resvgOptions,
  ))
  const pngData = resvg.render()
  return pngData.asPng()
}

async function createJpeg(event: OgImageRenderEventContext) {
  const { sharpOptions } = useOgImageRuntimeConfig()
  if (compatibility.sharp === false) {
    throw new Error('Sharp dependency is not accessible. Please check you have it installed and are using a compatible runtime.')
  }
  const svg = await createSvg(event)
  if (!svg) {
    throw new Error('Failed to create SVG for JPEG rendering.')
  }
  const svgBuffer = Buffer.from(svg)
  const sharp = await useSharp().catch(() => {
    throw new Error('Sharp dependency could not be loaded. Please check you have it installed and are using a compatible runtime.')
  })
  const options = defu(event.options.sharp, sharpOptions)
  return sharp(svgBuffer, options)
    .jpeg(options as JpegOptions)
    .toBuffer()
}
async function createVideo(event: OgImageRenderEventContext) {
  const { sharpOptions } = useOgImageRuntimeConfig()
  console.log(sharpOptions);

  if (compatibility.sharp === false) {
    throw new Error('Sharp dependency is not accessible. Please check you have it installed and are using a compatible runtime.')
  }
  // Start creating the video
  const {
    props,
    width = 1920,
    height = 1080,
    fps = 30,
    duration = 5,
    crf = 23,
  } = event.options;
  const format = event.extension

  const sharp = await useSharp().catch(() => {
    throw new Error('Sharp dependency could not be loaded. Please check you have it installed and are using a compatible runtime.')
  })

  console.log({ props, width, height, format, fps, duration, crf });
  const totalFrames = Math.floor(fps * duration);
  const frames = [];

  // Render each frame
  for (let i = 0; i < totalFrames; i++) {
    const progress = i / (totalFrames - 1);
    const time = i / fps;

    const frameInfo: OgImageFrameInfo = {
      index: i,
      total: totalFrames,
      progress,
      time,
      fps,
      duration,
    };
    // add the frame info to the props as class data
    event.options.props = {
      ...event.options.props,
      'class': {
        progress: frameInfo?.progress ?? 0,
        frame: frameInfo?.index ?? 0,
        totalFrames: frameInfo?.total,
        durationMs: frameInfo?.duration ? frameInfo.duration * 1000 : undefined,
      }
    }
    const png = await createPng(event);
    frames.push(png);
  }

  // Encode video using h264-mp4-encoder
  if (format === 'mp4') {
    const { default: HME } = await import('h264-mp4-encoder');
    const encoder = await HME.createH264MP4Encoder();

    encoder.width = width as number;
    encoder.height = height as number;
    encoder.frameRate = fps;
    encoder.quantizationParameter = crf;

    encoder.initialize();

    // Add frames
    for (const frame of frames) {
      const { data } = await sharp(frame).raw().toBuffer({ resolveWithObject: true });
      encoder.addFrameRgba(new Uint8Array(data));
    }

    encoder.finalize();

    const mp4 = encoder.FS.readFile(encoder.outputFilename);
    encoder.delete();

    return Buffer.from(mp4);
  }

  // Encode GIF using gifenc
  if (format === 'gif') {
    const { GIFEncoder, quantize, applyPalette } = await import('gifenc');

    const gif = GIFEncoder();
    const frameDelay = Math.round(1000 / fps);

    for (const frame of frames) {
      const { data, info } = await sharp(frame)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const rgba = new Uint8Array(data);
      const palette = quantize(rgba, 256);
      const indexed = applyPalette(rgba, palette);

      gif.writeFrame(indexed, info.width, info.height, {
        palette,
        delay: frameDelay,
      });
    }

    gif.finish();

    return Buffer.from(gif.bytes());
  }
}

const SatoriRenderer: Renderer = {
  name: 'satori',
  supportedFormats: ['png', 'jpeg', 'jpg', 'json'],
  async createImage(e) {
    switch (e.extension) {
      case 'png':
        return createPng(e)
      case 'jpeg':
      case 'jpg':
        return createJpeg(e)
      case 'gif':
      case 'mp4':
        return createVideo(e)
    }
  },
  async debug(e) {
    const [vnodes, svg] = await Promise.all([
      createVNodes(e),
      createSvg(e),
    ])
    return {
      vnodes,
      svg,
    }
  },
}

export default SatoriRenderer
