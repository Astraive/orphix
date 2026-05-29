import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";

@Injectable()
export class PkceService {
  generate() {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
    return { codeVerifier, codeChallenge };
  }

  generateState(): string {
    return crypto.randomBytes(24).toString("hex");
  }
}
