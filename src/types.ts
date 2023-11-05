export interface BuildAdapterOptions {
    entryPoints: EntryPoint[];
    tsConfigPath?: string;
    external: Array<string>;
    outdir: string;
    mappedPaths: MappedPath[];
    packageName?: string;
    esm?: boolean;
    watch?: boolean;
    kind: BuildKind;
    hash: boolean;
}

export interface PackageInfo {
    packageName: string;
    entryPoint: string;
    version: string;
    esm: boolean;
}

export interface BuilderInterface<T>{
    build(): Promise<T>;
}
export interface FederationOptions {
    workspaceRoot: string;
    outputPath: string;
    federationConfig: string;
    tsConfig?: string;
    verbose?: boolean;
    dev?: boolean;
    watch?: boolean;
    packageJson?: string;
}

export type SharedInfo = {
    singleton: boolean;
    strictVersion: boolean;
    requiredVersion: string;
    version?: string;
    packageName: string;
    outFileName: string;
    dev?: {
        entryPoint: string;
    };
};


export interface MappedPath {
    key: string;
    path: string;
}

export interface RebuildEvents {
    readonly rebuild: EventSource;
}

export type PluginOptions = {
    workspaceRoot: string;
    optimization: any;
    browsers: string[];
    sourceMap: any;
}

export type BuildKind =
    | 'shared-package'
    | 'shared-mapping'
    | 'exposed'
    | 'mapping-or-exposed';

export interface EntryPoint {
    packageName: string;
    fileName: string;
    outName: string;
}

export type BuildAdapter = (
    options: BuildAdapterOptions
) => Promise<Result[]>;


export interface Result {
    fileName: string;
}

export type EventHandler = () => Promise<void>;

export interface EventSource {
    register(handler: EventHandler): void;
}

export class EventHub implements EventSource {
    private handlers: EventHandler[] = [];

    register(handler: EventHandler): void {
        this.handlers.push(handler);
    }

    async emit(): Promise<void> {
        const promises = this.handlers.map((h) => h());
        await Promise.all(promises);
    }
}

export class RebuildHubs implements RebuildEvents {
    readonly rebuild = new EventHub();
}

export  const PACKAGE_JSON = "package.json"
