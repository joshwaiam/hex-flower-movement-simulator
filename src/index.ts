import { base_tiles } from "./base-tiles";
import minimist from "minimist";
import fs from "fs";
import { args_schema, config_schema } from "./schema";
import type { Config, DiceRollValues, Tile } from "./types";
import util from "util";

// Main function that runs the program
(async () => {
  try {
    const { config_path } = parse_args();
    const { starting_position, blockers, teleporters } =
      get_config(config_path);

    const tiles = build_tiles(blockers, teleporters);
    console.info(util.inspect(tiles, { depth: null, colors: true }));

    // const [die1, die2] = roll_2d6();
    // console.info(`You rolled a ${die1} and a ${die2}`);
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
function roll_2d6(): [number, number] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
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
