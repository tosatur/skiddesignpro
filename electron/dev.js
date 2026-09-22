// The dev EXE enables the existing application test tools on every launch.
process.env.SPN_ENABLE_TEST_TOOLS = "true";
await import("./main.js");
