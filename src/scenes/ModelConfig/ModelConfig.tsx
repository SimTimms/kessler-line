import { useState } from 'react';
import AppContainer from '../../components/App/AppContainer';
import ModelConfigScene from './ModelConfigScene';
import './modelConfig.css';

import FireButtons from './FireButtons';
export default function ModelConfig() {
  const [collisionMeshVisible, setCollisionMeshVisible] = useState(false);
  const [useVolumetricFog, setUseVolumetricFog] = useState(true);

  return (
    <AppContainer>
      <FireButtons
        collisionMeshVisible={collisionMeshVisible}
        setCollisionMeshVisible={setCollisionMeshVisible}
        useVolumetricFog={useVolumetricFog}
        setUseVolumetricFog={setUseVolumetricFog}
      />
      <ModelConfigScene
        showCollisionDebug={collisionMeshVisible}
        useVolumetricFog={useVolumetricFog}
      />
    </AppContainer>
  );
}
