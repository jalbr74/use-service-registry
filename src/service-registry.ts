import { createContext, createElement, type ReactNode, useContext } from "react";

export type Ctor<T> = new (...args: never[]) => T;

export interface Disposable {
    dispose(): void;
}

export interface ServiceRegistryProps {
    provide: Ctor<unknown>[];
}

export class ServiceObjectPlaceholder {
    ctor: Ctor<unknown>;

    constructor(ctor: Ctor<unknown>) {
        this.ctor = ctor;
    }
}

export class ServiceRegistry {
    private registry = new Map<Ctor<unknown>, unknown>();

    constructor(props?: ServiceRegistryProps) {
        if (props?.provide) {
            // First, create all instances without resolving any dependencies.
            for (const ctor of props.provide) {
                const instance = new ctor();
                this.add(ctor, instance);
            }

            // Now that all instances are created, we can resolve any dependencies that get injected.
            for (const instance of this.registry.values()) {
                for (const key of Object.keys(instance as object)) {
                    const value = (instance as any)[key];

                    if (value instanceof ServiceObjectPlaceholder) {
                        (instance as any)[key] = this.get((value as ServiceObjectPlaceholder).ctor);
                    }
                }
            }
        }
    };

    add<T>(ctor: Ctor<T>, value: T) {
        this.registry.set(ctor, value);
    }

    get<T>(ctor: Ctor<T>): T {
        if (!this.registry.has(ctor)) throw new Error(`No provider for ${ctor.name}`);

        return this.registry.get(ctor) as T;
    }

    disposeAll() {
        for (const v of this.registry.values()) {
            if ((v as Disposable)?.dispose) (v as Disposable).dispose();
        }

        this.registry.clear();
    }
}

export function inject<T>(ctor: Ctor<T>): T {
    // This returns a placeholder object during service construction, which gets replaced by the actual instance at runtime.
    return new ServiceObjectPlaceholder(ctor) as unknown as T;
}

const ServiceRegistryContext = createContext<ServiceRegistry | null>(null);

export function ServiceRegistryProvider(props: { serviceRegistry: ServiceRegistry; children?: ReactNode }) {
    return createElement(
        ServiceRegistryContext.Provider,
        { value: props.serviceRegistry },
        props.children
    );
}

export function useServiceRegistry(): ServiceRegistry {
    const c = useContext(ServiceRegistryContext);
    if (!c) throw new Error('ServiceRegistryProvider is missing above in the tree.');

    return c;
}

/**
 * Handy React hook to get a service from the service registry, such as:
 *
 * <pre>
 *     const backendService = useService(BackendService);
 * </pre>
 */
export function useService<T>(ctor: Ctor<T>): T {
    return useServiceRegistry().get(ctor);
}
