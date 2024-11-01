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
    }): Promise<{ videoId: string }> {
        const { url, time, start_js } = options;

        if (this.tasks.size >= this.concurrencyLimit) {
            throw new Error('Concurrency limit reached');
        }

        const videoId = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}`;
        const videoPath = path.join(this.videosDir, `${videoId}.mp4`);

        this.tasks.add(videoId);

        try {
            const browser = await puppeteer.launch({
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--display=:99',
                    '--window-size=1920,1080',
                ],
                defaultViewport: null,
            });

            const page = await browser.newPage();

            if (start_js) {
                await page.evaluate(start_js);
            }

            await page.goto(url);

            // Start FFmpeg process
            const ffmpegPath = '/usr/local/bin/ffmpeg'; // Update if necessary

            const ffmpegProcess = ffmpeg()
                .setFfmpegPath(ffmpegPath)
                .input(':99')
                .inputFormat('x11grab')
                .inputOptions(['-video_size', '1920x1080'])
                .videoCodec('h264')
                .outputOptions(['-preset', 'fast', '-pix_fmt', 'yuv420p'])
                .save(videoPath);

            ffmpegProcess.on('start', (commandLine) => {
                this.logger.log('Spawned FFmpeg with command: ' + commandLine);
            });

            ffmpegProcess.on('error', (err) => {
                this.logger.error('FFmpeg error: ' + err.message);
            });

            ffmpegProcess.on('end', async () => {
                this.logger.log('FFmpeg process ended');
                await browser.close();
                this.tasks.delete(videoId);
            });

            // Wait for the specified time
            await new Promise((resolve) => setTimeout(resolve, time * 1000));

            // Stop FFmpeg
            ffmpegProcess.kill('SIGINT');

            return { videoId };
        } catch (error) {
            this.tasks.delete(videoId);
            throw new Error('Failed to record video: ' + error.message);
        }
    }
}
