import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
//import * as ffmpeg from 'fluent-ffmpeg';
import ffmpeg = require('fluent-ffmpeg'); // Updated import
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecordService implements OnModuleInit {
    private readonly logger = new Logger(RecordService.name);
    private videosDir = path.join(process.cwd(), 'videos');
    private tasks = new Set();
    private concurrencyLimit = parseInt(process.env.CONCURRENCY, 10) || 1;
    private encoderCMD: ffmpeg.FfmpegCommand;
    private videoId = '';
    private videoPath;
    private ffmpegPath: string;
    private ffprobePath: string;

    constructor(private readonly configService: ConfigService) {
        if (!fs.existsSync(this.videosDir)) {
            fs.mkdirSync(this.videosDir);
        }

        this.ffmpegPath = this.configService.get<string>(
            'FFMPEG',
            '/usr/local/bin/ffmpeg'
        );
        this.ffprobePath = this.configService.get<string>(
            'ffprobePath',
            '/usr/local/bin/ffprobe'
        );
    }

    onModuleInit() {
        /*this.record({
            url: 'https://voceabasarabiei.md/live-tv/',
            time: 10,
        });*/
    }

    async record(options: {
        url: string;
        time: number;
        start_js?: string;
    }): Promise<{ videoId: string }> {
        const { url, time, start_js } = options;

        this.videoId = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}`;
        this.videoPath = path.join(this.videosDir, `${this.videoId}.mp4`);

        try {
            const browser = await puppeteer.launch({
                headless: false,
                ignoreDefaultArgs: ['--enable-automation'],
                args: [
                    '--display=:99',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars',
                    '--start-fullscreen',
                    '--window-size=1920,1080',
                    '--disable-notifications',
                    '--disable-extensions',
                    '--disable-session-crashed-bubble',
                    '--disable-features=TranslateUI',
                ],
                defaultViewport: null,
            });

            const page = await browser.newPage();

            // Suppress navigator.webdriver flag
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
            });

            // Navigate to the URL

            await page.goto(url, {
                waitUntil: 'domcontentloaded',
            });

            // Hide scrollbars and adjust styles
            await page.addStyleTag({
                content: `
					body {
						overflow: hidden;
						margin: 0;
					}
				`,
            });

            this.encoderCMD = ffmpeg(); // Create ffmpeg command
            this.encoderCMD.setFfmpegPath(this.ffmpegPath);

            this.encoderCMD.setFfmpegPath(this.ffmpegPath);

            return new Promise((resolve, reject) => {
                console.log({
                    ffmpeg: this.ffmpegPath,
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

                    .on('error', async (error) => {
                        this.logger.error('FFmpeg error: ' + error.message);
                        await browser.close();
                        reject({
                            error,
                            videoId: this.videoId,
                        });
                    })

                    .on('end', async () => {
                        this.logger.log('FFmpeg process ended');
                        await browser.close();
                        resolve({
                            videoId: this.videoId,
                        });
                    });

                this.encoderCMD.save(this.videoPath);

                // this.encoderCMD.run();
            });
        } catch (error) {
            this.logger.error(error);
            throw new Error('Failed to record video: ' + error.message);
        }
    }
}
