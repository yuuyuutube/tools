import { renderWav } from './wav';
import type { Melody } from '../music-core/model';
self.onmessage=(event:MessageEvent<Melody>)=>{
  try {const buffer=renderWav(event.data);self.postMessage({buffer},{transfer:[buffer]});}
  catch(error){self.postMessage({error:(error as Error).message});}
};
