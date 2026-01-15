import { writeFileSync } from 'fs';
import { generateTypeScript } from 'schema-typescript';

import schema from '../graph.schema.json';

const code = generateTypeScript(schema as any, {
  exclude: ['GraphSpec']
});
writeFileSync(__dirname + '/../src/types.ts', code);
