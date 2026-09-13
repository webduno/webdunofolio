// mutable input shared between the UI layer and the canvas loop
export type WorldControls = {
  // -1..1, x is right, y is forward (camera-relative)
  move: { x: number; y: number };
  // pending camera rotation in radians, consumed each frame
  yawDelta: number;
  // bumps every time the player asks for a jump
  jumpId: number;
};

export function createControls(): WorldControls {
  return { move: { x: 0, y: 0 }, yawDelta: 0, jumpId: 0 };
}
