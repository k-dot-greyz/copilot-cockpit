import { useEffect } from 'react';
import {
  bindGlitchTilt,
  registerGlitchMediaCard,
} from '../../../dex/06-tools/glitch-islands/glitch-media-card';

export function useGlitchIslands() {
  useEffect(() => {
    registerGlitchMediaCard();
    bindGlitchTilt();
  }, []);
}
