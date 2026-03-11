import { useEffect, useRef } from 'react';

export function useRerenderTrace(label: string) {
  const count = useRef(0);
  useEffect(() => {
    count.current += 1;
    if (count.current > 1) {
      // eslint-disable-next-line no-console
      console.debug(`[render] ${label} ${count.current}`);
    }
  });
}
