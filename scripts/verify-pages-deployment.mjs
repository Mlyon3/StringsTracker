/* global fetch */
import { env, stdout } from 'node:process';
import { URL } from 'node:url';

const deploymentUrl = new URL(
  env.PAGES_URL ?? 'https://mlyon3.github.io/StringsTracker/',
);
deploymentUrl.searchParams.set('deployment-check', Date.now().toString());

const response = await fetch(deploymentUrl, {
  headers: { 'cache-control': 'no-cache' },
});

if (!response.ok) {
  throw new Error(`GitHub Pages returned HTTP ${response.status}.`);
}

const html = await response.text();
const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
  ([, url]) => url,
);

if (assetUrls.length === 0) {
  throw new Error('The deployed page does not reference any built assets.');
}

for (const path of assetUrls) {
  if (!path.startsWith('/StringsTracker/')) {
    throw new Error(`The deployed page contains an invalid asset URL: ${path}`);
  }

  const assetUrl = new URL(path, deploymentUrl);
  assetUrl.searchParams.set('deployment-check', Date.now().toString());
  const assetResponse = await fetch(assetUrl, {
    headers: { 'cache-control': 'no-cache' },
  });

  if (!assetResponse.ok) {
    throw new Error(`${path} returned HTTP ${assetResponse.status}.`);
  }
}

stdout.write(
  `Verified ${assetUrls.length} assets at ${deploymentUrl.origin}/StringsTracker/\n`,
);
