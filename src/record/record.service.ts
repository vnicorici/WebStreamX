import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class RecordService {
    private readonly logger = new Logger(RecordService.name);
    private videosDir = path.join(process.cwd(), 'videos');
    private tasks = new Set();
    private concurrencyLimit = parseInt(process.env.CONCURRENCY, 10) || 1;

    constructor() {
        if (!fs.existsSync(this.videosDir)) {
            fs.mkdirSync(this.videosDir);
        }
    }

    async record(options: {
        url: string;
        time: number;
        start_js?: string;
        rtmpUrl?: string;
    }): Promise<{ videoId?: string; message?: string }> {
        const { url, time, start_js, rtmpUrl } = options;

        // Validate RTMP URL if provided
        if (rtmpUrl && !rtmpUrl.startsWith('rtmp://')) {
            throw new Error('Invalid RTMP URL');
        }

        // Check concurrency limit
        if (this.tasks.size >= this.concurrencyLimit) {
            throw new Error('Concurrency limit reached');
        }

        // Generate a unique ID for the video
        const videoId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        const videoPath = path.join(this.videosDir, `${videoId}.mp4`);

        // Add task to the set
        this.tasks.add(videoId);

        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--use-gl=egl',
                    '--enable-webgl',
                    '--ignore-gpu-blocklist',
                    '--enable-gpu-rasterization',
                    '--disable-software-rasterizer',
                    '--enable-accelerated-video-decode',
                ],
            });

            const page = await browser.newPage();

            if (start_js) {
                await page.evaluate(start_js);
            }

            await page.goto(url);

            const client = await page.createCDPSession();
            await client.send('Page.startScreencast', {
                format: 'jpeg',
                quality: 100,
            });

            const ffmpegPath = '/usr/bin/ffmpeg'; // Update this path if necessary

            const ffmpegProcess = ffmpeg()
                .input('pipe:0')
                .inputFormat('image2pipe')
                .inputOptions(['-framerate 30'])
                .outputOptions('-pix_fmt yuv420p')
                .setFfmpegPath(ffmpegPath);

            // Use GPU-accelerated encoding if available
            ffmpegProcess.videoCodec('h264_nvenc'); // For NVIDIA GPUs

            if (rtmpUrl) {
                ffmpegProcess
                    .addOutput(rtmpUrl)
                    .addOutputOptions([
                        `-t ${time}`,
                        '-f flv',
                        '-r 30',
                        '-g 60',
                        '-keyint_min 60',
                        '-preset',
                        'fast',
                        '-profile:v',
                        'high',
                    ]);
            } else {
                ffmpegProcess.save(videoPath);
            }

            ffmpegProcess.on('start', (commandLine) => {
                this.logger.log('Spawned FFmpeg with command: ' + commandLine);
            });

            ffmpegProcess.on('error', (err) => {
                this.logger.error('FFmpeg error: ' + err.message);
            });

            ffmpegProcess.on('end', () => {
                this.logger.log('FFmpeg process ended');
            });

            client.on(
                'Page.screencastFrame',
                async ({ data, metadata, sessionId }) => {
                    this.logger.debug(metadata);
                    ffmpegProcess.stdin.write(Buffer.from(data, 'base64'));
                    await client.send('Page.screencastFrameAck', { sessionId });
                }
            );

            return new Promise(async (resolve) => {
                setTimeout(async () => {
                    await client.send('Page.stopScreencast');
                    ffmpegProcess.stdin.end();
                    await browser.close();
                    this.tasks.delete(videoId);

                    if (!rtmpUrl) {
                        resolve({ videoId });
                    } else {
                        resolve({
                            message: 'Streaming to RTMP server completed',
                        });
                    }
                }, time * 1000);
            });
        } catch (error) {
            this.tasks.delete(videoId);
            throw new Error('Failed to record video: ' + error.message);
        }
    }
}
