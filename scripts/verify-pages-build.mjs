import { access, readFile } from 'node:fs/promises';
import { stdout } from 'node:process';
import { URL } from 'node:url';

const deploymentBase = '/StringsTracker/';
const indexHtml = await readFile(
  new URL('../dist/index.html', import.meta.url),
  'utf8',
);
const assetUrls = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map(
  ([, url]) => url,
);

if (assetUrls.length === 0) {
  throw new Error(
    'dist/index.html does not contain any script or stylesheet URLs.',
  );
}

for (const url of assetUrls) {
  if (!url.startsWith(deploymentBase)) {
    throw new Error(`Generated URL does not use ${deploymentBase}: ${url}`);
  }
}

const manifest = JSON.parse(
  await readFile(
    new URL('../dist/manifest.webmanifest', import.meta.url),
    'utf8',
  ),
);

for (const key of ['id', 'scope', 'start_url']) {
  if (manifest[key] !== './') {
    throw new Error(
      `PWA manifest ${key} must be relative to its deployment base.`,
    );
  }
}

for (const icon of manifest.icons ?? []) {
  if (icon.src.startsWith('/')) {
    throw new Error(
      `PWA icon must be relative to the manifest URL: ${icon.src}`,
    );
  }

  await access(new URL(`../dist/${icon.src}`, import.meta.url));
}

await access(new URL('../dist/sw.js', import.meta.url));

stdout.write(
  `Verified ${assetUrls.length} generated URLs under ${deploymentBase}\n`,
);
