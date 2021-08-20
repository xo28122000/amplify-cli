import * as fs from 'fs-extra';
import path from 'path';
import * as os from 'os';
import * as glob from 'glob';
import { PathConstants, StateManager, pathManager } from '..';
import { JSONUtilities } from '..';
import { HookFileMeta, HooksConfig } from './hooksTypes';

// purpose to provide uppper level abstractions to of hooks directory
const HooksDirName = 'hooks';
const HooksConfigFileName = 'hooks-config.json';

// hook directory path
const getHooksDirPath = (): string =>
  path.normalize(path.join(pathManager.findProjectRoot() ?? process.cwd(), PathConstants.AmplifyDirName, HooksDirName));

//  check if hooks directory exist
const hooksDirectoryExist = (projectPath?: string): boolean => fs.existsSync(getHooksDirPath());

//  get to hook directory relative path
const getHooksDirRelativePath = (pathStr: string) => path.relative(getHooksDirPath(), pathStr);

//  get all absolute files and directories - oswalk
const getAllEntriesInHooksDir = (projectPath?: string): string[] => {
  return glob.sync(convertToPosixPath(getHooksDirPath()).concat('/**/*')).filter(file => fs.lstatSync(file).isFile());
};

//  get all inon ignored files

//  copySampleHooksDirectory
const copySampleHooksDir = (sourceDirPath: string): void => {
  const targetDirPath = getHooksDirPath();
  // only create the hooks directory with sample hooks if the directory doesnt already exists
  if (!fs.existsSync(targetDirPath)) {
    fs.copySync(sourceDirPath, targetDirPath);
  }
};

//  get filemeta for an event if exit, undefined otherwise
const getFileMeta = (): HookFileMeta | undefined => {
  // hooktype add and add-auth and push

  return;
};

// config path
const getHooksConfigFilePath = (projectPath?: string): string => path.join(getHooksDirPath(), HooksConfigFileName);

// config json read
const getHooksConfigJson = (projectPath?: string): HooksConfig =>
  JSONUtilities.readJson<HooksConfig>(getHooksConfigFilePath(projectPath), {
    throwIfNotExist: false,
  }) ?? {};

// check if config exist
// config extensions:
//  check if a fileMeta is supported - check if extension exist, check if runtime is possible
//  given a filemeta, return the supported runtime
// config ignore:
//  get a list of ignored files and directories -> just raw list as supplied
//  get a list of non ignored files and directories -> os.walk

// other utility/helper functions

const convertToPosixPath = (filePath: string): string => {
  return filePath.split(path.sep).join(path.posix.sep);
};
