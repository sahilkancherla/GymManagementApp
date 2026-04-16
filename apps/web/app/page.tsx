import Link from "next/link";
import { APP_NAME } from "@acuo/shared";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[var(--color-bg-base)] text-[var(--color-ink)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--color-bg-base)]/85 backdrop-blur border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline shrink-0"
          >
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent-rich)] to-[var(--color-accent-deep)] text-white shadow-[0_1px_2px_-1px_rgba(4,120,87,0.4)]">
              <span className="text-[13px] font-semibold tracking-tight">
                {APP_NAME.charAt(0)}
              </span>
              <span className="absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-leaf)] ring-2 ring-[var(--color-bg-base)]" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)] font-display">
              {APP_NAME}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] text-[var(--color-ink-soft)]">
            <a
              href="#features"
              className="hover:text-[var(--color-ink)] transition-colors no-underline"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="hover:text-[var(--color-ink)] transition-colors no-underline"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="hover:text-[var(--color-ink)] transition-colors no-underline"
            >
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-9 px-4 rounded-md text-[13px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors no-underline"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-[var(--color-accent)] text-[13px] font-medium text-white hover:bg-[var(--color-accent-rich)] transition-colors no-underline"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-rule)]">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, rgba(4,120,87,0.06), transparent 40%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.06), transparent 40%)",
          }}
        />
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-24 md:py-32 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-rule)] bg-[var(--color-bg-card)] text-[11px] font-medium text-[var(--color-ink-soft)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-bright)]" />
            Built for modern gyms
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.05]">
            Run your gym.
            <br />
            <span className="text-[var(--color-ink-muted)]">
              Not your spreadsheet.
            </span>
          </h1>
          <p className="mt-6 text-[15px] md:text-lg text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            {APP_NAME} gives gym owners, coaches, and members a single platform
            for memberships, programs, classes, and check-ins — without the duct
            tape.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[var(--color-accent)] text-[14px] font-medium text-white hover:bg-[var(--color-accent-rich)] transition-colors no-underline shadow-[var(--shadow-soft)]"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors no-underline"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-[var(--color-ink-muted)]">
            No credit card required · Set up your gym in under 5 minutes
          </p>
        </div>
      </section>

      {/* Trusted by stats */}
      <section className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { value: "500+", label: "Gyms onboarded" },
              { value: "120k", label: "Workouts logged" },
              { value: "98%", label: "Check-in accuracy" },
              { value: "24/7", label: "Always on" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
                  {stat.value}
                </div>
                <div className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-[0.14em]">
              Everything in one place
            </p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">
              The operating system for your gym.
            </h2>
            <p className="mt-5 text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
              Stop stitching together five different tools. {APP_NAME} handles
              programming, scheduling, billing, and athlete progress — so you can
              focus on coaching.
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
                className="group p-6 rounded-xl border border-[var(--color-rule)] bg-[var(--color-bg-card)] hover:border-[var(--color-accent-rule-strong)] hover:shadow-[var(--shadow-lifted)] transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-soft)] group-hover:bg-[var(--color-accent)] transition-colors flex items-center justify-center mb-4">
                  <div className="w-4 h-4 rounded-sm bg-[var(--color-accent)] group-hover:bg-white transition-colors" />
                </div>
                <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section
        id="workflow"
        className="border-b border-[var(--color-rule)] bg-[var(--color-bg-sunken)]"
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-[0.14em]">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">
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
              <div
                key={s.step}
                className="relative p-8 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-rule)]"
              >
                <div className="text-[13px] font-mono font-semibold text-[var(--color-accent)]">
                  {s.step}
                </div>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--color-ink)]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-24">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-[0.14em]">
              Pricing
            </p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">
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
                features: [
                  "Up to 25 members",
                  "1 program",
                  "Basic check-in",
                  "Community support",
                ],
                cta: "Get started",
                highlighted: false,
              },
              {
                name: "Studio",
                price: "$49",
                period: "per month",
                desc: "For growing gyms with multiple coaches.",
                features: [
                  "Unlimited members",
                  "Unlimited programs",
                  "Recurring classes",
                  "Priority support",
                ],
                cta: "Start free trial",
                highlighted: true,
              },
              {
                name: "Scale",
                price: "Custom",
                period: "contact us",
                desc: "For gym networks and franchises.",
                features: [
                  "Everything in Studio",
                  "Multi-location",
                  "SSO & audit logs",
                  "Dedicated success manager",
                ],
                cta: "Contact sales",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-xl border ${
                  plan.highlighted
                    ? "border-[var(--color-accent-deep)] bg-[var(--color-ink)] text-white shadow-[var(--shadow-lifted)]"
                    : "border-[var(--color-rule)] bg-[var(--color-bg-card)]"
                }`}
              >
                <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  <span
                    className={`text-[13px] ${
                      plan.highlighted
                        ? "text-white/50"
                        : "text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className={`mt-3 text-[13px] ${
                    plan.highlighted
                      ? "text-white/60"
                      : "text-[var(--color-ink-soft)]"
                  }`}
                >
                  {plan.desc}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`text-[13px] flex items-start gap-2 ${
                        plan.highlighted
                          ? "text-white/70"
                          : "text-[var(--color-ink-soft)]"
                      }`}
                    >
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                          plan.highlighted
                            ? "bg-[var(--color-accent-leaf)]"
                            : "bg-[var(--color-accent)]"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 inline-flex w-full h-11 items-center justify-center rounded-lg text-[13px] font-medium transition-colors no-underline ${
                    plan.highlighted
                      ? "bg-white text-[var(--color-ink)] hover:bg-white/90"
                      : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-rich)]"
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
      <section className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-5xl px-6 md:px-10 py-24 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Ready to run your gym better?
          </h2>
          <p className="mt-5 text-[15px] text-[var(--color-ink-soft)] max-w-xl mx-auto">
            Join hundreds of gym owners who&apos;ve ditched the spreadsheets.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-[var(--color-accent)] text-[14px] font-medium text-white hover:bg-[var(--color-accent-rich)] transition-colors no-underline"
            >
              Create your gym
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-[var(--color-rule-strong)] bg-[var(--color-bg-card)] text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg-soft)] transition-colors no-underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-bg-base)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-accent-rich)] to-[var(--color-accent-deep)] text-white">
              <span className="text-[10px] font-semibold">
                {APP_NAME.charAt(0)}
              </span>
            </span>
            <span className="text-[13px] font-semibold text-[var(--color-ink)]">
              {APP_NAME}
            </span>
            <span className="text-[12px] text-[var(--color-ink-muted)]">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-[var(--color-ink-soft)]">
            <a
              href="#"
              className="hover:text-[var(--color-ink)] transition-colors no-underline"
            >
              Privacy
            </a>
            <a
              href="#"
              className="hover:text-[var(--color-ink)] transition-colors no-underline"
            >
              Terms
            </a>
            <a
              href="#"
              className="hover:text-[var(--color-ink)] transition-colors no-underline"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
