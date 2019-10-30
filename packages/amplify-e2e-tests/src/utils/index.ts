import { join } from 'path';
import { mkdirSync } from 'fs';
import * as rimraf from 'rimraf';
import { config } from 'dotenv';
import { default as generate } from 'nanoid/generate';

export { default as getProjectMeta } from './projectMeta';
export { default as getAWSExports } from './awsExports';
export * from './sdk-calls';
export * from './api';

// run dotenv config to update env variable
config();

export function getCLIPath() {
  return join(__dirname, '..', '..', '..', 'amplify-cli', 'bin', 'amplify');
}

export function createNewProjectDir(root?: string): string {
  if (!root) {
    root = join(__dirname, '../../../..', `amplify-integ-${getUniqueId()}`);
  }
  mkdirSync(root);
  return root;
}

export function deleteProjectDir(root: string) {
  return rimraf.sync(root);
}

export function isCI(): Boolean {
  return process.env.CI ? true : false;
}

export function getEnvVars(): {} {
  return { ...process.env };
}

export function getUniqueId(): string {
  const charset = '1234567890abcdefghijklmnopqrstuvwxyz';

  return generate(charset, 10);
}
