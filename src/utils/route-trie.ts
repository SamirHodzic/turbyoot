import { CompiledRoute } from '../types.js';

type RouteNode = {
  static: Map<string, RouteNode>;
  dynamic: RouteNode | null;
  paramName: string | null;
  wildcard: RouteNode | null;
  routes: Map<string, CompiledRoute>;
};

export class RouteTrie {
  private root: RouteNode = {
    static: new Map(),
    dynamic: null,
    paramName: null,
    wildcard: null,
    routes: new Map(),
  };

  add(route: CompiledRoute): void {
    const segments = this.splitPath(route.path);
    let currentNode = this.root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (segment === '*') {
        if (!currentNode.wildcard) {
          currentNode.wildcard = {
            static: new Map(),
            dynamic: null,
            paramName: null,
            wildcard: null,
            routes: new Map(),
          };
        }
        currentNode = currentNode.wildcard;
        break;
      } else if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        if (!currentNode.dynamic) {
          currentNode.dynamic = {
            static: new Map(),
            dynamic: null,
            paramName: paramName,
            wildcard: null,
            routes: new Map(),
          };
        } else if (currentNode.dynamic.paramName !== paramName) {
          currentNode.dynamic.paramName = paramName;
        }
        currentNode = currentNode.dynamic;
      } else {
        if (!currentNode.static.has(segment)) {
          currentNode.static.set(segment, {
            static: new Map(),
            dynamic: null,
            paramName: null,
            wildcard: null,
            routes: new Map(),
          });
        }
        currentNode = currentNode.static.get(segment)!;
      }
    }

    currentNode.routes.set(route.method, route);
  }

  find(
    method: string,
    path: string,
  ): { route: CompiledRoute | null; params: Record<string, string>; routesOnPath: CompiledRoute[] } {
    const segments = this.splitPath(path);
    const params: Record<string, string> = {};
    const routesOnPath: CompiledRoute[] = [];

    this.collectRoutesOnPath(this.root, segments, 0, routesOnPath, {});

    const result = this.searchNode(this.root, segments, 0, method, params);

    return {
      route: result.route,
      params,
      routesOnPath,
    };
  }

  private collectRoutesOnPath(
    node: RouteNode,
    segments: string[],
    index: number,
    routesOnPath: CompiledRoute[],
    tempParams: Record<string, string>,
  ): void {
    if (index >= segments.length) {
      for (const route of node.routes.values()) {
        routesOnPath.push(route);
      }
      return;
    }

    const segment = segments[index];

    if (node.wildcard) {
      for (const route of node.wildcard.routes.values()) {
        routesOnPath.push(route);
      }
    }

    if (node.static.has(segment)) {
      const staticNode = node.static.get(segment)!;
      this.collectRoutesOnPath(staticNode, segments, index + 1, routesOnPath, tempParams);
    }

    if (node.dynamic) {
      const paramName = node.dynamic.paramName!;
      const prevValue = tempParams[paramName];
      tempParams[paramName] = segment;
      this.collectRoutesOnPath(node.dynamic, segments, index + 1, routesOnPath, tempParams);
      if (prevValue !== undefined) {
        tempParams[paramName] = prevValue;
      } else {
        delete tempParams[paramName];
      }
    }
  }

  private searchNode(
    node: RouteNode,
    segments: string[],
    index: number,
    method: string,
    params: Record<string, string>,
  ): { route: CompiledRoute | null } {
    if (index >= segments.length) {
      return { route: node.routes.get(method) || null };
    }

    const segment = segments[index];

    if (node.static.has(segment)) {
      const staticNode = node.static.get(segment)!;
      const staticResult = this.searchNode(staticNode, segments, index + 1, method, params);
      if (staticResult.route) {
        return staticResult;
      }
    }

    if (node.dynamic) {
      const paramName = node.dynamic.paramName!;
      const prevValue = params[paramName];
      params[paramName] = segment;
      const dynamicResult = this.searchNode(node.dynamic, segments, index + 1, method, params);
      if (dynamicResult.route) {
        return dynamicResult;
      }
      if (prevValue !== undefined) {
        params[paramName] = prevValue;
      } else {
        delete params[paramName];
      }
    }

    if (node.wildcard) {
      return { route: node.wildcard.routes.get(method) || null };
    }

    return { route: null };
  }

  private splitPath(path: string): string[] {
    if (path === '/') {
      return [];
    }
    return path.split('/').filter((segment) => segment.length > 0);
  }

  clear(): void {
    this.root = {
      static: new Map(),
      dynamic: null,
      paramName: null,
      wildcard: null,
      routes: new Map(),
    };
  }
}
