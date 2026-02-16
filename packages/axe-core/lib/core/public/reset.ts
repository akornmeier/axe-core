import { resetStandards } from '../../standards';

declare const axe: {
  _audit: {
    resetRulesAndChecks: () => void;
  } | null;
};

function reset(): void {
  const audit = axe._audit;

  if (!audit) {
    throw new Error('No audit configured');
  }
  audit.resetRulesAndChecks();
  resetStandards();
}

export default reset;
