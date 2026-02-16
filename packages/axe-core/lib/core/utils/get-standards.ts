import standards from '../../standards';
import clone from './clone';

export default function getStandards(): unknown {
  return clone(standards);
}
