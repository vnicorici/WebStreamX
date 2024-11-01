import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecordService {
    private readonly logger = new Logger(RecordService.name);
    private videosDir = path.join(process.cwd(), 'videos');
    private tasks = new Set();
    private concurrencyLimit = parseInt(process.env.CONCURRENCY, 10) || 1;
    private ffmpeg = this.configService.get<string>('FFMPEG');
    private encoderCMD: ffmpeg.FfmpegCommand | null = null;

    constructor(private readonly configService: ConfigService) {
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

            this.encoderCMD = ffmpeg({
                logger: {
                    debug: this.logger.debug,
                    info: this.logger.log,
                    warn: this.logger.warn,
                    error: this.logger.error,
                },
            });

            this.encoderCMD.input(':99').inputFormat('x11grab');

            this.encoderCMD.inputOptions([
                `-t ${time}`,
                '-nostdin',
                '-hide_banner',
                '-extra_hw_frames 3',
                '-dn', // remove Data Track
                '-sn', // remove subtitles Track
                '-thread_queue_size 16384',
                '-start_at_zero',
                '-vsync cfr',
            ]);

            this.encoderCMD.addOptions([
                '-stats',
                // '-loglevel quiet',
                // '-err_detect ignore_err',
                // '-isync',
                // '-fflags nobuffer',
                // '-flush_packets 1',
                '-pix_fmt yuv420p',
                '-c:v libx264',
                '-preset fast',
                '-ac:a:0 2',
                '-c:a:0 aac',
                '-ar:a:0 48000',
                '-b:a:0 192k',
                '-sws_flags spline+accurate_rnd+full_chroma_int',
                '-color_range tv',
                '-colorspace bt709',
                '-color_primaries bt709',
                '-color_trc bt709',
                '-chroma_sample_location:v topleft',
            ]);

            this.encoderCMD
                .on('start', (commandLine) => {
                    this.logger.log(
                        'Spawned FFmpeg with command: ' + commandLine
                    );
                })

                .on('error', (err) => {
                    this.logger.error('FFmpeg error: ' + err.message);
                })

                .on('end', async () => {
                    this.logger.log('FFmpeg process ended');
                    await browser.close();
                    this.tasks.delete(videoId);
                });

            this.encoderCMD.save(videoPath);
            this.encoderCMD.run();

            // Wait for the specified time
            // await new Promise((resolve) => setTimeout(resolve, time * 1000));

            // Stop FFmpeg

            return { videoId };
        } catch (error) {
            this.tasks.delete(videoId);
            throw new Error('Failed to record video: ' + error.message);
        }
    }
}
