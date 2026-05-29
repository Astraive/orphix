import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : process.env.NODE_ENV !== "production"
      ? ["http://localhost:3000", "http://localhost:5173"]
      : undefined; // undefined = CORS_ORIGINS required in prod

  if (!allowedOrigins && process.env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGINS env var required in production");
  }

  app.enableCors({ origin: allowedOrigins, credentials: true });

  const port = process.env.PORT ?? 2605;
  await app.listen(port);
  console.log(`[control] listening on http://localhost:${port}`);
}
bootstrap();
