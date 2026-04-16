import Link from "next/link";
import { APP_NAME } from "@acuo/shared";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">{APP_NAME.charAt(0)}</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 no-underline">
              Features
            </a>
            <a href="#workflow" className="hover:text-gray-900 no-underline">
              How it works
            </a>
            <a href="#pricing" className="hover:text-gray-900 no-underline">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors no-underline"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-sm font-medium text-white hover:bg-primary/90 transition-colors no-underline"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-100">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, rgba(59,130,246,0.08), transparent 40%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.08), transparent 40%)",
          }}
        />
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Built for modern gyms
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.05]">
            Run your gym.
            <br />
            <span className="text-gray-400">Not your spreadsheet.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl leading-relaxed">
            {APP_NAME} gives gym owners, coaches, and members a single platform for
            memberships, programs, classes, and check-ins — without the duct
            tape.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-primary text-base font-medium text-white hover:bg-primary/90 transition-colors no-underline"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-gray-300 bg-white text-base font-medium text-gray-900 hover:bg-gray-50 transition-colors no-underline"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            No credit card required · Set up your gym in under 5 minutes
          </p>
        </div>
      </section>

      {/* Trusted by stats */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { value: "500+", label: "Gyms onboarded" },
              { value: "120k", label: "Workouts logged" },
              { value: "98%", label: "Check-in accuracy" },
              { value: "24/7", label: "Always on" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-secondary uppercase tracking-wide">
              Everything in one place
            </p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
              The operating system for your gym.
            </h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              Stop stitching together five different tools. {APP_NAME} handles
              programming, scheduling, billing, and athlete progress — so you
              can focus on coaching.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Programs & workouts",
                desc: "Design multi-week programs with calendar-based workouts. Athletes log time and AMRAP results from the app.",
              },
              {
                title: "Recurring classes",
                desc: `Set schedules once. ${APP_NAME} materializes occurrences, handles cancellations, and tracks coach overrides.`,
              },
              {
                title: "Memberships & billing",
                desc: "Monthly, yearly, or class-pack plans. Automatic usage tracking when members check in.",
              },
              {
                title: "One-tap check-in",
                desc: "Coaches see the roster for today's session and check athletes in with a single tap.",
              },
              {
                title: "Roles that fit reality",
                desc: "Members, coaches, and admins — one person can be all three. Permissions follow the role, not the user.",
              },
              {
                title: "Mobile + web",
                desc: "A native mobile app for athletes, a polished web dashboard for owners. Both powered by the same API.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-gray-200 bg-white hover:border-primary hover:shadow-lg transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-primary transition-colors flex items-center justify-center mb-4">
                  <div className="w-4 h-4 rounded-sm bg-primary group-hover:bg-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-secondary uppercase tracking-wide">
              How it works
            </p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
              From zero to first class in minutes.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Create your gym",
                desc: "Sign up, name your gym, and invite your coaches. You become the first admin.",
              },
              {
                step: "02",
                title: "Build your programs",
                desc: "Define membership plans, add recurring classes, and draft your first week of workouts.",
              },
              {
                step: "03",
                title: "Open the doors",
                desc: "Share your gym with members. They sign up, pick a plan, and start checking in.",
              },
            ].map((s) => (
              <div key={s.step} className="relative p-8 rounded-2xl bg-white border border-gray-200">
                <div className="text-sm font-mono font-semibold text-secondary">
                  {s.step}
                </div>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm font-semibold text-secondary uppercase tracking-wide">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
              Simple pricing. Scale as you grow.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$0",
                period: "forever",
                desc: "For new gyms getting off the ground.",
                features: ["Up to 25 members", "1 program", "Basic check-in", "Community support"],
                cta: "Get started",
                highlighted: false,
              },
              {
                name: "Studio",
                price: "$49",
                period: "per month",
                desc: "For growing gyms with multiple coaches.",
                features: ["Unlimited members", "Unlimited programs", "Recurring classes", "Priority support"],
                cta: "Start free trial",
                highlighted: true,
              },
              {
                name: "Scale",
                price: "Custom",
                period: "contact us",
                desc: "For gym networks and franchises.",
                features: ["Everything in Studio", "Multi-location", "SSO & audit logs", "Dedicated success manager"],
                cta: "Contact sales",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl border ${
                  plan.highlighted
                    ? "border-primary bg-primary text-white shadow-xl"
                    : "border-gray-200 bg-white"
                }`}
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? "text-gray-400" : "text-gray-500"}`}>
                    {plan.period}
                  </span>
                </div>
                <p
                  className={`mt-3 text-sm ${
                    plan.highlighted ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {plan.desc}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`text-sm flex items-start gap-2 ${
                        plan.highlighted ? "text-gray-200" : "text-gray-700"
                      }`}
                    >
                      <span
                        className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                          plan.highlighted ? "bg-white" : "bg-primary"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 inline-flex w-full h-11 items-center justify-center rounded-lg text-sm font-medium transition-colors no-underline ${
                    plan.highlighted
                      ? "bg-white text-gray-900 hover:bg-gray-100"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Ready to run your gym better?
          </h2>
          <p className="mt-5 text-lg text-gray-600 max-w-xl mx-auto">
            Join hundreds of gym owners who&apos;ve ditched the spreadsheets.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-primary text-base font-medium text-white hover:bg-primary/90 transition-colors no-underline"
            >
              Create your gym
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-gray-300 bg-white text-base font-medium text-gray-900 hover:bg-gray-50 transition-colors no-underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">{APP_NAME.charAt(0)}</span>
            </div>
            <span className="text-sm font-semibold">{APP_NAME}</span>
            <span className="text-xs text-gray-500">
              © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-900 no-underline">Privacy</a>
            <a href="#" className="hover:text-gray-900 no-underline">Terms</a>
            <a href="#" className="hover:text-gray-900 no-underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
