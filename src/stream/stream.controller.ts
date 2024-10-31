import {
    Controller,
    Post,
    Body,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { StreamService } from './stream.service';

@Controller('stream')
export class StreamController {
    constructor(private readonly streamService: StreamService) {}

    @Post()
    async startStreaming(@Body() body: any) {
        const { url, time, start_js, rtmpUrl } = body;

        if (!url || !time || !rtmpUrl) {
            throw new HttpException(
                'URL, time, and rtmpUrl are required',
                HttpStatus.BAD_REQUEST
            );
        }

        try {
            const result = await this.streamService.stream({
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
}
