import { HydrateClient } from "@/trpc/server";
import Header from "./_components/header";

export default async function Home() {
  return (
    <HydrateClient>
      <main>
        <Header />
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl md:text-6xl">
                Build Your SaaS
                <span className="block text-orange-500">Faster Than Ever</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                Launch your SaaS product in record time with our powerful,
                ready-to-use template. Packed with modern technologies and
                essential integrations.
              </p>
            </div>
          </div>
        </section>
      </main>
    </HydrateClient>
  );
}
