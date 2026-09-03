import { PARSER_CAPABILITIES } from './capabilities.js';
import { detectLspCapabilities } from './lsp-capabilities.js';

const json = process.argv.includes('--json');
const lsp = detectLspCapabilities();
const payload = {
  structuralParser: {
    engine: 'typescript-compiler-api',
    languages: PARSER_CAPABILITIES.filter((item) => item.structural).map((item) => item.language),
  },
  lexicalSearch: {
    engine: 'sqlite-fts5-bm25',
    languages: PARSER_CAPABILITIES.filter((item) => item.lexicalSearch).map(
      (item) => item.language
    ),
  },
  lspFoundation: {
    mode: 'detection-only',
    automaticDownload: false,
    structuralGraphIntegration: false,
    servers: lsp,
  },
};

if (json) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log('ToolNet Code Intelligence Capabilities');
  console.log('');
  console.log('Structural parser: TypeScript Compiler API');
  for (const capability of PARSER_CAPABILITIES) {
    console.log(
      [
        capability.language.padEnd(12),
        capability.structural ? 'structural=yes' : 'structural=no',
        capability.lexicalSearch ? 'lexical=yes' : 'lexical=no',
        capability.lspServer ? `lsp=${capability.lspServer}` : '',
      ]
        .filter(Boolean)
        .join('  ')
    );
  }
  console.log('');
  console.log('LSP detection:');
  for (const server of lsp) {
    console.log(
      [
        server.language.padEnd(12),
        server.command.padEnd(22),
        server.installed ? 'available' : 'not-installed',
      ].join(' ')
    );
  }
}
