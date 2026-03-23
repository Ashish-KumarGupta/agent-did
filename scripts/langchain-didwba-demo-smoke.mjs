import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..");

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: options.env ? Object.assign({}, process.env, options.env) : process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with exit code ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`
          )
        );
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function parseJsonOutput(label, stdout) {
  try {
    return JSON.parse(stdout.trim());
  } catch {
    throw new Error(`${label} did not emit valid JSON. Output was:\n${stdout}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasResolvedEvent(events, did) {
  return Array.isArray(events) && events.some((event) => event && event.did === did && event.stage === "resolved");
}

async function main() {
  const pythonCommand = process.env.PYTHON || "python";
  const jsDemoPath = path.join("integrations", "langchain", "examples", "agentDidLangChain.didWbaDemo.example.js");
  const pyDemoPath = path.join(
    "integrations",
    "langchain-python",
    "examples",
    "agent_did_langchain_did_wba_demo.py"
  );

  console.log("[smoke] Running LangChain JS did:wba demo...");
  const jsRun = await runCommand("node", [jsDemoPath]);
  const jsResult = parseJsonOutput("LangChain JS demo", jsRun.stdout);

  assert(jsResult.activeDid === "did:wba:agents.example:profiles:weather-bot", "Unexpected JS activeDid");
  assert(jsResult.partnerDid === "did:wba:agents.example:partners:dispatch-router", "Unexpected JS partnerDid");
  assert(jsResult.httpSignatureVerified === true, "JS demo did not verify its HTTP signature");
  assert(hasResolvedEvent(jsResult.resolutionEvents, jsResult.activeDid), "JS demo missing resolved event for active DID");
  assert(hasResolvedEvent(jsResult.resolutionEvents, jsResult.partnerDid), "JS demo missing resolved event for partner DID");

  console.log("[smoke] Running LangChain Python did:wba demo...");
  const pyRun = await runCommand(pythonCommand, [pyDemoPath]);
  const pyResult = parseJsonOutput("LangChain Python demo", pyRun.stdout);

  assert(pyResult.active_did === "did:wba:agents.example:profiles:weather-bot", "Unexpected Python active_did");
  assert(pyResult.partner_did === "did:wba:agents.example:partners:dispatch-router", "Unexpected Python partner_did");
  assert(pyResult.http_signature_verified === true, "Python demo did not verify its HTTP signature");
  assert(hasResolvedEvent(pyResult.resolution_events, pyResult.active_did), "Python demo missing resolved event for active DID");
  assert(hasResolvedEvent(pyResult.resolution_events, pyResult.partner_did), "Python demo missing resolved event for partner DID");

  console.log(
    JSON.stringify(
      {
        status: "ok",
        js: {
          activeDid: jsResult.activeDid,
          partnerDid: jsResult.partnerDid,
          httpSignatureVerified: jsResult.httpSignatureVerified,
        },
        python: {
          activeDid: pyResult.active_did,
          partnerDid: pyResult.partner_did,
          httpSignatureVerified: pyResult.http_signature_verified,
        },
      },
      null,
      2
    )
  );
}

try {
  await main();
} catch (error) {
  console.error("[smoke] LangChain did:wba demo smoke failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
