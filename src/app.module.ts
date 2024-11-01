import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StreamModule } from './stream/stream.module';
import { RecordModule } from './record/record.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        StreamModule,
        RecordModule,
        ConfigModule.forRoot({
            isGlobal: true, // Face ca ConfigModule să fie disponibil în toată aplicația
            envFilePath: '.env', // Specifică fișierul cu variabile de mediu
            // validationSchema: Joi.object({ ... }), // Poți adăuga validare aici
        }),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
