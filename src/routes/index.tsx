import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";

const LiveMap = lazy(() => import("@/components/LiveMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Tracker — Aircraft, Ships, Satellites & Launches" },
      {
        name: "description",
        content:
          "Real-time global map of live aircraft, vessels, satellites, and upcoming rocket launches.",
      },
      {
        property: "og:title",
        content: "Live Tracker — Aircraft, Ships, Satellites & Launches",
      },
      {
        property: "og:description",
        content:
          "Real-time global map of live aircraft, vessels, satellites, and upcoming rocket launches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading live map…
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
            Loading live map…
          </div>
        }
      >
        <LiveMap />
      </Suspense>
    </ClientOnly>
  );
}
