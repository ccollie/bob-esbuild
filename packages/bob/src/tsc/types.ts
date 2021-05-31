export interface TSCOptions {
  dirs?: string[];

  /**
   * @default "tsc --emitDeclarationOnly"
   */
  tscBuildCommand?: string;

  /**
   * Customize type diff hashing
   */
  hash?: {
    files?: {
      /**
       * @default ['*.d.ts']
       */
      exclude?: string[];
      /**
       * @default ['*.ts', '*.tsx', '*.json']
       */
      include?: string[];
    };
    folders?: {
      /**
       * @default [
          outDir,
          distDir,
          'node_modules',
          'lib',
          'temp',
          'dist',
          '.git',
          '.next',
          'coverage',
          '.vscode',
          '.github',
          '.changeset',
          '.husky',
          '.bob'
       ]
       */
      exclude?: string[];
    };
  };
}
