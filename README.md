## NEXT JS SaaS Starter Kit

A modern SaaS starter kit built with cutting-edge technologies:

- **Next.js** – React framework for building web applications
- **Auth.js** – Authentication and authorization
- **T3 Stack** – Type-safe full-stack framework
- **Drizzle ORM** – TypeScript ORM for database operations
- **Stripe** – Payment processing and subscriptions
- **shadcn/ui** – Beautiful UI components

## Features

- User authentication (Sign up, Login, Logout)
- Subscription-based payments with Stripe
- Database management using Drizzle ORM
- UI components with shadcn/ui
- API routes with Next.js server functions
- Type safety with TypeScript

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js (LTS version recommended)
- PostgreSQL / MySQL (configured for Drizzle ORM)
- Stripe account for payment processing

### Installation

```sh
git clone <repo-url>
cd saas-starter-kit
pnpm install
```

### Environment Variables

Create a `.env` file in the root directory and add the necessary environment variables:

### Running the Development Server

```sh
npm dev
```

The app will be available at `http://localhost:3000`.

## Deployment

To deploy your SaaS starter kit, you can use Vercel, AWS, or any platform that supports Next.js applications.

```sh
npm build
npm start
```

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
