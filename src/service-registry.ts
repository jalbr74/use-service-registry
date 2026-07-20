import { createContext, createElement, type ReactNode, useContext } from "react";

export type NoArgConstructor<T> = new () => T;
export type ServiceToken<T> = symbol & { readonly __serviceType?: T; }; // Created using something like: const INameServiceToken = createServiceToken<INameService>("INameService");
export type RegistryKey<T> = NoArgConstructor<T> | ServiceToken<T>;

/**
 * Creates a service token for the provided interface.
 * This token is used to register and inject implementations of the interface, since interfaces are not available at runtime.
 */
export function createServiceToken<T>(description: string): ServiceToken<T> {
    return Symbol(description) as ServiceToken<T>;
}

export interface ServiceProvider<T> {
    provide: RegistryKey<T>;
    useClass?: NoArgConstructor<T>;
    useValue?: T;
    useFactory?: () => T;
}

export interface ServiceRegistryProps {
    providers: (NoArgConstructor<unknown> | ServiceProvider<unknown>)[];
}

export class InjectionStandIn {
    key: RegistryKey<unknown>;

    constructor(key: RegistryKey<unknown>) {
        this.key = key;
    }
}

export interface Disposable {
    dispose(): void;
}

export class ServiceRegistry {
    private registry = new Map<RegistryKey<unknown>, unknown>();

    constructor(props?: ServiceRegistryProps) {
        if (props?.providers) {
            // First, create all instances without resolving any dependencies.
            for (const provider of props.providers) {
                if (typeof provider === "function") {
                    const instance = new (provider as NoArgConstructor<unknown>)();

                    // Add the instance to the registry using the constructor as the key, i.e., this.add(MessageService, new MessageService()).
                    this.add(provider as NoArgConstructor<unknown>, instance);
                } else if ((provider as any).provide) {
                    const token = (provider as ServiceProvider<unknown>).provide;

                    if ((provider as ServiceProvider<unknown>).useValue) {
                        this.add(token, (provider as ServiceProvider<unknown>).useValue);
                    } else if ((provider as ServiceProvider<unknown>).useClass) {
                        const instance = new ((provider as ServiceProvider<unknown>).useClass as NoArgConstructor<unknown>)();
                        this.add(token, instance);
                    } else if ((provider as ServiceProvider<unknown>).useFactory) {
                        const instance = (provider as ServiceProvider<unknown>).useFactory!();
                        this.add(token, instance);
                    } else {
                        throw new Error(`Service provider for token ${token.toString()} must have either useClass, useValue, or useFactory.`);
                    }
                } else {
                    throw new Error(`Invalid provider: ${provider}`);
                }
            }

            // Now that all instances are created, we can resolve any dependencies that get injected.
            for (const instance of this.registry.values()) {
                this.inject(instance);
            }
        }
    };

    /**
     * Injects dependencies into an instance of a class. If the argument is a constructor, it will create a new instance of that class first and then inject dependencies into it.
     * @param arg The instance or constructor of the class to inject dependencies into.
     */
    inject<T>(arg: NoArgConstructor<T>): T;
    inject<T>(arg: T): T;
    inject<T>(arg: T | NoArgConstructor<T>): T {
        const instance =
            typeof arg === "function"
                ? new (arg as NoArgConstructor<T>)()
                : arg;

        for (const key of Object.keys(instance as object)) {
            const value = (instance as any)[key];

            if (value instanceof InjectionStandIn) {
                (instance as any)[key] = this.get((value as InjectionStandIn).key);
            }
        }

        return instance;
    }

    add<T>(ctor: RegistryKey<T>, value: T) {
        this.registry.set(ctor, value);
    }

    get<T>(key: RegistryKey<T>): T {
        if (!this.registry.has(key)) throw new Error(`No provider for ${key.toString()}`);

        return this.registry.get(key) as T;
    }

    disposeAll() {
        for (const v of this.registry.values()) {
            if ((v as Disposable)?.dispose) (v as Disposable).dispose();
        }

        this.registry.clear();
    }
}

/**
 * Injects a service into a class property. Initially a placeholder is returned, but then it get replaced with the actual instance at runtime.
 * @param key The constructor of the service to inject or a token for the interface (since interfaces are not available at runtime).
 */
export function inject<T>(key: RegistryKey<T>): T {
    return new InjectionStandIn(key) as unknown as T;
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
export function useService<T>(ctor: NoArgConstructor<T>): T {
    return useServiceRegistry().get(ctor);
}
