export type Config = {
  port: number;
  dataDir: string;
  basePath: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
};

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 3001),
    dataDir: process.env.DATA_DIR ?? '/tmp/bagina-data',
    basePath: process.env.BASE_PATH ?? '/',
    logLevel: (process.env.LOG_LEVEL as Config['logLevel']) ?? 'info',
  };
}
