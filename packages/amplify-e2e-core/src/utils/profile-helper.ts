import * as path from 'path';
import * as fs from 'fs-extra';
import * as ini from 'ini';
import * as os from 'os';

export function getConfigFromProfile() {
  const dotAWSDirPath = path.normalize(path.join(os.homedir(), '.aws'));
  const credentialsFilePath = path.join(dotAWSDirPath, 'credentials');
  const configFilePath = path.join(dotAWSDirPath, 'config');
  const profileName = 'amplify-integ-test-user';

  fs.ensureDirSync(dotAWSDirPath);

  let credentials = {};
  let config = {};
  if (fs.existsSync(credentialsFilePath)) {
    credentials = ini.parse(fs.readFileSync(credentialsFilePath, 'utf-8'));
  }
  if (fs.existsSync(configFilePath)) {
    config = ini.parse(fs.readFileSync(configFilePath, 'utf-8'));
  }

  const configKeyName = `profile ${profileName}`;

  return {
    accessKeyId: credentials[profileName].aws_access_key_id,
    secretAccessKey: credentials[profileName].aws_secret_access_key,
    region: config[configKeyName].region,
  };
}