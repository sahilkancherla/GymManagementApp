import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GYM_ID = "14089b6a-8cf4-480d-b33d-36f0b8e3ec69";

// ---------- Plans ----------

const PLANS = [
  {
    name: "Acuo Adult Monthly Unlimited",
    description: "Unlimited classes and open gym access for adults.",
    price_cents: 23500,
    type: "monthly",
    class_count: null, // unlimited
  },
  {
    name: "Acuo Kids Monthly Unlimited",
    description: "Unlimited classes for kids and teens.",
    price_cents: 14000,
    type: "monthly",
    class_count: null,
  },
];

// ---------- Programs ----------

const PROGRAMS = [
  {
    name: "Acuo Adult Program",
    description:
      "Strength and conditioning for adults of all levels. Includes daily WODs, Olympic lifting, and gymnastics progressions.",
  },
  {
    name: "Acuo Kids Program",
    description:
      "Fun, age-appropriate fitness for kids and teens. Focus on movement fundamentals, coordination, and teamwork.",
  },
];

// ---------- Members ----------
// plan: index into PLANS array, programs: indices into PROGRAMS array

const MEMBERS: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  gender: string;
  roles: string[];
  plans: number[];
  programs: number[];
}[] = [
  {
    email: "sarah.johnson@example.com",
    password: "seed1234",
    first_name: "Sarah",
    last_name: "Johnson",
    gender: "female",
    roles: ["admin", "coach"],
    plans: [0], // Adult Monthly Unlimited
    programs: [0], // Adult
  },
  {
    email: "mike.chen@example.com",
    password: "seed1234",
    first_name: "Mike",
    last_name: "Chen",
    gender: "male",
    roles: ["coach"],
    plans: [0],
    programs: [0],
  },
  {
    email: "jessica.taylor@example.com",
    password: "seed1234",
    first_name: "Jessica",
    last_name: "Taylor",
    gender: "female",
    roles: ["coach", "member"],
    plans: [0, 1], // Both — coaches kids too
    programs: [0, 1],
  },
  {
    email: "alex.rivera@example.com",
    password: "seed1234",
    first_name: "Alex",
    last_name: "Rivera",
    gender: "male",
    roles: ["member"],
    plans: [0],
    programs: [0],
  },
  {
    email: "emma.watson@example.com",
    password: "seed1234",
    first_name: "Emma",
    last_name: "Watson",
    gender: "female",
    roles: ["member"],
    plans: [1], // Kids Monthly Unlimited
    programs: [1],
  },
  {
    email: "james.park@example.com",
    password: "seed1234",
    first_name: "James",
    last_name: "Park",
    gender: "male",
    roles: ["admin"],
    plans: [0],
    programs: [0],
  },
  {
    email: "olivia.martinez@example.com",
    password: "seed1234",
    first_name: "Olivia",
    last_name: "Martinez",
    gender: "female",
    roles: ["member"],
    plans: [0],
    programs: [0],
  },
  {
    email: "daniel.kim@example.com",
    password: "seed1234",
    first_name: "Daniel",
    last_name: "Kim",
    gender: "male",
    roles: ["coach", "member"],
    plans: [0, 1], // Both — coaches kids too
    programs: [0, 1],
  },
  {
    email: "rachel.nguyen@example.com",
    password: "seed1234",
    first_name: "Rachel",
    last_name: "Nguyen",
    gender: "female",
    roles: ["admin", "coach", "member"],
    plans: [0],
    programs: [0],
  },
  {
    email: "tom.bradley@example.com",
    password: "seed1234",
    first_name: "Tom",
    last_name: "Bradley",
    gender: "male",
    roles: ["member"],
    plans: [], // No active subscription
    programs: [], // Not enrolled yet
  },
];

async function seed() {
  // ---- 1. Create plans ----
  console.log("Creating plans...");
  const planIds: string[] = [];
  for (const p of PLANS) {
    const { data, error } = await supabase
      .from("plans")
      .insert({ gym_id: GYM_ID, ...p })
      .select("id")
      .single();
    if (error) {
      console.error(`  ✗ Plan "${p.name}": ${error.message}`);
      process.exit(1);
    }
    planIds.push(data.id);
    console.log(`  ✓ ${p.name} — $${p.price_cents / 100}/mo`);
  }

  // ---- 2. Create programs ----
  console.log("\nCreating programs...");
  const programIds: string[] = [];
  for (const p of PROGRAMS) {
    const { data, error } = await supabase
      .from("programs")
      .insert({ gym_id: GYM_ID, ...p })
      .select("id")
      .single();
    if (error) {
      console.error(`  ✗ Program "${p.name}": ${error.message}`);
      process.exit(1);
    }
    programIds.push(data.id);
    console.log(`  ✓ ${p.name}`);
  }

  // ---- 3. Link plans to programs via plan_programs ----
  // Monthly Unlimited → Adult Program, Kids Unlimited → Kids Program
  console.log("\nLinking plans to programs...");
  const planProgramLinks = [
    { plan_id: planIds[0], program_id: programIds[0] }, // Monthly Unlimited → Adult
    { plan_id: planIds[1], program_id: programIds[1] }, // Kids Unlimited → Kids
  ];
  const { error: linkError } = await supabase
    .from("plan_programs")
    .insert(planProgramLinks);
  if (linkError) {
    console.error(`  ✗ plan_programs: ${linkError.message}`);
  } else {
    console.log("  ✓ Plans linked to programs");
  }

  // ---- 4. Create members ----
  console.log(`\nSeeding ${MEMBERS.length} members...\n`);

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // last day

  for (const m of MEMBERS) {
    // 4a. Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: m.email,
        password: m.password,
        email_confirm: true,
        user_metadata: {
          first_name: m.first_name,
          last_name: m.last_name,
        },
      });

    if (authError) {
      console.error(`  ✗ ${m.first_name} ${m.last_name} — auth: ${authError.message}`);
      continue;
    }

    const userId = authData.user.id;

    // 4b. Update profile with gender
    await supabase
      .from("profiles")
      .update({ gender: m.gender })
      .eq("id", userId);

    // 4c. Create gym_members row
    const { data: memberData, error: memberError } = await supabase
      .from("gym_members")
      .insert({ gym_id: GYM_ID, user_id: userId, status: "active" })
      .select("id")
      .single();

    if (memberError) {
      console.error(`  ✗ ${m.first_name} ${m.last_name} — membership: ${memberError.message}`);
      continue;
    }

    // 4d. Assign roles
    const roleRows = m.roles.map((role) => ({
      member_id: memberData.id,
      role,
    }));
    const { error: roleError } = await supabase
      .from("gym_member_roles")
      .insert(roleRows);
    if (roleError) {
      console.error(`  ✗ ${m.first_name} ${m.last_name} — roles: ${roleError.message}`);
      continue;
    }

    // 4e. Create subscriptions
    for (const pi of m.plans) {
      const { error: subError } = await supabase.from("subscriptions").insert({
        gym_id: GYM_ID,
        user_id: userId,
        plan_id: planIds[pi],
        status: "active",
        classes_used: 0,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      });
      if (subError) {
        console.error(`  ✗ ${m.first_name} ${m.last_name} — subscription: ${subError.message}`);
      }
    }

    // 4f. Enroll in programs
    for (const pi of m.programs) {
      const { error: enrollError } = await supabase
        .from("program_enrollments")
        .insert({
          program_id: programIds[pi],
          user_id: userId,
          status: "active",
        });
      if (enrollError) {
        console.error(`  ✗ ${m.first_name} ${m.last_name} — enrollment: ${enrollError.message}`);
      }
    }

    const planLabel =
      m.plans.length > 0
        ? m.plans.map((i) => PLANS[i].name).join(", ")
        : "no plan";
    const progLabels =
      m.programs.length > 0
        ? m.programs.map((i) => PROGRAMS[i].name).join(", ")
        : "none";

    console.log(
      `  ✓ ${m.first_name} ${m.last_name} (${m.email})\n` +
        `      roles: ${m.roles.join(", ")}  |  plan: ${planLabel}  |  programs: ${progLabels}`
    );
  }

  console.log("\nDone.");
}

seed().catch(console.error);
