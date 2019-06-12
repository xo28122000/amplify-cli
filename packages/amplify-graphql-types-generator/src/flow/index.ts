import * as prettier from 'prettier';
import { LegacyCompilerContext } from '../compiler/legacyIR';

import { parse, printSchema } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import * as addPlugin from '@graphql-codegen/add';
import * as flowOperations from '@graphql-codegen/flow-operations';
import * as flow from '@graphql-codegen/flow';

const SCALARS = {
  AWSTimestamp: 'number'
};
export async function generateSource(context: LegacyCompilerContext) {
  const filename = 'codegen.js';
  const schema = parse(printSchema(context.schema));
  const fragments = Object.keys(context.fragments).map(name => {
    return {
      filePath: context.fragments[name].filePath || '',
      content: parse(context.fragments[name].source)
    };
  });
  const operations = Object.keys(context.operations).map(name => {
    return {
      filePath: context.operations[name].filePath || '',
      content: parse(context.operations[name].source)
    };
  });
  const documents = [...fragments, ...operations];

  const output = await codegen({
    filename,
    schema,
    documents,
    plugins: [
      {
        add: [
          '// @flow',
          '//  This file was automatically generated and should not be edited.'
        ].join('\n')
      },
      {
        flow: {
          scalars: {
            ...SCALARS
          }
        }
      },
      {
        flowOperations: {
          scalars: {
            ...SCALARS
          }
        }
      }
    ],
    config: {},
    pluginMap: {
      add: addPlugin,
      flow,
      flowOperations
    }
  });

  return prettier.format(output, { parser: 'flow' });
}
