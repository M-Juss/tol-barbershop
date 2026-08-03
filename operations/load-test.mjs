import process from "node:process";

const args = process.argv.slice(2);
const baseUrlArgument = args.find((argument) => !argument.startsWith("--"));
const confirmedStaging = args.includes("--confirm-staging");
const virtualUsers = Number(process.env.LOAD_TEST_VUS ?? 15);
const durationSeconds = Number(process.env.LOAD_TEST_DURATION_SECONDS ?? 900);
const intervalMs = Number(process.env.LOAD_TEST_INTERVAL_MS ?? 10000);
const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS ?? 10000);
const maximumP95Ms = Number(process.env.LOAD_TEST_MAX_P95_MS ?? 1000);
const endpoints = [
  "/api/v1/public-booking-settings",
  "/api/v1/public-services",
  "/api/v1/public-gallery-images",
  "/api/v1/featured-feedback",
];

if (!baseUrlArgument || !confirmedStaging) {
  console.error(
    "Usage: node operations/load-test.mjs https://staging.example.com --confirm-staging",
  );
  process.exit(2);
}

if (
  !Number.isInteger(virtualUsers) ||
  virtualUsers < 1 ||
  virtualUsers > 40 ||
  !Number.isFinite(durationSeconds) ||
  durationSeconds < 10 ||
  durationSeconds > 3600 ||
  !Number.isFinite(intervalMs) ||
  intervalMs < 1000 ||
  !Number.isFinite(timeoutMs) ||
  timeoutMs < 1000 ||
  !Number.isFinite(maximumP95Ms) ||
  maximumP95Ms < 1
) {
  console.error("Invalid load-test settings.");
  process.exit(2);
}

const baseUrl = new URL(baseUrlArgument);

if (
  baseUrl.username ||
  baseUrl.password ||
  baseUrl.pathname !== "/" ||
  baseUrl.search ||
  baseUrl.hash ||
  (baseUrl.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(baseUrl.hostname))
) {
  console.error("The target must be a clean HTTPS staging origin or localhost.");
  process.exit(2);
}

const results = [];
const statusCounts = new Map();
let requestErrors = 0;
const endsAt = Date.now() + durationSeconds * 1000;

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));

const recordStatus = (status) => {
  statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
};

const runVirtualUser = async (virtualUserId) => {
  let iteration = 0;

  while (Date.now() < endsAt) {
    const cycleStartedAt = Date.now();
    const endpoint = endpoints[(virtualUserId + iteration) % endpoints.length];
    const requestStartedAt = performance.now();

    try {
      const response = await fetch(new URL(endpoint, baseUrl), {
        headers: {
          Accept: "application/json",
          "User-Agent": "TOL-Barbershop-Staging-Load-Test/1.0",
        },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });

      await response.arrayBuffer();
      results.push(performance.now() - requestStartedAt);
      recordStatus(response.status);
    } catch {
      requestErrors += 1;
    }

    iteration += 1;
    await delay(intervalMs - (Date.now() - cycleStartedAt));
  }
};

console.log(
  `Running ${virtualUsers} virtual users for ${durationSeconds}s against ${baseUrl.origin}`,
);
console.log(
  "Observe Hostinger PHP workers, CPU, and MySQL connections during this run.",
);

await Promise.all(
  Array.from({ length: virtualUsers }, (_, index) => runVirtualUser(index)),
);

results.sort((left, right) => left - right);

const percentile = (value) => {
  if (results.length === 0) {
    return 0;
  }

  return results[Math.min(results.length - 1, Math.ceil(results.length * value) - 1)];
};

const p50 = percentile(0.5);
const p95 = percentile(0.95);
const p99 = percentile(0.99);
const serverErrors = [...statusCounts.entries()]
  .filter(([status]) => status >= 500)
  .reduce((total, [, count]) => total + count, 0);
const nonSuccessResponses = [...statusCounts.entries()]
  .filter(([status]) => status < 200 || status >= 300)
  .reduce((total, [, count]) => total + count, 0);

console.table({
  requests: results.length,
  request_errors: requestErrors,
  non_2xx: nonSuccessResponses,
  server_5xx: serverErrors,
  p50_ms: Number(p50.toFixed(1)),
  p95_ms: Number(p95.toFixed(1)),
  p99_ms: Number(p99.toFixed(1)),
});
console.log(
  `Status counts: ${[...statusCounts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([status, count]) => `${status}=${count}`)
    .join(", ")}`,
);

if (
  results.length === 0 ||
  requestErrors > 0 ||
  nonSuccessResponses > 0 ||
  p95 > maximumP95Ms
) {
  console.error(
    `Load test failed. Required: all requests 2xx, no request errors, p95 <= ${maximumP95Ms}ms.`,
  );
  process.exit(1);
}

console.log(`Load test passed with p95 <= ${maximumP95Ms}ms.`);
