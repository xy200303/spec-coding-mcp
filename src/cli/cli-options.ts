/* Shared option parsing helpers for small CLI subcommands. */
export function optionValue(args: string[], name: string): string | undefined {
  const equalsPrefix = `${name}=`;
  const inlineValue = args.find((arg) => arg.startsWith(equalsPrefix));
  if (inlineValue) return inlineValue.slice(equalsPrefix.length);

  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export function assertKnownOptions(args: string[], allowedOptions: string[]): void {
  const allowed = new Set(allowedOptions);
  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (!allowed.has(name)) {
      throw new Error(`Unknown option: ${name}`);
    }
  }
}
