'use client';
import { useEffect } from 'react';

export default function RDKitLoader() {
  useEffect(() => {
    const init = () => {
      if ((window as any).initRDKitModule) {
        (window as any).initRDKitModule().then((RDKit: any) => {
          (window as any).RDKit = RDKit;
          console.log('RDKit ready:', RDKit.version());
        }).catch((e: any) => console.warn('RDKit failed', e));
      } else {
        setTimeout(init, 200);
      }
    };
    init();
  }, []);
  return null;
}