import { memo } from 'react';
import type { ReactNode } from 'react';

interface AppContainerProps {
  children: ReactNode;
}

const AppContainer = memo(function AppContainer({ children }: AppContainerProps) {
  return <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>{children}</div>;
});

export default AppContainer;
