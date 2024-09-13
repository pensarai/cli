import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as ini from 'ini';

type SetTokenParams = {
    value: string;
    name?: string;
};

function writeToConfigFile(value: string, name?: string): void {
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, '.pensar');
  const configFile = path.join(configDir, 'credentials');

  // Create .pensar directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Read existing config or create new object
  let config: { [key: string]: { [key: string]: string } } = {};
  if (fs.existsSync(configFile)) {
    const fileContent = fs.readFileSync(configFile, 'utf-8');
    config = ini.parse(fileContent);
  }

  // Update or add the new value
  const section = name || 'default';
  config[section] = { value };

  // Write the updated config back to the file
  fs.writeFileSync(configFile, ini.stringify(config));
}

function readFromConfigFile(name?: string): string | null {
  const homeDir = os.homedir();
  const configFile = path.join(homeDir, '.pensar', 'credentials');

  if (!fs.existsSync(configFile)) {
    return null;
  }

  const fileContent = fs.readFileSync(configFile, 'utf-8');
  const config = ini.parse(fileContent);

  const section = name || 'default';
  return config[section]?.value || null;
}

function setTokenCommandHandler(params: SetTokenParams) {
    writeToConfigFile(params.value, params.name);
}

export { writeToConfigFile, readFromConfigFile, setTokenCommandHandler };