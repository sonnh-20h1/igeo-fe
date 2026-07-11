import fs from 'node:fs';
import path from 'node:path';

const nextVersion = process.argv[2]?.trim();

if (!nextVersion) {
  console.error('Usage: yarn update-version 0.1.4');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(nextVersion)) {
  console.error('Version must match x.y.z, for example: 0.1.4');
  process.exit(1);
}

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const packageLockPath = path.join(root, 'package-lock.json');
const envPaths = ['.env.development', '.env.production'].map((file) => path.join(root, file));

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = nextVersion;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

if (fs.existsSync(packageLockPath)) {
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  packageLock.version = nextVersion;
  if (packageLock.packages?.['']) {
    packageLock.packages[''].version = nextVersion;
  }
  fs.writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
}

for (const envPath of envPaths) {
  const content = fs.readFileSync(envPath, 'utf8');
  const nextLine = `NEXT_PUBLIC_APP_VERSION=v${nextVersion}`;
  const updated = /^NEXT_PUBLIC_APP_VERSION=.*/m.test(content)
    ? content.replace(/^NEXT_PUBLIC_APP_VERSION=.*/m, nextLine)
    : `${content.trimEnd()}\n${nextLine}\n`;
  fs.writeFileSync(envPath, updated);
}

console.log(`Updated app version to v${nextVersion}`);
console.log('Updated package.json, package-lock.json, .env.development, and .env.production.');
