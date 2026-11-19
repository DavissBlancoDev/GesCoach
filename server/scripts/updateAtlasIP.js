
const { config } = require("dotenv");
const crypto = require("node:crypto");

config();

const {
  ATLAS_PUBLIC_KEY,
  ATLAS_PRIVATE_KEY,
  ATLAS_PROJECT_ID,
} = process.env;

const BASE_URL = "https://cloud.mongodb.com/api/atlas/v2";
const COMMENT = "GesCoach - IP Updater";

function digestHash(value) {
  return crypto.createHash("md5").update(value).digest("hex");
}

async function atlasRequest(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const credentials = `${ATLAS_PUBLIC_KEY}:${ATLAS_PRIVATE_KEY}`;

  const challengeResponse = await fetch(url, {
    method: "GET",
  });

  const challenge = challengeResponse.headers.get("www-authenticate");

  if (!challenge || !challenge.toLowerCase().startsWith("digest ")) {
    throw new Error("Atlas no devolvió un desafío Digest válido");
  }

  const parameters = Object.fromEntries(
    [...challenge.matchAll(/(\w+)="([^"]*)"/g)].map(
      ([, key, value]) => [key, value]
    )
  );

  const { realm, nonce, qop, opaque } = parameters;
  const uri = new URL(url).pathname;
  const nc = "00000001";
  const cnonce = crypto.randomBytes(16).toString("hex");

  const ha1 = digestHash(`${credentials.split(":")[0]}:${realm}:${ATLAS_PRIVATE_KEY}`);
  const ha2 = digestHash(`${method}:${uri}`);
  const response = digestHash(
    `${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`
  );

  const authorization = [
    `Digest username="${ATLAS_PUBLIC_KEY}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
    `qop=auth`,
    `nc=${nc}`,
    `cnonce="${cnonce}"`,
    ...(opaque ? [`opaque="${opaque}"`] : []),
  ].join(", ");

  const result = await fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      Accept: "application/vnd.atlas.2025-03-12+json",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!result.ok) {
    throw new Error(`Atlas API: HTTP ${result.status} - ${await result.text()}`);
  }

  return result.json();
}

async function updateAtlasIP() {
  if (!ATLAS_PUBLIC_KEY || !ATLAS_PRIVATE_KEY || !ATLAS_PROJECT_ID) {
    throw new Error("Faltan variables ATLAS_* en el archivo .env");
  }

  const ipResponse = await fetch("https://api.ipify.org?format=json");

  if (!ipResponse.ok) {
    throw new Error("No se pudo consultar la IP pública ❌");
  }

  const { ip } = await ipResponse.json();

  console.log(`[Atlas] IP pública actual: ${ip}`);

  const path = `/groups/${ATLAS_PROJECT_ID}/accessList`;

  const accessList = await atlasRequest("GET", path);

  if (accessList.results?.some((entry) => entry.ipAddress === ip)) {
    console.log("[Atlas] La IP ya está autorizada 🟢");
    return;
  }

  await atlasRequest("POST", path, [
    { ipAddress: ip, comment: COMMENT },
  ]);

  console.log("[Atlas] Nueva IP autorizada correctamente ✅");
}

updateAtlasIP().catch((error) => {
  console.error("[Atlas]", error.message);
  process.exitCode = 1;
});
