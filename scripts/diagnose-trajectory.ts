import { loadTableLayout } from '../packages/physics/src/layout-loader';
import { createPhysicsWorld } from '../packages/physics/src/physics-world';
import * as pl from 'planck';

async function diagnose() {
  const layout = await loadTableLayout();
  const S = layout.physicsScale;
  const world = createPhysicsWorld(layout);

  world.ball.setPosition(pl.Vec2(0.5 * S, 0.5 * S));
  world.ball.setLinearVelocity(pl.Vec2(0, 0));

  console.log('--- Ball drop trajectory from [0.5, 0.5] ---');
  for (let i = 0; i < 180; i++) {
    world.step();
    const st = world.getBallState();
    if (i % 15 === 0 || st.y > 1.7) {
      console.log(`t=${(i/120).toFixed(2)}s: pos=[${st.x.toFixed(3)}, ${st.y.toFixed(3)}], vy=${st.vy.toFixed(3)}`);
    }
    if (st.y >= 1.75) break;
  }
}

diagnose();
