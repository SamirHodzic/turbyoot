export function compilePath(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const pattern = path
    .replace(/\//g, '\\/')
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, paramName) => {
      paramNames.push(paramName);
      return '([^\\/]+)';
    })
    .replace(/\*/g, '(.*)');
  
  const regex = new RegExp(`^${pattern}$`);
  return { regex, paramNames };
}

export function matchPath(compiledPath: { regex: RegExp; paramNames: string[] }, url: string): { match: boolean; params: Record<string, string> } {
  const match = url.match(compiledPath.regex);
  if (!match) {
    return { match: false, params: {} };
  }
  
  const params: Record<string, string> = {};
  compiledPath.paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });
  
  return { match: true, params };
}
