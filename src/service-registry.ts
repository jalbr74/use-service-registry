// TODO: publish this to npm as a standalone package: use-service-registry

import { createContext, createElement, type ReactNode, useContext } from "react";

export type Ctor<T> = new (...args: never[]) => T;

export interface Disposable {
    dispose(): void;
}

export class ServiceRegistry {
    private registry = new Map<Ctor<unknown>, unknown>();

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
