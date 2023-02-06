import { base_tiles } from "./base-tiles";
import minimist from "minimist";
import fs from "fs";
import { args_schema, config_schema } from "./schema";
import type { Config, DiceRollValues, Tile } from "./types";
import { z } from "zod";
import { createObjectCsvWriter as csvWriter } from "csv-writer";

// Main function that runs the program
(async () => {
  try {
    const { config_path } = parse_args();
    const { starting_position, turns_to_simulate, blockers, teleporters } =
      get_config(config_path);

    const tiles = build_tiles(blockers, teleporters);

    const results: Array<{
      roll: number;
      player_position: number;
    }> = [];

    // Simulate the turns
    for (let i = 0; i <= turns_to_simulate; i++) {
      // If it's the first turn, initialize the history with the starting position
      if (i == 0) {
        results.push({
          roll: -1,
          player_position: starting_position,
        });
        continue;
      }

      const roll = roll_2d6();

      const current_player_position = tiles.find(
        (t) => t.id === results[i - 1].player_position
      );

      if (!current_player_position) {
        throw new Error(`Invalid player position, turn # ${i}`);
      }

      const player_position = current_player_position.edges[roll].is_blocked
        ? current_player_position.id
        : current_player_position.edges[roll].neighbor_id;

      results.push({
        roll,
        player_position,
      });
    }

    // Write the results
    const [history_output, summary_output] = write_results(
      results,
      config_path
    );

    console.info(
      `Done! Results written to ${history_output} and ${summary_output}`
    );
  } catch (e) {
    console.error("Script cancelled due to error!", e);
    return;
  }
})();

/**
 * Parses the command line arguments
 *  --config: The path to the config file. /configs/ is prepended to the path
 *            ex. --config config.json  =>  ./configs/config.json
 */
function parse_args(): { config_path: string } {
  const unsafe_args = minimist(process.argv.slice(2));
  const args = args_schema.safeParse(unsafe_args);

  const config_path = `./configs/${
    args.success ? args.data.config : "data.json"
  }`;

  return {
    config_path,
  };
}

/**
 * Validates the config file
 */
function get_config(config_path: string): Config {
  try {
    const file = fs.readFileSync(config_path, "utf8");
    const json = JSON.parse(file);
    const config = config_schema.parse(json);
    return config;
  } catch (e) {
    console.error(e);
    throw new Error("Error parsing the config.");
  }
}

/**
 * Rolls two 6-sided dice
 */
function roll_2d6(): DiceRollValues {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const roll = z
    .number()
    .min(2)
    .max(12)
    .parse(die1 + die2);
  return roll as DiceRollValues;
}

/**
 * Takes the base-tiles and adds the blockers and teleporters
 * from the config file.
 */

function build_tiles(
  blockers: Config["blockers"],
  teleporters: Config["teleporters"]
): Tile[] {
  const tiles = [...base_tiles];

  // Add blockers
  blockers.forEach((blocker) => {
    const tile = tiles.find((t) => t.id === blocker.tile);
    if (tile) {
      tile.edges[blocker.edge as DiceRollValues].is_blocked = true;
    }
  });

  // Add teleporters
  teleporters.forEach((teleporter) => {
    const tile = tiles.find((t) => t.id === teleporter.tile);
    if (tile) {
      // Note the current neighbor_id so that we can replace both edge
      // values. This is because many movements share a single edge,
      // such as 2-3, 4-5, 6-7, 8-9, 10-11
      const current_neighbor_id =
        tile.edges[teleporter.edge as DiceRollValues].neighbor_id;

      // Update both linked edge values
      Object.keys(tile.edges).forEach((edge) => {
        const e = Number(edge) as DiceRollValues;

        if (tile.edges[e].neighbor_id === current_neighbor_id) {
          tile.edges[e].neighbor_id = teleporter.target;
        }
      });
    }
  });

  return tiles;
}

/**
 * Writes data results to a file.
 * @param results The data to write to the file
 * @returns void
 */
export function write_results(
  results: Array<{ roll: number; player_position: number }>,
  config_path: string
): [string, string] {
  const timestamp = Date.now().toString();
  const base_path = config_path.replace("configs", "results");
  const history_output = `${base_path}_history${timestamp}.csv`;
  const summary_output = `${base_path}_summary${timestamp}.csv`;

  // Output the entire match history
  let writer = csvWriter({
    path: history_output,
    header: [
      { id: "turn", title: "Turn" },
      { id: "roll", title: "Roll" },
      { id: "player_position", title: "Player Tile" },
    ],
  });
  writer.writeRecords(results.map((result, i) => ({ ...result, turn: i })));

  // Output the summary of each tile
  writer = csvWriter({
    path: summary_output,
    header: [
      { id: "tile", title: "Tile" },
      { id: "count", title: "Count" },
    ],
  });
  const unique_tiles = new Set(results.map((result) => result.player_position));
  const summary_results = [];

  for (const tile of unique_tiles) {
    summary_results.push({
      tile,
      count: results.filter((result) => result.player_position === tile).length,
    });
  }

  writer.writeRecords(summary_results);

  return [history_output, summary_output];
}
