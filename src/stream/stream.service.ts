import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as ffmpeg from 'fluent-ffmpeg';

@Injectable()
export class StreamService {
    private readonly logger = new Logger(StreamService.name);
    private tasks = new Set();
    private concurrencyLimit = parseInt(process.env.CONCURRENCY, 10) || 1;

    async stream(options: {
        url: string;
        time: number;
        start_js?: string;
        rtmpUrl: string;
    }): Promise<{ message: string }> {
        const { url, time, start_js, rtmpUrl } = options;

        // Validate RTMP URL
        if (!rtmpUrl || !rtmpUrl.startsWith('rtmp://')) {
            throw new Error('Valid RTMP URL is required');
        }

        // Check concurrency limit
        if (this.tasks.size >= this.concurrencyLimit) {
            throw new Error('Concurrency limit reached');
        }

        // Add task to the set
        this.tasks.add(rtmpUrl);

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
                    '--disable-dev-shm-usage',
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

            const ffmpegPath = '/usr/local/bin/ffmpeg'; // Update this path if necessary

            const ffmpegProcess = ffmpeg()
                .input('pipe:0')
                .inputFormat('image2pipe')
                .inputOptions(['-framerate 30'])
                .outputOptions('-pix_fmt yuv420p')
                .setFfmpegPath(ffmpegPath)
                .videoCodec('h264_nvenc') // Use GPU-accelerated encoder
                .addOutput(rtmpUrl)
                .addOutputOptions([
                    '-f flv',
                    '-r 30',
                    '-g 60',
                    '-keyint_min 60',
                    '-preset',
                    'fast',
                    '-profile:v',
                    'high',
                ]);

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
                    this.tasks.delete(rtmpUrl);

                    resolve({ message: 'Streaming to RTMP server completed' });
                }, time * 1000);
            });
        } catch (error) {
            this.tasks.delete(rtmpUrl);
            throw new Error('Failed to stream video: ' + error.message);
        }
    }
}
