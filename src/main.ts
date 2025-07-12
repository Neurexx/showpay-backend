/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';


const URI1=process.env.URI1
const URI2=process.env.URI2


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: [URI1,URI2],
    credentials: true,
  });
  
  

  await app.listen(3000);
  console.log('Payment Dashboard API running on port 3000');
}
bootstrap();