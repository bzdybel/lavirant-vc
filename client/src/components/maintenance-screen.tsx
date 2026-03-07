import content from "@/lib/content.json";

const { maintenance } = content;

export default function MaintenanceScreen() {
  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {maintenance.badge}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          {maintenance.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-200 sm:text-lg">
          {maintenance.message}
        </p>
      </div>
    </main>
  );
}
