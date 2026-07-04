const axios = require("axios");
const jwt = require("jsonwebtoken");

const FIREBASE_CERTIFICATES_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/" +
  "securetoken@system.gserviceaccount.com";

let cachedCertificates;
let certificatesExpireAt = 0;
let certificatesRequest;

const getCacheMaxAge = (headers) => {
  const cacheControl =
    headers?.["cache-control"] || headers?.get?.("cache-control") || "";
  const match = cacheControl.match(/max-age=(\d+)/i);
  return match ? Number(match[1]) : 60 * 60;
};

const fetchFirebaseCertificates = async (forceRefresh = false) => {
  if (
    !forceRefresh &&
    cachedCertificates &&
    Date.now() < certificatesExpireAt
  ) {
    return cachedCertificates;
  }

  if (!forceRefresh && certificatesRequest) return certificatesRequest;

  const request = axios
    .get(FIREBASE_CERTIFICATES_URL, { timeout: 5000 })
    .then((response) => {
      if (!response.data || typeof response.data !== "object") {
        throw new Error("Firebase public certificates were unavailable");
      }

      cachedCertificates = response.data;
      certificatesExpireAt =
        Date.now() + getCacheMaxAge(response.headers) * 1000;
      return cachedCertificates;
    });

  if (!forceRefresh) certificatesRequest = request;

  try {
    return await request;
  } finally {
    if (!forceRefresh) certificatesRequest = undefined;
  }
};

const verifyFirebaseIdToken = async (idToken) => {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error(
      "Firebase token verification is not configured. Set FIREBASE_PROJECT_ID",
    );
  }

  const decodedHeader = jwt.decode(idToken, { complete: true })?.header;
  if (
    !decodedHeader ||
    decodedHeader.alg !== "RS256" ||
    typeof decodedHeader.kid !== "string" ||
    !decodedHeader.kid
  ) {
    throw new Error("Firebase ID token header is invalid");
  }

  let certificates = await fetchFirebaseCertificates();
  let certificate = certificates[decodedHeader.kid];

  // Firebase rotates signing keys. Refresh immediately if a new key ID appears.
  if (!certificate) {
    certificates = await fetchFirebaseCertificates(true);
    certificate = certificates[decodedHeader.kid];
  }

  if (!certificate) {
    throw new Error("Firebase ID token signing key was not found");
  }

  const decodedToken = jwt.verify(idToken, certificate, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  if (
    typeof decodedToken !== "object" ||
    typeof decodedToken.sub !== "string" ||
    decodedToken.sub.length === 0 ||
    decodedToken.sub.length > 128
  ) {
    throw new Error("Firebase ID token subject is invalid");
  }

  return decodedToken;
};

module.exports = { verifyFirebaseIdToken };
