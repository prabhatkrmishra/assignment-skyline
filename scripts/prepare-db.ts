import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const configuredPath = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./data/skyline.sqlite";
const path = configuredPath === ":memory:" ? null : isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
if (path) mkdirSync(dirname(path), { recursive: true });
