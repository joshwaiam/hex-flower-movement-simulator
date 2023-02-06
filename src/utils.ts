import fs from "fs";
import readline from "readline";
import { z } from "zod";

/**
 * Asks the user a question and returns their response
 * @param query The question to ask the user
 * @returns string | undefined
 */
export async function prompt(query: string): Promise<string | undefined> {
  try {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const response = z
      .string()
      .parse(await new Promise((resolve) => rl.question(`${query} `, resolve)));

    rl.close();
    return response;
  } catch (e) {
    console.error("Error prompting the user", e);
    return undefined;
  }
}

/**
 * Writes data results to a file.
 * @param results The data to write to the file
 * @returns void
 */
export function write_results(
  results: Array<{ player_position: number }>,
  config_path: string
): void {
  // TODO Write to CSV rather than JSON
  const json = JSON.stringify(results, undefined, 2);
  const output_path = `${config_path.replace(
    "config",
    "results"
  )}_${Date.now().toString()}.json`;
  fs.writeFileSync(output_path, json);
}
