import { createClient } from "@supabase/supabase-js";

async function run() {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Error: BOOTSTRAP_SUPER_ADMIN_EMAIL and BOOTSTRAP_SUPER_ADMIN_PASSWORD must be provided.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`Bootstrapping Super Admin for email: ${email}...`);

  // 1. Ensure user exists in Auth
  let userId;
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const existingAuthUser = usersData.users.find(u => u.email === email);
  if (existingAuthUser) {
    userId = existingAuthUser.id;
    console.log(`Auth user already exists (ID: ${userId}). Updating attributes...`);
    // Update app_metadata
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { role: "SUPER_ADMIN", is_active: true },
      user_metadata: { first_name: "Mukund", last_name: "Gaikwad" },
    });
    if (updateAuthError) {
      console.error("Failed to update auth user app_metadata:", updateAuthError.message);
      process.exit(1);
    }
  } else {
    console.log("Creating new Auth user...");
    const { data: createdAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "Mukund", last_name: "Gaikwad" },
      app_metadata: { role: "SUPER_ADMIN", is_active: true },
    });

    if (createAuthError) {
      console.error("Failed to create auth user:", createAuthError.message);
      process.exit(1);
    }
    userId = createdAuthUser.user.id;
    console.log(`Created Auth user (ID: ${userId}).`);
  }

  // 2. Ensure profile exists and has SUPER_ADMIN role
  console.log("Synchronizing profile...");
  const { data: existingProfile, error: profileCheckError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileCheckError) {
    console.error("Failed to check profile:", profileCheckError.message);
    process.exit(1);
  }

  if (existingProfile) {
    console.log("Profile exists. Updating role to SUPER_ADMIN...");
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        role: "SUPER_ADMIN",
        is_active: true,
        first_name: "Mukund",
        last_name: "Gaikwad",
      })
      .eq("id", userId);

    if (updateProfileError) {
      console.error("Failed to update profile:", updateProfileError.message);
      process.exit(1);
    }
  } else {
    console.log("Profile does not exist. Creating profile...");
    const { error: insertProfileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email,
        role: "SUPER_ADMIN",
        first_name: "Mukund",
        last_name: "Gaikwad",
        is_active: true,
        status: "active",
      });

    if (insertProfileError) {
      console.error("Failed to insert profile:", insertProfileError.message);
      process.exit(1);
    }
  }

  console.log("✅ Super Admin bootstrap completed successfully.");
  console.log("You can now log in using this email and password.");
}

run().catch(console.error);
