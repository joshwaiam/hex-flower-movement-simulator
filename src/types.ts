export type Config = {
  starting_position: number;
  turns_to_simulate: number;
  blockers: Array<{
    tile: number;
    edge: number;
  }>;
  teleporters: Array<{
    tile: number;
    edge: number;
    target: number;
  }>;
};

export type DiceRollValues = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

type TileEdge = {
  is_blocked: boolean;
  neighbor_id: number;
};

export type Tile = {
  id: number;
  edges: {
    [key in DiceRollValues]: TileEdge;
  };
};
