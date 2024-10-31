import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StreamModule } from './stream/stream.module';
import { RecordModule } from './record/record.module';

@Module({
    imports: [StreamModule, RecordModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
