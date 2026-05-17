import * as z from "zod"

// Test what happens when parse throws
try {
  const schema = z.object({
    name: z.string().min(1, "required"),
    org_id: z.string().uuid("must be uuid"),
  })
  
  // This is what the frontend sends
  schema.parse({ name: "Test Dept", org_id: "00000000-0000-0000-0000-000000000001" })
} catch(e) {
  console.log("--- Error details ---")
  console.log("Type:", typeof e)
  console.log("Constructor:", e.constructor?.name)
  console.log("name:", e.name)
  console.log("message (first 200):", String(e.message).substring(0, 200))
  console.log("instanceof z.ZodError:", e instanceof z.ZodError)
  console.log("has .errors:", !!e.errors)
  console.log("has .issues:", !!e.issues)
  
  if (e.issues) {
    console.log("\ne.issues:", JSON.stringify(e.issues, null, 2))
  }
  if (e.errors) {
    console.log("\ne.errors:", JSON.stringify(e.errors, null, 2))
  }
}

// Also test: does a simple uuid pattern accept our ID?
console.log("\n--- UUID regex test ---")
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
console.log("Standard regex:", uuidRegex.test("00000000-0000-0000-0000-000000000001"))

// Zod v4 UUID regex from the error message
const zodRegex = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/
console.log("Zod v4 regex:", zodRegex.test("00000000-0000-0000-0000-000000000001"))
