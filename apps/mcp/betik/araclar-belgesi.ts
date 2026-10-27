// `ARACLAR.md` belgesini araç tanımlarından üretir.
import { writeFileSync } from "node:fs";
import { araclarBelgesi } from "../src/belge.ts";

writeFileSync(new URL("../ARACLAR.md", import.meta.url), araclarBelgesi());
