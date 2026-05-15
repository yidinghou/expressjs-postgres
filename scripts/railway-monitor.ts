#!/usr/bin/env ts-node
/**
 * Railway monitoring agent for Claude Code
 * Fetches deployment status, logs, and errors from Railway
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface RailwayStatus {
  projectId: string;
  environmentId: string;
  serviceName: string;
  status: "running" | "crashed" | "redeploying" | "unknown";
  lastDeployment: string;
  recentLogs: string[];
  errors: Array<{ timestamp: string; message: string; level: "error" | "warn" }>;
}

function executeCommand(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8" });
  } catch (error: any) {
    return `Error executing command: ${error.message}`;
  }
}

function getRailwayStatus(): RailwayStatus {
  // Get Railway project and environment info
  const projectOutput = executeCommand("railway project").trim();
  const projectId = extractProjectId(projectOutput);

  const envOutput = executeCommand("railway environment").trim();
  const environmentId = extractEnvironmentId(envOutput);

  // Get service status
  const statusOutput = executeCommand(
    `railway service list --service ${process.env.RAILWAY_SERVICE || "web"}`
  );

  // Get recent logs
  const logsOutput = executeCommand(
    `railway logs --tail 50 --service ${process.env.RAILWAY_SERVICE || "web"}`
  );

  // Parse logs for errors
  const recentLogs = logsOutput
    .split("\n")
    .filter((line) => line.trim())
    .slice(-20);
  const errors = parseErrorsFromLogs(recentLogs);

  // Get deployment info
  const deploymentOutput = executeCommand("railway deployments --limit 1");
  const lastDeployment = extractDeploymentInfo(deploymentOutput);

  return {
    projectId,
    environmentId,
    serviceName: process.env.RAILWAY_SERVICE || "web",
    status: determineStatus(statusOutput, errors),
    lastDeployment,
    recentLogs,
    errors,
  };
}

function extractProjectId(output: string): string {
  const match = output.match(/Project ID: ([a-z0-9-]+)/i);
  return match ? match[1] : "unknown";
}

function extractEnvironmentId(output: string): string {
  const match = output.match(/Environment ID: ([a-z0-9-]+)/i);
  return match ? match[1] : "unknown";
}

function extractDeploymentInfo(output: string): string {
  const lines = output.split("\n");
  return lines[1] || "No deployments found";
}

function parseErrorsFromLogs(
  logs: string[]
): Array<{ timestamp: string; message: string; level: "error" | "warn" }> {
  return logs
    .filter((line) => /error|fail|exception|crash/i.test(line))
    .map((line) => ({
      timestamp: new Date().toISOString(),
      message: line,
      level: /error|crash|exception/i.test(line) ? "error" : "warn",
    }));
}

function determineStatus(
  statusOutput: string,
  errors: Array<any>
): "running" | "crashed" | "redeploying" | "unknown" {
  if (/crashed|stopped/i.test(statusOutput)) return "crashed";
  if (/deploying|redeploying/i.test(statusOutput)) return "redeploying";
  if (errors.length > 0 && /error/i.test(errors[0].level)) return "crashed";
  if (/running|healthy|active/i.test(statusOutput)) return "running";
  return "unknown";
}

// Main execution
const status = getRailwayStatus();

// Output as JSON for Claude to parse
console.log(JSON.stringify(status, null, 2));

// Also output a human-readable summary
console.error("\n--- Railway Status Summary ---");
console.error(`Status: ${status.status.toUpperCase()}`);
console.error(`Service: ${status.serviceName}`);
console.error(`Last Deployment: ${status.lastDeployment}`);
console.error(`Recent Errors: ${status.errors.length}`);
if (status.errors.length > 0) {
  console.error("\nRecent Errors:");
  status.errors.slice(0, 5).forEach((err) => {
    console.error(`  [${err.level.toUpperCase()}] ${err.message}`);
  });
}
