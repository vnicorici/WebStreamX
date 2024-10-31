import {
    Controller,
    Post,
    Body,
    Get,
    Query,
    Res,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { RecordService } from './record.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('record')
export class RecordController {
    constructor(private readonly recordService: RecordService) {}

    @Post()
    async startRecording(@Body() body: any) {
        const { url, time, start_js, rtmpUrl } = body;

        if (!url || !time) {
            throw new HttpException(
                'URL and time are required',
                HttpStatus.BAD_REQUEST
            );
        }

        try {
            const result = await this.recordService.record({
                url,
                time,
                start_js,
                rtmpUrl,
            });
            return result;
        } catch (error) {
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('download')
    downloadVideo(@Query('id') id: string, @Res() res: Response) {
        if (!id) {
            throw new HttpException('ID is required', HttpStatus.BAD_REQUEST);
        }

        const videoPath = path.join(process.cwd(), 'videos', `${id}.mp4`);

        if (fs.existsSync(videoPath)) {
            res.download(videoPath, `${id}.mp4`, (err) => {
                if (err) {
                    throw new HttpException(
                        'Error downloading video',
                        HttpStatus.INTERNAL_SERVER_ERROR
                    );
                }
            });
        } else {
            throw new HttpException(
                'Video not found or not complete',
                HttpStatus.NOT_FOUND
            );
        }
    }
}
