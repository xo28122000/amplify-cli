import { pathManager, stateManager } from '../state-manager';
import { HooksConfig, HooksExtensions, HooksFileMeta, HooksEvent, DataParameter, ErrorParameter } from './hooksTypes';
import { defaultSupportedExt, hooksFileSeperator } from './hooksConstants';
import { skipHooks } from './skipHooks';
import * as which from 'which';
import * as fs from 'fs-extra';
import * as path from 'path';
import execa from 'execa';
import { HooksMeta } from './hooksMeta';
import _ from 'lodash';
import { getLogger } from '../logger/index';
import { EOL } from 'os';
import { printer } from 'amplify-prompts';
const logger = getLogger('amplify-cli-core', 'hooks/hooksExecutioner.ts');

export const executeHooks = async (hooksMeta: HooksMeta): Promise<void> => {
  if (skipHooks()) {
    return;
  }

  const projectPath = pathManager.findProjectRoot() ?? process.cwd();
  const hooksDirPath = pathManager.getHooksDirPath(projectPath);
  if (!fs.existsSync(hooksDirPath)) {
    return;
  }

  const hooksConfig: HooksConfig = stateManager.getHooksConfigJson(projectPath) ?? {};

  const { commandHooksFileMeta, subCommandHooksFileMeta } = getHooksFileMetas(hooksDirPath, hooksMeta.getHooksEvent(), hooksConfig);

  let executionQueue = [commandHooksFileMeta, subCommandHooksFileMeta];

  if (hooksMeta.getHooksEvent().forcePush) {
    // we want to run push related hoooks when forcePush flag is enabled
    hooksMeta.setEventCommand('push');
    hooksMeta.setEventSubCommand(undefined);
    const { commandHooksFileMeta } = getHooksFileMetas(hooksDirPath, hooksMeta.getHooksEvent(), hooksConfig);
    executionQueue.push(commandHooksFileMeta);
  }

  for (const execFileMeta of executionQueue) {
    if (execFileMeta) {
      const runtime = getRuntime(execFileMeta, hooksConfig);
      if (runtime) {
        await execHelper(runtime, execFileMeta, hooksMeta.getDataParameter(), hooksMeta.getErrorParameter());
      }
    }
  }
};

const execHelper = async (
  runtime: string,
  execFileMeta: HooksFileMeta,
  dataParameter: DataParameter,
  errorParameter?: ErrorParameter,
): Promise<void> => {
  if (!execFileMeta?.filePath) {
    return;
  }

  const projectRoot = pathManager.findProjectRoot() ?? process.cwd();
  if (!projectRoot) {
    return;
  }

  printer.blankLine();
  printer.info(`----- 🪝 ${execFileMeta.baseName} execution start -----`);

  try {
    logger.info(`hooks file: ${execFileMeta.fileName} execution started`);
    const childProcess = execa(runtime, [execFileMeta.filePath], {
      cwd: projectRoot,
      env: { PATH: process.env.PATH },
      input: JSON.stringify({
        data: dataParameter,
        error: errorParameter,
      }),
      stripFinalNewline: false,
    });
    childProcess?.stdout?.pipe(process.stdout);
    const childProcessResult = await childProcess;
    if (!childProcessResult?.stdout?.endsWith(EOL)) {
      printer.blankLine();
    }
    logger.info(`hooks file: ${execFileMeta.fileName} execution ended`);
  } catch (err) {
    logger.info(`hooks file: ${execFileMeta.fileName} execution error - ${JSON.stringify(err)}`);
    if (err?.stderr?.length > 0) {
      printer.error(err.stderr);
    }
    if (err?.exitCode) {
      printer.blankLine();
      printer.error(`${execFileMeta.baseName} hook script exited with exit code ${err.exitCode}`);
    }
    printer.blankLine();
    printer.error('exiting Amplify process...');
    printer.blankLine();
    logger.error('hook script exited with error', err);
    // exit code is 76 indicating Amplify exited because user hook script exited with a non zero status
    process.exit(76);
  }
  printer.info(`----- 🪝 ${execFileMeta.baseName} execution end -----`);
  printer.blankLine();
};

const getHooksFileMetas = (
  hooksDirPath: string,
  hooksEvent: HooksEvent,
  hooksConfig: HooksConfig,
): { commandHooksFileMeta?: HooksFileMeta; subCommandHooksFileMeta?: HooksFileMeta } => {
  if (!hooksEvent.command) {
    return {};
  }
  const extensionsSupported = getSupportedExtensions(hooksConfig);

  const allFiles = fs
    .readdirSync(hooksDirPath)
    .filter(relFilePath => fs.lstatSync(path.join(hooksDirPath, relFilePath)).isFile())
    .map(relFilePath => splitFileName(relFilePath))
    .filter(fileMeta => fileMeta.extension && extensionsSupported.hasOwnProperty(fileMeta.extension))
    .map(fileMeta => ({ ...fileMeta, filePath: path.join(hooksDirPath, String(fileMeta.fileName)) }));

  const commandType = hooksEvent.eventPrefix ? [hooksEvent.eventPrefix, hooksEvent.command].join(hooksFileSeperator) : hooksEvent.command;
  const commandHooksFiles = allFiles.filter(fileMeta => fileMeta.baseName === commandType);
  const commandHooksFileMeta = throwOnDuplicateHooksFiles(commandHooksFiles);

  let subCommandHooksFiles;
  let subCommandHooksFileMeta: HooksFileMeta | undefined;
  if (hooksEvent.subCommand) {
    const subCommandType = hooksEvent.eventPrefix
      ? [hooksEvent.eventPrefix, hooksEvent.command, hooksEvent.subCommand].join(hooksFileSeperator)
      : [hooksEvent.command, hooksEvent.subCommand].join(hooksFileSeperator);

    subCommandHooksFiles = allFiles.filter(fileMeta => fileMeta.baseName === subCommandType);
    subCommandHooksFileMeta = throwOnDuplicateHooksFiles(subCommandHooksFiles);
  }
  return { commandHooksFileMeta, subCommandHooksFileMeta };
};

const throwOnDuplicateHooksFiles = (files: HooksFileMeta[]): HooksFileMeta | undefined => {
  if (files.length > 1) {
    throw new Error(`found duplicate hook scripts: ${files.map(file => file.fileName).join(', ')}`);
  } else if (files.length === 1) {
    return files[0];
  }
};

const splitFileName = (filename: string): HooksFileMeta => {
  const lastDotIndex = filename.lastIndexOf('.');
  const fileMeta: HooksFileMeta = { fileName: filename, baseName: filename };
  if (lastDotIndex !== -1) {
    fileMeta.baseName = filename.substring(0, lastDotIndex);
    fileMeta.extension = filename.substring(lastDotIndex + 1);
  }
  return fileMeta;
};

const getRuntime = (fileMeta: HooksFileMeta, hooksConfig: HooksConfig): string | undefined => {
  const { extension } = fileMeta;
  if (!extension) {
    return;
  }
  const isWin = process.platform === 'win32' || process.env.OSTYPE === 'cygwin' || process.env.OSTYPE === 'msys';
  const extensionObj = getSupportedExtensions(hooksConfig);

  let runtime: string | undefined;
  if (isWin) runtime = extensionObj?.[extension]?.runtime_windows;
  runtime = runtime ?? extensionObj?.[extension]?.runtime;
  if (!runtime) {
    return;
  }

  const executablePath = which.sync(runtime, {
    nothrow: true,
  });
  if (!executablePath) {
    throw new Error(String('hooks runtime not found: ' + runtime));
  }

  return executablePath;
};

const getSupportedExtensions = (hooksConfig: HooksConfig): HooksExtensions => {
  return { ...defaultSupportedExt, ...hooksConfig?.extensions };
};
