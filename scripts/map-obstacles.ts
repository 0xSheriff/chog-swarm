import { loadTableLayout } from '../packages/physics/src/layout-loader';

async function mapObstacles() {
  const layout = await loadTableLayout();
  console.log('--- Obstacles on Playfield ---');
  console.log('Top Arch: Center [0.5, 0.5], Radius 0.5 (y: 0.0 to 0.5, x: 0.0 to 1.0)');
  console.log('Rollover lanes:', layout.rolloverLanes.dividerX, 'y:', layout.rolloverLanes.y0, 'to', layout.rolloverLanes.y1);
  console.log('Crypt Portal:', layout.cryptPortal.x, layout.cryptPortal.y, 'r:', layout.cryptPortal.radius);
  console.log('Bumpers:');
  layout.popBumpers.forEach(b => console.log(' ', b.id, 'at [', b.x, b.y, '] r =', b.radius));
  console.log('Ghosts:');
  layout.ghostTargets.forEach(g => console.log(' ', g.id, 'at [', g.x, g.y, '] r =', g.radius));
  console.log('Slingshots:');
  layout.slingshots.forEach(s => console.log(' ', s.id, s.verts));
  console.log('Flippers:');
  console.log('  left pivot:', layout.flippers.left.pivot, 'restAngle:', layout.flippers.left.restAngle, 'upAngle:', layout.flippers.left.upAngle);
  console.log('  right pivot:', layout.flippers.right.pivot, 'restAngle:', layout.flippers.right.restAngle, 'upAngle:', layout.flippers.right.upAngle);
}

mapObstacles();
