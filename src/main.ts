/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';





async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  

  await app.listen(3000);
  console.log('Payment Dashboard API running on port 3000');
}
bootstrap();