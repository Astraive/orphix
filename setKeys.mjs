import { execSync } from "child_process";
import { readFileSync } from "fs";

const lines = readFileSync("keys.env", "utf8").split("\n");
const privateKey = lines[0].replace(/^JWT_PRIVATE_KEY="/, "").replace(/"$/, "");
const jwks = lines[1].replace(/^JWKS=/, "");

// Set via stdin
execSync(`bunx convex env set JWKS '${jwks}'`, { stdio: "inherit" });

// For the private key, use a temp file approach
import { writeFileSync, unlinkSync } from "fs";
writeFileSync("_tmp_key.txt", privateKey);
execSync("bunx convex env set JWT_PRIVATE_KEY \"$(cat _tmp_key.txt)\"", { stdio: "inherit", shell: true });
unlinkSync("_tmp_key.txt");
