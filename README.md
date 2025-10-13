# A service registry for React

When I was an Angular developer, I enjoyed being able to define services and inject them where needed. But when I became a React developer, I missed that ability. So I thought I would make a library that provides a simple service registry for React applications.

## Install

```
npm i use-service-registry
```

## Usage

Let's say you have a service that provides some backend functionality. In this case, it simply returns a string, but it could be anything, including making HTTP calls, managing WebSocket connections, etc.:

message-service.ts:
```ts
export class MessageService {
    getMessage(): string {
        return "Hello World!";
    }
}
````

I usually use Vite to create my React applications, so I'll show you how to set up the service registry in a Vite application. First, you need to create a service registry and add your services to it. Then, you provide the registry to your React application using the `ServiceRegistryProvider` component as follows:

main.tsx:

```tsx
const registry = new ServiceRegistry({
    provide: [MessageService]
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ServiceRegistryProvider serviceRegistry={registry}>
            <App/>
        </ServiceRegistryProvider>
    </StrictMode>
)
```

From here, you can use the `useService` hook to get access to your services anywhere in your React component tree. For example, you can use the `MessageService` in your main `App` component as follows:

App.tsx
```tsx
export function App() {
    const messageService = useService(MessageService);

    return (
        <>
            Special message: {messageService.getMessage()}
        </>
    )
}
```

## Dependency Injection

A very simple dependency injection mechanism can be used if you have services that rely on each other. Just add all the services in the provide array of your ServiceRegistry. For example:

main.tsx
```ts
const registry = new ServiceRegistry({
    provide: [BackendService, MessageService, NameService]
});
```

Then you can inject the dependent services using the inject function. For example:

backend-service.ts
```ts
export class BackendService {
    private nameService = inject(NameService);
    private messageService = inject(MessageService);

    fetchData(): Promise<string> {
        return Promise.resolve(this.nameService.getName() + ': ' + this.messageService.getMessage());
    }
}
```
