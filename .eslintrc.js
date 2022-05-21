// you can expand this regex to add more allowed names
const ignoredPropNames = `^(${['__resolveReference'].join('|')})$`;

module.exports = {
  root: true,
  extends: ['eslint:recommended', 'google', 'prettier'],
  // plugins: ['mocha'],
  parserOptions: {
    ecmaVersion: 2018,
  },
  env: {
    node: true,
    browser: false,
    // mocha: true,
    es6: true,
  },
  rules: {
    'linebreak-style': 'off',
    indent: ['error', 2],
    curly: ['error', 'all'],
    'arrow-parens': ['error', 'as-needed'],
    'quote-props': ['error', 'as-needed'],
    'no-console': [
      'error',
      {
        allow: ['log', 'warn', 'error'],
      },
    ],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
    'max-len': [
      'error',
      {
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true,
      },
    ],
    'object-curly-spacing': ['error', 'always'],
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'block-spacing': ['error', 'always'],
    'require-jsdoc': [
      'error',
      {
        require: {
          FunctionDeclaration: false,
        },
      },
    ],
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'only-multiline',
      },
    ],
    'padded-blocks': ['error', 'never', { allowSingleLineBlocks: true }],
    'spaced-comment': ['error', 'always', { markers: ['/'] }],

    // 'mocha/no-exclusive-tests': 'error',
  },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      rules: {
        indent: 'off',
        camelcase: 'off',
        'max-len': 'off',
        'valid-jsdoc': 'off',
        'new-cap': ['error', { capIsNew: false }],

        // '@typescript-eslint/indent': ['error', 2, {
        //   ignoredNodes: [
        //     // BUG: https://github.com/typescript-eslint/typescript-eslint/issues/455
        //     // BUG: https://github.com/typescript-eslint/typescript-eslint/issues/1824
        //     'TSTypeParameterInstantiation',
        //   ],
        // }],

        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/no-use-before-define': [
          'error',
          {
            functions: false,
          },
        ],
        '@typescript-eslint/array-type': [
          'error',
          {
            default: 'array-simple',
          },
        ],
        '@typescript-eslint/no-namespace': [
          'error',
          {
            allowDeclarations: true,
          },
        ],
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'default',
            format: ['camelCase'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow',
            filter: {
              regex: ignoredPropNames,
              match: false,
            },
          },
          {
            selector: 'variable',
            format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow',
          },
          {
            selector: 'property',
            format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow',
            filter: {
              regex: ignoredPropNames,
              match: false,
            },
          },

          {
            selector: 'parameter',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow',
          },
          {
            selector: 'parameterProperty',
            format: ['camelCase', 'PascalCase'],
          },
          {
            selector: 'enumMember',
            format: ['PascalCase', 'UPPER_CASE'],
          },
          {
            selector: 'function',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow',
          },
          {
            selector: 'typeLike',
            format: ['PascalCase'],
          },
        ],
      },
    },
    {
      files: ['**/*/generated/graphql.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      rules: {
        indent: 'off',
        camelcase: 'off',
        'max-len': 'off',
        'valid-jsdoc': 'off',
        'new-cap': ['error', { capIsNew: false }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/array-type': 'off',
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],
};
