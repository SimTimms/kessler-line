import { useState } from 'react';
import AppContainer from '../App/AppContainer';
import ModelConfigScene from './ModelConfigScene';
import './modelConfig.css';

import FireButtons from './FireButtons';
export default function ModelConfig() {
  const [collisionMeshVisible, setCollisionMeshVisible] = useState(false);
  return (
    <AppContainer>
      <FireButtons
        collisionMeshVisible={collisionMeshVisible}
        setCollisionMeshVisible={setCollisionMeshVisible}
      />
      <ModelConfigScene showCollisionDebug={collisionMeshVisible} />
    </AppContainer>
  );
}
